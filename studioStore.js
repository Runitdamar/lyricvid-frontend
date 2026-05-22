import { create } from 'zustand'

const useStudioStore = create((set, get) => ({
  audioFile: null, audioUrl: null, audioDuration: 0,
  currentTime: 0, isPlaying: false,
  transcript: '', words: [],
  isTranscribing: false, transcriptionError: null,
  theme: 'neon-noir', font: 'Bebas Neue',
  primaryColor: '#ff1fa0', secondaryColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundType: 'pattern',
  backgroundVideo: null,
  backgroundGradient: { from: '#000000', to: '#1a0030' },
  backgroundPattern: 'particles',
  textEffect: 'neon-glow',
  textSize: 72, textAlign: 'center', textPosition: 'center',
  strokeColor: '#ff1fa0', strokeWidth: 0,
  shadowColor: '#ff1fa0', shadowBlur: 20,

  setAudioFile: (file, url, duration) => set({ audioFile: file, audioUrl: url, audioDuration: duration }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setTranscript: (t) => set({ transcript: t }),
  setWords: (w) => set({ words: w }),
  setIsTranscribing: (v) => set({ isTranscribing: v }),
  setTranscriptionError: (e) => set({ transcriptionError: e }),
  updateWord: (index, updates) => set(state => ({
    words: state.words.map((w, i) => i === index ? { ...w, ...updates } : w)
  })),
  setTheme: (t) => set({ theme: t }),
  setFont: (f) => set({ font: f }),
  setPrimaryColor: (c) => set({ primaryColor: c }),
  setSecondaryColor: (c) => set({ secondaryColor: c }),
  setBackgroundColor: (c) => set({ backgroundColor: c }),
  setBackgroundType: (t) => set({ backgroundType: t }),
  setBackgroundVideo: (v) => set({ backgroundVideo: v }),
  setBackgroundGradient: (g) => set({ backgroundGradient: g }),
  setBackgroundPattern: (p) => set({ backgroundPattern: p }),
  setTextEffect: (e) => set({ textEffect: e }),
  setTextSize: (s) => set({ textSize: s }),
  setTextAlign: (a) => set({ textAlign: a }),
  setTextPosition: (p) => set({ textPosition: p }),
  setStrokeColor: (c) => set({ strokeColor: c }),
  setStrokeWidth: (w) => set({ strokeWidth: w }),
  setShadowColor: (c) => set({ shadowColor: c }),
  setShadowBlur: (b) => set({ shadowBlur: b }),

  applyThemePreset: (preset) => {
    const presets = {
      'neon-noir': { backgroundColor: '#000000', primaryColor: '#ff1fa0', secondaryColor: '#ffffff', textEffect: 'neon-glow', backgroundType: 'pattern', backgroundPattern: 'particles' },
      'cyberpunk': { backgroundColor: '#0d0221', primaryColor: '#00ffff', secondaryColor: '#ffff00', textEffect: 'glitch', backgroundType: 'gradient', backgroundGradient: { from: '#0d0221', to: '#1a0040' } },
      'vaporwave': { backgroundColor: '#1a0040', primaryColor: '#ff71ce', secondaryColor: '#01cdfe', textEffect: 'wave', backgroundType: 'gradient', backgroundGradient: { from: '#1a0040', to: '#0d1b5e' } },
      'fire': { backgroundColor: '#0a0000', primaryColor: '#ff4500', secondaryColor: '#ffff00', textEffect: 'flame', backgroundType: 'gradient', backgroundGradient: { from: '#0a0000', to: '#2d0000' } },
      'ice': { backgroundColor: '#000d1a', primaryColor: '#00d4ff', secondaryColor: '#ffffff', textEffect: 'freeze', backgroundType: 'gradient', backgroundGradient: { from: '#000d1a', to: '#001a2e' } },
      'golden': { backgroundColor: '#0a0500', primaryColor: '#ffd700', secondaryColor: '#ffffff', textEffect: 'shimmer', backgroundType: 'gradient', backgroundGradient: { from: '#0a0500', to: '#1a0e00' } },
      'holographic': { backgroundColor: '#050505', primaryColor: '#ff00ff', secondaryColor: '#00ffff', textEffect: 'rainbow', backgroundType: 'pattern', backgroundPattern: 'geometric' },
      'graffiti': { backgroundColor: '#111111', primaryColor: '#ff6b35', secondaryColor: '#f7c59f', textEffect: 'shake', backgroundType: 'solid' },
      'minimal': { backgroundColor: '#ffffff', primaryColor: '#000000', secondaryColor: '#555555', textEffect: 'typewriter', backgroundType: 'solid' },
      'dark-luxury': { backgroundColor: '#0a0a0a', primaryColor: '#c9a84c', secondaryColor: '#ffffff', textEffect: 'fade', backgroundType: 'gradient', backgroundGradient: { from: '#0a0a0a', to: '#1a1000' } },
      'matrix': { backgroundColor: '#000000', primaryColor: '#00ff00', secondaryColor: '#003300', textEffect: 'matrix', backgroundType: 'pattern', backgroundPattern: 'matrix' },
      'retro': { backgroundColor: '#1a0a00', primaryColor: '#ff8c00', secondaryColor: '#ffe0b2', textEffect: 'bounce', backgroundType: 'gradient', backgroundGradient: { from: '#1a0a00', to: '#2d1500' } }
    }
    if (presets[preset]) set({ theme: preset, ...presets[preset] })
  }
}))

export default useStudioStore
