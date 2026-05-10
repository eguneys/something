import { BassVoice, Instrument, Mixer } from './modulator';

class SynthProcessor extends AudioWorkletProcessor {

    mixer: Mixer

    lead: Instrument
    bass: Instrument

    constructor() {
        super();

        this.mixer = new Mixer()

        const lead = new Instrument<BassVoice>(sampleRate, BassVoice)
        const bass = new Instrument<BassVoice>(sampleRate, BassVoice)

        this.mixer.add(lead)
        this.mixer.add(bass)
        this.lead = lead
        this.bass = bass

        this.port.onmessage = (event) => {

            let instrument
            let settings
            if (event.data.bass) {
                instrument = this.bass
                settings = event.data.bass
            } else if (event.data.lead) {
                instrument = this.lead
                settings = event.data.lead
            }

            if (instrument) {
                let { envelope, noteOn, noteOff } = settings

                if (envelope) {
                    if (envelope.amp) {
                        instrument.envelopes.amp = envelope.amp
                    }
                    if (envelope.filter) {
                        instrument.envelopes.filter = envelope.filter
                    }
                    if (envelope.pitch) {
                        instrument.envelopes.pitch = envelope.pitch
                    }
                } else if (noteOn) {
                    bass.noteOn(noteOn)
                } else if (noteOff) {
                    bass.noteOff(noteOff)
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

        //this.mixer.processBlock()

        for (let i = 0; i < channel.length; i++) {

            //let sampleSinceStart = (frame + i) - this.startFrame
            //const timeSinceStart = sampleSinceStart / sampleRate

            let sample = this.mixer.process()
            channel[i] = sample
        }

        return true
    }
}

registerProcessor('synth-processor', SynthProcessor)