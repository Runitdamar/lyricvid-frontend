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
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)

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
    setIsExporting(true); setProgress(0); setExportUrl(null); setExportError(null)

    try {
      const duration = store.audioDuration

      // Setup audio element for export
      const audio = audioRef.current
      audio.src = store.audioUrl
      await new Promise((res, rej) => {
        audio.oncanplaythrough = res
        audio.onerror = rej
        audio.load()
      })

      setStatusMsg('Setting up recording...')
      setProgress(5)

      // Start canvas render loop synced to audio time
      const render = () => {
        const t = audio.currentTime
        if (engineRef.current) {
          engineRef.current.renderFrame(t, store.lines, getStyle())
        }
        animRef.current = requestAnimationFrame(render)
      }

      // Capture canvas stream
      const canvasStream = canvasRef.current.captureStream(30)

      // Add audio stream
      const audioCtx = new AudioContext()
      const audioSrc = audioCtx.createMediaElementSource(audio)
      const dest = audioCtx.createMediaStreamDestination()
      audioSrc.connect(dest)
      audioSrc.connect(audioCtx.destination)
      dest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t))

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'

      const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 6000000 })
      const chunks = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setExportUrl(URL.createObjectURL(blob))
        setIsExporting(false)
        setProgress(100)
        setStatusMsg('')
        cancelAnimationFrame(animRef.current)
        audioCtx.close()
      }

      // Start everything together
      animRef.current = requestAnimationFrame(render)
      recorder.start(100)
      audio.currentTime = 0
      await audio.play()

      setStatusMsg('Recording...')

      // Track progress
      const interval = setInterval(() => {
        const t = audio.currentTime
        const pct = Math.min(95, (t / duration) * 100)
        setProgress(Math.round(pct))
        setStatusMsg(`Recording... ${t.toFixed(1)}s / ${duration.toFixed(1)}s`)

        // Stop when clip is done
        if (t >= duration - 0.1) {
          clearInterval(interval)
          audio.pause()
          recorder.stop()
        }
      }, 200)

      // Safety timeout
      setTimeout(() => {
        clearInterval(interval)
        if (recorder.state !== 'inactive') recorder.stop()
      }, (duration + 3) * 1000)

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
    a.download = `lyricvid-reel-${Date.now()}.webm`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">EXPORT REEL</h2>
        <p className="text-white/40 text-sm font-mono">1080×1920 • 9:16 • Ready for Reels & TikTok</p>
      </div>

      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <audio ref={audioRef} className="hidden" />

      {/* Summary */}
      <div className="glass rounded-xl p-5 border border-white/10">
        <h3 className="font-bebas text-xl tracking-wider text-white/70 mb-4">REEL SUMMARY</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Duration', `${store.audioDuration.toFixed(1)}s`],
            ['Lines', store.lines.length],
            ['Theme', store.theme],
            ['Transition', store.lineTransition],
            ['Effect', store.textEffect],
            ['Format', '9:16 WebM']
          ].map(([label, value]) => (
            <div key={label} className="glass rounded-lg p-3 border border-white/5">
              <p className="text-white/30 text-xs font-mono uppercase">{label}</p>
              <p className="text-white font-bebas text-lg capitalize mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isExporting && !exportUrl && (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-xl p-4 border border-yellow-500/20 text-yellow-400/60 text-sm font-mono space-y-1">
              <p>⚠️ Keep screen on during export</p>
              <p className="text-yellow-400/40 text-xs">Use Chrome for best results. Export takes {store.audioDuration.toFixed(0)}s in real time.</p>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={startExport}
              className="btn-primary w-full py-5 text-xl">
              🎬 Export Reel
            </motion.button>
          </motion.div>
        )}

        {isExporting && (
          <motion.div key="exporting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass rounded-xl p-6 border border-brand-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="font-mono text-red-400 text-sm">● REC</span>
              <span className="font-mono text-white/40 text-sm ml-auto">{statusMsg}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <motion.div className="h-3 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>
            <p className="font-mono text-xs text-white/30">Do not close this tab or lock your screen</p>
          </motion.div>
        )}

        {exportUrl && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-6 border border-green-500/30 space-y-4 text-center">
            <div className="text-5xl">🎉</div>
            <h3 className="font-bebas text-3xl tracking-wider text-green-400">YOUR REEL IS READY!</h3>
            <p className="text-white/40 text-sm">Download and post to Instagram Reels, TikTok or YouTube Shorts</p>
            <div className="flex justify-center">
              <video src={exportUrl} controls className="rounded-xl border border-white/10"
                style={{ maxHeight: 360, aspectRatio: '9/16', maxWidth: '100%' }} />
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={download}
              className="btn-primary w-full py-4 text-lg">
              ⬇️ Download Reel
            </motion.button>
            <button onClick={() => { setExportUrl(null); setProgress(0) }} className="btn-secondary w-full py-3 text-sm">
              Re-export
            </button>
          </motion.div>
        )}

        {exportError && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl p-5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm space-y-2">
            <p><strong>Export failed:</strong> {exportError}</p>
            <p className="text-red-300/50 text-xs">Make sure you're using Chrome and try again.</p>
            <button onClick={() => setExportError(null)} className="text-red-300 underline text-xs">Try again</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.03 }} onClick={onBack} className="btn-secondary py-3 px-8">← Back</motion.button>
    </div>
  )
}
