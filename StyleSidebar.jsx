import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HexColorPicker } from 'react-colorful'
import useStudioStore from './studioStore.js'
import { THEMES, FONTS, TEXT_EFFECTS, TRANSITIONS, PATTERNS, COLOR_PALETTES } from './themes.js'

const tabs = ['Theme', 'Font', 'Colors', 'Effects', 'Background']

const FONT_CATEGORIES = ['All', 'Display', 'GenZ', 'Futuristic', 'Handwritten', 'Luxury', 'Condensed', 'Bold']

export default function StyleSidebar() {
  const [activeTab, setActiveTab] = useState('Theme')
  const [showColorPicker, setShowColorPicker] = useState(null)
  const [fontCategory, setFontCategory] = useState('All')
  const [customFontUrl, setCustomFontUrl] = useState('')
  const [customFontName, setCustomFontName] = useState('')
  const [customFonts, setCustomFonts] = useState([])
  const store = useStudioStore()

  const randomize = useCallback(() => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)]
    store.applyThemePreset(pick(THEMES).id)
    store.setFont(pick(FONTS).id)
    store.setTextEffect(pick(TEXT_EFFECTS).id)
    store.setPrimaryColor(pick(COLOR_PALETTES).colors[0])
    store.setShadowColor(pick(COLOR_PALETTES).colors[0])
    store.setBackgroundPattern(pick(PATTERNS).id)
    store.setLineTransition(pick(TRANSITIONS).id)
  }, [store])

  const filteredFonts = fontCategory === 'All'
    ? [...FONTS, ...customFonts]
    : [...FONTS, ...customFonts].filter(f => f.category === fontCategory)

  const loadCustomFont = () => {
    if (!customFontUrl || !customFontName) return
    const fontFace = new FontFace(customFontName, `url(${customFontUrl})`)
    fontFace.load().then(loaded => {
      document.fonts.add(loaded)
      setCustomFonts(prev => [...prev, { id: customFontName, name: customFontName, category: 'Custom' }])
      store.setFont(customFontName)
      setCustomFontUrl('')
      setCustomFontName('')
    }).catch(() => alert('Could not load font. Check the URL.'))
  }

  return (
    <div className="glass rounded-2xl border border-white/10 flex flex-col h-full overflow-hidden">

      {/* Randomizer */}
      <div className="p-3 border-b border-white/10 flex-shrink-0">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={randomize}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-bebas text-xl tracking-wider transition-all flex items-center justify-center gap-2 glow-pink">
          🎲 RANDOMIZE STYLE
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-white/10 flex-shrink-0 scrollbar-none">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-mono uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-brand-400 border-b-2 border-brand-400' : 'text-white/40 hover:text-white'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-5">

        {/* ── THEME TAB ── */}
        {activeTab === 'Theme' && (
          <div className="space-y-4">
            <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Theme Preset</p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(t => (
                <motion.button key={t.id} whileTap={{ scale: 0.96 }}
                  onClick={() => store.applyThemePreset(t.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${store.theme === t.id ? 'border-brand-400 bg-brand-500/15' : 'border-white/10 hover:border-brand-500/40'}`}>
                  <div className="flex gap-1 mb-2">
                    {(t.previewColors || t.preview).map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{t.tag}</span>
                    <p className="text-xs font-mono text-white/80 truncate">{t.name}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Line Transition */}
            <div className="pt-2">
              <p className="text-xs text-white/30 font-mono uppercase tracking-wider mb-3">Line Transition</p>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITIONS.map(tr => (
                  <button key={tr.id} onClick={() => store.setLineTransition(tr.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${store.lineTransition === tr.id ? 'border-brand-400 bg-brand-500/15' : 'border-white/10 hover:border-brand-500/30'}`}>
                    <div className="text-xl mb-1">{tr.icon}</div>
                    <p className="text-xs font-mono text-white leading-tight">{tr.name}</p>
                    <p className="text-xs text-white/30 leading-tight mt-0.5">{tr.desc}</p>
                    {store.lineTransition === tr.id && <div className="mt-1.5 w-2 h-2 rounded-full bg-brand-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FONT TAB ── */}
        {activeTab === 'Font' && (
          <div className="space-y-4">

            {/* Category filter */}
            <div className="flex gap-1.5 flex-wrap">
              {FONT_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setFontCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${fontCategory === cat ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Font list */}
            <div className="space-y-2">
              {filteredFonts.map(f => (
                <motion.button key={f.id} whileTap={{ scale: 0.98 }} onClick={() => store.setFont(f.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${store.font === f.id ? 'border-brand-400 bg-brand-500/15' : 'border-white/10 hover:border-brand-500/40'}`}>
                  <span style={{ fontFamily: `'${f.id}', sans-serif` }} className="text-white text-2xl leading-none">{f.name}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${f.category === 'Custom' ? 'bg-purple-500/20 text-purple-300' : 'text-white/30'}`}>{f.category}</span>
                </motion.button>
              ))}
            </div>

            {/* Custom font loader */}
            <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
              <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Custom Font URL</p>
              <input
                type="text" placeholder="Font name (e.g. MyFont)"
                value={customFontName}
                onChange={e => setCustomFontName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50"
              />
              <input
                type="text" placeholder="https://fonts.gstatic.com/... or direct .ttf URL"
                value={customFontUrl}
                onChange={e => setCustomFontUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50"
              />
              <button onClick={loadCustomFont}
                className="w-full py-2 rounded-lg bg-brand-500/20 text-brand-300 text-xs font-mono hover:bg-brand-500/30 transition-all">
                + Load Font
              </button>
            </div>

            {/* Size / Position / Align */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Size: {store.textSize}px</label>
                <input type="range" min={40} max={140} value={store.textSize} onChange={e => store.setTextSize(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>
              <div>
                <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Position</label>
                <div className="flex gap-2">
                  {['top', 'center', 'bottom'].map(p => (
                    <button key={p} onClick={() => store.setTextPosition(p)}
                      className={`flex-1 py-2 rounded-lg text-xs font-mono capitalize transition-all ${store.textPosition === p ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Align</label>
                <div className="flex gap-2">
                  {[['left', '◀'], ['center', '▐'], ['right', '▶']].map(([a, icon]) => (
                    <button key={a} onClick={() => store.setTextAlign(a)}
                      className={`flex-1 py-2 rounded-lg text-xs font-mono capitalize transition-all ${store.textAlign === a ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>{icon}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── COLORS TAB ── */}
        {activeTab === 'Colors' && (
          <div className="space-y-4">
            <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Quick Palettes</p>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_PALETTES.map(pal => (
                <button key={pal.name}
                  onClick={() => { store.setPrimaryColor(pal.colors[0]); store.setShadowColor(pal.colors[0]); store.setStrokeColor(pal.colors[1]) }}
                  className="p-3 rounded-xl border border-white/10 hover:border-brand-500/40 text-left transition-all">
                  <div className="flex gap-1 mb-1.5">
                    {pal.colors.map((c, i) => <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ background: c }} />)}
                  </div>
                  <p className="text-xs font-mono text-white/60">{pal.name}</p>
                </button>
              ))}
            </div>

            {/* Color pickers */}
            {[
              { key: 'text', label: 'Text Color', value: store.primaryColor, set: store.setPrimaryColor },
              { key: 'stroke', label: 'Stroke Color', value: store.strokeColor, set: store.setStrokeColor },
              { key: 'shadow', label: 'Glow Color', value: store.shadowColor, set: store.setShadowColor },
            ].map(({ key, label, value, set }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/30 font-mono uppercase tracking-wider">{label}</label>
                  <button onClick={() => setShowColorPicker(showColorPicker === key ? null : key)}
                    className="w-8 h-8 rounded-lg border-2 border-white/20 hover:scale-110 transition-transform flex-shrink-0"
                    style={{ background: value || '#ffffff' }} />
                </div>
                <AnimatePresence>
                  {showColorPicker === key && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-2">
                      <HexColorPicker color={value || '#ffffff'} onChange={set} style={{ width: '100%' }} />
                      <input type="text" value={value || ''} onChange={e => set(e.target.value)}
                        className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand-500/50" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <div>
              <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Glow Intensity: {store.shadowBlur}</label>
              <input type="range" min={0} max={80} value={store.shadowBlur} onChange={e => store.setShadowBlur(Number(e.target.value))} className="w-full accent-brand-500" />
            </div>
            <div>
              <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Stroke Width: {store.strokeWidth}</label>
              <input type="range" min={0} max={10} value={store.strokeWidth} onChange={e => store.setStrokeWidth(Number(e.target.value))} className="w-full accent-brand-500" />
            </div>
          </div>
        )}

        {/* ── EFFECTS TAB ── */}
        {activeTab === 'Effects' && (
          <div className="space-y-3">
            <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Text Effect</p>
            <div className="grid grid-cols-2 gap-2">
              {TEXT_EFFECTS.map(effect => (
                <motion.button key={effect.id} whileTap={{ scale: 0.96 }}
                  onClick={() => store.setTextEffect(effect.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${store.textEffect === effect.id ? 'border-brand-400 bg-brand-500/15' : 'border-white/10 hover:border-brand-500/40'}`}>
                  <div className="text-2xl mb-1">{effect.icon}</div>
                  <p className="text-xs font-mono text-white/80 leading-tight">{effect.name}</p>
                  <p className="text-xs text-white/30 leading-tight mt-0.5">{effect.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── BACKGROUND TAB ── */}
        {activeTab === 'Background' && (
          <div className="space-y-4">
            <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Background Type</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'solid', label: 'Solid', icon: '⬛' },
                { id: 'gradient', label: 'Gradient', icon: '🌈' },
                { id: 'pattern', label: 'Pattern', icon: '✦' },
                { id: 'image', label: 'Photo', icon: '🖼️' },
                { id: 'video', label: 'Video', icon: '🎬' }
              ].map(t => (
                <button key={t.id} onClick={() => store.setBackgroundType(t.id)}
                  className={`py-3 px-3 rounded-xl border text-xs font-mono uppercase transition-all flex items-center gap-2 ${store.backgroundType === t.id ? 'border-brand-400 bg-brand-500/15 text-brand-300' : 'border-white/10 text-white/50 hover:border-brand-500/40'}`}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>

            {store.backgroundType === 'pattern' && (
              <div className="space-y-2">
                <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Pattern</p>
                <div className="grid grid-cols-2 gap-2">
                  {PATTERNS.map(p => (
                    <button key={p.id} onClick={() => store.setBackgroundPattern(p.id)}
                      className={`py-2 px-3 rounded-lg border text-xs font-mono transition-all ${store.backgroundPattern === p.id ? 'border-brand-400 bg-brand-500/15 text-brand-300' : 'border-white/10 text-white/50 hover:border-brand-500/40'}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {store.backgroundType === 'gradient' && (
              <div className="space-y-3">
                {['from', 'to'].map(side => (
                  <div key={side}>
                    <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">{side === 'from' ? 'Top' : 'Bottom'} Color</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowColorPicker(showColorPicker === `g-${side}` ? null : `g-${side}`)}
                        className="w-10 h-10 rounded-lg border-2 border-white/20 hover:scale-110 transition-transform"
                        style={{ background: store.backgroundGradient?.[side] || '#000000' }} />
                      <span className="font-mono text-sm text-white/40">{store.backgroundGradient?.[side]}</span>
                    </div>
                    <AnimatePresence>
                      {showColorPicker === `g-${side}` && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                          <HexColorPicker color={store.backgroundGradient?.[side] || '#000000'}
                            onChange={c => store.setBackgroundGradient({ ...store.backgroundGradient, [side]: c })}
                            style={{ width: '100%' }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}

            {store.backgroundType === 'image' && (
              <div className="space-y-3">
                <label className="glass border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-brand-500/50 transition-all">
                  <span className="text-4xl">🖼️</span>
                  <span className="text-sm text-white/60 font-mono">Tap to upload photo</span>
                  <span className="text-xs text-white/30">JPG • PNG • WEBP</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files[0]
                      if (!file) return
                      const url = URL.createObjectURL(file)
                      store.setBackgroundImageUrl(url)
                      const img = new Image()
                      img.onload = () => store.setBackgroundImage(img)
                      img.src = url
                    }} />
                </label>
                {store.backgroundImageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-brand-500/30">
                    <img src={store.backgroundImageUrl} className="w-full h-20 object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="text-xs text-green-400 font-mono">✅ Photo loaded</span>
                    </div>
                    <button onClick={() => { store.setBackgroundImage(null); store.setBackgroundImageUrl(null) }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center">✕</button>
                  </div>
                )}
                <div>
                  <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Overlay: {store.imageOverlay || 35}%</label>
                  <input type="range" min={0} max={90} value={store.imageOverlay || 35}
                    onChange={e => store.setImageOverlay(Number(e.target.value))} className="w-full accent-brand-500" />
                </div>
              </div>
