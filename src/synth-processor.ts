import { Voice } from './modulator';

class SynthProcessor extends AudioWorkletProcessor {

    voice: Voice

    constructor() {
        super();

        this.voice = new Voice(sampleRate)

        this.port.onmessage = (event) => {
            if (event.data.frequency) {
                this.voice.oscillator_a.frequency.baseValue = event.data.frequency
            }
            if (event.data.envelope) {
                if (event.data.envelope.attack) {
                    this.voice.envelopes[0].set_envelope({
                        attackTimeInSeconds: 0.01,
                        decayTimeInSeconds: 0.01,
                        sustainLevel: 0.1,
                        releaseTimeInSeconds: 10
                    })
                } else if (event.data.envelope.release) {
                    this.voice.release()
                }
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


        for (let i = 0; i < channel.length; i++) {

            this.voice.step_audio_rate()


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