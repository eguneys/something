import Envelope from './envelope'

class SynthProcessor extends AudioWorkletProcessor {

    constructor() {
        super();
        this.phase = 0;
        this.frequency = 110;

        this.envelope = new Envelope(sampleRate)

        this.port.onmessage = (event) => {
            if (event.data.frequency) {
                this.frequency = event.data.frequency
            }
            if (event.data.envelope) {
                if (event.data.envelope.attack) {
                    this.envelope.set_envelope({
                        attackTimeInSeconds: 0.01,
                        decayTimeInSeconds: 0.1,
                        sustainLevel: 0.7,
                        releaseTimeInSeconds: 0.3
                    })
                } else if (event.data.envelope.release) {
                    this.envelope.release()
                }
            }
        }
    }

    process(inputs, outputs) {
        const output = outputs[0]
        const channel = output[0]

        const frame = currentFrame

        if (!this.startFrame) {
            this.startFrame = frame
        }


        for (let i = 0; i < channel.length; i++) {

            this.envelope.step()
            let sampleSinceStart = (frame + i) - this.startFrame
            const timeSinceStart = sampleSinceStart / sampleRate

            let envelope = this.envelope.value
            this.phase += this.frequency / sampleRate;

            if (this.phase >= 1) {
                this.phase -= 1;
            }

            let sample;

            if (this.phase < 0.5) {
                sample = 1
            } else {
                sample = -1;
            }

            let phase = this.phase

            let p = phase

            p = p * p
            //phase  = phase * phase

            let width = 0

            if (timeSinceStart < 0.01) {
                width = 0.2 + timeSinceStart * 30
            } else {
                width = 0.5 + Math.sin(timeSinceStart * 20) * 0.3
            }

            //sample = phase * 2 - 1
            sample = Math.sin(phase * Math.PI * 2)
            //sample = 1 - Math.abs(phase * 2 - 1) * 2
            //sample = phase < width ? 1 : - 1

            //sample = Math.sin(2 * Math.PI * frequency * time)


            //sample = Math.max(-0.98, Math.min(0.98, sample))



            //sample = Math.sin(p * Math.PI * 2)

            let folding = false
            if (folding) {
                sample *= 4;

                while (sample > 1 || sample < -1) {

                    if (sample > 1)
                        sample = 2 - sample;

                    if (sample < -1)
                        sample = -2 - sample;
                }
            }




            const steps = 6;
            //sample = Math.round(sample * steps) / steps;

            sample *= envelope

            let drive = 0.7
            //sample = Math.tanh(sample * drive)

            channel[i] = sample
        }

        return true
    }
}

registerProcessor('synth-processor', SynthProcessor)