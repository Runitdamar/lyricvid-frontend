import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore, { groupWordsIntoLines } from './studioStore.js'

export default function LyricsEditor({ onNext, onBack }) {
  const store = useStudioStore()
  const { lines, audioUrl, audioDuration } = store
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnd = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd) }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.play(); setIsPlaying(true) }
  }

  const saveEdit = () => {
    if (editingIndex === null) return
    store.updateLine(editingIndex, { text: editText.trim() })
    setEditingIndex(null)
  }

  const deleteLine = (i) => {
    store.setLines(lines.filter((_, idx) => idx !== i))
    setEditingIndex(null)
  }

  const addLine = () => {
    const last = lines[lines.length - 1]
    const newLine = {
      id: lines.length,
      text: 'New line',
      start: last ? last.end + 0.2 : 0,
      end: last ? last.end + 3 : 3,
      words: []
    }
    store.setLines([...lines, newLine])
    setEditingIndex(lines.length)
    setEditText('New line')
  }

  const adjustTiming = (i, field, delta) => {
    const newVal = Math.max(0, parseFloat((lines[i][field] + delta).toFixed(1)))
    store.updateLine(i, { [field]: newVal })
  }

  const regroup = () => {
    const regrouped = groupWordsIntoLines(store.words)
    store.setLines(regrouped)
  }

  const activeLineIndex = lines.findIndex(l => currentTime >= l.start && currentTime <= l.end)
  const progressPct = audioDuration ? (currentTime / audioDuration) * 100 : 0

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">EDIT LYRICS</h2>
        <p className="text-white/40 text-xs font-mono">Tap a line to edit • Play to check sync</p>
      </div>

      {/* Audio player */}
      <audio ref={audioRef} src={audioUrl} />
      <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-colors flex-shrink-0 glow-pink">
            {isPlaying
              ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <div className="flex-1">
            <div className="w-full h-2 bg-white/10 rounded-full cursor-pointer"
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (audioRef.current) audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * audioDuration }}>
              <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-100" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-mono text-xs text-white/30">{currentTime.toFixed(1)}s</span>
              <span className="font-mono text-xs text-white/20">{audioDuration.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Active line preview */}
        <div className="h-10 glass rounded-lg border border-white/5 flex items-center justify-center px-4">
          <AnimatePresence mode="wait">
            {activeLineIndex >= 0 ? (
              <motion.p key={activeLineIndex}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="font-bebas text-xl tracking-wider gradient-text text-center truncate">
                {lines[activeLineIndex]?.text}
              </motion.p>
            ) : (
              <span className="text-white/20 text-xs font-mono">▶ play to preview sync</span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lines list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {lines.map((line, i) => (
          <motion.div key={line.id}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`rounded-xl border transition-all cursor-pointer ${
              activeLineIndex === i ? 'border-brand-400 bg-brand-500/15 glow-pink'
              : editingIndex === i ? 'border-brand-500/60 bg-brand-500/10'
              : 'border-white/10 bg-white/3 hover:border-brand-500/30 hover:bg-white/5'
            }`}
            onClick={() => { if (editingIndex !== i) { setEditingIndex(i); setEditText(line.text) } }}
          >
            <div className="flex items-center gap-3 p-3">
              {/* Line number */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bebas flex-shrink-0 ${activeLineIndex === i ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/40'}`}>
                {i + 1}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`font-bebas text-lg tracking-wider truncate ${activeLineIndex === i ? 'text-white' : 'text-white/80'}`}>
                  {line.text}
                </p>
                <p className="text-xs font-mono text-white/30">
                  {line.start.toFixed(1)}s → {line.end.toFixed(1)}s • {(line.end - line.start).toFixed(1)}s
                </p>
              </div>

              {/* Edit indicator */}
              <div className="text-white/20 text-sm flex-shrink-0">✏️</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Line editor */}
      <AnimatePresence>
        {editingIndex !== null && lines[editingIndex] && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass rounded-2xl p-5 border border-brand-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bebas text-xl tracking-wider gradient-text">LINE {editingIndex + 1}</h3>
              <button onClick={() => setEditingIndex(null)} className="text-white/30 hover:text-white text-xl transition-colors">✕</button>
            </div>

            {/* Text edit */}
            <div>
              <label className="text-xs font-mono text-white/30 uppercase tracking-wider mb-2 block">Lyrics Text</label>
              <div className="flex gap-2">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={2}
                  className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white font-bebas text-lg tracking-wider focus:outline-none focus:border-brand-400 transition-colors resize-none"
                  autoFocus
                />
                <button onClick={saveEdit} className="btn-primary px-4 text-sm self-start mt-0 py-3">Save</button>
              </div>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-2 gap-3">
              {[{ label: 'Start Time', field: 'start' }, { label: 'End Time', field: 'end' }].map(({ label, field }) => (
                <div key={field} className="glass rounded-xl p-3 border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-mono text-white/30 uppercase">{label}</span>
                    <span className="font-mono text-sm text-brand-400">{lines[editingIndex]?.[field]?.toFixed(1)}s</span>
                  </div>
                  <div className="flex gap-1">
                    {[-1, -0.5, +0.5, +1].map(d => (
                      <button key={d} onClick={() => adjustTiming(editingIndex, field, d)}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-brand-500/20 text-white/50 hover:text-brand-300 text-xs font-mono transition-all">
                        {d > 0 ? `+${d}` : d}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => deleteLine(editingIndex)}
              className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-mono transition-all">
              🗑 Delete this line
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={addLine} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-brand-500/40 text-white/50 hover:text-white text-sm font-mono transition-all">
          + Add Line
        </button>
        <button onClick={regroup} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-brand-500/40 text-white/50 hover:text-white text-sm font-mono transition-all">
          🔄 Auto-regroup
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        {[
          { label: 'Lines', value: lines.length },
          { label: 'Duration', value: `${audioDuration.toFixed(1)}s` },
          { label: 'Avg Line', value: lines.length ? `${(audioDuration / lines.length).toFixed(1)}s` : '-' }
        ].map(({ label, value }) => (
          <div key={label} className="flex-1 glass rounded-xl p-3 border border-white/5 text-center">
            <p className="text-white/30 text-xs font-mono uppercase">{label}</p>
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
