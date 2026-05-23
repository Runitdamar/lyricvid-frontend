import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import useStudioStore from './studioStore.js'

export default function LyricsEditor({ onNext, onBack }) {
  const { words, audioUrl, audioDuration, updateWord, setWords } = useStudioStore()
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [viewMode, setViewMode] = useState('cards') // cards | timeline
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const update = () => setCurrentTime(audio.currentTime)
    const ended = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', update)
    audio.addEventListener('ended', ended)
    return () => { audio.removeEventListener('timeupdate', update); audio.removeEventListener('ended', ended) }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.play(); setIsPlaying(true) }
  }

  const saveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      updateWord(editingIndex, { word: editValue.trim() })
      setEditingIndex(null)
    }
  }

  const deleteWord = (index) => {
    setWords(words.filter((_, i) => i !== index))
    setEditingIndex(null)
  }

  const addWord = () => {
    const last = words[words.length - 1]
    const newWord = { word: 'NEW', start: last ? last.end + 0.1 : 0, end: last ? last.end + 0.6 : 0.5 }
    setWords([...words, newWord])
    setEditingIndex(words.length)
    setEditValue('NEW')
  }

  const adjustTiming = (index, field, delta) => {
    const newVal = Math.max(0, Math.round((words[index][field] + delta) * 10) / 10)
    updateWord(index, { [field]: newVal })
  }

  const activeWordIndex = words.findIndex(w => currentTime >= w.start && currentTime < w.end)
  const progressPercent = audioDuration ? (currentTime / audioDuration) * 100 : 0

  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">EDIT LYRICS</h2>
        <p className="text-white/40 text-xs font-mono">Tap any word to edit • Play audio to check sync</p>
      </div>

      {/* Audio player */}
      <div className="glass rounded-2xl p-4 border border-white/10">
        <audio ref={audioRef} src={audioUrl} />
        <div className="flex items-center gap-3 mb-3">
          <button onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-colors flex-shrink-0 glow-pink">
            {isPlaying
              ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <div className="flex-1 space-y-1">
            <div className="w-full h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden"
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (audioRef.current) audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * audioDuration }}>
              <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.1 }} />
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-xs text-white/30">{currentTime.toFixed(1)}s</span>
              <span className="font-mono text-xs text-white/20">{audioDuration.toFixed(1)}s total</span>
            </div>
          </div>
        </div>

        {/* Active word display */}
        <div className="flex items-center justify-center h-10 glass rounded-xl border border-white/5">
          <AnimatePresence mode="wait">
            {activeWordIndex >= 0 ? (
              <motion.span key={activeWordIndex} initial={{ opacity: 0, scale: 0.8, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, y: -5 }}
                className="font-bebas text-2xl tracking-wider gradient-text glow-text">
                {words[activeWordIndex]?.word}
              </motion.span>
            ) : (
              <motion.span key="idle" className="text-white/20 text-xs font-mono">▶ play to see sync</motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        {['cards', 'timeline'].map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)}
            className={`flex-1 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${viewMode === mode ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
            {mode === 'cards' ? '⊞ Cards' : '⟺ Timeline'}
          </button>
        ))}
      </div>

      {/* Cards view */}
      {viewMode === 'cards' && (
        <div className="glass rounded-2xl p-4 border border-white/10 max-h-80 overflow-y-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            <AnimatePresence>
              {words.map((w, i) => (
                <motion.button key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditingIndex(i); setEditValue(w.word) }}
                  className={`relative px-3 py-2 rounded-xl font-bebas text-lg tracking-wider transition-all border ${
                    activeWordIndex === i
                      ? 'bg-brand-500 border-brand-300 text-white glow-pink scale-110 shadow-lg shadow-brand-500/50'
                      : editingIndex === i
                      ? 'bg-brand-500/20 border-brand-400 text-brand-300'
                      : 'bg-white/5 border-white/10 text-white/80 hover:border-brand-500/50 hover:bg-white/10'
                  }`}>
                  {w.word}
                  <span className="absolute -bottom-1 left-0 right-0 flex justify-center">
                    <span className="text-white/20 text-xs font-mono leading-none">{w.start.toFixed(1)}</span>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          <button onClick={addWord}
            className="text-xs text-brand-400 hover:text-brand-300 font-mono border border-brand-500/30 hover:border-brand-400 px-4 py-2 rounded-xl transition-all">
            + Add Word
          </button>
        </div>
      )}

      {/* Timeline view */}
      {viewMode === 'timeline' && (
        <div className="glass rounded-2xl p-4 border border-white/10 overflow-x-auto">
          <div className="relative h-16 min-w-full" style={{ width: `${Math.max(600, audioDuration * 80)}px` }}>
            {/* Time markers */}
            {Array.from({ length: Math.ceil(audioDuration) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 flex flex-col justify-between"
                style={{ left: `${(i / audioDuration) * 100}%` }}>
                <div className="w-px h-2 bg-white/20" />
                <span className="text-white/20 text-xs font-mono" style={{ fontSize: 9 }}>{i}s</span>
              </div>
            ))}
            {/* Word blocks */}
            {words.map((w, i) => (
              <motion.button key={i} whileHover={{ scaleY: 1.1 }}
                onClick={() => { setEditingIndex(i); setEditValue(w.word) }}
                className={`absolute top-1 h-10 rounded-lg flex items-center justify-center overflow-hidden text-xs font-bebas tracking-wider transition-all border ${
                  activeWordIndex === i ? 'bg-brand-500 border-brand-300 text-white shadow-lg shadow-brand-500/40'
                  : editingIndex === i ? 'bg-brand-500/30 border-brand-400 text-brand-300'
                  : 'bg-brand-500/15 border-brand-500/30 text-white/70 hover:bg-brand-500/25'
                }`}
                style={{
                  left: `${(w.start / audioDuration) * 100}%`,
                  width: `${Math.max(2, ((w.end - w.start) / audioDuration) * 100)}%`
                }}>
                <span className="px-1 truncate">{w.word}</span>
              </motion.button>
            ))}
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-white/60 pointer-events-none transition-all"
              style={{ left: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Word editor panel */}
      <AnimatePresence>
        {editingIndex !== null && words[editingIndex] && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass rounded-2xl p-5 border border-brand-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bebas text-xl tracking-wider gradient-text">WORD #{editingIndex + 1}</h3>
              <button onClick={() => setEditingIndex(null)} className="text-white/30 hover:text-white transition-colors text-lg">✕</button>
            </div>

            {/* Word text input */}
            <div className="flex gap-2">
              <input value={editValue} onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingIndex(null) }}
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white font-bebas text-xl tracking-wider focus:outline-none focus:border-brand-400 transition-colors"
                autoFocus />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={saveEdit}
                className="btn-primary py-2 px-5 text-sm">Save</motion.button>
            </div>

            {/* Timing controls */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Start', field: 'start' },
                { label: 'End', field: 'end' }
              ].map(({ label, field }) => (
                <div key={field} className="glass rounded-xl p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-white/30 font-mono uppercase tracking-wider">{label}</label>
                    <span className="font-mono text-sm text-brand-400">{words[editingIndex]?.[field]?.toFixed(1)}s</span>
                  </div>
                  <div className="flex gap-1">
                    {[-0.5, -0.1, +0.1, +0.5].map(delta => (
                      <button key={delta} onClick={() => adjustTiming(editingIndex, field, delta)}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-brand-500/20 text-white/60 hover:text-brand-400 text-xs font-mono transition-all border border-white/5 hover:border-brand-500/30">
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => deleteWord(editingIndex)}
              className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-mono transition-all">
              🗑 Delete this word
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div className="flex gap-3">
        {[
          { label: 'Words', value: words.length },
          { label: 'Duration', value: `${audioDuration.toFixed(1)}s` },
          { label: 'Avg/Word', value: words.length ? `${(audioDuration / words.length).toFixed(1)}s` : '-' }
        ].map(({ label, value }) => (
          <div key={label} className="flex-1 glass rounded-xl p-3 border border-white/5 text-center">
            <p className="text-white/30 text-xs font-mono uppercase tracking-wider">{label}</p>
            <p className="text-white font-bebas text-xl mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack} className="btn-secondary py-3 px-8">← Back</motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onNext} className="btn-primary py-3 px-10">Style It →</motion.button>
      </div>
    </div>
  )
}
