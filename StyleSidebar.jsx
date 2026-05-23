import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HexColorPicker } from 'react-colorful'
import useStudioStore from './studioStore.js'
import { THEMES, FONTS, TEXT_EFFECTS, PATTERNS, COLOR_PALETTES } from './themes.js'

const tabs = ['Theme', 'Font', 'Colors', 'Effects', 'Background']

export default function StyleSidebar() {
  const [activeTab, setActiveTab] = useState('Theme')
  const [showColorPicker, setShowColorPicker] = useState(null)
  const store = useStudioStore()

  const randomize = () => {
    const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)]
    const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)]
    const randomEffect = TEXT_EFFECTS[Math.floor(Math.random() * TEXT_EFFECTS.length)]
    const randomPalette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)]
    const randomPattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]
    store.applyThemePreset(randomTheme.id)
    store.setFont(randomFont.id)
    store.setTextEffect(randomEffect.id)
    store.setPrimaryColor(randomPalette.colors[0])
    store.setShadowColor(randomPalette.colors[0])
    store.setBackgroundPattern(randomPattern.id)
  }

  return (
    <div className="glass rounded-2xl border border-white/10 flex flex-col h-full overflow-hidden">

      {/* Randomizer button */}
      <div className="p-3 border-b border-white/10 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={randomize}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-bebas text-lg tracking-wider transition-all flex items-center justify-center gap-2 glow-pink"
        >
          🎲 RANDOMIZE STYLE
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-white/10 flex-shrink-0">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-mono uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-brand-400 border-b-2 border-brand-400' : 'text-white/40 hover:text-white'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-4">

        {/* THEME */}
        {activeTab === 'Theme' && (
          <div className="space-y-3">
            <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Select a theme preset</p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(t => (
                <motion.button key={t.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => store.applyThemePreset(t.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${store.theme === t.id ? 'border-brand-400 bg-brand-500/15' : 'border-white/10 hover:border-brand-500/40'}`}>
                  <div className="flex gap-1 mb-2">
                    {t.preview.map((c, i) => <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ background: c }} />)}
                  </div>
                  <p className="text-xs font-mono text-white/80">{t.name}</p>
                  {store.theme === t.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1" />}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* FONT */}
        {activeTab === 'Font' && (
          <div className="space-y-3">
            <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Choose your font</p>
            <div className="space-y-2">
              {FONTS.map(f => (
                <motion.button key={f.id} whileHover={{ scale: 1.01 }} onClick={() => store.setFont(f.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${store.font === f.id ? 'border-brand-400 bg-brand-500/15' : 'border-white/10 hover:border-brand-500/40'}`}>
                  <span style={{ fontFamily: `'${f.id}', sans-serif` }} className="text-white text-2xl leading-none">{f.name}</span>
                  <span className="text-xs text-white/30 font-mono">{f.category}</span>
                </motion.button>
              ))}
            </div>

            <div className="pt-2 space-y-4">
              <div>
                <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Text Size: {store.textSize}px</label>
                <input type="range" min={48} max={160} value={store.textSize} onChange={e => store.setTextSize(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>
              <div>
                <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Position</label>
                <div className="flex gap-2">
                  {['top', 'center', 'bottom'].map(pos => (
                    <button key={pos} onClick={() => store.setTextPosition(pos)}
                      className={`flex-1 py-2 rounded-lg text-xs font-mono capitalize transition-all ${store.textPosition === pos ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Alignment</label>
                <div className="flex gap-2">
                  {['left', 'center', 'right'].map(align => (
                    <button key={align} onClick={() => store.setTextAlign(align)}
                      className={`flex-1 py-2 rounded-lg text-xs font-mono capitalize transition-all ${store.textAlign === align ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COLORS */}
        {activeTab === 'Colors' && (
          <div className="space-y-4">
            <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Quick Palettes</p>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_PALETTES.map(pal => (
                <button key={pal.name}
                  onClick={() => { store.setPrimaryColor(pal.colors[0]); store.setShadowColor(pal.colors[0]); store.setStrokeColor(pal.colors[1]) }}
                  className="p-3 rounded-xl border border-white/10 hover:border-brand-500/40 text-left transition-all">
                  <div className="flex gap-1 mb-1.5">
                    {pal.colors.map((c, i) => <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ background: c }} />)}
                  </div>
                  <p className="text-xs font-mono text-white/60">{pal.name}</p>
                </button>
              ))}
            </div>

            {[
              { label: 'Primary Color', key: 'primaryColor', setter: store.setPrimaryColor },
              { label: 'Background Color', key: 'backgroundColor', setter: store.setBackgroundColor },
              { label: 'Glow Color', key: 'shadowColor', setter: store.setShadowColor }
            ].map(({ label, key, setter }) => (
              <div key={key}>
                <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">{label}</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowColorPicker(showColorPicker === key ? null : key)}
                    className="w-10 h-10 rounded-lg border-2 border-white/20 flex-shrink-0 transition-transform hover:scale-110"
                    style={{ background: store[key] }} />
                  <span className="font-mono text-sm text-white/50">{store[key]}</span>
                </div>
                <AnimatePresence>
                  {showColorPicker === key && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                      <HexColorPicker color={store[key]} onChange={setter} style={{ width: '100%' }} />
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

        {/* EFFECTS */}
        {activeTab === 'Effects' && (
          <div className="space-y-3">
            <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Text animation effect</p>
            <div className="grid grid-cols-2 gap-2">
              {TEXT_EFFECTS.map(effect => (
                <motion.button key={effect.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => store.setTextEffect(effect.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${store.textEffect === effect.id ? 'border-brand-400 bg-brand-500/15' : 'border-white/10 hover:border-brand-500/40'}`}>
                  <div className="text-2xl mb-1">{effect.icon}</div>
                  <p className="text-xs font-mono text-white/80">{effect.name}</p>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* BACKGROUND */}
        {activeTab === 'Background' && (
          <div className="space-y-4">
            <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Background type</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'solid', label: 'Solid', icon: '⬛' },
                { id: 'gradient', label: 'Gradient', icon: '🌈' },
                { id: 'pattern', label: 'Pattern', icon: '✦' },
                { id: 'image', label: 'Photo', icon: '🖼️' },
                { id: 'video', label: 'Video', icon: '🎬' }
              ].map(type => (
                <button key={type.id} onClick={() => store.setBackgroundType(type.id)}
                  className={`py-3 px-3 rounded-xl border text-xs font-mono uppercase transition-all flex items-center gap-2 ${store.backgroundType === type.id ? 'border-brand-400 bg-brand-500/15 text-brand-300' : 'border-white/10 text-white/50 hover:border-brand-500/40'}`}>
                  <span>{type.icon}</span>{type.label}
                </button>
              ))}
            </div>

            {/* Pattern picker */}
            {store.backgroundType === 'pattern' && (
              <div className="space-y-2">
                <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Pattern Style</p>
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

            {/* Gradient picker */}
            {store.backgroundType === 'gradient' && (
              <div className="space-y-3">
                {['from', 'to'].map(side => (
                  <div key={side}>
                    <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">
                      {side === 'from' ? 'Top Color' : 'Bottom Color'}
                    </label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowColorPicker(showColorPicker === `grad-${side}` ? null : `grad-${side}`)}
                        className="w-10 h-10 rounded-lg border-2 border-white/20 hover:scale-110 transition-transform"
                        style={{ background: store.backgroundGradient?.[side] || '#000000' }} />
                      <span className="font-mono text-sm text-white/50">{store.backgroundGradient?.[side]}</span>
                    </div>
                    <AnimatePresence>
                      {showColorPicker === `grad-${side}` && (
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

            {/* Photo upload */}
            {store.backgroundType === 'image' && (
              <div className="space-y-3">
                <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Upload Photo Background</p>
                <label className="glass border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-brand-500/50 transition-all">
                  <span className="text-4xl">🖼️</span>
                  <span className="text-sm text-white/60 font-mono">Tap to upload photo</span>
                  <span className="text-xs text-white/30 font-mono">JPG • PNG • WEBP</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files[0]
                      if (!file) return
                      const img = new Image()
                      const url = URL.createObjectURL(file)
                      img.onload = () => store.setBackgroundImage(img)
                      img.src = url
                      store.setBackgroundImageUrl(url)
                    }} />
                </label>
                {store.backgroundImageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-brand-500/30">
                    <img src={store.backgroundImageUrl} className="w-full h-24 object-cover opacity-70" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-green-400 font-mono bg-black/60 px-3 py-1 rounded-full">✅ Photo loaded</span>
                    </div>
                    <button onClick={() => { store.setBackgroundImage(null); store.setBackgroundImageUrl(null) }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors">✕</button>
                  </div>
                )}

                {/* Overlay opacity */}
                <div>
                  <label className="text-xs text-white/30 font-mono uppercase tracking-wider mb-2 block">Dark Overlay: {store.imageOverlay || 35}%</label>
                  <input type="range" min={0} max={90} value={store.imageOverlay || 35}
                    onChange={e => store.setImageOverlay(Number(e.target.value))} className="w-full accent-brand-500" />
                </div>
              </div>
            )}

            {/* Video upload */}
            {store.backgroundType === 'video' && (
              <div className="space-y-3">
                <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Upload Background Video</p>
                <label className="glass border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-brand-500/50 transition-all">
                  <span className="text-4xl">🎬</span>
                  <span className="text-sm text-white/60 font-mono">Tap to upload video</span>
                  <span className="text-xs text-white/30 font-mono">MP4 • WebM</span>
                  <input type="file" accept="video/*" className="hidden"
                    onChange={e => { const f = e.target.files[0]; if (f) store.setBackgroundVideo(URL.createObjectURL(f)) }} />
                </label>
                {store.backgroundVideo && <p className="text-xs text-green-400 font-mono">✅ Video background loaded</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
