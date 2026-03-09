// Audio playback utilities

const SAMPLE_RATE = 24000

export class AudioPlayer {
  constructor() {
    this.audioContext = null
    this.source = null
    this.isPlaying = false
    this.onEnded = null
  }

  async playFloat32Array(float32Array, onEnded = null) {
    if (this.isPlaying) this.stop()

    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
    this.onEnded = onEnded

    const buffer = this.audioContext.createBuffer(1, float32Array.length, SAMPLE_RATE)
    buffer.copyFromChannel(float32Array, 0)

    this.source = this.audioContext.createBufferSource()
    this.source.buffer = buffer
    this.source.connect(this.audioContext.destination)

    this.source.onended = () => {
      this.isPlaying = false
      if (this.onEnded) this.onEnded()
    }

    this.source.start()
    this.isPlaying = true
  }

  stop() {
    if (this.source) {
      this.source.stop()
      this.source = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.isPlaying = false
  }
}