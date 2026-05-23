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
    backgroundImage: store.backgroundImage, imageOverlay: store.imageOverlay,
    textEffect: store.textEffect, textSize: store.textSize,
    textAlign: store.textAlign, textPosition: store.textPosition,
    strokeColor: store.strokeColor, strokeWidth: store.strokeWidth,
    shadowColor: store.shadowColor, shadowBlur: store.shadowBlur
  })

  useEffect(() => {
    if (!canvasRef.current) return
    engineRef.current = new CanvasEngine(canvasRef.current, { width: 1080, height: 1920 })
    if (store.backgroundImage) engineRef.current.setBackgroundImage(store.backgroundImage)
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
    a.href = exportUrl; a.download = `lyricvid-reel-${Date.now()}.webm`; a.click()
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-2">EXPORT REEL</h2>
        <p className="text-white/50 text-sm">1080×1920 • 9:16 Portrait • Ready for Reels & TikTok</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Summary */}
      <div className="glass rounded-xl p-5 border border-white/10">
        <h3 className="font-bebas text-xl tracking-wider text-white/80 mb-4">REEL SUMMARY</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Duration', `${store.audioDuration.toFixed(1)}s`],
            ['Words', store.words.length],
            ['Theme', store.theme],
            ['Effect', store.textEffect],
            ['Resolution', '1080×1920'],
            ['Format', '9:16 Reel']
          ].map(([label, value]) => (
            <div key={label} className="glass rounded-lg p-3 border border-white/5">
              <p className="text-white/30 text-xs font-mono uppercase tracking-wider">{label}</p>
              <p className="text-white font-bebas text-lg capitalize mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isExporting && !exportUrl && (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-xl p-4 border border-yellow-500/20 text-yellow-400/70 text-sm font-mono">
              ⚠️ Keep this tab open and screen on during export.
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
              <div className="w-3 h-3 bg-brand-500 rounded-full animate-pulse" />
              <span className="font-mono text-brand-400">Recording your reel...</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <motion.div className="h-3 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className="font-mono text-sm text-white/40">{Math.round(progress)}% — do not close this tab</p>
          </motion.div>
        )}

        {exportUrl && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-6 border border-green-500/30 space-y-4 text-center">
            <div className="text-6xl">🎉</div>
            <h3 className="font-bebas text-3xl tracking-wider text-green-400">YOUR REEL IS READY!</h3>
            <p className="text-white/50 text-sm">Download and post to Instagram Reels, TikTok or YouTube Shorts</p>
            <div className="flex justify-center">
              <video src={exportUrl} controls className="rounded-xl border border-white/10"
                style={{ maxHeight: 400, aspectRatio: '9/16' }} />
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={download}
              className="btn-primary w-full py-4 text-lg">
              ⬇️ Download Reel (WebM)
            </motion.button>
            <button onClick={() => { setExportUrl(null); setProgress(0) }} className="btn-secondary w-full py-3 text-sm">
              Re-export
            </button>
          </motion.div>
        )}

        {exportError && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl p-5 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm space-y-2">
            <p><strong>Export failed:</strong> {exportError}</p>
            <button onClick={() => setExportError(null)} className="text-red-300 underline text-xs">Try again</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.03 }} onClick={onBack} className="btn-secondary py-3 px-8">← Back to Preview</motion.button>
    </div>
  )
}
