import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore from './studioStore.js'
import { CanvasEngine } from './canvasEngine.js'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://lyricvid-backend.onrender.com'
const FPS = 24

export default function ExportPanel({ onBack }) {
  const store = useStudioStore()
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exportUrl, setExportUrl] = useState(null)
  const [exportError, setExportError] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [eta, setEta] = useState(null)
  const [previewFrame, setPreviewFrame] = useState(null)
  const [cancelled, setCancelled] = useState(false)
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const cancelRef = useRef(false)
  const startTimeRef = useRef(null)

  const getStyle = () => ({
    font: store.font,
    primaryColor: store.primaryColor,
    backgroundColor: store.backgroundColor,
    backgroundType: store.backgroundType,
    backgroundGradient: store.backgroundGradient,
    backgroundPattern: store.backgroundPattern,
    backgroundImage: store.backgroundImage,
    imageOverlay: store.imageOverlay,
    textEffect: store.textEffect,
    textSize: store.textSize,
    textAlign: store.textAlign,
    textPosition: store.textPosition,
    strokeColor: store.strokeColor,
    strokeWidth: store.strokeWidth,
    shadowColor: store.shadowColor,
    shadowBlur: store.shadowBlur,
    lineTransition: store.lineTransition
  })

  useEffect(() => {
    if (!canvasRef.current) return
    engineRef.current = new CanvasEngine(canvasRef.current, { width: 1080, height: 1920 })
    if (store.backgroundImage) engineRef.current.setBackgroundImage(store.backgroundImage)
    return () => { if (engineRef.current) engineRef.current.destroy() }
  }, [])

  // ETA calculator
  const calcEta = (done, total) => {
    if (!startTimeRef.current || done === 0) return null
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    const rate = done / elapsed
    const remaining = (total - done) / rate
    if (remaining > 99) return null
    return Math.ceil(remaining)
  }

  const cancelExport = () => {
    cancelRef.current = true
    setCancelled(true)
    setIsExporting(false)
    setStatusMsg('')
    setEta(null)
    setPreviewFrame(null)
    setProgress(0)
  }

  const startExport = async () => {
    if (!canvasRef.current || !store.audioUrl) return
    cancelRef.current = false
    setCancelled(false)
    setIsExporting(true)
    setProgress(0)
    setExportUrl(null)
    setExportError(null)
    setEta(null)
    setPreviewFrame(null)
    startTimeRef.current = Date.now()

    try {
      const duration = store.audioDuration
      const totalFrames = Math.ceil(duration * FPS)
      const frames = []

      setStatusMsg('Rendering frames...')

      for (let i = 0; i < totalFrames; i++) {
        // Check cancel
        if (cancelRef.current) return

        const t = i / FPS
        engineRef.current.renderFrame(t, store.lines, getStyle())
        const frameData = canvasRef.current.toDataURL('image/jpeg', 0.85)
        frames.push(frameData)

        if (i % 10 === 0) {
          const pct = Math.round((i / totalFrames) * 60)
          setProgress(pct)
          setStatusMsg(`Rendering frame ${i + 1} / ${totalFrames}`)
          setPreviewFrame(frameData)
          setEta(calcEta(i, totalFrames))
          await new Promise(r => setTimeout(r, 0))
        }
      }

      if (cancelRef.current) return

      setPreviewFrame(null)
      setProgress(62)
      setStatusMsg('Preparing audio...')
      setEta(null)

      const audioResp = await fetch(store.audioUrl)
      const audioBlob = await audioResp.blob()
      const wavBase64 = await blobToBase64(audioBlob)
      const trimStart = store.trimStart || 0

      if (cancelRef.current) return

      setProgress(70)
      setStatusMsg('Uploading to server...')

      const jobId = `job_${Date.now()}`
      const CHUNK_SIZE = 30
      const totalChunks = Math.ceil(frames.length / CHUNK_SIZE)
      startTimeRef.current = Date.now()

      for (let i = 0; i < frames.length; i += CHUNK_SIZE) {
        if (cancelRef.current) return

        const chunk = frames.slice(i, i + CHUNK_SIZE)
        const chunkIndex = Math.floor(i / CHUNK_SIZE)

        const chunkResp = await fetch(`${BACKEND}/api/upload-chunk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, chunkIndex, totalChunks, frames: chunk })
        })

        if (!chunkResp.ok) {
          const errText = await chunkResp.text().catch(() => 'unknown')
          throw new Error(`Chunk ${chunkIndex} failed: ${errText}`)
        }

        const uploadPct = 70 + Math.round(((i + chunk.length) / frames.length) * 15)
        setProgress(uploadPct)
        setStatusMsg(`Uploading ${i + chunk.length} / ${frames.length} frames`)
        setEta(calcEta(chunkIndex + 1, totalChunks))
      }

      if (cancelRef.current) return

      setProgress(85)
      setStatusMsg('Server is rendering MP4...')
      setEta(null)

      const response = await fetch(`${BACKEND}/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, audio: wavBase64, fps: FPS, duration, trimStart })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Server error' }))
        throw new Error(err.error || 'Render failed')
      }

      setProgress(95)
      setStatusMsg('Almost done...')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      setExportUrl(url)
      setProgress(100)
      setStatusMsg('')
      setEta(null)
      setIsExporting(false)

    } catch (err) {
      if (cancelRef.current) return
      console.error('Export error:', err)
      setExportError(err.message)
      setIsExporting(false)
      setStatusMsg('')
      setEta(null)
    }
  }

  const download = () => {
    if (!exportUrl) return
    const a = document.createElement('a')
    a.href = exportUrl
    a.download = `lyricvid-${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">EXPORT REEL</h2>
        <p className="text-white/40 text-sm font-mono">1080×1920 • 9:16 • MP4 Video</p>
      </div>

      <canvas ref={canvasRef} style={{ position: 'fixed', top: '-9999px', left: '-9999px' }} width={1080} height={1920} />

      <div className="glass rounded-xl p-5 border border-white/10">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Duration', `${store.audioDuration.toFixed(1)}s`],
            ['Lines', store.lines.length],
            ['Theme', store.theme || 'custom'],
            ['Transition', store.lineTransition],
            ['Effect', store.textEffect],
            ['Format', '9:16 MP4']
          ].map(([label, value]) => (
            <div key={label} className="glass rounded-lg p-3 border border-white/5">
              <p className="text-white/25 text-xs font-mono uppercase">{label}</p>
              <p className="text-white font-bebas text-base capitalize mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isExporting && !exportUrl && (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {cancelled && (
              <div className="glass rounded-xl p-3 border border-yellow-500/20 text-yellow-400/60 text-xs font-mono text-center">
                Export cancelled — ready to start again
              </div>
            )}
            <div className="glass rounded-xl p-4 border border-yellow-500/15 text-yellow-400/50 text-xs font-mono space-y-1">
              <p>⚠️ Export renders all frames then sends to server</p>
              <p>⚠️ Takes ~1-2 min for a 60s clip — please wait</p>
              <p>⚠️ Keep this tab open the whole time</p>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={startExport}
              className="btn-primary w-full py-5 text-xl">
              🎬 Export as MP4
            </motion.button>
          </motion.div>
        )}

        {isExporting && (
          <motion.div key="exporting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Live preview frame */}
            <AnimatePresence>
              {previewFrame && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center"
                >
                  <div className="relative">
                    <img
                      src={previewFrame}
                      alt="preview"
                      className="rounded-2xl border border-white/10"
                      style={{ maxHeight: 260, aspectRatio: '9/16', maxWidth: '100%', objectFit: 'cover' }}
                    />
                    <div className="absolute top-2 left-2 bg-red-500/80 text-white text-xs font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            <div className="glass rounded-xl p-6 border border-red-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono text-red-400 text-sm font-bold">● RENDERING</span>
                {eta && (
                  <span className="font-mono text-brand-400 text-xs ml-auto">
                    ~{eta}s left
                  </span>
                )}
              </div>

              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-3 rounded-full bg-gradient-to-r from-red-600 to-brand-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-white/30">{statusMsg}</p>
                <p className="font-mono text-xs text-white/20">{progress}%</p>
              </div>

              {/* Cancel button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={cancelExport}
                className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400/60 text-xs font-mono hover:border-red-500/60 hover:text-red-400 transition-all"
              >
                ✕ Cancel Export
              </motion.button>
            </div>
          </motion.div>
        )}

        {exportUrl && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="glass rounded-xl p-5 border border-green-500/30 text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <h3 className="font-bebas text-3xl tracking-wider text-green-400">MP4 IS READY!</h3>
              <p className="text-white/30 text-sm">Download and post to Instagram, TikTok or YouTube Shorts</p>
            </div>
            <div className="flex justify-center">
              <video src={exportUrl} controls playsInline
                className="rounded-2xl border border-white/10 glow-pink"
                style={{ maxHeight: 400, aspectRatio: '9/16', maxWidth: '100%' }} />
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={download}
              className="btn-primary w-full py-4 text-lg">
              ⬇️ Download MP4
            </motion.button>
            <button onClick={() => { setExportUrl(null); setProgress(0); setCancelled(false) }}
              className="btn-secondary w-full py-3 text-sm">Re-export</button>
          </motion.div>
        )}

        {exportError && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl p-5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm space-y-3">
            <p><strong>Export failed:</strong> {exportError}</p>
            <p className="text-red-300/40 text-xs">Check your connection and try again.</p>
            <div className="flex gap-3">
              <button onClick={() => { setExportError(null); startExport() }}
                className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs font-mono hover:bg-red-500/30 transition-all">
                🔄 Retry
              </button>
              <button onClick={() => setExportError(null)}
                className="flex-1 py-2 rounded-lg border border-red-500/20 text-red-400/60 text-xs font-mono">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.03 }} onClick={onBack} className="btn-secondary py-3 px-8">← Back</motion.button>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function bufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataLength = buffer.length * blockAlign
  const arrayBuffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(arrayBuffer)
  const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)) }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)
  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' })
            }
