import { Voice } from './modulator';

class SynthProcessor extends AudioWorkletProcessor {

    voice: Voice

    constructor() {
        super();

        this.voice = new Voice(sampleRate)

        this.port.onmessage = (event) => {
            if (event.data.envelope) {
                if (event.data.envelope.amp) {
                    this.voice.ampEnvelope.set_envelope(event.data.envelope.amp)
                } 
                if (event.data.envelope.filter) {
                    this.voice.filterEnvelope.set_envelope(event.data.envelope.filter)
                } 
                if (event.data.envelope.pitch) {
                    this.voice.pitchEnvelope.set_envelope(event.data.envelope.pitch)
                }
            } else if (event.data.frequency) {
                this.voice.noteOn(event.data.frequency)
            } else if (event.data.noteOff) {
                this.voice.noteOff()
            }
        }
    }

    startFrame?: number

    process(_inputs: Float32Array[][], outputs: Float32Array[][], _parameters: Record<string, Float32Array>) {
        const output = outputs[0]
        const channel = output[0]

        const frame = currentFrame

        if (!this.startFrame) {
            this.startFrame = frame
        }

        this.voice.processBlock()

        for (let i = 0; i < channel.length; i++) {

            //let sampleSinceStart = (frame + i) - this.startFrame
            //const timeSinceStart = sampleSinceStart / sampleRate


            let sample_a = this.voice.process()

            let sample = sample_a

            channel[i] = sample
        }

        return true
    }
}

registerProcessor('synth-processor', SynthProcessor)