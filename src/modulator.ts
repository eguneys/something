import Envelope from "./envelope"


class Modulation {
    constructor(readonly source: Parameter, readonly amount: number) { }
}

interface Signal {
    process(): number
}

class Parameter {
    baseValue = 0
    modulations: Modulation[] = []


    addModulation(source: Parameter, amount: number) {
        this.modulations.push(new Modulation(source, amount))
    }

    getValue() {
        let value = this.baseValue

        for (const mod of this.modulations) {
            value += mod.source.getValue() * mod.amount
        }
        return value
    }
}


/*

            if (this.phase < 0.5) {
                sample = 1
            } else {
                sample = -1;
            }

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


*/
export class Oscillator implements Signal {

    frequency = new Parameter()
    gain = new Parameter()
    pulseWidth = new Parameter()

    phase = 0

    constructor(readonly sampleRate: number) {}

    process() {

        let sampleRate = this.sampleRate

        let freq = this.frequency.getValue()
        let gain = this.gain.getValue()

        this.phase += freq / sampleRate

        if (this.phase >= 1) {
            this.phase -= 1;
        }

        return Math.sin(this.phase * Math.PI * 2) * gain
    }

}

export class Voice implements Signal {
    
    oscillator_a: Oscillator
    oscillator_b: Oscillator

    ampEnvelope: Envelope

    constructor(sampleRate: number) {
        this.oscillator_a = new Oscillator(sampleRate)
        this.oscillator_b = new Oscillator(sampleRate)
        this.ampEnvelope = new Envelope(sampleRate)

        this.oscillator_a.gain.baseValue = 1
        this.oscillator_b.gain.baseValue = 1
    }

    noteOn(freq: number) {
        this.oscillator_a.frequency.baseValue = freq
        this.oscillator_b.frequency.baseValue = freq

        this.ampEnvelope.trigger()
    }

    noteOff() {
        this.ampEnvelope.release()
    }

    step_audio_rate() {
        this.ampEnvelope.step()
    }

    process() {

        let a = this.oscillator_a.process()
        let b = this.oscillator_b.process()

        let mixed = (a + b) * 0.5

        mixed *= this.ampEnvelope.value

        return mixed
    }
}