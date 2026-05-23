import { useCallback, useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore from './studioStore.js'

const ASSEMBLYAI_KEY = '39846581378e4e1c9fea52cde0a192d2'
const BASE_URL = 'https://api.assemblyai.com'

async function transcribe(file, startMs, endMs, onStatus) {
  const headers = { 'authorization': ASSEMBLYAI_KEY, 'content-type': 'application/json' }

  onStatus('Uploading...')
  const uploadRes = await fetch(`${BASE_URL}/v2/upload`, {
    method: 'POST',
    headers: { 'authorization': ASSEMBLYAI_KEY, 'content-type': file.type || 'audio/mpeg' },
    body: file
  })
  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)
  const { upload_url } = await uploadRes.json()

  onStatus('Transcribing...')
  const body = {
    audio_url: upload_url,
    speech_models: ['universal-2'],
    language_code: 'en_us',
    audio_start_from: startMs,
    audio_end_at: endMs
  }

  const res = await fetch(`${BASE_URL}/v2/transcript`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) { const e = await res.text(); throw new Error(`Failed: ${res.status} - ${e}`) }
  const { id } = await res.json()

  let attempts = 0
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await fetch(`${BASE_URL}/v2/transcript/${id}`, { headers })
    const result = await poll.json()
    if (result.status === 'completed') {
      if (!result.text?.trim()) throw new Error('No speech detected')
      // Normalize timestamps to start from 0
      const offsetMs = startMs
      const words = result.words?.length > 0
        ? result.words.map(w => ({
            word: w.text,
            start: Math.max(0, (w.start - offsetMs) / 1000),
            end: Math.max(0, (w.end - offsetMs) / 1000)
          }))
        : result.text.trim().split(/\s+/).map((word, i, arr) => ({
            word,
            start: parseFloat((i * ((endMs - startMs) / 1000 / arr.length)).toFixed(2)),
            end: parseFloat(((i + 1) * ((endMs - startMs) / 1000 / arr.length)).toFixed(2))
          }))
      return { text: result.text.trim(), words }
    }
    if (result.status === 'error') throw new Error(result.error)
    onStatus(`Processing... ${attempts % 2 === 0 ? '⠋' : '⠙'}`)
    attempts++
  }
  throw new Error('Timed out. Please try again.')
}

export default function AudioUploader({ onNext }) {
  const store = useStudioStore()
  const [phase, setPhase] = useState('upload') // upload | trim | transcribing | done
  const [statusMsg, setStatusMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [duration, setDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(40)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const localUrlRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      // Stop at trim end
      if (audio.currentTime >= trimEnd) { audio.pause(); setIsPlaying(false) }
    }
    const onEnd = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd) }
  }, [trimEnd])

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
      setTrimStart(0)
      setTrimEnd(Math.min(40, dur))
      setPhase('trim')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac'] },
    maxSize: 50 * 1024 * 1024, multiple: false
  })

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else {
      if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) audio.currentTime = trimStart
      audio.play(); setIsPlaying(true)
    }
  }

  const handleStartTranscription = async () => {
    setPhase('transcribing')
    setProgress(10)
    setError(null)
    const clipDuration = trimEnd - trimStart
    store.setAudioFile(fileRef.current, localUrlRef.current, clipDuration)
    store.setTrim(trimStart, trimEnd)
    try {
      const result = await transcribe(
        fileRef.current,
        Math.floor(trimStart * 1000),
        Math.floor(trimEnd * 1000),
        (msg) => { setStatusMsg(msg); setProgress(p => Math.min(p + 8, 88)) }
      )
      store.setTranscript(result.text)
      store.setWords(result.words) // auto-groups into lines
      setProgress(100)
      setPhase('done')
    } catch (err) {
      setError(err.message)
      setPhase('trim')
      setProgress(0)
    }
  }

  const clipDuration = trimEnd - trimStart
  const progressPct = duration ? (currentTime / duration) * 100 : 0
  const trimStartPct = duration ? (trimStart / duration) * 100 : 0
  const trimEndPct = duration ? (trimEnd / duration) * 100 : 100

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">UPLOAD AUDIO</h2>
        <p className="text-white/40 text-sm">MP3, WAV, M4A • Max 50MB</p>
      </div>

      {/* UPLOAD PHASE */}
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

      {/* TRIM PHASE */}
      {phase === 'trim' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <audio ref={audioRef} src={localUrlRef.current} />

          {/* File info */}
          <div className="glass rounded-xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-xl flex-shrink-0">🎵</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-mono truncate">{fileName}</p>
              <p className="text-white/40 text-xs font-mono">{duration.toFixed(1)}s total</p>
            </div>
            <button onClick={() => { setPhase('upload'); fileRef.current = null }}
              className="text-white/30 hover:text-white text-lg transition-colors">✕</button>
          </div>

          {/* Simple visual timeline */}
          <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Select clip</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${clipDuration <= 40 ? 'text-green-400 border-green-500/40' : 'text-red-400 border-red-500/40'}`}>
                {clipDuration.toFixed(1)}s {clipDuration <= 40 ? '✓' : '↑ too long'}
              </span>
            </div>

            {/* Visual bar */}
            <div className="relative h-10 bg-white/5 rounded-xl overflow-hidden">
              {/* Outside trim - dimmed */}
              <div className="absolute inset-y-0 left-0 bg-black/50 z-10 rounded-l-xl" style={{ width: `${trimStartPct}%` }} />
              <div className="absolute inset-y-0 right-0 bg-black/50 z-10 rounded-r-xl" style={{ width: `${100 - trimEndPct}%` }} />
              {/* Selected region */}
              <div className="absolute inset-y-0 border-x-2 border-brand-400 bg-brand-500/15 z-20"
                style={{ left: `${trimStartPct}%`, width: `${trimEndPct - trimStartPct}%` }} />
              {/* Playhead */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white/70 z-30 transition-none"
                style={{ left: `${progressPct}%` }} />
              {/* Fake waveform */}
              <div className="absolute inset-0 flex items-center gap-0.5 px-1 opacity-30">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-white rounded-full"
                    style={{ height: `${25 + Math.sin(i * 0.7) * 15 + Math.cos(i * 0.4) * 10}%` }} />
                ))}
              </div>
            </div>

            {/* Play button */}
            <div className="flex items-center gap-3">
              <button onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-colors flex-shrink-0">
                {isPlaying
                  ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <span className="font-mono text-xs text-white/30">Preview selected clip</span>
            </div>
          </div>

          {/* Start slider */}
          <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Start</label>
              <span className="font-bebas text-xl text-brand-400">{trimStart.toFixed(1)}s</span>
            </div>
            <input type="range" min={0} max={Math.max(0, duration - 5)} step={0.5}
              value={trimStart}
              onChange={e => {
                const v = parseFloat(e.target.value)
                setTrimStart(v)
                if (trimEnd - v > 40) setTrimEnd(v + 40)
                if (trimEnd - v < 5) setTrimEnd(Math.min(v + 5, duration))
              }}
              className="w-full accent-brand-500 h-2" />
          </div>

          {/* End slider */}
          <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono text-white/40 uppercase tracking-wider">End</label>
              <span className="font-bebas text-xl text-brand-400">{trimEnd.toFixed(1)}s</span>
            </div>
            <input type="range" min={Math.min(trimStart + 5, duration)} max={duration} step={0.5}
              value={trimEnd}
              onChange={e => {
                const v = parseFloat(e.target.value)
                setTrimEnd(v)
                if (v - trimStart > 40) setTrimStart(v - 40)
              }}
              className="w-full accent-brand-500 h-2" />
          </div>

          {/* Quick select */}
          <div className="flex gap-2">
            {[15, 30, 40].map(s => (
              <button key={s} onClick={() => { setTrimStart(0); setTrimEnd(Math.min(s, duration)) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bebas tracking-wider transition-all border ${Math.abs(clipDuration - s) < 1 ? 'bg-brand-500 border-brand-400 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:border-brand-400 hover:text-white'}`}>
                {s}s
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
              ⚠️ {error}
            </div>
          )}

          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleStartTranscription}
            disabled={clipDuration > 40 || clipDuration < 2}
            className={`w-full py-4 rounded-2xl font-bebas text-xl tracking-wider transition-all ${clipDuration <= 40 && clipDuration >= 2 ? 'btn-primary' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>
            ✨ Transcribe This Clip
          </motion.button>
        </motion.div>
      )}

      {/* TRANSCRIBING PHASE */}
      {phase === 'transcribing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 border border-brand-500/20 text-center space-y-5">
          <div className="text-5xl">🤖</div>
          <h3 className="font-bebas text-2xl tracking-wider gradient-text">AI IS LISTENING...</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50 flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
                {statusMsg || 'Starting...'}
              </span>
              <span className="font-mono text-sm text-brand-400">{progress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
          <p className="text-white/30 text-xs font-mono">Usually 10-25 seconds...</p>
        </motion.div>
      )}

      {/* DONE PHASE */}
      {phase === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="glass rounded-2xl p-6 border border-green-500/30 text-center space-y-3">
            <div className="text-5xl">✅</div>
            <h3 className="font-bebas text-2xl tracking-wider text-green-400">TRANSCRIBED!</h3>
            <p className="text-white/50 text-sm">{store.transcript.slice(0, 80)}{store.transcript.length > 80 ? '...' : ''}</p>
            <div className="flex gap-3 justify-center text-xs font-mono">
              <span className="glass px-3 py-1 rounded-full border border-white/10 text-white/50">{store.lines.length} lines</span>
              <span className="glass px-3 py-1 rounded-full border border-white/10 text-white/50">{clipDuration.toFixed(1)}s clip</span>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={onNext}
            className="btn-primary w-full py-4 text-xl">
            Next: Edit Lyrics →
          </motion.button>
          <button onClick={() => setPhase('trim')} className="w-full text-center text-white/30 text-xs font-mono hover:text-white transition-colors py-2">
            ← Re-trim clip
          </button>
        </motion.div>
      )}
    </div>
  )
}
