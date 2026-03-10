// Audio recording utilities with resampling to 24kHz

const SAMPLE_RATE = 24000

/**
 * Record audio from microphone and resample to 24kHz
 */
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null
    this.audioContext = null
    this.stream = null
    this.chunks = []
    this.isRecording = false
  }

  async startRecording() {
    if (this.isRecording) return

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
      this.mediaRecorder = new MediaRecorder(this.stream)

      this.chunks = []
      this.mediaRecorder.ondataavailable = (event) => {
        this.chunks.push(event.data)
      }

      this.mediaRecorder.start()
      this.isRecording = true
    } catch (error) {
      throw new Error('Failed to start recording: ' + error.message)
    }
  }

  async stopRecording() {
    if (!this.isRecording) return null

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.chunks, { type: 'audio/webm' })
          const arrayBuffer = await blob.arrayBuffer()
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

          // Convert to Float32Array at target sample rate
          const float32Array = audioBuffer.getChannelData(0)

          // Clean up
          this.stream.getTracks().forEach(track => track.stop())
          this.audioContext.close()
          this.isRecording = false

          resolve(float32Array)
        } catch (err) {
          this.stream.getTracks().forEach(track => track.stop())
          this.audioContext.close()
          this.isRecording = false
          reject(err)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  cancelRecording() {
    if (this.isRecording) {
      this.mediaRecorder.stop()
      this.stream.getTracks().forEach(track => track.stop())
      this.audioContext.close()
      this.isRecording = false
    }
  }
}

/**
 * Load audio file and resample to 24kHz
 */
export async function loadAudioFile(file) {
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
  const arrayBuffer = await file.arrayBuffer()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const float32Array = audioBuffer.getChannelData(0)
    return float32Array
  } finally {
    audioContext.close()
  }
}