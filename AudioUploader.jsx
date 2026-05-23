import { useCallback, useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore from './studioStore.js'

const ASSEMBLYAI_KEY = '39846581378e4e1c9fea52cde0a192d2'
const BASE_URL = 'https://api.assemblyai.com'

async function transcribeWithAssemblyAI(file, startTime, endTime, onStatus) {
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
  const body = {
    audio_url: upload_url,
    speech_models: ['universal-2'],
    language_code: 'en_us'
  }
  // Pass clip times if trimmed
  if (startTime > 0 || endTime) {
    body.audio_start_from = Math.floor(startTime * 1000)
    body.audio_end_at = Math.floor(endTime * 1000)
  }

  const transcriptRes = await fetch(`${BASE_URL}/v2/transcript`, {
    method: 'POST', headers, body: JSON.stringify(body)
  })
  if (!transcriptRes.ok) {
    const err = await transcriptRes.text()
    throw new Error(`Transcription start failed: ${transcriptRes.status} - ${err}`)
  }
  const { id } = await transcriptRes.json()

  onStatus('AI is transcribing...')
  let attempts = 0
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`${BASE_URL}/v2/transcript/${id}`, { headers })
    if (!pollRes.ok) throw new Error('Failed to check status')
    const result = await pollRes.json()
    if (result.status === 'completed') {
      if (!result.text?.trim()) throw new Error('No speech detected')
      const words = result.words?.length > 0
        ? result.words.map(w => ({ word: w.text, start: w.start / 1000, end: w.end / 1000 }))
        : result.text.trim().split(/\s+/).map((word, i, arr) => ({
            word,
            start: parseFloat((startTime + i * ((endTime - startTime) / arr.length)).toFixed(2)),
            end: parseFloat((startTime + (i + 1) * ((endTime - startTime) / arr.length)).toFixed(2))
          }))
      return { fullText: result.text.trim(), words }
    }
    if (result.status === 'error') throw new Error(`Failed: ${result.error}`)
    onStatus(`Transcribing... ${attempts % 3 === 0 ? '⠋' : attempts % 3 === 1 ? '⠙' : '⠹'}`)
    attempts++
  }
  throw new Error('Timed out. Please try again.')
}

export default function AudioUploader({ onNext }) {
  const { audioUrl, isTranscribing, transcriptionError, setAudioFile, setTranscript, setWords, setIsTranscribing, setTranscriptionError } = useStudioStore()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedName, setUploadedName] = useState('')
  const [audioDuration, setAudioDuration] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [showTrimmer, setShowTrimmer] = useState(false)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(40)
  const [localAudioUrl, setLocalAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)
  const audioRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const update = () => setPreviewTime(audio.currentTime)
    const ended = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', update)
    audio.addEventListener('ended', ended)
    return () => { audio.removeEventListener('timeupdate', update); audio.removeEventListener('ended', ended) }
  }, [localAudioUrl])

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return
    fileRef.current = file
    const url = URL.createObjectURL(file)
    setLocalAudioUrl(url)
    setUploadedName(file.name)
    setTranscriptionError(null)

    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      const dur = audio.duration
      setAudioDuration(dur)
      setTrimStart(0)
      setTrimEnd(Math.min(40, dur))
      setAudioFile(file, url, Math.min(40, dur))
      setShowTrimmer(true)
    }
  }, [])

  const togglePreview = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.currentTime = trimStart; audio.play(); setIsPlaying(true) }
  }

  const startTranscription = async () => {
    const file = fileRef.current
    if (!file) return
    setShowTrimmer(false)
    setIsTranscribing(true)
    setUploadProgress(20)
    const clipDuration = trimEnd - trimStart
    setAudioFile(file, localAudioUrl, clipDuration)
    try {
      const result = await transcribeWithAssemblyAI(file, trimStart, trimEnd, (msg) => {
        setStatusMsg(msg)
        setUploadProgress(prev => Math.min(prev + 10, 90))
      })
      // Normalize word timings to start from 0
      const normalizedWords = result.words.map(w => ({
        ...w,
        start: parseFloat((w.start - trimStart).toFixed(2)),
        end: parseFloat((w.end - trimStart).toFixed(2))
      }))
      setUploadProgress(100)
      setTranscript(result.fullText)
      setWords(normalizedWords)
      setIsTranscribing(false)
      setStatusMsg('')
    } catch (err) {
      setTranscriptionError(err.message)
      setIsTranscribing(false)
      setUploadProgress(0)
      setStatusMsg('')
      setShowTrimmer(true)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac'] },
    maxSize: 50 * 1024 * 1024, multiple: false
  })

  const clipDuration = trimEnd - trimStart
  const progressPercent = audioDuration ? (previewTime / audioDuration) * 100 : 0
  const trimStartPercent = audioDuration ? (trimStart / audioDuration) * 100 : 0
  const trimEndPercent = audioDuration ? (trimEnd / audioDuration) * 100 : 100

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-2">UPLOAD AUDIO</h2>
        <p className="text-white/50 text-sm">MP3, WAV, M4A — up to 50MB • Max 40 sec clip</p>
      </div>

      {/* Dropzone */}
      {!showTrimmer && !isTranscribing && (
        <motion.div {...getRootProps()} whileHover={{ scale: 1.01 }}
          className={`relative rounded-2xl border-2 border-dashed p-14 text-center cursor-pointer transition-all duration-300 ${
            isDragActive ? 'border-brand-400 bg-brand-500/10'
            : localAudioUrl ? 'border-green-500/50 bg-green-500/5'
            : 'border-white/20 hover:border-brand-500/50'}`}>
          <input {...getInputProps()} />
          <div className="text-5xl mb-4">🎤</div>
          <p className="font-bebas text-2xl tracking-wider text-white mb-2">DROP YOUR AUDIO</p>
          <p className="text-white/40 text-sm">or tap to browse files</p>
          <p className="text-white/20 font-mono text-xs mt-3">MP3 • WAV • M4A • OGG • FLAC</p>
        </motion.div>
      )}

      {/* Clip Trimmer */}
      <AnimatePresence>
        {showTrimmer && !isTranscribing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass rounded-2xl p-6 border border-brand-500/30 space-y-5">

            <div className="flex items-center justify-between">
              <h3 className="font-bebas text-2xl tracking-wider gradient-text">TRIM YOUR CLIP</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-mono border ${clipDuration <= 40 ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}`}>
                {clipDuration.toFixed(1)}s {clipDuration <= 40 ? '✓' : '— too long!'}
              </div>
            </div>

            <p className="text-white/40 text-xs font-mono">Select a 30-40 second clip for best results</p>

            {/* Audio preview player */}
            <audio ref={audioRef} src={localAudioUrl} />
            <div className="space-y-2">
              <div className="relative h-12 bg-white/5 rounded-xl overflow-hidden cursor-pointer"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const ratio = (e.clientX - rect.left) / rect.width
                  const newTime = ratio * audioDuration
                  if (audioRef.current) audioRef.current.currentTime = newTime
                }}>
                {/* Dimmed areas outside trim */}
                <div className="absolute inset-y-0 left-0 bg-black/60 z-10" style={{ width: `${trimStartPercent}%` }} />
                <div className="absolute inset-y-0 right-0 bg-black/60 z-10" style={{ width: `${100 - trimEndPercent}%` }} />
                {/* Selected region */}
                <div className="absolute inset-y-0 bg-brand-500/20 border-x-2 border-brand-400 z-20"
                  style={{ left: `${trimStartPercent}%`, width: `${trimEndPercent - trimStartPercent}%` }} />
                {/* Playhead */}
                <div className="absolute inset-y-0 w-0.5 bg-white z-30 transition-all duration-100"
                  style={{ left: `${progressPercent}%` }} />
                {/* Waveform bars */}
                <div className="absolute inset-0 flex items-center gap-px px-1">
                  {Array.from({ length: 80 }).map((_, i) => (
                    <div key={i} className="flex-1 bg-white/20 rounded-full"
                      style={{ height: `${20 + Math.sin(i * 0.5) * 15 + Math.cos(i * 0.3) * 10}%` }} />
                  ))}
                </div>
              </div>

              {/* Play button + time */}
              <div className="flex items-center gap-3">
                <button onClick={togglePreview}
                  className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-colors flex-shrink-0">
                  {isPlaying
                    ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    : <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  }
                </button>
                <span className="font-mono text-xs text-white/40">
                  {previewTime.toFixed(1)}s / {audioDuration.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Trim sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Start</label>
                  <span className="text-xs font-mono text-brand-400">{trimStart.toFixed(1)}s</span>
                </div>
                <input type="range" min={0} max={Math.max(0, audioDuration - 5)} step={0.1}
                  value={trimStart}
                  onChange={e => {
                    const val = parseFloat(e.target.value)
                    setTrimStart(val)
                    if (trimEnd - val < 5) setTrimEnd(Math.min(val + 5, audioDuration))
                    if (trimEnd - val > 40) setTrimEnd(val + 40)
                  }}
                  className="w-full accent-brand-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-mono text-white/40 uppercase tracking-wider">End</label>
                  <span className="text-xs font-mono text-brand-400">{trimEnd.toFixed(1)}s</span>
                </div>
                <input type="range" min={Math.min(trimStart + 5, audioDuration)} max={audioDuration} step={0.1}
                  value={trimEnd}
                  onChange={e => {
                    const val = parseFloat(e.target.value)
                    setTrimEnd(val)
                    if (val - trimStart > 40) setTrimStart(val - 40)
                  }}
                  className="w-full accent-brand-500" />
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2">
              {[15, 30, 40].map(sec => (
                <button key={sec} onClick={() => { setTrimStart(0); setTrimEnd(Math.min(sec, audioDuration)) }}
                  className={`flex-1 py-2 rounded-lg text-xs font-mono transition-all border ${
                    Math.round(clipDuration) === sec ? 'bg-brand-500 border-brand-400 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:border-brand-400'
                  }`}>
                  {sec}s
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowTrimmer(false); setLocalAudioUrl(null); fileRef.current = null }}
                className="btn-secondary flex-1 py-3 text-sm">← Re-upload</button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={startTranscription}
                disabled={clipDuration > 40}
                className={`flex-1 py-3 text-sm rounded-full font-bold transition-all ${clipDuration <= 40 ? 'btn-primary' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>
                Transcribe Clip ✨
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcribing progress */}
      <AnimatePresence>
        {isTranscribing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass rounded-xl p-6 border border-brand-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/70 flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
                {statusMsg || 'Connecting to AssemblyAI...'}
              </span>
              <span className="font-mono text-sm text-brand-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className="text-white/30 text-xs font-mono mt-3">Usually 10-20 seconds for short clips...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {transcriptionError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-xl p-5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <strong>Error:</strong> {transcriptionError}
            <br /><span className="text-red-300/60 text-xs mt-1 block">Try again or choose a different clip.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button */}
      <AnimatePresence>
        {!showTrimmer && !isTranscribing && !transcriptionError && localAudioUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center pt-2">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={onNext}
              className="btn-primary text-lg py-4 px-12">
              Next: Edit Lyrics →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
