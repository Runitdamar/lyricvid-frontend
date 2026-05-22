import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <span className="text-white font-bebas text-base">L</span>
          </div>
          <span className="font-bebas text-xl tracking-wider gradient-text">LYRICVID</span>
        </div>
        <p className="text-white/30 text-sm">AI-powered lyric video generator. 100% free. 100% fire. 🔥</p>
        <div className="flex items-center gap-6 text-white/40 text-sm">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <Link to="/studio" className="hover:text-white transition-colors">Studio</Link>
        </div>
      </div>
    </footer>
  )
}
