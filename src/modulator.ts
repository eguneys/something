import Envelope from "./envelope"
import { StateVariableFilter } from "./filter"


export interface Signal {
    process(input?: number): number
}

export class Parameter {
    private normalized = 0.5  // Store normalized value (0-1) internally
    
    private minValue: number
    private maxValue: number
    
    private modulationSum = 0

    // Smoothed value actually used by DSP
    private currentValue = 0

    // 0..1
    // smaller = smoother/slower
    // larger = snappier/faster
    private smoothingFactor: number

    constructor(
        minValue: number,
        maxValue: number,
        defaultValue: number,
        smoothingFactor = 0.001
    ) {

        if (minValue <= 0) {
            throw new Error('minValue must be > 0 for exponential mapping')
        }
        if (maxValue <= minValue) {
            throw new Error('maxVlaue must be greater than minValue')
        }

        this.minValue = minValue
        this.maxValue = maxValue

        // Convert defaultValue to normalized
        this.normalized = this.valueToNormalized(defaultValue)
        this.currentValue = defaultValue

        this.smoothingFactor = smoothingFactor
    }

    setNormalizedValue(normalized: number) {
        this.normalized = Math.max(0, Math.min(1, normalized))
    }

    setValue(value: number, is_immediate?: boolean) {
        // Convert value to normalized for storage
        this.normalized = this.valueToNormalized(this.clamp(value))
        if (is_immediate) {
            this.currentValue = this.getValueFromNormalized()
        }
    }

    // Call once per sample (or audio frame)
    process() {
        // Get the target value from normalized + modulation
        const target = this.clamp(
            this.getValueFromNormalized() + this.modulationSum
        )

        // One-pole smoothing
        this.currentValue +=
            (target - this.currentValue) * this.smoothingFactor
    }

    getValue() {
        return this.currentValue
    }
    
    getNormalizedValue() {
        return this.normalized
    }

    modulate(amount: number) {
        this.modulationSum += amount
    }

    resetModulation() {
        this.modulationSum = 0
    }

    setSmoothing(factor: number) {
        this.smoothingFactor = Math.min(1, Math.max(0, factor))
    }

    private getValueFromNormalized(): number {
        return this.minValue *
            Math.pow(this.maxValue / this.minValue, this.normalized)
    }

    private valueToNormalized(value: number): number {
        return Math.log(value / this.minValue) / Math.log(this.maxValue / this.minValue)
    }

    private clamp(value: number) {
        return Math.min(this.maxValue, Math.max(this.minValue, value))
    }
}

/*
            let p = phase

            p = p * p
            //phase  = phase * phase

            let width = 0

            if (timeSinceStart < 0.01) {
                width = 0.2 + timeSinceStart * 30
            } else {
                width = 0.5 + Math.sin(timeSinceStart * 20) * 0.3
            }

            //sample = phase < width ? 1 : - 1



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

*/
export class Oscillator implements Signal {

    frequency: Parameter
    gain: Parameter
    pulseWidth: Parameter

    phase = 0

    waveform: WaveForm = 'sine'

    constructor(readonly sampleRate: number) {
        this.frequency = new Parameter(20, 20000, 440)
        this.gain = new Parameter(0.001, 1, 0.5)
        this.pulseWidth = new Parameter(0.01, 0.99, 0.5)
    }

    process() {

        this.frequency.process()
        this.gain.process()
        this.pulseWidth.process()

        let sampleRate = this.sampleRate

        let freq = this.frequency.getValue()
        let gain = this.gain.getValue()

        this.phase += freq / sampleRate

        if (this.phase >= 1) {
            this.phase -= 1;
        }


        let value = getWaveformValue(this.waveform, this.pulseWidth, this.phase, freq / sampleRate)

        return value * gain
    }

}

export type WaveForm = 'sine' | 'triangle' | 'sawtooth' | 'square'

export class LFO implements Signal, Modulator {
    frequency: Parameter
    gain: Parameter
    pulseWidth: Parameter

    phase = 0

    waveform: WaveForm = 'sine'

    syncToTempo: boolean = false
    tempoDivision = 1

    constructor(readonly sampleRate: number) {
        this.frequency = new Parameter(0.1, 20000, 440)
        this.gain = new Parameter(0.001, 1, 0.5)
        this.pulseWidth = new Parameter(0.01, 0.99, 0.5)
    }

    getValue(): number {
        let value = getWaveformValue(this.waveform, this.pulseWidth, this.phase, this.frequency.getValue() / this.sampleRate)
        return value * this.gain.getValue()
    }

    process( ){


        this.frequency.process()
        this.gain.process()
        this.pulseWidth.process()

        let sampleRate = this.sampleRate

        let freq = this.frequency.getValue()
        let gain = this.gain.getValue()


        this.phase += freq / sampleRate

        if (this.phase >= 1) {
            this.phase -= 1
        }

        let value = getWaveformValue(this.waveform, this.pulseWidth, this.phase, freq / sampleRate)

        return value * gain
    }

}


function getWaveformValue(waveform: WaveForm, pulseWidth: Parameter, phase: number, phaseIncrement: number): number {
    let res = 0
    switch (waveform) {
        case 'sine':
            return Math.sin(phase * Math.PI * 2)
        case 'triangle':
            return 1 - Math.abs(phase * 4 - 2)
        case 'sawtooth':
            res =  phase * 2 - 1
            res -= polyBlep(phase, phaseIncrement)
            return res
        case 'square':
            let pw = pulseWidth.getValue()
            res =  phase < pw ? 1 : -1
            res += polyBlep(phase, phaseIncrement)
            let t2 = (phase - pulseWidth.getValue() + 1) % 1
            res -= polyBlep(t2, phaseIncrement)
            return res
        default:
            return Math.sin(phase * Math.PI * 2)
    }
}

export class Voice implements Signal {
    
    oscillator_a: Oscillator

    ampEnvelope: Envelope

    filter: StateVariableFilter

    filterEnvelope: Envelope

    lfo: LFO

    modMatrix: ModulationMatrix

    constructor(sampleRate: number) {

        this.lfo = new LFO(sampleRate)

        this.oscillator_a = new Oscillator(sampleRate)
        this.ampEnvelope = new Envelope(sampleRate)

        this.oscillator_a.waveform = 'square'

        this.modMatrix = new ModulationMatrix()

        this.filterEnvelope = new Envelope(sampleRate)
        this.filter = new StateVariableFilter(sampleRate)

        this.filter.type = 'lowpass'
        this.filter.gain.setValue(1)
        this.filter.resonance.setValue(1)
        this.filter.cutoff.setValue(12000)

        this.oscillator_a.pulseWidth.setValue(0.5)
        this.modMatrix.connect(this.filterEnvelope, this.filter.cutoff, -9060)
        this.modMatrix.connect(this.lfo, this.oscillator_a.pulseWidth, 0.333)

        this.lfo.frequency.setValue(0.5)

    }

    noteOn(freq: number) {
        this.oscillator_a.frequency.setValue(freq)

        this.ampEnvelope.trigger()
        this.filterEnvelope.trigger()
    }

    noteOff() {
        this.ampEnvelope.release()
        this.filterEnvelope.release()
    }

    //drift = 1
    processBlock() {
        //this.lfo.process()
        //this.drift += this.drift * 0.1 * Math.sign(0.5 - Math.random())
        //let drift = this.drift
        //this.oscillator_a.frequency.setValue(this.oscillator_a.frequency.getValue() * 1 + drift, true)
    }
    
    process() {
        this.lfo.process()

        this.ampEnvelope.process()
        this.filterEnvelope.process()

        this.modMatrix.process()


        let a = this.oscillator_a.process()
        let mixed = a

        let drive = 1
        mixed = Math.tanh(mixed * drive)

        mixed = this.filter.process(mixed)

        mixed = Math.tanh(mixed * 1.5)

        mixed *= this.ampEnvelope.getValue()

        return mixed
    }
}

export interface Modulator {
    getValue(): number

    reset?(): void

    trigger?(): void
    release?(): void

    process?(): number
}

interface ModulationRoute {
    source: Modulator
    destination: Parameter
    amount: number
}


export class ModulationMatrix {
    private routes: ModulationRoute[] = []

    connect(source: Modulator, destination: Parameter, amount: number) {
        this.routes.push({ source, destination, amount })
    }

    disconnect(source: Modulator, destination: Parameter) {
        this.routes = this.routes.filter(route =>
            route.source !== source || route.destination !== destination
        )
    }

    process() {

        const destinations = new Set<Parameter>()

        for (const route of this.routes) {
            destinations.add(route.destination)
        }

        for (const destination of destinations) {
            destination.resetModulation()
        }

        for (const route of this.routes) {
            let sourceValue = route.source.getValue()
            let modulation = sourceValue * route.amount

            route.destination.modulate(modulation)
        }
    }
}


function polyBlep(t: number, dt: number): number {

    // rising edge
    if (t < dt) {
        t /= dt
        return t + t - t * t - 1
    }

    // falling edge
    if (t > 1 - dt) {
        t = (t - 1) / dt
        return t * t + t + t + 1
    }

    return 0
}