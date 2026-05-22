import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Navbar() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center glow-pink">
            <span className="text-white font-bebas text-lg">L</span>
          </div>
          <span className="font-bebas text-2xl tracking-wider gradient-text">LYRICVID</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className={`text-sm font-semibold tracking-widest uppercase transition-colors ${location.pathname === '/' ? 'text-brand-400' : 'text-white/60 hover:text-white'}`}>Home</Link>
          <Link to="/studio" className={`text-sm font-semibold tracking-widest uppercase transition-colors ${location.pathname === '/studio' ? 'text-brand-400' : 'text-white/60 hover:text-white'}`}>Studio</Link>
        </div>

        <Link to="/studio" className="hidden md:block">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="btn-primary text-sm py-2 px-6">
            🎵 Open Studio
          </motion.button>
        </Link>

        <button className="md:hidden text-white/70" onClick={() => setMenuOpen(!menuOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden glass-dark border-t border-white/5 px-6 py-4 flex flex-col gap-4">
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white font-semibold">Home</Link>
          <Link to="/studio" onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white font-semibold">Studio</Link>
          <Link to="/studio" onClick={() => setMenuOpen(false)}>
            <button className="btn-primary w-full text-sm py-2">🎵 Open Studio</button>
          </Link>
        </div>
      )}
    </motion.nav>
  )
}
