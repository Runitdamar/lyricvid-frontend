import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AudioUploader from './AudioUploader.jsx'
import LyricsEditor from './LyricsEditor.jsx'
import StyleSidebar from './StyleSidebar.jsx'
import CanvasPreview from './CanvasPreview.jsx'
import ExportPanel from './ExportPanel.jsx'
import useStudioStore from './studioStore.js'
import { CanvasEngine } from './canvasEngine.js'

const STEPS = [
  { id: 1, label: 'Upload', icon: '🎤' },
  { id: 2, label: 'Lyrics', icon: '✍️' },
  { id: 3, label: 'Style', icon: '🎨' },
  { id: 4, label: 'Preview', icon: '▶️' },
  { id: 5, label: 'Export', icon: '📽️' }
]

export default function Studio() {
  const [step, setStep] = useState(1)

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="font-bebas text-5xl md:text-7xl tracking-wider gradient-text mb-2">STUDIO</h1>
          <p className="text-white/40 text-sm">Create your lyric video in minutes</p>
        </motion.div>

        <div className="flex items-center justify-center mb-10 overflow-x-auto pb-2">
          <div className="flex items-center gap-0 min-w-max">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <motion.button whileHover={step > s.id ? { scale: 1.05 } : {}}
                  onClick={() => step > s.id && setStep(s.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${step === s.id ? 'opacity-100' : step > s.id ? 'opacity-70 cursor-pointer hover:opacity-100' : 'opacity-30 cursor-not-allowed'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${step === s.id ? 'bg-brand-500 glow-pink' : step > s.id ? 'bg-green-600' : 'bg-white/10'}`}>
                    {step > s.id ? '✓' : s.icon}
                  </div>
                  <span className={`text-xs font-mono uppercase tracking-wider ${step === s.id ? 'text-brand-400' : 'text-white/40'}`}>{s.label}</span>
                </motion.button>
                {i < STEPS.length - 1 && <div className={`w-8 md:w-12 h-px mx-1 transition-colors ${step > s.id ? 'bg-green-600' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {(step === 1 || step === 2 || step === 5) && (
            <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
              className="max-w-2xl mx-auto glass rounded-2xl p-8 border border-white/10">
              {step === 1 && <AudioUploader onNext={() => setStep(2)} />}
              {step === 2 && <LyricsEditor onNext={() => setStep(3)} onBack={() => setStep(1)} />}
              {step === 5 && <ExportPanel onBack={() => setStep(4)} />}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step-3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
              className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-2 h-auto xl:h-[700px]"><StyleSidebar /></div>
              <div className="xl:col-span-3 flex flex-col gap-4">
                <LiveStylePreview />
                <div className="flex justify-between">
                  <motion.button whileHover={{ scale: 1.03 }} onClick={() => setStep(2)} className="btn-secondary py-3 px-8">← Back</motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} onClick={() => setStep(4)} className="btn-primary py-3 px-10">Preview →</motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step-4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }} className="max-w-4xl mx-auto">
              <CanvasPreview onNext={() => setStep(5)} onBack={() => setStep(3)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function LiveStylePreview() {
  const store = useStudioStore()
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  useEffect(() => {
    if (!canvasRef.current) return
    engineRef.current = new CanvasEngine(canvasRef.current, { width: 1280, height: 720 })
    const animate = () => {
      timeRef.current += 16
      const word = store.words.length > 0
        ? store.words[Math.floor((timeRef.current / 1500) % store.words.length)]?.word || 'PREVIEW'
        : 'PREVIEW'
      const style = {
        font: store.font, primaryColor: store.primaryColor,
        backgroundColor: store.backgroundColor, backgroundType: store.backgroundType,
        backgroundGradient: store.backgroundGradient, backgroundPattern: store.backgroundPattern,
        textEffect: store.textEffect, textSize: store.textSize,
        textAlign: store.textAlign, textPosition: store.textPosition,
        strokeColor: store.strokeColor, strokeWidth: store.strokeWidth,
        shadowColor: store.shadowColor, shadowBlur: store.shadowBlur
      }
      if (engineRef.current) {
        engineRef.current.drawBackground(style, timeRef.current)
        engineRef.current.drawText(word, style, timeRef.current)
      }
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(animRef.current); if (engineRef.current) engineRef.current.destroy() }
  }, [store.font, store.primaryColor, store.backgroundColor, store.backgroundType,
      store.backgroundPattern, store.backgroundGradient, store.textEffect, store.textSize,
      store.textAlign, store.textPosition, store.strokeColor, store.strokeWidth,
      store.shadowColor, store.shadowBlur, store.words])

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/10 glow-pink">
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
        <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Live Preview</span>
      </div>
      <canvas ref={canvasRef} className="w-full" style={{ aspectRatio: '16/9', display: 'block' }} />
    </div>
  )
}
