import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

const features = [
  { icon: '🎤', title: 'AI Transcription', desc: 'Upload any audio and our AI instantly converts speech to perfectly synced lyrics using Whisper Large V3.' },
  { icon: '⚡', title: 'Word-by-Word Sync', desc: 'Every single word pops at exactly the right moment. Tight, cinematic, professional sync.' },
  { icon: '🎨', title: '12 Epic Themes', desc: 'Neon Noir, Cyberpunk, Vaporwave, Fire, Ice, Matrix and more. Each theme is a complete visual world.' },
  { icon: '✍️', title: '15+ Fonts', desc: 'Bebas Neue, Orbitron, Bangers, Permanent Marker — pick the typography that matches your vibe.' },
  { icon: '💥', title: '15 Text Effects', desc: 'Glitch, Neon Glow, Rainbow, Flame, Wave, Shimmer, Typewriter — make every word unforgettable.' },
  { icon: '📽️', title: 'HD Video Export', desc: 'Export your lyric video as 1280×720 WebM. Preview live before exporting. Zero quality loss.' }
]

const steps = [
  { num: '01', title: 'Upload Audio', desc: 'Drop your MP3, WAV, or M4A file.' },
  { num: '02', title: 'AI Transcribes', desc: 'Whisper AI reads every word and timestamps it.' },
  { num: '03', title: 'Style It', desc: 'Pick your theme, font, colors, effects and background.' },
  { num: '04', title: 'Preview & Export', desc: 'Watch it live. Export when it looks right.' }
]

const DEMO_WORDS = ['YOUR', 'LYRICS', 'COME', 'ALIVE']

export default function Home() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = 800; canvas.height = 200
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * 800, y: Math.random() * 200,
      vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 1
    }))
    const animate = () => {
      timeRef.current += 16
      const t = timeRef.current
      const word = DEMO_WORDS[Math.floor((t / 800) % DEMO_WORDS.length)]
      ctx.clearRect(0, 0, 800, 200)
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 800, 200)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > 800) p.vx *= -1
        if (p.y < 0 || p.y > 200) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = '#ff1fa044'; ctx.fill()
      })
      const scale = 1 + Math.sin(t * 0.006) * 0.06
      ctx.save(); ctx.translate(400, 100); ctx.scale(scale, scale)
      for (let i = 3; i > 0; i--) {
        ctx.shadowColor = '#ff1fa0'; ctx.shadowBlur = i * 20
        ctx.fillStyle = '#ff1fa0'
        ctx.font = "bold 64px 'Bebas Neue', cursive"
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(word, 0, 0)
      }
      ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillText(word, 0, 0)
      ctx.restore()
      animRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div className="pt-20">
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 glass border border-brand-500/30 rounded-full px-5 py-2 mb-8 text-sm text-brand-300 font-mono">
            <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
            AI-Powered • 100% Free • No Sign Up
          </motion.div>

          <h1 className="font-bebas text-7xl md:text-9xl tracking-wider mb-6 leading-none">
            <span className="gradient-text">LYRIC</span><br />
            <span className="text-white">VIDEOS</span><br />
            <span className="gradient-text glow-text">REBORN</span>
          </h1>

          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your audio. AI transcribes the lyrics. Pick your style. Get a stunning animated lyric video — in minutes, for free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/studio">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} className="btn-primary text-lg py-4 px-10">
                🎵 Create Your Video
              </motion.button>
            </Link>
            <a href="#how-it-works">
              <motion.button whileHover={{ scale: 1.03 }} className="btn-secondary text-lg py-4 px-10">See How It Works →</motion.button>
            </a>
          </div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="relative mx-auto rounded-2xl overflow-hidden glow-pink border border-brand-500/30" style={{ maxWidth: 800 }}>
            <canvas ref={canvasRef} className="w-full" style={{ display: 'block' }} />
            <div className="absolute bottom-3 right-4 text-white/30 text-xs font-mono">LIVE PREVIEW</div>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-bebas text-5xl md:text-7xl tracking-wider gradient-text mb-4">FEATURES</h2>
            <p className="text-white/50 text-lg">Everything you need to make jaw-dropping lyric videos</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }} className="glass rounded-2xl p-8 border border-white/5 hover:border-brand-500/30 transition-all duration-300">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bebas text-2xl tracking-wider text-white mb-3">{f.title}</h3>
                <p className="text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-bebas text-5xl md:text-7xl tracking-wider gradient-text mb-4">HOW IT WORKS</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="flex gap-6 glass rounded-2xl p-8 border border-white/5">
                <div className="font-bebas text-6xl gradient-text opacity-60 leading-none">{s.num}</div>
                <div>
                  <h3 className="font-bebas text-2xl tracking-wider text-white mb-2">{s.title}</h3>
                  <p className="text-white/50 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-4xl mx-auto glass rounded-3xl p-16 text-center border border-brand-500/20 glow-pink relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-purple-600/5 pointer-events-none" />
          <h2 className="font-bebas text-5xl md:text-7xl tracking-wider gradient-text mb-6 relative z-10">READY TO DROP?</h2>
          <p className="text-white/60 text-lg mb-10 relative z-10">Your next lyric video is one upload away. No account needed. Always free.</p>
          <Link to="/studio" className="relative z-10">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} className="btn-primary text-xl py-5 px-14">
              🚀 Start Creating Now
            </motion.button>
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
