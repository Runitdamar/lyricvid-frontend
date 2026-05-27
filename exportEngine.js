export class ExportEngine {
  constructor(canvas, audioUrl) {
    this.canvas = canvas
    this.audioUrl = audioUrl
    this.mediaRecorder = null
    this.chunks = []
  }

  async exportAsWebM(onProgress, duration) {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = this.canvas.captureStream(30)

        if (this.audioUrl) {
          const audioCtx = new AudioContext()
          const buf = await fetch(this.audioUrl).then(r => r.arrayBuffer())
          const decoded = await audioCtx.decodeAudioData(buf)
          const source = audioCtx.createBufferSource()
          source.buffer = decoded
          const dest = audioCtx.createMediaStreamDestination()
          source.connect(dest)
          source.start(0)
          dest.stream.getAudioTracks().forEach(t => stream.addTrack(t))
        }

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
  ? 'video/webm;codecs=vp9'
  : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
  ? 'video/webm;codecs=vp8'
  : MediaRecorder.isTypeSupported('video/webm')
  ? 'video/webm'
  : ''

this.mediaRecorder = new MediaRecorder(stream, {
  ...(mimeType && { mimeType }),
  videoBitsPerSecond: 8000000
})

        this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.chunks.push(e.data) }
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.chunks, { type: 'video/webm' })
          resolve({ url: URL.createObjectURL(blob), blob })
        }
        this.mediaRecorder.onerror = reject
        this.mediaRecorder.start(100)

        const startTime = Date.now()
        const interval = setInterval(() => {
          const progress = Math.min(95, ((Date.now() - startTime) / (duration * 1000)) * 100)
          onProgress && onProgress(progress)
        }, 500)

        setTimeout(() => {
          clearInterval(interval)
          this.mediaRecorder.stop()
          onProgress && onProgress(100)
        }, duration * 1000 + 500)

      } catch (err) { reject(err) }
    })
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop()
  }
}
