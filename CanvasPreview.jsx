import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import useStudioStore from './studioStore.js'
import { CanvasEngine } from './canvasEngine.js'

export default function CanvasPreview({ onNext, onBack }) {
  const store = useStudioStore()
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const audioRef = useRef(null)
  const animFrameRef = useRef(null)
  const bgVideoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const getStyle = () => ({
    font: store.font, primaryColor: store.primaryColor,
    backgroundColor: store.backgroundColor, backgroundType: store.backgroundType,
    backgroundVideo: store.backgroundVideo, backgroundGradient: store.backgroundGradient,
    backgroundPattern: store.backgroundPattern, backgroundImage: store.backgroundImage,
    imageOverlay: store.imageOverlay,
    textEffect: store.textEffect, textSize: store.textSize,
    textAlign: store.textAlign, textPosition: store.textPosition,
    strokeColor: store.strokeColor, strokeWidth: store.strokeWidth,
    shadowColor: store.shadowColor, shadowBlur: store.shadowBlur
  })

  useEffect(() => {
    if (!canvasRef.current) return
    engineRef.current = new CanvasEngine(canvasRef.current, { width: 1080, height: 1920 })
    if (store.backgroundImage) engineRef.current.setBackgroundImage(store.backgroundImage)
    return () => { if (engineRef.current) engineRef.current.destroy(); cancelAnimationFrame(animFrameRef.current) }
  }, [])

  useEffect(() => {
    if (!engineRef.current) return
    if (store.backgroundType === 'video' && store.backgroundVideo && bgVideoRef.current) {
      bgVideoRef.current.src = store.backgroundVideo
      bgVideoRef.current.loop = true
      bgVideoRef.current.muted = true
      engineRef.current.setBackgroundVideo(bgVideoRef.current)
    } else {
      engineRef.current.setBackgroundVideo(null)
    }
    if (store.backgroundType === 'image' && store.backgroundImage) {
      engineRef.current.setBackgroundImage(store.backgroundImage)
    } else {
      engineRef.current.setBackgroundImage(null)
    }
  }, [store.backgroundType, store.backgroundVideo, store.backgroundImage])

  useEffect(() => {
    const render = () => {
      const time = audioRef.current ? audioRef.current.currentTime : 0
      setCurrentTime(time)
      if (engineRef.current) engineRef.current.renderFrame(time, store.words, getStyle())
      animFrameRef.current = requestAnimationFrame(render)
    }
    animFrameRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [store.words, store.font, store.primaryColor, store.backgroundColor, store.backgroundType,
      store.backgroundPattern, store.backgroundGradient, store.backgroundImage, store.imageOverlay,
      store.textEffect, store.textSize, store.textAlign, store.textPosition,
      store.strokeColor, store.strokeWidth, store.shadowColor, store.shadowBlur])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); bgVideoRef.current?.pause(); setIsPlaying(false) }
    else { audio.play(); bgVideoRef.current?.play(); setIsPlaying(true) }
  }

  const progressPercent = store.audioDuration ? (currentTime / store.audioDuration) * 100 : 0
  const activeWord = store.words.find(w => currentTime >= w.start && currentTime < w.end)

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-2">PREVIEW</h2>
        <p className="text-white/50 text-sm">9:16 Reels format • 1080×1920</p>
      </div>

      <audio ref={audioRef} src={store.audioUrl} onEnded={() => setIsPlaying(false)} />
      <video ref={bgVideoRef} className="hidden" playsInline />

      {/* 9:16 portrait canvas */}
      <div className="flex justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl overflow-hidden glow-pink border border-brand-500/30"
          style={{ width: '100%', maxWidth: 360, aspectRatio: '9/16' }}>
          <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
          {activeWord && (
            <div className="absolute top-3 left-3 bg-black/60 rounded-lg px-3 py-1">
              <span className="font-mono text-xs text-brand-400">{activeWord.word}</span>
            </div>
          )}
          <div className="absolute bottom-3 right-3 bg-black/40 rounded-full px-2 py-0.5">
            <span className="font-mono text-xs text-white/40">9:16</span>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
        <div className="w-full h-2 bg-white/10 rounded-full cursor-pointer"
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const t = ((e.clientX - r.left) / r.width) * store.audioDuration; if (audioRef.current) audioRef.current.currentTime = t }}>
          <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-100" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-colors glow-pink">
            {isPlaying
              ? <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <div className="flex-1 flex items-center justify-between">
            <span className="font-mono text-sm text-white/60">{currentTime.toFixed(1)}s</span>
            <span className="font-mono text-sm text-white/30">{store.audioDuration.toFixed(1)}s</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[store.theme, store.font.split(' ')[0], store.textEffect].map(label => (
            <span key={label} className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-mono text-white/50 capitalize">{label}</span>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <motion.button whileHover={{ scale: 1.03 }} onClick={onBack} className="btn-secondary py-3 px-8">← Back</motion.button>
        <motion.button whileHover={{ scale: 1.03 }} onClick={onNext} className="btn-primary py-3 px-10">Export Reel →</motion.button>
      </div>
    </div>
  )
}
