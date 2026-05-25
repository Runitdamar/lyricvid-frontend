import { useCallback, useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore from './studioStore.js'

const ASSEMBLYAI_KEY = '39846581378e4e1c9fea52cde0a192d2'
const BASE_URL = 'https://api.assemblyai.com'
const CLIP_DURATIONS = [15, 30, 40]
const BAR_COUNT = 150
const BAR_WIDTH = 3
const BAR_GAP = 2
const BAR_TOTAL = BAR_WIDTH + BAR_GAP
const TOTAL_WAVEFORM_PX = BAR_COUNT * BAR_TOTAL

function generateWaveform(count) {
  return Array.from({ length: count }, (_, i) => {
    const base = 0.3
    const w1 = Math.sin(i * 0.18) * 0.25
    const w2 = Math.sin(i * 0.45) * 0.15
    const w3 = Math.cos(i * 0.1) * 0.1
    const noise = (Math.random() * 0.25)
    return Math.max(0.08, Math.min(1, base + w1 + w2 + w3 + noise))
  })
}

const WAVEFORM = generateWaveform(BAR_COUNT)

async function cropAudio(file, startSec, endSec) {
  const arrayBuffer = await file.arrayBuffer()
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const decoded = await audioCtx.decodeAudioData(arrayBuffer)
  const sampleRate = decoded.sampleRate
  const startSample = Math.floor(startSec * sampleRate)
  const endSample = Math.floor(endSec * sampleRate)
  const frameCount = endSample - startSample
  const croppedBuffer = audioCtx.createBuffer(decoded.numberOfChannels, frameCount, sampleRate)
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const src = decoded.getChannelData(ch)
    const dst = croppedBuffer.getChannelData(ch)
    for (let i = 0; i < frameCount; i++) dst[i] = src[startSample + i]
  }
  audioCtx.close()
  return audioBufferToWavBlob(croppedBuffer)
}

function audioBufferToWavBlob(buffer) {
  const numCh = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const numFrames = buffer.length
  const bytesPerSample = 2
  const blockAlign = numCh * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign
  const ab = new ArrayBuffer(44 + dataSize)
  const view = new DataView(ab)
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); ws(8, 'WAVE'); ws(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numCh, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true)
  ws(36, 'data'); view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      offset += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

async function transcribeCropped(wavBlob, clipDuration, onStatus) {
  const headers = { 'authorization': ASSEMBLYAI_KEY, 'content-type': 'application/json' }
  onStatus('Uploading clip...')
  const uploadRes = await fetch(`${BASE_URL}/v2/upload`, {
    method: 'POST',
    headers: { 'authorization': ASSEMBLYAI_KEY, 'content-type': 'audio/wav' },
    body: wavBlob
  })
  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)
  const { upload_url } = await uploadRes.json()
  onStatus('Starting transcription...')
  const res = await fetch(`${BASE_URL}/v2/transcript`, {
    method: 'POST', headers,
    body: JSON.stringify({ audio_url: upload_url, speech_models: ['universal-2'], language_code: 'en_us' })
  })
  if (!res.ok) { const e = await res.text(); throw new Error(`${res.status}: ${e}`) }
  const { id } = await res.json()
  let attempts = 0
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await fetch(`${BASE_URL}/v2/transcript/${id}`, { headers })
    const result = await poll.json()
    if (result.status === 'completed') {
      if (!result.text?.trim()) throw new Error('No speech detected in clip')
      const words = result.words?.length > 0
        ? result.words.map(w => ({ word: w.text, start: parseFloat((w.start / 1000).toFixed(3)), end: parseFloat((w.end / 1000).toFixed(3)) }))
        : result.text.trim().split(/\s+/).map((word, i, arr) => ({
            word,
            start: parseFloat((i * (clipDuration / arr.length)).toFixed(3)),
            end: parseFloat(((i + 1) * (clipDuration / arr.length)).toFixed(3))
          }))
      return { text: result.text.trim(), words }
    }
    if (result.status === 'error') throw new Error(result.error)
    onStatus(`Transcribing... ${attempts % 2 === 0 ? '⠋' : '⠙'}`)
    attempts++
  }
  throw new Error('Timed out. Please try again.')
}

export default function AudioUploader({ onNext }) {
  const store = useStudioStore()
  const [phase, setPhase] = useState('upload')
  const [fileName, setFileName] = useState('')
  const [duration, setDuration] = useState(0)
  const [clipDuration, setClipDuration] = useState(15)
  const [waveformOffset, setWaveformOffset] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const localUrlRef = useRef(null)
  const audioRef = useRef(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartOffset = useRef(0)

  const pxPerSec = TOTAL_WAVEFORM_PX / Math.max(1, duration)
  const selectionWidthPx = Math.min(clipDuration * pxPerSec, TOTAL_WAVEFORM_PX)
  const maxOffset = Math.max(0, TOTAL_WAVEFORM_PX - selectionWidthPx)
  const trimStart = duration > 0 ? (waveformOffset / TOTAL_WAVEFORM_PX) * duration : 0
  const trimEnd = Math.min(duration, trimStart + clipDuration)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      if (audio.currentTime >= trimEnd) { audio.pause(); audio.currentTime = trimStart; setIsPlaying(false) }
    }
    const onEnd = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd) }
  }, [trimStart, trimEnd])

  const onDrop = useCallback((files) => {
    const file = files[0]
    if (!file) return
    fileRef.current = file
    setFileName(file.name)
    setError(null)
    const url = URL.createObjectURL(file)
    localUrlRef.current = url
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      const dur = audio.duration
      setDuration(dur)
      setClipDuration(Math.min(15, dur))
      setWaveformOffset(0)
      setPhase('trim')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac'] }, maxSize: 50 * 1024 * 1024, multiple: false
  })

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.currentTime = trimStart; audio.play(); setIsPlaying(true) }
  }

  const onDragStart = (e) => {
    isDragging.current = true
    dragStartX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    dragStartOffset.current = waveformOffset
  }

  const onDragMove = (e) => {
    if (!isDragging.current) return
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const delta = dragStartX.current - clientX
    const newOffset = Math.max(0, Math.min(maxOffset, dragStartOffset.current + delta))
    setWaveformOffset(newOffset)
    if (audioRef.current) audioRef.current.currentTime = (newOffset / TOTAL_WAVEFORM_PX) * duration
  }

  const onDragEnd = () => { isDragging.current = false }

  const selectClipDuration = (sec) => {
    const newClip = Math.min(sec, duration)
    setClipDuration(newClip)
    const center = trimStart + clipDuration / 2
    const newStart = Math.max(0, Math.min(duration - newClip, center - newClip / 2))
    setWaveformOffset(Math.min(maxOffset, (newStart / duration) * TOTAL_WAVEFORM_PX))
  }

  const startTranscription = async () => {
    setPhase('transcribing'); setProgress(5); setError(null)
    try {
      const clipDur = trimEnd - trimStart
      setStatusMsg('Cropping audio clip...'); setProgress(10)
      const wavBlob = await cropAudio(fileRef.current, trimStart, trimEnd)
      setProgress(20)
      const croppedUrl = URL.createObjectURL(wavBlob)
      store.setAudioFile(fileRef.current, croppedUrl, clipDur, trimStart, trimEnd)
      const result = await transcribeCropped(wavBlob, clipDur, (msg) => {
        setStatusMsg(msg); setProgress(p => Math.min(p + 8, 88))
      })
      store.setTranscript(result.text); store.setWords(result.words)
      setProgress(100); setPhase('done')
    } catch (err) {
      setError(err.message); setPhase('trim'); setProgress(0)
    }
  }

  const selectionStartBar = Math.floor(waveformOffset / BAR_TOTAL)
  const selectionEndBar = Math.ceil((waveformOffset + selectionWidthPx) / BAR_TOTAL)
  const playheadPct = clipDuration > 0 ? Math.min(1, (currentTime - trimStart) / clipDuration) : 0

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">UPLOAD AUDIO</h2>
        <p className="text-white/40 text-sm">MP3, WAV, M4A • Max 50MB</p>
      </div>

      {phase === 'upload' && (
        <motion.div {...getRootProps()} whileHover={{ scale: 1.01 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all ${isDragActive ? 'border-brand-400 bg-brand-500/10' : 'border-white/20 hover:border-brand-500/50'}`}>
          <input {...getInputProps()} />
          <div className="text-6xl mb-4">🎤</div>
          <p className="font-bebas text-3xl tracking-wider text-white mb-2">DROP YOUR AUDIO</p>
          <p className="text-white/40 text-sm">or tap to browse</p>
          <p className="text-white/20 font-mono text-xs mt-3">MP3 • WAV • M4A • OGG</p>
        </motion.div>
      )}

      {phase === 'trim' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <audio ref={audioRef} src={localUrlRef.current} />

          <div className="glass rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/20 flex items-center justify-center text-lg">🎵</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-mono truncate">{fileName}</p>
              <p className="text-white/30 text-xs font-mono">{duration.toFixed(1)}s total</p>
            </div>
            <button onClick={() => { setPhase('upload'); fileRef.current = null }} className="text-white/20 hover:text-white text-lg">✕</button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-white/30 flex-shrink-0">Clip</span>
            <div className="flex gap-2">
              {CLIP_DURATIONS.filter(s => s <= Math.ceil(duration)).map(s => (
                <button key={s} onClick={() => selectClipDuration(s)}
                  className={`w-12 h-12 rounded-full text-sm font-bebas tracking-wider transition-all border-2 ${Math.round(clipDuration) === s ? 'bg-white text-black border-white shadow-lg' : 'bg-transparent text-white/60 border-white/25 hover:border-white/60 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
            <span className="text-xs font-mono text-brand-400 ml-auto">{(trimEnd - trimStart).toFixed(1)}s selected</span>
          </div>

          {/* Waveform - BOX IS FIXED, waveform scrolls */}
          <div className="space-y-2">
            <div
              className="relative rounded-2xl overflow-hidden bg-black"
              style={{ height: 88, cursor: 'grab', touchAction: 'none' }}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onMouseLeave={onDragEnd}
              onTouchStart={onDragStart}
              onTouchMove={onDragMove}
              onTouchEnd={onDragEnd}
            >
              {/* Scrolling waveform underneath */}
              <div className="absolute inset-y-0 flex items-center"
                style={{ left: `calc(50% - ${selectionWidthPx / 2 + waveformOffset}px)`, width: TOTAL_WAVEFORM_PX, pointerEvents: 'none' }}>
                {WAVEFORM.map((h, i) => (
                  <div key={i} className="flex-shrink-0 rounded-full"
                    style={{
                      width: BAR_WIDTH, marginRight: BAR_GAP,
                      height: `${h * 72}%`,
                      background: i >= selectionStartBar && i < selectionEndBar
                        ? 'linear-gradient(to bottom, #ff1fa0, #ff96d9)'
                        : 'rgba(255,255,255,0.15)'
                    }} />
                ))}
              </div>

              {/* FIXED selection box in center — never moves */}
              <div className="absolute inset-y-2 pointer-events-none rounded-xl"
                style={{
                  left: `calc(50% - ${selectionWidthPx / 2}px)`,
                  width: selectionWidthPx,
                  border: '2px solid rgba(255,255,255,0.9)',
                  background: 'rgba(255,255,255,0.03)'
                }}>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 w-1 h-7 bg-white rounded-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-0.5 w-1 h-7 bg-white rounded-full" />
                {isPlaying && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white/70 rounded-full transition-none"
                    style={{ left: `${playheadPct * 100}%` }} />
                )}
              </div>

              {/* Edge fades */}
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none" />
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-xs text-white/30">{trimStart.toFixed(1)}s</span>
              <button onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
                {isPlaying
                  ? <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <span className="font-mono text-xs text-white/30">{trimEnd.toFixed(1)}s</span>
            </div>
            <p className="text-center text-white/20 text-xs font-mono">← drag waveform to reposition →</p>
          </div>

          {error && <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">⚠️ {error}</div>}

          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={startTranscription} className="btn-primary w-full py-4 text-xl">
            ✨ Crop & Transcribe
          </motion.button>
        </motion.div>
      )}

      {phase === 'transcribing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 border border-brand-500/20 text-center space-y-5">
          <div className="text-5xl">🤖</div>
          <h3 className="font-bebas text-2xl tracking-wider gradient-text">PROCESSING CLIP...</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50 flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />{statusMsg}
              </span>
              <span className="font-mono text-sm text-brand-400">{progress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
          <p className="text-white/20 text-xs font-mono">Cropping + transcribing... ~15-25s</p>
        </motion.div>
      )}

      {phase === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="glass rounded-2xl p-6 border border-green-500/30 text-center space-y-3">
            <div className="text-5xl">✅</div>
            <h3 className="font-bebas text-2xl tracking-wider text-green-400">CLIP READY!</h3>
            <p className="text-white/40 text-sm px-4 truncate">{store.transcript.slice(0, 100)}...</p>
            <div className="flex gap-3 justify-center">
              <span className="glass px-3 py-1 rounded-full border border-white/10 text-white/40 text-xs font-mono">{store.lines.length} lines</span>
              <span className="glass px-3 py-1 rounded-full border border-white/10 text-white/40 text-xs font-mono">{store.audioDuration.toFixed(1)}s</span>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={onNext} className="btn-primary w-full py-4 text-xl">
            Next: Sync Lyrics →
          </motion.button>
          <button onClick={() => setPhase('trim')} className="w-full text-center text-white/20 text-xs font-mono hover:text-white py-2 transition-colors">← Re-trim</button>
        </motion.div>
      )}
    </div>
  )
}
