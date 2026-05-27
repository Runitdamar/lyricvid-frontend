import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStudioStore, { groupWordsIntoLines } from './studioStore.js'

export default function LyricsEditor({ onNext, onBack }) {
  const store = useStudioStore()
  const { lines, audioUrl, audioDuration, trimStart } = store
  const [mode, setMode] = useState('edit')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [syncIndex, setSyncIndex] = useState(0)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const [syncDone, setSyncDone] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onLoaded = () => { audio.currentTime = trimStart || 0 }
    const onTime = () => {
      const rel = Math.max(0, audio.currentTime - (trimStart || 0))
      setCurrentTime(rel)
      if (rel >= audioDuration) {
        audio.pause()
        audio.currentTime = trimStart || 0
        setCurrentTime(0)
        setIsPlaying(false)
        if (mode === 'sync') {
          store.updateLine(lines.length - 1, { end: audioDuration })
          setSyncDone(true)
        }
      }
    }
    const onEnd = () => { setIsPlaying(false); audio.currentTime = trimStart || 0; setCurrentTime(0) }
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    if (audio.readyState >= 1) audio.currentTime = trimStart || 0
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
    }
  }, [audioDuration, trimStart, mode, lines.length])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else {
      if (currentTime >= audioDuration) { audio.currentTime = trimStart || 0; setCurrentTime(0) }
      audio.play(); setIsPlaying(true)
    }
  }

  const seekTo = (rel) => {
    const audio = audioRef.current
    if (!audio) return
    const abs = (trimStart || 0) + Math.max(0, Math.min(audioDuration, rel))
    audio.currentTime = abs
    setCurrentTime(Math.max(0, Math.min(audioDuration, rel)))
  }

  const startSync = () => {
    const audio = audioRef.current
    if (!audio) return
    store.setLines(lines.map(l => ({ ...l, start: 0, end: audioDuration })))
    setSyncIndex(0); setSyncDone(false); setMode('sync')
    audio.currentTime = trimStart || 0; setCurrentTime(0)
    audio.play(); setIsPlaying(true)
    store.updateLine(0, { start: 0 })
  }

  const tapLine = useCallback(() => {
    if (!isPlaying) return
    const t = parseFloat(currentTime.toFixed(2))
    const next = syncIndex + 1
    store.updateLine(syncIndex, { end: t })
    if (next < lines.length) { store.updateLine(next, { start: t }); setSyncIndex(next) }
    else { store.updateLine(syncIndex, { end: audioDuration }); audioRef.current?.pause(); setIsPlaying(false); setSyncDone(true) }
  }, [syncIndex, lines.length, isPlaying, audioDuration, currentTime])

  const stopSync = () => { audioRef.current?.pause(); setIsPlaying(false); setMode('edit'); setSyncIndex(0) }
  const saveEdit = () => { if (editingIndex !== null && editText.trim()) { store.updateLine(editingIndex, { text: editText.trim() }); setEditingIndex(null) } }
  const deleteLine = (i) => { store.setLines(lines.filter((_, idx) => idx !== i)); setEditingIndex(null) }
  const addLine = () => { const last = lines[lines.length - 1]; store.setLines([...lines, { id: lines.length, text: 'New line', start: last ? last.end + 0.1 : 0, end: audioDuration, words: [] }]) }

  const progressPct = audioDuration > 0 ? Math.min(100, (currentTime / audioDuration) * 100) : 0
  const activeLineIndex = lines.findIndex(l => currentTime >= l.start && currentTime < l.end)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-bebas text-4xl tracking-wider gradient-text mb-1">
          {mode === 'sync' ? '🎵 TAP TO SYNC' : '✏️ EDIT LYRICS'}
        </h2>
        <p className="text-white/30 text-xs font-mono">
          {mode === 'sync' ? 'Tap the highlighted card when each line starts in the song' : 'Edit your lines below, then sync the timing'}
        </p>
      </div>

      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Player */}
      <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
        {/* Waveform progress bar */}
        <div className="w-full h-10 bg-white/5 rounded-xl overflow-hidden cursor-pointer relative"
          onClick={e => { if (mode === 'sync') return; const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * audioDuration) }}>
          {/* Fake waveform bars */}
          <div className="absolute inset-0 flex items-center gap-px px-2">
            {Array.from({ length: 60 }).map((_, i) => {
              const h = 20 + Math.sin(i * 0.5) * 15 + Math.cos(i * 0.3) * 10
              const pct = (i / 60) * 100
              const filled = pct <= progressPct
              return (
                <div key={i} className="flex-1 rounded-full transition-colors"
                  style={{ height: `${h}%`, background: filled ? '#ff1fa0' : 'rgba(255,255,255,0.1)' }} />
              )
            })}
          </div>
          {/* Playhead */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-white/60 pointer-events-none"
            style={{ left: `${progressPct}%` }} />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={mode === 'sync' ? undefined : togglePlay} disabled={mode === 'sync'}
            className="w-12 h-12 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-all glow-pink disabled:opacity-40 flex-shrink-0">
            {isPlaying
              ? <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="font-mono text-sm text-white/50">{currentTime.toFixed(1)}s</span>
              <span className="font-mono text-sm text-white/20">{audioDuration.toFixed(1)}s</span>
            </div>
          </div>
          {/* Mode switcher */}
          {mode === 'edit' && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={startSync}
              className="flex-shrink-0 bg-gradient-to-r from-brand-600 to-purple-600 text-white font-bebas tracking-wider text-sm px-4 py-2 rounded-xl">
              🎯 SYNC
            </motion.button>
          )}
          {mode === 'sync' && (
            <button onClick={stopSync} className="flex-shrink-0 bg-white/10 text-white/50 font-mono text-xs px-4 py-2 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all">
              ✕ Cancel
            </button>
          )}
        </div>

        {/* Now playing line */}
        <div className="h-10 bg-white/3 rounded-xl border border-white/5 flex items-center justify-center px-4">
          <AnimatePresence mode="wait">
            {activeLineIndex >= 0 ? (
              <motion.p key={activeLineIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                className="font-bebas text-xl tracking-wider gradient-text text-center truncate w-full">
                {lines[activeLineIndex]?.text}
              </motion.p>
            ) : (
              <span className="text-white/20 text-xs font-mono">▶ play to preview</span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SYNC MODE UI */}
      <AnimatePresence>
        {mode === 'sync' && !syncDone && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${((syncIndex) / lines.length) * 100}%` }} />
              </div>
              <span className="text-xs font-mono text-white/30 flex-shrink-0">{syncIndex + 1}/{lines.length}</span>
            </div>

            {/* Previous */}
            {syncIndex > 0 && (
              <div className="glass rounded-xl p-3 border border-white/5 opacity-40">
                <p className="text-white/30 font-bebas text-base tracking-wider truncate">{lines[syncIndex - 1]?.text}</p>
              </div>
            )}

            {/* Current — tap target */}
            <motion.button onClick={tapLine} whileTap={{ scale: 0.98 }}
              className="w-full rounded-2xl p-6 border-2 border-brand-400 bg-brand-500/10 text-center space-y-2 active:bg-brand-500/20 transition-all">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
                <span className="text-xs font-mono text-brand-400 uppercase tracking-widest">Tap when this starts</span>
              </div>
              <p className="font-bebas text-3xl md:text-4xl tracking-wider text-white leading-tight">
                {lines[syncIndex]?.text}
              </p>
            </motion.button>

            {/* Next */}
            {syncIndex < lines.length - 1 && (
              <div className="glass rounded-xl p-3 border border-white/5 opacity-50">
                <p className="text-xs font-mono text-white/20 mb-1">UP NEXT</p>
                <p className="text-white/50 font-bebas text-base tracking-wider truncate">{lines[syncIndex + 1]?.text}</p>
              </div>
            )}
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
            <p className="text-white/30 text-sm">Play audio above to check. Tap Sync again to redo.</p>
            <div className="flex gap-2">
              <button onClick={() => { setSyncDone(false); setMode('edit') }} className="flex-1 btn-secondary py-2.5 text-sm">✏️ Edit</button>
              <button onClick={startSync} className="flex-1 btn-secondary py-2.5 text-sm">🔄 Re-sync</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODE — Lines */}
      {mode === 'edit' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono text-white/30 uppercase tracking-wider">{lines.length} lines</span>
            <div className="flex gap-2">
              <button onClick={addLine} className="text-xs font-mono text-brand-400 hover:text-brand-300 transition-colors">+ Add</button>
              <span className="text-white/10">|</span>
              <button onClick={() => store.setWords(store.words)} className="text-xs font-mono text-white/30 hover:text-white transition-colors">🔄 Regroup</button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 rounded-xl">
            {lines.map((line, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                onClick={() => { if (editingIndex !== i) { setEditingIndex(i); setEditText(line.text) } }}
                className={`rounded-xl border cursor-pointer transition-all ${
                  activeLineIndex === i ? 'border-brand-400 bg-brand-500/15 shadow-lg shadow-brand-500/10'
                  : editingIndex === i ? 'border-brand-500/40 bg-brand-500/8'
                  : 'border-white/8 bg-white/2 hover:border-brand-500/30 hover:bg-white/4'}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Line number badge */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bebas flex-shrink-0 transition-all ${activeLineIndex === i ? 'bg-brand-500 text-white' : 'bg-white/8 text-white/30'}`}>
                    {i + 1}
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bebas text-lg tracking-wider leading-tight truncate transition-colors ${activeLineIndex === i ? 'text-white' : 'text-white/70'}`}>
                      {line.text}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-white/20">{line.start.toFixed(1)}s</span>
                      <div className="flex-1 h-px bg-white/10 relative">
                        <div className="absolute inset-y-0 rounded-full bg-brand-500/40"
                          style={{
                            left: `${(line.start / audioDuration) * 100}%`,
                            width: `${((line.end - line.start) / audioDuration) * 100}%`
                          }} />
                      </div>
                      <span className="text-xs font-mono text-white/20">{line.end.toFixed(1)}s</span>
                    </div>
                  </div>
                  <div className="text-white/15 flex-shrink-0 text-base">›</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Inline line editor */}
      <AnimatePresence>
        {editingIndex !== null && mode === 'edit' && lines[editingIndex] && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="glass rounded-2xl p-5 border border-brand-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bebas text-lg tracking-wider gradient-text">LINE {editingIndex + 1}</span>
              <button onClick={() => setEditingIndex(null)} className="text-white/20 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="flex gap-2 items-start">
              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } }}
                rows={2} autoFocus
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white font-bebas text-xl tracking-wider focus:outline-none focus:border-brand-400 transition-colors resize-none" />
              <button onClick={saveEdit} className="btn-primary py-3 px-5 text-sm flex-shrink-0">✓</button>
            </div>
            <button onClick={() => deleteLine(editingIndex)}
              className="w-full py-2.5 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400/60 text-sm font-mono hover:bg-red-500/15 hover:text-red-400 transition-all">
              🗑 Delete this line
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats + Nav */}
      <div className="pt-2 space-y-3">
        <div className="flex gap-2">
          {[['Lines', lines.length], ['Clip', `${audioDuration.toFixed(0)}s`], ['Synced', syncDone ? '✓' : '—']].map(([l, v]) => (
            <div key={l} className="flex-1 glass rounded-xl p-3 border border-white/5 text-center">
              <p className="text-white/20 text-xs font-mono uppercase tracking-wider">{l}</p>
              <p className={`font-bebas text-xl mt-0.5 ${v === '✓' ? 'text-green-400' : 'text-white'}`}>{v}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { stopSync(); onBack() }} className="btn-secondary py-3 px-8">← Back</motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onNext} className="btn-primary py-3 px-10">Style It →</motion.button>
        </div>
      </div>
    </div>
  )
}
