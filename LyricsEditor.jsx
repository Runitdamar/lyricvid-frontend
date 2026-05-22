import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore from './studioStore.js'

export default function LyricsEditor({ onNext, onBack }) {
  const { words, audioUrl, audioDuration, updateWord, setWords } = useStudioStore()
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const update = () => setCurrentTime(audio.currentTime)
    audio.addEventListener('timeupdate', update)
    audio.addEventListener('ended', () => setIsPlaying(false))
    return () => audio.removeEventListener('timeupdate', update)
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.play(); setIsPlaying(true) }
  }

  const saveEdit = () => {
    if (editingIndex !== null) { updateWord(editingIndex, { word: editValue }); setEditingIndex(null) }
  }

  const deleteWord = (index) => { setWords(words.filter((_, i) => i !== index)); setEditingIndex(null) }

  const addWord = () => {
    const last = words[words.length - 1]
    setWords([...words, { word: 'NEW', start: last ? last.end : 0, end: last ? last.end + 0.5 : 0.5 }])
  }

  const adjustTiming = (index, field, delta) => {
    updateWord(index, { [field]: Math.max(0, Math.round((words[index][field] + delta) * 10) / 10) })
  }

  const activeWordIndex = words.findIndex(w => currentTime >= w.start && currentTime < w.end)
  const progressPercent = audioDuration ? (currentTime / audioDuration) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-2">EDIT LYRICS</h2>
        <p className="text-white/50 text-sm">Tap any word to edit • Adjust timing if needed</p>
      </div>

      <div className="glass rounded-xl p-4 border border-white/10">
        <audio ref={audioRef} src={audioUrl} />
        <div className="flex items-center gap-4">
          <button onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-colors flex-shrink-0">
            {isPlaying
              ? <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <div className="flex-1">
            <div className="w-full h-2 bg-white/10 rounded-full cursor-pointer"
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (audioRef.current) audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * audioDuration }}>
              <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-100" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <span className="font-mono text-xs text-white/40">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(audioDuration / 60)}:{String(Math.floor(audioDuration % 60)).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-white/10 max-h-72 overflow-y-auto">
        <div className="flex flex-wrap gap-2 mb-4">
          {words.map((w, i) => (
            <motion.button key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setEditingIndex(i); setEditValue(w.word) }}
              className={`px-3 py-1.5 rounded-lg font-mono text-sm transition-all border ${
                activeWordIndex === i ? 'bg-brand-500 border-brand-400 text-white scale-110 shadow-lg shadow-brand-500/40'
                : editingIndex === i ? 'bg-brand-500/30 border-brand-400 text-brand-300'
                : 'bg-white/5 border-white/10 text-white/70 hover:border-brand-500/50'}`}>
              {w.word}
            </motion.button>
          ))}
        </div>
        <button onClick={addWord} className="text-xs text-brand-400 hover:text-brand-300 font-mono border border-brand-500/30 px-3 py-1 rounded-lg transition-colors">
          + Add Word
        </button>
      </div>

      <AnimatePresence>
        {editingIndex !== null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass rounded-xl p-6 border border-brand-500/30 space-y-4">
            <h3 className="font-bebas text-xl tracking-wider text-brand-400">EDIT WORD #{editingIndex + 1}</h3>
            <div>
              <label className="text-xs text-white/40 font-mono uppercase tracking-wider mb-2 block">Word Text</label>
              <div className="flex gap-2">
                <input value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-brand-400 transition-colors" autoFocus />
                <button onClick={saveEdit} className="btn-primary py-2 px-5 text-sm">Save</button>
                <button onClick={() => setEditingIndex(null)} className="btn-secondary py-2 px-4 text-sm">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 font-mono uppercase tracking-wider mb-2 block">Start: {words[editingIndex]?.start?.toFixed(1)}s</label>
                <div className="flex gap-2">
                  <button onClick={() => adjustTiming(editingIndex, 'start', -0.1)} className="btn-secondary py-2 px-3 text-sm">−</button>
                  <button onClick={() => adjustTiming(editingIndex, 'start', 0.1)} className="btn-secondary py-2 px-3 text-sm">+</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 font-mono uppercase tracking-wider mb-2 block">End: {words[editingIndex]?.end?.toFixed(1)}s</label>
                <div className="flex gap-2">
                  <button onClick={() => adjustTiming(editingIndex, 'end', -0.1)} className="btn-secondary py-2 px-3 text-sm">−</button>
                  <button onClick={() => adjustTiming(editingIndex, 'end', 0.1)} className="btn-secondary py-2 px-3 text-sm">+</button>
                </div>
              </div>
            </div>
            <button onClick={() => deleteWord(editingIndex)} className="text-red-400 hover:text-red-300 text-sm font-mono transition-colors">🗑 Delete this word</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between pt-4">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack} className="btn-secondary py-3 px-8">← Back</motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onNext} className="btn-primary py-3 px-10">Next: Style It →</motion.button>
      </div>
    </div>
  )
}
