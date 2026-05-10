import type { Modulator } from "./modulator"

export class Velocity implements Modulator {
    private value: number = 0

    setVelocity(velocity: number) {
        this.value = Math.min(127, Math.max(0, velocity))
    }

    getValue() {
        return this.value / 127
    }
}


export class PitchBend implements Modulator {
    private value: number = 0

    setBend(bendValue: number) {
        this.value = Math.min(8191, Math.max(-8192, bendValue))
    }

    getValue() {
        if (this.value < 0) {
            return this.value / 8192 // -1 to 0
        } else {
            return this.value / 8191 // 0 to 1
        }
    }
}

export class Aftertouch implements Modulator {
    private pressure: number = 0

    setPressure(pressure: number) {
        this.pressure = Math.min(127, Math.max(0, pressure))
    }

    getValue() {
        return this.pressure / 127
    }
}


export class RandomModulator implements Modulator {
    private lastValue = 0
    private triggerRate: number
    private phase: number = 0
    private sampleRate: number

    constructor(sampleRate: number, triggerRate: number = 10) {
        this.sampleRate = sampleRate
        this.triggerRate = triggerRate
    }

    getValue() {
        return this.lastValue
    }

    process() {
        this.phase += this.triggerRate / this.sampleRate

        if (this.phase >= 1) {
            this.phase -= 1
            this.lastValue = Math.random() * 2 - 1
        }
        return this.lastValue
    }
}

export class Constant implements Modulator {
    constructor(private value: number) {}

    getValue(): number {
        return this.value
    }
}


export class ModulatorSum implements Modulator {
    constructor(private modulators: Modulator[]) {}


    getValue() {
        let sum = 0

        for (const mod of this.modulators) {
            sum += mod.getValue()
        }
        return sum
    }
}

export class ScaledModulator implements Modulator {
    constructor(private source: Modulator,
        private scale: number = 1,
        private offset: number = 0) {}

    getValue() {
        return this.source.getValue() * this.scale + this.offset
    }
}