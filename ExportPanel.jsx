import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore from './studioStore.js'
import { CanvasEngine } from './canvasEngine.js'

export default function ExportPanel({ onBack }) {
  const store = useStudioStore()
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exportUrl, setExportUrl] = useState(null)
  const [exportError, setExportError] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [exportFormat, setExportFormat] = useState('webm')
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const animRef = useRef(null)

  const getStyle = () => ({
    font: store.font, primaryColor: store.primaryColor,
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
    return () => {
      if (engineRef.current) engineRef.current.destroy()
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  const startExport = async () => {
    if (!canvasRef.current || !store.audioUrl) return
    setIsExporting(true); setProgress(2); setExportUrl(null); setExportError(null)

    try {
      const duration = store.audioDuration
      setStatusMsg('Loading audio...')

      // Create fresh audio element for export
      const audio = new Audio()
      audio.src = store.audioUrl
      audio.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        audio.oncanplaythrough = resolve
        audio.onerror = reject
        audio.load()
      })

      setStatusMsg('Setting up recording...')
      setProgress(8)

      // Canvas render loop
      const startTime = { value: null }
      const render = (timestamp) => {
        if (startTime.value === null) startTime.value = timestamp
        const elapsed = (timestamp - startTime.value) / 1000
        const t = Math.min(elapsed, duration)
        if (engineRef.current) engineRef.current.renderFrame(t, store.lines, getStyle())
        if (elapsed < duration + 0.5) {
          animRef.current = requestAnimationFrame(render)
        }
      }

      // Capture canvas at 30fps
      const canvasStream = canvasRef.current.captureStream(30)

      // Capture audio using Web Audio API
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtx.createMediaElementSource(audio)
      const dest = audioCtx.createMediaStreamDestination()
      source.connect(dest)
      // Don't connect to speakers during export to avoid echo
      dest.stream.getAudioTracks().forEach(track => canvasStream.addTrack(track))

      // Pick best supported format
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm'

      const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 5000000 })
      const chunks = []

      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = async () => {
        cancelAnimationFrame(animRef.current)
        audioCtx.close()

        setStatusMsg('Finalizing...')
        setProgress(95)

        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setExportUrl(url)
        setIsExporting(false)
        setProgress(100)
        setStatusMsg('')
      }

      // Start render, recorder, and audio together
      animRef.current = requestAnimationFrame(render)
      recorder.start(100)
      audio.currentTime = 0
      await audio.play()

      setProgress(10)
      setStatusMsg('Recording...')

      // Progress + stop tracking
      const interval = setInterval(() => {
        const t = audio.currentTime
        const pct = Math.min(92, 10 + (t / duration) * 82)
        setProgress(Math.round(pct))
        setStatusMsg(`Recording ${t.toFixed(1)}s / ${duration.toFixed(1)}s`)

        if (t >= duration - 0.05) {
          clearInterval(interval)
          audio.pause()
          setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop()
          }, 500)
        }
      }, 250)

      // Safety stop
      setTimeout(() => {
        clearInterval(interval)
        audio.pause()
        if (recorder.state !== 'inactive') recorder.stop()
      }, (duration + 4) * 1000)

    } catch (err) {
      console.error('Export error:', err)
      cancelAnimationFrame(animRef.current)
      setExportError(err.message)
      setIsExporting(false)
      setStatusMsg('')
    }
  }

  const download = () => {
    if (!exportUrl) return
    const a = document.createElement('a')
    a.href = exportUrl
    a.download = `lyricvid-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">EXPORT REEL</h2>
        <p className="text-white/40 text-sm font-mono">1080×1920 • 9:16 • WebM Video</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Summary */}
      <div className="glass rounded-xl p-5 border border-white/10">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Duration', `${store.audioDuration.toFixed(1)}s`],
            ['Lines', store.lines.length],
            ['Theme', store.theme || 'custom'],
            ['Transition', store.lineTransition],
            ['Effect', store.textEffect],
            ['Format', '9:16 WebM']
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
            <div className="glass rounded-xl p-4 border border-yellow-500/15 text-yellow-400/50 text-xs font-mono space-y-1">
              <p>⚠️ Use Chrome browser for best results</p>
              <p>⚠️ Keep screen on — export takes {store.audioDuration.toFixed(0)}s in real time</p>
              <p>⚠️ Do not switch tabs during export</p>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={startExport}
              className="btn-primary w-full py-5 text-xl">
              🎬 Start Export
            </motion.button>
          </motion.div>
        )}

        {isExporting && (
          <motion.div key="exporting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass rounded-xl p-6 border border-red-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="font-mono text-red-400 text-sm font-bold">● REC</span>
              <span className="font-mono text-white/30 text-xs ml-auto">{statusMsg}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <motion.div className="h-3 rounded-full bg-gradient-to-r from-red-600 to-brand-400"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>
            <p className="font-mono text-xs text-white/20 text-center">{progress}% — do not close or switch tabs</p>
          </motion.div>
        )}

        {exportUrl && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="space-y-4">
            <div className="glass rounded-xl p-5 border border-green-500/30 text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <h3 className="font-bebas text-3xl tracking-wider text-green-400">REEL IS READY!</h3>
              <p className="text-white/30 text-sm">Download and post to Instagram, TikTok or YouTube Shorts</p>
            </div>

            <div className="flex justify-center">
              <video src={exportUrl} controls playsInline
                className="rounded-2xl border border-white/10 glow-pink"
                style={{ maxHeight: 400, aspectRatio: '9/16', maxWidth: '100%' }} />
            </div>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={download}
              className="btn-primary w-full py-4 text-lg">
              ⬇️ Download Reel (.webm)
            </motion.button>

            <div className="glass rounded-xl p-4 border border-white/5 text-xs font-mono text-white/30 space-y-1">
              <p>💡 To convert to MP4: open VLC or use <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" className="text-brand-400 underline">cloudconvert.com</a> (free)</p>
              <p>💡 WebM plays natively in Chrome and Android</p>
            </div>

            <button onClick={() => { setExportUrl(null); setProgress(0) }} className="btn-secondary w-full py-3 text-sm">Re-export</button>
          </motion.div>
        )}

        {exportError && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl p-5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm space-y-2">
            <p><strong>Export failed:</strong> {exportError}</p>
            <p className="text-red-300/40 text-xs">Make sure you're using Chrome and try again.</p>
            <button onClick={() => setExportError(null)} className="text-red-300 underline text-xs">Try again</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.03 }} onClick={onBack} className="btn-secondary py-3 px-8">← Back</motion.button>
    </div>
  )
}
