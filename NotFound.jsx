import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center pt-20">
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="font-bebas text-9xl gradient-text glow-text">404</div>
        <h1 className="font-bebas text-4xl tracking-wider text-white">PAGE NOT FOUND</h1>
        <p className="text-white/40 max-w-md">Looks like this page dropped off the beat.</p>
        <Link to="/">
          <motion.button whileHover={{ scale: 1.05 }} className="btn-primary py-4 px-10 text-lg mt-4">← Back to Home</motion.button>
        </Link>
      </motion.div>
    </div>
  )
}
