class SynthProcessor extends AudioWorkletProcessor {

    constructor() {
        super();
        this.phase = 0;
        this.frequency = 110;

        this.port.onmessage = (event) => {
            if (event.data.frequency) {
                this.frequency = event.data.frequency
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

            let sampleSinceStart = (frame + i) - this.startFrame
            const timeSinceStart = sampleSinceStart / sampleRate

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

            //phase  = phase * phase

            let width = 0

            if (timeSinceStart < 0.01) {
                width = 0.2 + timeSinceStart * 30
            } else {
                width = 0.5 + Math.sin(timeSinceStart * 20) * 0.3
            }

            //sample = phase * 2 - 1
            //sample = Math.sin(phase * Math.PI * 2)
            //sample = 1 - Math.abs(phase * 2 - 1) * 2
            //sample = phase < width ? 1 : - 1

            //sample = Math.sin(2 * Math.PI * frequency * time)


            sample = Math.max(-0.98, Math.min(0.98, sample))

            channel[i] = sample
        }

        return true
    }
}

registerProcessor('synth-processor', SynthProcessor)