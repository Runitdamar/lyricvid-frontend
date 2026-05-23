import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore from './studioStore.js'

const HF_TOKEN = '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'
const HF_URL = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3'

async function transcribeWithWhisper(file, onStatus) {
  onStatus('Sending to Whisper AI...')
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = new Uint8Array(arrayBuffer)
  let attempts = 0
  while (attempts < 5) {
    const response = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': file.type || 'audio/mpeg',
        'X-Wait-For-Model': 'true'
      },
      body: audioBuffer
    })
    if (response.status === 503) {
      const data = await response.json()
      const wait = Math.ceil(data.estimated_time || 20)
      onStatus(`Model loading... waiting ${wait}s`)
      await new Promise(r => setTimeout(r, wait * 1000))
      attempts++; continue
    }
    if (!response.ok) { const err = await response.text(); throw new Error(`Whisper error: ${response.status} - ${err}`) }
    const result = await response.json()
    const text = result.text || (typeof result === 'string' ? result : '')
    if (!text.trim()) throw new Error('No speech detected in audio')
    const words = text.trim().split(/\s+/)
    const duration = words.length * 0.45
    return {
      fullText: text.trim(),
      words: result.chunks && result.chunks.length > 0
        ? result.chunks.map(c => ({ word: c.text.trim(), start: c.timestamp[0] || 0, end: c.timestamp[1] || 0 })).filter(w => w.word.length > 0)
        : words.map((word, i) => ({ word, start: parseFloat((i * (duration / words.length)).toFixed(2)), end: parseFloat(((i + 1) * (duration / words.length)).toFixed(2)) }))
    }
  }
  throw new Error('Model took too long. Please try again.')
}

export default function AudioUploader({ onNext }) {
  const { audioUrl, isTranscribing, transcriptionError, setAudioFile, setTranscript, setWords, setIsTranscribing, setTranscriptionError } = useStudioStore()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedName, setUploadedName] = useState('')
  const [audioDur, setAudioDur] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return
    setUploadedName(file.name); setTranscriptionError(null); setStatusMsg('')
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.onloadedmetadata = () => { setAudioDur(audio.duration); setAudioFile(file, url, audio.duration) }
    setIsTranscribing(true); setUploadProgress(20)
    try {
      setUploadProgress(40)
      const result = await transcribeWithWhisper(file, setStatusMsg)
      setUploadProgress(100); setTranscript(result.fullText); setWords(result.words); setIsTranscribing(false); setStatusMsg('')
    } catch (err) { setTranscriptionError(err.message); setIsTranscribing(false); setUploadProgress(0); setStatusMsg('') }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac'] }, maxSize: 25 * 1024 * 1024, multiple: false })

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-2">UPLOAD AUDIO</h2>
        <p className="text-white/50 text-sm">MP3, WAV, M4A, OGG — up to 25MB</p>
      </div>
      <motion.div {...getRootProps()} whileHover={{ scale: 1.01 }}
        className={`relative rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'border-brand-400 bg-brand-500/10' : audioUrl ? 'border-green-500/50 bg-green-500/5' : 'border-white/20 hover:border-brand-500/50'}`}>
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {isDragActive ? (
            <motion.div key="drag" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="text-6xl mb-4">🎵</div><p className="font-bebas text-2xl tracking-wider text-brand-400">DROP IT!</p></motion.div>
          ) : audioUrl ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-6xl mb-4">✅</div>
              <p className="font-bebas text-2xl tracking-wider text-green-400 mb-2">UPLOADED!</p>
              <p className="text-white/50 text-sm font-mono">{uploadedName}</p>
              <p className="text-white/30 text-xs font-mono mt-1">{audioDur ? `${Math.floor(audioDur / 60)}:${String(Math.floor(audioDur % 60)).padStart(2, '0')}` : ''}</p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-6xl mb-4">🎤</div>
              <p className="font-bebas text-3xl tracking-wider text-white mb-3">DROP YOUR AUDIO</p>
              <p className="text-white/40 text-sm">or tap to browse files</p>
              <p className="text-white/20 font-mono text-xs mt-4">MP3 • WAV • M4A • OGG • FLAC</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {isTranscribing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass rounded-xl p-6 border border-brand-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/70 flex items-center gap-2"><span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />{statusMsg || 'Transcribing with Whisper AI...'}</span>
              <span className="font-mono text-sm text-brand-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400" animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className="text-white/30 text-xs font-mono mt-3">First use may take 20-40 seconds while model loads...</p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {transcriptionError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl p-5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <strong>Error:</strong> {transcriptionError}<br />
            <span className="text-red-300/60 text-xs mt-1 block">Try again — model may still be loading.</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {audioUrl && !isTranscribing && !transcriptionError && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center pt-4">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={onNext} className="btn-primary text-lg py-4 px-12">Next: Edit Lyrics →</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
