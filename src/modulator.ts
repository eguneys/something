
class Modulation {
    constructor(readonly source: Parameter, readonly amount: number) { }
}

export class Parameter {
    baseValue = 0
    modulations: Modulation[] = []

    push_modulation(m: Modulation) {
        this.modulations.push(m)
    }

    getValue() {
        let value = this.baseValue

        for (let mod of this.modulations) {
            value += mod.source.getValue() * mod.amount
        }

        return value
    }
}

export class Oscillator {

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


        return Math.sin(this.phase * Math.PI * 2) * gain
    }

}

export class Voice {
    oscillators: Oscillator[] = []
    //envelopes: Envelope[] = []
    //lfos: LFO[] = []
}