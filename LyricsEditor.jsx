import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore, { groupWordsIntoLines } from './studioStore.js'

export default function LyricsEditor({ onNext, onBack }) {
  const store = useStudioStore()
  const { lines, audioUrl, audioDuration } = store
  const [mode, setMode] = useState('edit') // edit | sync
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [syncIndex, setSyncIndex] = useState(0)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const [syncDone, setSyncDone] = useState(false)
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  // Hard stop at audioDuration
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      const t = audio.currentTime
      setCurrentTime(t)
      // HARD STOP at clip duration
      if (t >= audioDuration) {
        audio.pause()
        audio.currentTime = 0
        setCurrentTime(0)
        setIsPlaying(false)
        if (mode === 'sync') {
          // Auto-set end time for last line
          store.updateLine(lines.length - 1, { end: audioDuration })
          setSyncDone(true)
        }
      }
    }
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
    }
  }, [audioDuration, mode, lines.length])

  const startSync = () => {
    const audio = audioRef.current
    if (!audio) return
    // Reset all line timings
    const resetLines = lines.map((l, i) => ({ ...l, start: 0, end: audioDuration }))
    store.setLines(resetLines)
    setSyncIndex(0)
    setSyncDone(false)
    setMode('sync')
    audio.currentTime = 0
    audio.play()
    setIsPlaying(true)
    // First line starts at 0
    store.updateLine(0, { start: 0 })
  }

  const tapLine = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !isPlaying) return
    const t = audio.currentTime
    const nextIndex = syncIndex + 1

    // Set end of current line
    store.updateLine(syncIndex, { end: t })

    if (nextIndex < lines.length) {
      // Set start of next line
      store.updateLine(nextIndex, { start: t })
      setSyncIndex(nextIndex)
    } else {
      // All done!
      store.updateLine(syncIndex, { end: audioDuration })
      audio.pause()
      setIsPlaying(false)
      setSyncDone(true)
    }
  }, [syncIndex, lines.length, isPlaying, audioDuration])

  const stopSync = () => {
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.currentTime = 0 }
    setIsPlaying(false)
    setMode('edit')
    setSyncIndex(0)
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else {
      if (audio.currentTime >= audioDuration) audio.currentTime = 0
      audio.play(); setIsPlaying(true)
    }
  }

  const saveEdit = () => {
    if (editingIndex !== null && editText.trim()) {
      store.updateLine(editingIndex, { text: editText.trim() })
      setEditingIndex(null)
    }
  }

  const deleteLine = (i) => {
    store.setLines(lines.filter((_, idx) => idx !== i))
    setEditingIndex(null)
  }

  const addLine = () => {
    const last = lines[lines.length - 1]
    store.setLines([...lines, { id: lines.length, text: 'New line', start: last ? last.end : 0, end: audioDuration, words: [] }])
  }

  const regroup = () => { store.setWords(store.words) }

  const progressPct = audioDuration > 0 ? Math.min(100, (currentTime / audioDuration) * 100) : 0
  const activeLineIndex = lines.findIndex(l => currentTime >= l.start && currentTime < l.end)

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">
          {mode === 'sync' ? 'TAP TO SYNC' : 'EDIT LYRICS'}
        </h2>
        <p className="text-white/40 text-xs font-mono">
          {mode === 'sync' ? 'Tap the button when each line starts' : 'Edit lines • Then tap Sync to set timing'}
        </p>
      </div>

      <audio ref={audioRef} src={audioUrl} />

      {/* Mode toggle */}
      {mode === 'edit' && (
        <div className="flex gap-2">
          <button onClick={() => setMode('edit')} className="flex-1 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider bg-brand-500 text-white">
            ✏️ Edit Lines
          </button>
          <button onClick={startSync} className="flex-1 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider bg-white/5 border border-white/10 text-white/50 hover:border-brand-400 hover:text-white transition-all">
            🎵 Sync Timing
          </button>
        </div>
      )}

      {/* Audio player - always visible */}
      <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} disabled={mode === 'sync'}
            className="w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50">
            {isPlaying
              ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <div className="flex-1">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-none"
                style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-mono text-xs text-white/30">{currentTime.toFixed(1)}s</span>
              <span className="font-mono text-xs text-white/20">{audioDuration.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Active line display */}
        <div className="h-9 glass rounded-lg border border-white/5 flex items-center justify-center px-3">
          <AnimatePresence mode="wait">
            {activeLineIndex >= 0 ? (
              <motion.p key={activeLineIndex}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="font-bebas text-lg tracking-wider gradient-text truncate text-center">
                {lines[activeLineIndex]?.text}
              </motion.p>
            ) : (
              <span className="text-white/20 text-xs font-mono">▶ play to preview</span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SYNC MODE */}
      <AnimatePresence>
        {mode === 'sync' && !syncDone && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Progress through lines */}
            <div className="flex items-center justify-between text-xs font-mono text-white/40">
              <span>Line {syncIndex + 1} of {lines.length}</span>
              <span>{Math.round((syncIndex / lines.length) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full">
              <div className="h-1 bg-brand-500 rounded-full transition-all" style={{ width: `${(syncIndex / lines.length) * 100}%` }} />
            </div>

            {/* Current + next line */}
            <div className="space-y-2">
              {/* Previous line */}
              {syncIndex > 0 && (
                <div className="glass rounded-xl p-3 border border-white/5 opacity-40">
                  <p className="text-xs font-mono text-white/30 mb-1">PREVIOUS</p>
                  <p className="font-bebas text-lg text-white/50 tracking-wider">{lines[syncIndex - 1]?.text}</p>
                </div>
              )}

              {/* Current line - tap target */}
              <motion.button
                onClick={tapLine}
                whileTap={{ scale: 0.97 }}
                className="w-full glass rounded-2xl p-6 border-2 border-brand-400 bg-brand-500/10 text-center active:bg-brand-500/25 transition-all"
              >
                <p className="text-xs font-mono text-brand-400 mb-2 uppercase tracking-wider">NOW PLAYING → TAP WHEN THIS STARTS</p>
                <p className="font-bebas text-3xl tracking-wider text-white leading-tight">
                  {lines[syncIndex]?.text}
                </p>
                <p className="text-xs text-white/30 font-mono mt-2">tap anywhere on this card</p>
              </motion.button>

              {/* Next line preview */}
              {syncIndex < lines.length - 1 && (
                <div className="glass rounded-xl p-3 border border-white/5 opacity-60">
                  <p className="text-xs font-mono text-white/30 mb-1">UP NEXT</p>
                  <p className="font-bebas text-lg text-white/60 tracking-wider">{lines[syncIndex + 1]?.text}</p>
                </div>
              )}
            </div>

            <button onClick={stopSync} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm font-mono hover:border-red-500/40 hover:text-red-400 transition-all">
              ✕ Cancel sync
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SYNC DONE */}
      <AnimatePresence>
        {syncDone && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-5 border border-green-500/30 text-center space-y-3">
            <div className="text-4xl">🎯</div>
            <h3 className="font-bebas text-2xl tracking-wider text-green-400">SYNC COMPLETE!</h3>
            <p className="text-white/40 text-sm">All {lines.length} lines timed. Play above to check.</p>
            <div className="flex gap-2">
              <button onClick={() => { setSyncDone(false); setMode('edit') }}
                className="flex-1 btn-secondary py-2 text-sm">Edit lines</button>
              <button onClick={startSync}
                className="flex-1 btn-secondary py-2 text-sm">Re-sync</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODE - Lines list */}
      {mode === 'edit' && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {lines.map((line, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              className={`rounded-xl border transition-all cursor-pointer ${
                activeLineIndex === i ? 'border-brand-400 bg-brand-500/15'
                : editingIndex === i ? 'border-brand-500/50 bg-brand-500/8'
                : 'border-white/8 hover:border-brand-500/30'}`}
              onClick={() => { if (editingIndex !== i) { setEditingIndex(i); setEditText(line.text) } }}>
              <div className="flex items-center gap-3 p-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bebas flex-shrink-0 ${activeLineIndex === i ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/30'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bebas text-base tracking-wider text-white/80 truncate">{line.text}</p>
                  <p className="text-xs font-mono text-white/25">{line.start.toFixed(1)}s → {line.end.toFixed(1)}s</p>
                </div>
                <span className="text-white/15 text-sm">✏️</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Line editor */}
      <AnimatePresence>
        {editingIndex !== null && mode === 'edit' && lines[editingIndex] && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass rounded-2xl p-5 border border-brand-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bebas text-lg tracking-wider gradient-text">LINE {editingIndex + 1}</h3>
              <button onClick={() => setEditingIndex(null)} className="text-white/20 hover:text-white text-xl">✕</button>
            </div>
            <div className="flex gap-2">
              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white font-bebas text-lg tracking-wider focus:outline-none focus:border-brand-400 resize-none" autoFocus />
              <button onClick={saveEdit} className="btn-primary px-4 text-sm self-start py-3">Save</button>
            </div>
            <button onClick={() => deleteLine(editingIndex)}
              className="w-full py-2 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400/80 text-sm font-mono hover:bg-red-500/15 transition-all">
              🗑 Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {mode === 'edit' && (
        <div className="flex gap-2">
          <button onClick={addLine} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-brand-500/30 text-white/40 hover:text-white text-xs font-mono transition-all">+ Add Line</button>
          <button onClick={regroup} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-brand-500/30 text-white/40 hover:text-white text-xs font-mono transition-all">🔄 Auto-group</button>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-2">
        {[['Lines', lines.length], ['Duration', `${audioDuration.toFixed(1)}s`], ['Synced', syncDone ? '✓' : '—']].map(([l, v]) => (
          <div key={l} className="flex-1 glass rounded-xl p-3 border border-white/5 text-center">
            <p className="text-white/20 text-xs font-mono uppercase">{l}</p>
            <p className={`font-bebas text-xl mt-0.5 ${v === '✓' ? 'text-green-400' : 'text-white'}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <motion.button whileHover={{ scale: 1.03 }} onClick={() => { stopSync(); onBack() }} className="btn-secondary py-3 px-8">← Back</motion.button>
        <motion.button whileHover={{ scale: 1.03 }} onClick={onNext} className="btn-primary py-3 px-10">Style It →</motion.button>
      </div>
    </div>
  )
}
