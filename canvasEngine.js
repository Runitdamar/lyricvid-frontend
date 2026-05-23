export class CanvasEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.width = options.width || 1080
    this.height = options.height || 1920
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.particles = []
    this.matrixColumns = []
    this.bgVideoElement = null
    this.bgImageElement = null
    this.lastFrameTime = 0
    this.frameInterval = 1000 / 30 // cap at 30fps to prevent crash
    this.initParticles()
    this.initMatrix()
  }

  initParticles() {
    this.particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 3 + 1,
      alpha: Math.random() * 0.6 + 0.2
    }))
  }

  initMatrix() {
    const cols = Math.floor(this.width / 20)
    this.matrixColumns = Array.from({ length: cols }, () => Math.random() * this.height)
  }

  setBackgroundVideo(el) { this.bgVideoElement = el }
  setBackgroundImage(el) { this.bgImageElement = el }

  drawBackground(style, time) {
    const { ctx, width, height } = this
    ctx.clearRect(0, 0, width, height)

    if (style.backgroundType === 'video' && this.bgVideoElement) {
      try {
        ctx.drawImage(this.bgVideoElement, 0, 0, width, height)
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(0, 0, width, height)
      } catch (e) {
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, width, height)
      }
      return
    }

    if (style.backgroundType === 'image' && this.bgImageElement) {
      try {
        // Cover fit for portrait
        const imgRatio = this.bgImageElement.naturalWidth / this.bgImageElement.naturalHeight
        const canvasRatio = width / height
        let sx = 0, sy = 0, sw = this.bgImageElement.naturalWidth, sh = this.bgImageElement.naturalHeight
        if (imgRatio > canvasRatio) {
          sw = sh * canvasRatio
          sx = (this.bgImageElement.naturalWidth - sw) / 2
        } else {
          sh = sw / canvasRatio
          sy = (this.bgImageElement.naturalHeight - sh) / 2
        }
        ctx.drawImage(this.bgImageElement, sx, sy, sw, sh, 0, 0, width, height)
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(0, 0, width, height)
      } catch (e) {
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, width, height)
      }
      return
    }

    if (style.backgroundType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0, style.backgroundGradient?.from || '#000000')
      grad.addColorStop(1, style.backgroundGradient?.to || '#1a0030')
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = style.backgroundColor || '#000000'
    }
    ctx.fillRect(0, 0, width, height)

    if (style.backgroundType === 'pattern') {
      this.drawPattern(style.backgroundPattern, style.primaryColor, time)
    }
  }

  drawPattern(pattern, color, time) {
    const { ctx, width, height } = this
    const t = time || 0

    if (pattern === 'particles') {
      this.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      // Connect nearby particles (limit to avoid perf issues)
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < Math.min(i + 8, this.particles.length); j++) {
          const p1 = this.particles[i], p2 = this.particles[j]
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = color + Math.floor((1 - dist / 120) * 35).toString(16).padStart(2, '0')
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
    }

    if (pattern === 'stars') {
      for (let i = 0; i < 120; i++) {
        const x = (i * 137.5 + t * 0.01) % width
        const y = (i * 97.3) % height
        const size = (Math.sin(t * 0.002 + i) + 1) * 2
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fillStyle = color + '99'
        ctx.fill()
      }
    }

    if (pattern === 'geometric') {
      ctx.strokeStyle = color + '33'
      ctx.lineWidth = 1
      const size = 80
      for (let x = 0; x < width + size; x += size) {
        for (let y = 0; y < height + size; y += size) {
          const offset = Math.sin(t * 0.001 + x * 0.01 + y * 0.01) * 5
          ctx.beginPath()
          ctx.rect(x - size / 2 + offset, y - size / 2 + offset, size - 2, size - 2)
          ctx.stroke()
        }
      }
    }

    if (pattern === 'matrix') {
      ctx.font = '16px monospace'
      this.matrixColumns.forEach((y, i) => {
        const char = String.fromCharCode(0x30a0 + Math.random() * 96)
        ctx.fillStyle = color
        ctx.fillText(char, i * 20, y)
        this.matrixColumns[i] = y > height + Math.random() * 1000 ? 0 : y + 20
      })
    }

    if (pattern === 'grid') {
      ctx.strokeStyle = color + '22'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
      for (let y = 0; y < height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }
    }

    if (pattern === 'bokeh') {
      this.particles.slice(0, 20).forEach((p, i) => {
        const pulse = (Math.sin(t * 0.002 + i) + 1) / 2
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 20 * pulse)
        grad.addColorStop(0, color + '55')
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 20 * pulse, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    if (pattern === 'aurora') {
      for (let band = 0; band < 3; band++) {
        const grad = ctx.createLinearGradient(0, 0, 0, height)
        const hue = (t * 0.05 + band * 60) % 360
        grad.addColorStop(0, 'transparent')
        grad.addColorStop(0.3 + band * 0.1, `hsla(${hue},100%,60%,0.12)`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)
      }
    }

    if (pattern === 'hexagon') {
      const hexR = 50
      ctx.strokeStyle = color + '33'
      ctx.lineWidth = 1
      for (let row = 0; row < height / (hexR * 1.5) + 1; row++) {
        for (let col = 0; col < width / (hexR * Math.sqrt(3)) + 1; col++) {
          const cx = col * hexR * Math.sqrt(3) + (row % 2 ? hexR * Math.sqrt(3) / 2 : 0)
          const cy = row * hexR * 1.5
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + t * 0.0002
            i === 0 ? ctx.moveTo(cx + hexR * Math.cos(angle), cy + hexR * Math.sin(angle))
                    : ctx.lineTo(cx + hexR * Math.cos(angle), cy + hexR * Math.sin(angle))
          }
          ctx.closePath(); ctx.stroke()
        }
      }
    }

    if (pattern === 'noise') {
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = color + '0f'
        ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2)
      }
    }

    if (pattern === 'lightning') {
      if (Math.random() < 0.04) {
        ctx.strokeStyle = color + 'bb'
        ctx.lineWidth = 2
        ctx.beginPath()
        let lx = Math.random() * width
        ctx.moveTo(lx, 0)
        for (let ly = 0; ly < height; ly += 40) {
          lx += (Math.random() - 0.5) * 100
          ctx.lineTo(lx, ly)
        }
        ctx.stroke()
      }
    }
  }

  drawText(text, style, time) {
    if (!text) return
    const { ctx, width, height } = this
    const t = time || 0
    const fontSize = style.textSize || 100
    const fontFamily = style.font || 'Bebas Neue'
    const effect = style.textEffect || 'none'

    ctx.save()

    // Portrait positioning — center vertically
    let baseY = height / 2
    if (style.textPosition === 'top') baseY = height * 0.25
    if (style.textPosition === 'bottom') baseY = height * 0.75

    let baseX = width / 2
    if (style.textAlign === 'left') baseX = 80
    if (style.textAlign === 'right') baseX = width - 80

    let offsetX = 0, offsetY = 0, scale = 1, alpha = 1

    if (effect === 'bounce') offsetY = Math.abs(Math.sin(t * 0.005)) * -40
    if (effect === 'wave') { offsetY = Math.sin(t * 0.004) * 20; offsetX = Math.cos(t * 0.003) * 10 }
    if (effect === 'zoom-pulse') scale = 1 + Math.sin(t * 0.004) * 0.1
    if (effect === 'shake') { offsetX = (Math.random() - 0.5) * 8; offsetY = (Math.random() - 0.5) * 8 }
    if (effect === 'fade') alpha = Math.min(1, (t % 2000) / 400)
    if (effect === 'slide-up') { offsetY = Math.max(0, 100 - (t % 800) * 0.2); alpha = Math.min(1, (t % 800) / 250) }

    ctx.globalAlpha = alpha
    ctx.translate(baseX + offsetX, baseY + offsetY)
    ctx.scale(scale, scale)
    ctx.font = `${fontSize}px '${fontFamily}', sans-serif`
    ctx.textAlign = style.textAlign === 'left' ? 'left' : style.textAlign === 'right' ? 'right' : 'center'
    ctx.textBaseline = 'middle'

    if (style.shadowBlur > 0) {
      ctx.shadowColor = style.shadowColor || '#ff1fa0'
      ctx.shadowBlur = style.shadowBlur
    }

    if (effect === 'neon-glow') {
      for (let i = 3; i > 0; i--) {
        ctx.shadowColor = style.primaryColor || '#ff1fa0'
        ctx.shadowBlur = i * 30
        ctx.fillStyle = style.primaryColor || '#ff1fa0'
        ctx.fillText(text, 0, 0)
      }
      ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillText(text, 0, 0)
    } else if (effect === 'glitch') {
      const g = Math.random() < 0.1 ? (Math.random() - 0.5) * 15 : 0
      ctx.fillStyle = '#ff0000'; ctx.fillText(text, g, -3)
      ctx.fillStyle = '#00ffff'; ctx.fillText(text, -g, 3)
      ctx.fillStyle = style.primaryColor || '#ffffff'; ctx.fillText(text, 0, 0)
    } else if (effect === 'rainbow') {
      const grad = ctx.createLinearGradient(-300, 0, 300, 0)
      const h = (t * 0.1) % 360
      grad.addColorStop(0, `hsl(${h},100%,60%)`)
      grad.addColorStop(0.5, `hsl(${h + 180},100%,60%)`)
      grad.addColorStop(1, `hsl(${h + 360},100%,60%)`)
      ctx.fillStyle = grad; ctx.fillText(text, 0, 0)
    } else if (effect === 'shimmer') {
      const sp = ((t * 0.001) % 2) - 0.5
      const sg = ctx.createLinearGradient(-300, 0, 300, 0)
      sg.addColorStop(Math.max(0, sp - 0.2), style.primaryColor || '#ffd700')
      sg.addColorStop(Math.min(1, sp + 0.1), '#ffffff')
      sg.addColorStop(Math.min(1, sp + 0.3), style.primaryColor || '#ffd700')
      ctx.fillStyle = sg; ctx.fillText(text, 0, 0)
    } else if (effect === 'matrix') {
      ctx.fillStyle = '#00ff00'
      ctx.font = `${fontSize * 0.9}px 'Space Mono', monospace`
      ctx.fillText(text, 0, 0)
    } else if (effect === 'typewriter') {
      const chars = Math.floor((t % 3000) / 3000 * text.length)
      ctx.fillStyle = style.primaryColor || '#ffffff'
      ctx.fillText(text.slice(0, chars + 1) + (Math.floor(t / 500) % 2 ? '|' : ''), 0, 0)
    } else if (effect === 'flame') {
      for (let f = 3; f > 0; f--) {
        ctx.shadowColor = f === 3 ? '#ff0000' : f === 2 ? '#ff6600' : '#ffff00'
        ctx.shadowBlur = f * 25
        ctx.fillStyle = f === 3 ? '#ffff00' : style.primaryColor
        ctx.fillText(text, 0, -f * 3)
      }
      ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillText(text, 0, 0)
    } else if (effect === 'freeze') {
      ctx.fillStyle = '#a8edea'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 35
      ctx.fillText(text, 0, 0)
      ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1; ctx.strokeText(text, 0, 0)
    } else {
      if (style.strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor || style.primaryColor
        ctx.lineWidth = style.strokeWidth
        ctx.strokeText(text, 0, 0)
      }
      ctx.fillStyle = style.primaryColor || '#ffffff'
      ctx.fillText(text, 0, 0)
    }

    ctx.restore()
  }

  drawTextDimmed(text, style) {
    const { ctx, width, height } = this
    const fontSize = (style.textSize || 100) * 0.8
    ctx.save()
    let baseY = height / 2
    if (style.textPosition === 'top') baseY = height * 0.25
    if (style.textPosition === 'bottom') baseY = height * 0.75
    ctx.font = `${fontSize}px '${style.font || 'Bebas Neue'}', sans-serif`
    ctx.textAlign = style.textAlign === 'left' ? 'left' : style.textAlign === 'right' ? 'right' : 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff22'
    const x = style.textAlign === 'left' ? 80 : style.textAlign === 'right' ? width - 80 : width / 2
    ctx.fillText(text, x, baseY)
    ctx.restore()
  }

  renderFrame(currentTime, words, style) {
    const timeMs = currentTime * 1000
    const activeWord = words.find(w => timeMs >= w.start * 1000 && timeMs < w.end * 1000)
    const upcomingWord = words.find(w => w.start * 1000 > timeMs)
    this.drawBackground(style, timeMs)
    if (!activeWord && upcomingWord) {
      this.ctx.globalAlpha = 0.25
      this.drawTextDimmed(upcomingWord.word, style)
      this.ctx.globalAlpha = 1
    }
    if (activeWord) this.drawText(activeWord.word, style, timeMs)
  }

  destroy() {}
}
