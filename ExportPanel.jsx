import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore from './studioStore.js'
import { CanvasEngine } from './canvasEngine.js'
import { ExportEngine } from './exportEngine.js'

export default function ExportPanel({ onBack }) {
  const store = useStudioStore()
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exportUrl, setExportUrl] = useState(null)
  const [exportError, setExportError] = useState(null)
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const animRef = useRef(null)

  const getStyle = () => ({
    font: store.font, primaryColor: store.primaryColor,
    backgroundColor: store.backgroundColor, backgroundType: store.backgroundType,
    backgroundGradient: store.backgroundGradient, backgroundPattern: store.backgroundPattern,
    textEffect: store.textEffect, textSize: store.textSize,
    textAlign: store.textAlign, textPosition: store.textPosition,
    strokeColor: store.strokeColor, strokeWidth: store.strokeWidth,
    shadowColor: store.shadowColor, shadowBlur: store.shadowBlur
  })

  useEffect(() => {
    if (!canvasRef.current) return
    engineRef.current = new CanvasEngine(canvasRef.current, { width: 1280, height: 720 })
    return () => { if (engineRef.current) engineRef.current.destroy(); cancelAnimationFrame(animRef.current) }
  }, [])

  const startExport = async () => {
    if (!canvasRef.current || !store.audioUrl) return
    setIsExporting(true); setProgress(0); setExportUrl(null); setExportError(null)
    try {
      const startTime = Date.now()
      const render = () => {
        const elapsed = (Date.now() - startTime) / 1000
        if (engineRef.current) engineRef.current.renderFrame(elapsed, store.words, getStyle())
        animRef.current = requestAnimationFrame(render)
      }
      animRef.current = requestAnimationFrame(render)
      const exporter = new ExportEngine(canvasRef.current, store.audioUrl)
      const result = await exporter.exportAsWebM(setProgress, store.audioDuration)
      cancelAnimationFrame(animRef.current)
      setExportUrl(result.url); setIsExporting(false); setProgress(100)
    } catch (err) {
      cancelAnimationFrame(animRef.current); setExportError(err.message); setIsExporting(false)
    }
  }

  const download = () => {
    if (!exportUrl) return
    const a = document.createElement('a')
    a.href = exportUrl; a.download = `lyricvid-${Date.now()}.webm`; a.click()
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-2">EXPORT VIDEO</h2>
        <p className="text-white/50 text-sm">Your lyric video will be rendered and ready to download</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="glass rounded-xl p-6 border border-white/10 space-y-3">
        <h3 className="font-bebas text-xl tracking-wider text-white/80">VIDEO SUMMARY</h3>
        <div className="grid grid-cols-2 gap-3 text-sm font-mono">
          {[
            ['Duration', `${Math.floor(store.audioDuration / 60)}:${String(Math.floor(store.audioDuration % 60)).padStart(2, '0')}`],
            ['Words', store.words.length],
            ['Theme', store.theme],
            ['Effect', store.textEffect],
            ['Resolution', '1280 × 720 HD'],
            ['Format', 'WebM (VP9)']
          ].map(([label, value]) => (
            <div key={label} className="space-y-1">
              <p className="text-white/30 text-xs uppercase tracking-wider">{label}</p>
              <p className="text-white capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isExporting && !exportUrl && (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-xl p-4 border border-yellow-500/20 text-yellow-400/70 text-sm font-mono">
              ⚠️ Keep this tab open during export. Video plays in real-time to record it.
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={startExport} className="btn-primary w-full py-5 text-xl">
              🎬 Start Export
            </motion.button>
          </motion.div>
        )}

        {isExporting && (
          <motion.div key="exporting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl p-6 border border-brand-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-brand-500 rounded-full animate-pulse" />
              <span className="font-mono text-brand-400">Recording your video...</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <motion.div className="h-3 rounded-full bg-gradient-to-r from-brand-600 to-brand-400" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className="font-mono text-sm text-white/40">{Math.round(progress)}% — do not close this tab</p>
          </motion.div>
        )}

        {exportUrl && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-xl p-6 border border-green-500/30 text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h3 className="font-bebas text-3xl tracking-wider text-green-400">DONE!</h3>
            <p className="text-white/50 text-sm">Your lyric video is ready</p>
            <video src={exportUrl} controls className="w-full rounded-xl border border-white/10 mt-2" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={download} className="btn-primary w-full py-4 text-lg">
              ⬇️ Download WebM Video
            </motion.button>
            <button onClick={() => { setExportUrl(null); setProgress(0) }} className="btn-secondary w-full py-3 text-sm">Re-export</button>
          </motion.div>
        )}

        {exportError && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-5 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm space-y-2">
            <p><strong>Export failed:</strong> {exportError}</p>
            <button onClick={() => setExportError(null)} className="text-red-300 underline text-xs">Try again</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.03 }} onClick={onBack} className="btn-secondary py-3 px-8">← Back to Preview</motion.button>
    </div>
  )
}
