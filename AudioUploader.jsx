import { useCallback, useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore from './studioStore.js'

const ASSEMBLYAI_KEY = '39846581378e4e1c9fea52cde0a192d2'
const BASE_URL = 'https://api.assemblyai.com'
const CLIP_DURATIONS = [15, 30, 40]

async function transcribe(file, startMs, endMs, onStatus) {
  const headers = { 'authorization': ASSEMBLYAI_KEY, 'content-type': 'application/json' }
  onStatus('Uploading audio...')
  const uploadRes = await fetch(`${BASE_URL}/v2/upload`, {
    method: 'POST',
    headers: { 'authorization': ASSEMBLYAI_KEY, 'content-type': file.type || 'audio/mpeg' },
    body: file
  })
  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)
  const { upload_url } = await uploadRes.json()

  onStatus('Starting transcription...')
  const res = await fetch(`${BASE_URL}/v2/transcript`, {
    method: 'POST', headers,
    body: JSON.stringify({
      audio_url: upload_url,
      speech_models: ['universal-2'],
      language_code: 'en_us',
      audio_start_from: startMs,
      audio_end_at: endMs
    })
  })
  if (!res.ok) { const e = await res.text(); throw new Error(`${res.status}: ${e}`) }
  const { id } = await res.json()

  let attempts = 0
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await fetch(`${BASE_URL}/v2/transcript/${id}`, { headers })
    const result = await poll.json()
    if (result.status === 'completed') {
      if (!result.text?.trim()) throw new Error('No speech detected')
      const clipDurationSec = (endMs - startMs) / 1000
      // Normalize timestamps: subtract startMs offset, convert to seconds
      const words = result.words?.length > 0
        ? result.words.map(w => ({
            word: w.text,
            start: parseFloat(Math.max(0, (w.start - startMs) / 1000).toFixed(3)),
            end: parseFloat(Math.max(0, (w.end - startMs) / 1000).toFixed(3))
          }))
        : result.text.trim().split(/\s+/).map((word, i, arr) => ({
            word,
            start: parseFloat((i * (clipDurationSec / arr.length)).toFixed(3)),
            end: parseFloat(((i + 1) * (clipDurationSec / arr.length)).toFixed(3))
          }))
      return { text: result.text.trim(), words }
    }
    if (result.status === 'error') throw new Error(result.error)
    onStatus(`Transcribing... ${attempts % 2 === 0 ? '⠋' : '⠙'}`)
    attempts++
  }
  throw new Error('Timed out. Please try again.')
}

// Generate fake waveform bars from audio
function generateWaveform(bars = 200) {
  return Array.from({ length: bars }, (_, i) => {
    const base = 0.3
    const wave1 = Math.sin(i * 0.15) * 0.25
    const wave2 = Math.sin(i * 0.4) * 0.15
    const noise = Math.random() * 0.3
    return Math.max(0.05, Math.min(1, base + wave1 + wave2 + noise))
  })
}

const WAVEFORM = generateWaveform(200)
const BAR_WIDTH = 4
const BAR_GAP = 2
const TOTAL_BAR_WIDTH = BAR_WIDTH + BAR_GAP

export default function AudioUploader({ onNext }) {
  const store = useStudioStore()
  const [phase, setPhase] = useState('upload')
  const [fileName, setFileName] = useState('')
  const [duration, setDuration] = useState(0)
  const [clipDuration, setClipDuration] = useState(15)
  const [scrollOffset, setScrollOffset] = useState(0) // in pixels
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const localUrlRef = useRef(null)
  const audioRef = useRef(null)
  const waveformRef = useRef(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartOffset = useRef(0)

  const totalWaveWidth = WAVEFORM.length * TOTAL_BAR_WIDTH
  // scrollOffset = how many px we've scrolled = start time in px
  const pxPerSec = totalWaveWidth / Math.max(1, duration)
  const clipWidthPx = clipDuration * pxPerSec
  const maxOffset = Math.max(0, totalWaveWidth - clipWidthPx)

  const trimStart = duration > 0 ? (scrollOffset / totalWaveWidth) * duration : 0
  const trimEnd = Math.min(duration, trimStart + clipDuration)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      if (audio.currentTime >= trimEnd) { audio.pause(); setIsPlaying(false); audio.currentTime = trimStart }
    }
    const onEnd = () => { setIsPlaying(false) }
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
      setDuration(audio.duration)
      setClipDuration(Math.min(15, audio.duration))
      setScrollOffset(0)
      setPhase('trim')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac'] },
    maxSize: 50 * 1024 * 1024,
    multiple: false
  })

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else {
      audio.currentTime = trimStart
      audio.play()
      setIsPlaying(true)
    }
  }

  // Drag handlers for waveform
  const onMouseDown = (e) => {
    isDragging.current = true
    dragStartX.current = e.clientX || e.touches?.[0]?.clientX
    dragStartOffset.current = scrollOffset
  }

  const onMouseMove = (e) => {
    if (!isDragging.current) return
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const delta = dragStartX.current - clientX
    const newOffset = Math.max(0, Math.min(maxOffset, dragStartOffset.current + delta))
    setScrollOffset(newOffset)
    // Seek audio to new position
    if (audioRef.current) {
      const newStart = (newOffset / totalWaveWidth) * duration
      audioRef.current.currentTime = newStart
    }
  }

  const onMouseUp = () => { isDragging.current = false }

  const selectClipDuration = (sec) => {
    const newClip = Math.min(sec, duration)
    setClipDuration(newClip)
    // Keep trim centered
    const center = trimStart + clipDuration / 2
    const newStart = Math.max(0, center - newClip / 2)
    const newOffset = Math.min(maxOffset, (newStart / duration) * totalWaveWidth)
    setScrollOffset(newOffset)
  }

  const startTranscription = async () => {
    setPhase('transcribing')
    setProgress(10)
    setError(null)
    const clipDur = trimEnd - trimStart
    store.setAudioFile(fileRef.current, localUrlRef.current, clipDur, trimStart, trimEnd)
    try {
      const result = await transcribe(
        fileRef.current,
        Math.floor(trimStart * 1000),
        Math.floor(trimEnd * 1000),
        (msg) => { setStatusMsg(msg); setProgress(p => Math.min(p + 8, 88)) }
      )
      store.setTranscript(result.text)
      store.setWords(result.words)
      setProgress(100)
      setPhase('done')
    } catch (err) {
      setError(err.message)
      setPhase('trim')
      setProgress(0)
    }
  }

  // Visible window of waveform (centered display)
  const viewportWidth = 320
  const visibleOffset = scrollOffset

  const playheadPx = duration > 0 ? ((currentTime - trimStart) / clipDuration) * clipWidthPx : 0

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">UPLOAD AUDIO</h2>
        <p className="text-white/40 text-sm">MP3, WAV, M4A • Max 50MB</p>
      </div>

      {/* UPLOAD */}
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

      {/* INSTAGRAM STYLE TRIMMER */}
      {phase === 'trim' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <audio ref={audioRef} src={localUrlRef.current} />

          {/* File info */}
          <div className="glass rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/20 flex items-center justify-center text-lg flex-shrink-0">🎵</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-mono truncate">{fileName}</p>
              <p className="text-white/30 text-xs font-mono">{duration.toFixed(1)}s</p>
            </div>
            <button onClick={() => { setPhase('upload'); fileRef.current = null }} className="text-white/20 hover:text-white text-lg">✕</button>
          </div>

          {/* Duration selector pills */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-white/30 uppercase tracking-wider flex-shrink-0">Clip length</span>
            <div className="flex gap-2">
              {CLIP_DURATIONS.filter(s => s <= duration + 1).map(s => (
                <button key={s} onClick={() => selectClipDuration(s)}
                  className={`w-12 h-12 rounded-full text-sm font-bebas tracking-wider transition-all border-2 ${Math.round(clipDuration) === s ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/30 hover:border-white/60'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Instagram-style waveform */}
          <div className="space-y-3">
            <div className="relative bg-black rounded-2xl overflow-hidden" style={{ height: 100 }}>
              {/* Waveform scrollable area */}
              <div
                ref={waveformRef}
                className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchStart={onMouseDown}
                onTouchMove={onMouseMove}
                onTouchEnd={onMouseUp}
                style={{ touchAction: 'none' }}
              >
                {/* All waveform bars */}
                <div className="absolute inset-y-0 flex items-center"
                  style={{ left: `50%`, transform: `translateX(calc(-${scrollOffset}px - 50%))`, width: totalWaveWidth }}>
                  {WAVEFORM.map((h, i) => {
                    const barLeft = i * TOTAL_BAR_WIDTH
                    const inSelection = barLeft >= scrollOffset && barLeft < scrollOffset + clipWidthPx
                    return (
                      <div key={i} className="flex-shrink-0 rounded-full mx-px transition-colors"
                        style={{
                          width: BAR_WIDTH,
                          height: `${h * 70}%`,
                          background: inSelection
                            ? `linear-gradient(to bottom, #ff1fa0, #ff96d9)`
                            : 'rgba(255,255,255,0.2)'
                        }} />
                    )
                  })}
                </div>

                {/* Selection window overlay */}
                <div className="absolute inset-y-0 pointer-events-none"
                  style={{
                    left: `calc(50% - ${scrollOffset - 0}px)`,
                    width: clipWidthPx,
                    border: '2px solid white',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)'
                  }} />

                {/* Playhead */}
                {isPlaying && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-10"
                    style={{ left: `calc(50% + ${playheadPx - clipWidthPx / 2}px)` }} />
                )}

                {/* Center line indicator */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 pointer-events-none" />
              </div>

              {/* Left/Right gradient fade */}
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none" />
            </div>

            {/* Time display */}
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-xs text-white/40">{trimStart.toFixed(1)}s</span>
              <div className="flex items-center gap-3">
                <button onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center transition-all hover:scale-105 active:scale-95">
                  {isPlaying
                    ? <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    : <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  }
                </button>
                <span className="font-bebas text-xl text-brand-400 tracking-wider">{clipDuration.toFixed(0)}s selected</span>
              </div>
              <span className="font-mono text-xs text-white/40">{trimEnd.toFixed(1)}s</span>
            </div>

            <p className="text-center text-white/20 text-xs font-mono">← drag waveform to select clip →</p>
          </div>

          {error && (
            <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">⚠️ {error}</div>
          )}

          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={startTranscription}
            className="btn-primary w-full py-4 text-xl">
            ✨ Transcribe This Clip
          </motion.button>
        </motion.div>
      )}

      {/* TRANSCRIBING */}
      {phase === 'transcribing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 border border-brand-500/20 text-center space-y-5">
          <div className="text-5xl">🤖</div>
          <h3 className="font-bebas text-2xl tracking-wider gradient-text">AI IS LISTENING...</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50 flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
                {statusMsg}
              </span>
              <span className="font-mono text-sm text-brand-400">{progress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
          <p className="text-white/20 text-xs font-mono">Usually 10-25 seconds...</p>
        </motion.div>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="glass rounded-2xl p-6 border border-green-500/30 text-center space-y-3">
            <div className="text-5xl">✅</div>
            <h3 className="font-bebas text-2xl tracking-wider text-green-400">TRANSCRIBED!</h3>
            <p className="text-white/40 text-sm truncate px-4">{store.transcript.slice(0, 100)}...</p>
            <div className="flex gap-3 justify-center text-xs font-mono">
              <span className="glass px-3 py-1 rounded-full border border-white/10 text-white/40">{store.lines.length} lines</span>
              <span className="glass px-3 py-1 rounded-full border border-white/10 text-white/40">{store.audioDuration.toFixed(1)}s</span>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={onNext} className="btn-primary w-full py-4 text-xl">
            Next: Sync Lyrics →
          </motion.button>
          <button onClick={() => setPhase('trim')} className="w-full text-center text-white/20 text-xs font-mono hover:text-white py-2">
            ← Re-trim
          </button>
        </motion.div>
      )}
    </div>
  )
}
