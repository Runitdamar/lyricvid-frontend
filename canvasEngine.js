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
    this.lastRenderedLineId = -1
    this.lineEnterTime = 0
    this.initParticles()
    this.initMatrix()
  }

  initParticles() {
    this.particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 3 + 1,
      alpha: Math.random() * 0.5 + 0.2
    }))
  }

  initMatrix() {
    this.matrixColumns = Array.from({ length: Math.floor(this.width / 20) }, () => Math.random() * this.height)
  }

  setBackgroundVideo(el) { this.bgVideoElement = el }
  setBackgroundImage(el) { this.bgImageElement = el }

  drawBackground(style, time) {
    const { ctx, width, height } = this
    ctx.clearRect(0, 0, width, height)

    if (style.backgroundType === 'video' && this.bgVideoElement) {
      try { ctx.drawImage(this.bgVideoElement, 0, 0, width, height) } catch (e) {}
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, width, height)
      return
    }

    if (style.backgroundType === 'image' && this.bgImageElement) {
      try {
        const img = this.bgImageElement
        const imgR = img.naturalWidth / img.naturalHeight
        const canR = width / height
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
        if (imgR > canR) { sw = sh * canR; sx = (img.naturalWidth - sw) / 2 }
        else { sh = sw / canR; sy = (img.naturalHeight - sh) / 2 }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
      } catch (e) {}
      ctx.fillStyle = `rgba(0,0,0,${(style.imageOverlay || 35) / 100})`
      ctx.fillRect(0, 0, width, height)
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
    if (style.backgroundType === 'pattern') this.drawPattern(style.backgroundPattern, style.primaryColor, time)
  }

  drawPattern(pattern, color, time) {
    const { ctx, width, height } = this
    const t = time || 0

    if (pattern === 'particles') {
      this.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < Math.min(i + 6, this.particles.length); j++) {
          const d = Math.hypot(this.particles[i].x - this.particles[j].x, this.particles[i].y - this.particles[j].y)
          if (d < 150) {
            ctx.beginPath(); ctx.moveTo(this.particles[i].x, this.particles[i].y)
            ctx.lineTo(this.particles[j].x, this.particles[j].y)
            ctx.strokeStyle = color + Math.floor((1 - d / 150) * 30).toString(16).padStart(2, '0')
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
    }
    if (pattern === 'stars') {
      for (let i = 0; i < 100; i++) {
        const x = (i * 137.5 + t * 0.008) % width
        const y = (i * 97.3) % height
        const s = (Math.sin(t * 0.002 + i) + 1) * 2
        ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2)
        ctx.fillStyle = color + '88'; ctx.fill()
      }
    }
    if (pattern === 'geometric') {
      ctx.strokeStyle = color + '25'; ctx.lineWidth = 1
      for (let x = 0; x < width + 80; x += 80) {
        for (let y = 0; y < height + 80; y += 80) {
          const o = Math.sin(t * 0.001 + x * 0.01 + y * 0.01) * 5
          ctx.beginPath(); ctx.rect(x - 40 + o, y - 40 + o, 78, 78); ctx.stroke()
        }
      }
    }
    if (pattern === 'matrix') {
      ctx.font = '16px monospace'
      this.matrixColumns.forEach((y, i) => {
        ctx.fillStyle = color
        ctx.fillText(String.fromCharCode(0x30a0 + Math.random() * 96), i * 20, y)
        this.matrixColumns[i] = y > height + Math.random() * 1000 ? 0 : y + 20
      })
    }
    if (pattern === 'grid') {
      ctx.strokeStyle = color + '20'; ctx.lineWidth = 1
      for (let x = 0; x < width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
      for (let y = 0; y < height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }
    }
    if (pattern === 'bokeh') {
      this.particles.slice(0, 15).forEach((p, i) => {
        const pulse = (Math.sin(t * 0.002 + i) + 1) / 2
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 25 * pulse)
        g.addColorStop(0, color + '44'); g.addColorStop(1, 'transparent')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 25 * pulse, 0, Math.PI * 2); ctx.fill()
      })
    }
    if (pattern === 'aurora') {
      for (let b = 0; b < 3; b++) {
        const g = ctx.createLinearGradient(0, 0, 0, height)
        const h = (t * 0.04 + b * 60) % 360
        g.addColorStop(0, 'transparent')
        g.addColorStop(0.3 + b * 0.1, `hsla(${h},100%,60%,0.1)`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height)
      }
    }
    if (pattern === 'hexagon') {
      const r = 50; ctx.strokeStyle = color + '30'; ctx.lineWidth = 1
      for (let row = 0; row < height / (r * 1.5) + 1; row++) {
        for (let col = 0; col < width / (r * 1.73) + 1; col++) {
          const cx = col * r * 1.73 + (row % 2 ? r * 0.87 : 0), cy = row * r * 1.5
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i + t * 0.0001
            i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
          }
          ctx.closePath(); ctx.stroke()
        }
      }
    }
    if (pattern === 'lightning' && Math.random() < 0.03) {
      ctx.strokeStyle = color + 'aa'; ctx.lineWidth = 2; ctx.beginPath()
      let lx = Math.random() * width; ctx.moveTo(lx, 0)
      for (let ly = 0; ly < height; ly += 40) { lx += (Math.random() - 0.5) * 120; ctx.lineTo(lx, ly) }
      ctx.stroke()
    }
    if (pattern === 'noise') {
      for (let i = 0; i < 150; i++) {
        ctx.fillStyle = color + '0e'
        ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2)
      }
    }
  }

  // Main line renderer - smooth transitions between lyric lines
  renderLine(text, style, alpha, offsetY = 0) {
    if (!text) return
    const { ctx, width, height } = this
    const fontSize = style.textSize || 72
    const fontFamily = style.font || 'Bebas Neue'
    const effect = style.textEffect || 'none'

    ctx.save()
    ctx.globalAlpha = alpha

    let baseY = height / 2
    if (style.textPosition === 'top') baseY = height * 0.22
    if (style.textPosition === 'bottom') baseY = height * 0.78

    let baseX = width / 2
    if (style.textAlign === 'left') baseX = 80
    if (style.textAlign === 'right') baseX = width - 80

    ctx.translate(baseX, baseY + offsetY)

    // Wrap long text
    const maxWidth = width - 120
    ctx.font = `${fontSize}px '${fontFamily}', sans-serif`
    ctx.textAlign = style.textAlign === 'left' ? 'left' : style.textAlign === 'right' ? 'right' : 'center'
    ctx.textBaseline = 'middle'

    // Word wrap
    const words = text.split(' ')
    const lines = []
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current); current = word
      } else { current = test }
    }
    if (current) lines.push(current)

    const lineHeight = fontSize * 1.3
    const totalH = lines.length * lineHeight
    const startY = -totalH / 2 + lineHeight / 2

    lines.forEach((line, li) => {
      const y = startY + li * lineHeight

      if (style.shadowBlur > 0) {
        ctx.shadowColor = style.shadowColor || '#ff1fa0'
        ctx.shadowBlur = style.shadowBlur
      }

      if (effect === 'neon-glow') {
        for (let i = 3; i > 0; i--) {
          ctx.shadowColor = style.primaryColor; ctx.shadowBlur = i * 25
          ctx.fillStyle = style.primaryColor; ctx.fillText(line, 0, y)
        }
        ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillText(line, 0, y)
      } else if (effect === 'glitch') {
        const g = Math.random() < 0.08 ? (Math.random() - 0.5) * 12 : 0
        ctx.fillStyle = '#ff0000'; ctx.fillText(line, g, y - 2)
        ctx.fillStyle = '#00ffff'; ctx.fillText(line, -g, y + 2)
        ctx.fillStyle = style.primaryColor; ctx.fillText(line, 0, y)
      } else if (effect === 'rainbow') {
        const grad = ctx.createLinearGradient(-maxWidth / 2, 0, maxWidth / 2, 0)
        const h = (Date.now() * 0.05) % 360
        grad.addColorStop(0, `hsl(${h},100%,60%)`)
        grad.addColorStop(0.5, `hsl(${h + 180},100%,60%)`)
        grad.addColorStop(1, `hsl(${h + 360},100%,60%)`)
        ctx.fillStyle = grad; ctx.fillText(line, 0, y)
      } else if (effect === 'shimmer') {
        const sp = ((Date.now() * 0.001) % 2) - 0.5
        const sg = ctx.createLinearGradient(-300, 0, 300, 0)
        sg.addColorStop(Math.max(0, sp - 0.2), style.primaryColor || '#ffd700')
        sg.addColorStop(Math.min(1, sp + 0.1), '#ffffff')
        sg.addColorStop(Math.min(1, sp + 0.3), style.primaryColor || '#ffd700')
        ctx.fillStyle = sg; ctx.fillText(line, 0, y)
      } else if (effect === 'flame') {
        for (let f = 3; f > 0; f--) {
          ctx.shadowColor = f === 3 ? '#ff0000' : f === 2 ? '#ff6600' : '#ffff00'
          ctx.shadowBlur = f * 20
          ctx.fillStyle = f === 3 ? '#ffff00' : style.primaryColor
          ctx.fillText(line, 0, y - f * 2)
        }
        ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillText(line, 0, y)
      } else if (effect === 'freeze') {
        ctx.fillStyle = '#a8edea'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 30
        ctx.fillText(line, 0, y)
        ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1; ctx.strokeText(line, 0, y)
      } else if (effect === 'matrix') {
        ctx.fillStyle = '#00ff00'
        ctx.font = `${fontSize * 0.9}px 'Space Mono', monospace`
        ctx.fillText(line, 0, y)
      } else if (effect === 'bounce') {
        const bounceY = Math.abs(Math.sin(Date.now() * 0.005)) * -15
        if (style.strokeWidth > 0) { ctx.strokeStyle = style.strokeColor; ctx.lineWidth = style.strokeWidth; ctx.strokeText(line, 0, y + bounceY) }
        ctx.fillStyle = style.primaryColor; ctx.fillText(line, 0, y + bounceY)
      } else if (effect === 'wave') {
        const waveY = Math.sin(Date.now() * 0.004) * 10
        ctx.fillStyle = style.primaryColor; ctx.fillText(line, 0, y + waveY)
      } else if (effect === 'shake') {
        const sx = (Math.random() - 0.5) * 6, sy = (Math.random() - 0.5) * 6
        ctx.fillStyle = style.primaryColor; ctx.fillText(line, sx, y + sy)
      } else if (effect === 'zoom-pulse') {
        const sc = 1 + Math.sin(Date.now() * 0.004) * 0.06
        ctx.save(); ctx.scale(sc, sc); ctx.fillStyle = style.primaryColor; ctx.fillText(line, 0, y / sc); ctx.restore()
      } else {
        if (style.strokeWidth > 0) {
          ctx.strokeStyle = style.strokeColor || style.primaryColor
          ctx.lineWidth = style.strokeWidth; ctx.strokeText(line, 0, y)
        }
        ctx.fillStyle = style.primaryColor || '#ffffff'; ctx.fillText(line, 0, y)
      }
    })

    ctx.restore()
  }

  renderFrame(currentTime, lines, style) {
    const t = currentTime * 1000
    this.drawBackground(style, t)
    if (!lines || lines.length === 0) return

    const activeLine = lines.find(l => currentTime >= l.start && currentTime <= l.end)
    const FADE_DURATION = 0.3 // seconds for fade in/out

    if (!activeLine) return

    // Track line changes
    if (activeLine.id !== this.lastRenderedLineId) {
      this.lastRenderedLineId = activeLine.id
      this.lineEnterTime = currentTime
    }

    const timeInLine = currentTime - activeLine.start
    const timeLeftInLine = activeLine.end - currentTime
    const transition = style.lineTransition || 'fade'

    let alpha = 1
    let offsetY = 0

    if (transition === 'fade') {
      if (timeInLine < FADE_DURATION) alpha = timeInLine / FADE_DURATION
      else if (timeLeftInLine < FADE_DURATION) alpha = timeLeftInLine / FADE_DURATION

    } else if (transition === 'fadeInOut') {
      const fadeOut = FADE_DURATION * 1.5
      if (timeInLine < FADE_DURATION) alpha = timeInLine / FADE_DURATION
      else if (timeLeftInLine < fadeOut) alpha = Math.max(0, timeLeftInLine / fadeOut)

    } else if (transition === 'slideUp') {
      if (timeInLine < FADE_DURATION) {
        alpha = timeInLine / FADE_DURATION
        offsetY = (1 - alpha) * 80
      } else if (timeLeftInLine < FADE_DURATION) {
        alpha = timeLeftInLine / FADE_DURATION
        offsetY = -(1 - alpha) * 80
      }
    }

    this.renderLine(activeLine.text, style, Math.max(0, Math.min(1, alpha)), offsetY)
  }

  destroy() {}
}
