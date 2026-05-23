import { create } from 'zustand'

// Group words into timed chunks (3-4 seconds each)
export function groupWordsIntoLines(words, chunkDuration = 3.5) {
  if (!words || words.length === 0) return []
  const lines = []
  let currentLine = []
  let lineStart = words[0].start

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    currentLine.push(word)
    const lineDuration = word.end - lineStart

    const isLast = i === words.length - 1
    const nextWord = words[i + 1]
    const gapToNext = nextWord ? nextWord.start - word.end : 999
    const wouldBeTooLong = nextWord ? (nextWord.end - lineStart) > chunkDuration + 1 : true

    if (isLast || gapToNext > 1.0 || (wouldBeTooLong && currentLine.length >= 3)) {
      lines.push({
        id: lines.length,
        text: currentLine.map(w => w.word).join(' '),
        start: lineStart,
        end: word.end,
        words: [...currentLine]
      })
      currentLine = []
      if (nextWord) lineStart = nextWord.start
    }
  }
  return lines
}

const useStudioStore = create((set, get) => ({
  // Audio
  audioFile: null, audioUrl: null, audioDuration: 0,
  trimStart: 0, trimEnd: 40,

  // Transcription
  transcript: '', words: [], lines: [],
  isTranscribing: false, transcriptionError: null,

  // Style
  theme: 'neon-noir', font: 'Bebas Neue',
  primaryColor: '#ff1fa0', secondaryColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundType: 'pattern',
  backgroundVideo: null,
  backgroundImage: null, backgroundImageUrl: null,
  imageOverlay: 35,
  backgroundGradient: { from: '#000000', to: '#1a0030' },
  backgroundPattern: 'particles',
  textEffect: 'neon-glow',
  lineTransition: 'fade', // fade | fadeInOut | slideUp
  textSize: 72, textAlign: 'center', textPosition: 'center',
  strokeColor: '#ff1fa0', strokeWidth: 0,
  shadowColor: '#ff1fa0', shadowBlur: 20,

  // Actions
  setAudioFile: (file, url, duration) => set({ audioFile: file, audioUrl: url, audioDuration: duration }),
  setTrim: (start, end) => set({ trimStart: start, trimEnd: end }),
  setTranscript: (t) => set({ transcript: t }),
  setWords: (words) => {
    const lines = groupWordsIntoLines(words)
    set({ words, lines })
  },
  setLines: (lines) => set({ lines }),
  updateLine: (index, updates) => set(state => ({
    lines: state.lines.map((l, i) => i === index ? { ...l, ...updates } : l)
  })),
  setIsTranscribing: (v) => set({ isTranscribing: v }),
  setTranscriptionError: (e) => set({ transcriptionError: e }),

  setTheme: (t) => set({ theme: t }),
  setFont: (f) => set({ font: f }),
  setPrimaryColor: (c) => set({ primaryColor: c }),
  setBackgroundColor: (c) => set({ backgroundColor: c }),
  setBackgroundType: (t) => set({ backgroundType: t }),
  setBackgroundVideo: (v) => set({ backgroundVideo: v }),
  setBackgroundImage: (img) => set({ backgroundImage: img }),
  setBackgroundImageUrl: (url) => set({ backgroundImageUrl: url }),
  setImageOverlay: (v) => set({ imageOverlay: v }),
  setBackgroundGradient: (g) => set({ backgroundGradient: g }),
  setBackgroundPattern: (p) => set({ backgroundPattern: p }),
  setTextEffect: (e) => set({ textEffect: e }),
  setLineTransition: (t) => set({ lineTransition: t }),
  setTextSize: (s) => set({ textSize: s }),
  setTextAlign: (a) => set({ textAlign: a }),
  setTextPosition: (p) => set({ textPosition: p }),
  setStrokeColor: (c) => set({ strokeColor: c }),
  setStrokeWidth: (w) => set({ strokeWidth: w }),
  setShadowColor: (c) => set({ shadowColor: c }),
  setShadowBlur: (b) => set({ shadowBlur: b }),

  applyThemePreset: (preset) => {
    const presets = {
      'neon-noir': { backgroundColor: '#000000', primaryColor: '#ff1fa0', textEffect: 'neon-glow', backgroundType: 'pattern', backgroundPattern: 'particles' },
      'cyberpunk': { backgroundColor: '#0d0221', primaryColor: '#00ffff', textEffect: 'glitch', backgroundType: 'gradient', backgroundGradient: { from: '#0d0221', to: '#1a0040' } },
      'vaporwave': { backgroundColor: '#1a0040', primaryColor: '#ff71ce', textEffect: 'wave', backgroundType: 'gradient', backgroundGradient: { from: '#1a0040', to: '#0d1b5e' } },
      'fire': { backgroundColor: '#0a0000', primaryColor: '#ff4500', textEffect: 'flame', backgroundType: 'gradient', backgroundGradient: { from: '#0a0000', to: '#2d0000' } },
      'ice': { backgroundColor: '#000d1a', primaryColor: '#00d4ff', textEffect: 'freeze', backgroundType: 'gradient', backgroundGradient: { from: '#000d1a', to: '#001a2e' } },
      'golden': { backgroundColor: '#0a0500', primaryColor: '#ffd700', textEffect: 'shimmer', backgroundType: 'gradient', backgroundGradient: { from: '#0a0500', to: '#1a0e00' } },
      'holographic': { backgroundColor: '#050505', primaryColor: '#ff00ff', textEffect: 'rainbow', backgroundType: 'pattern', backgroundPattern: 'geometric' },
      'graffiti': { backgroundColor: '#111111', primaryColor: '#ff6b35', textEffect: 'shake', backgroundType: 'solid' },
      'minimal': { backgroundColor: '#ffffff', primaryColor: '#000000', textEffect: 'fade', backgroundType: 'solid' },
      'dark-luxury': { backgroundColor: '#0a0a0a', primaryColor: '#c9a84c', textEffect: 'shimmer', backgroundType: 'gradient', backgroundGradient: { from: '#0a0a0a', to: '#1a1000' } },
      'matrix': { backgroundColor: '#000000', primaryColor: '#00ff00', textEffect: 'matrix', backgroundType: 'pattern', backgroundPattern: 'matrix' },
      'retro': { backgroundColor: '#1a0a00', primaryColor: '#ff8c00', textEffect: 'bounce', backgroundType: 'gradient', backgroundGradient: { from: '#1a0a00', to: '#2d1500' } }
    }
    if (presets[preset]) set({ theme: preset, ...presets[preset] })
  }
}))

export default useStudioStore
