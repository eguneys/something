import Envelope from "./envelope"
import { StateVariableFilter } from "./filter"


export interface Signal {
    process(input?: number): number
}

export class Parameter {
    private baseValue = 0
    private modulationSum: number = 0

    private minValue: number
    private maxValue: number


    constructor(minValue: number, maxValue: number, defaultValue: number) {
        this.minValue = minValue
        this.maxValue = maxValue
        this.baseValue = defaultValue
    }

    setValue(value: number) {
        this.baseValue = this.clamp(value)
    }

    getValue() {
        return this.clamp(this.baseValue + this.modulationSum)
    }


    modulate(amount: number) {
        this.modulationSum += amount
    }

    resetModulation() {
        this.modulationSum = 0
    }

    private clamp(value: number) {
        return Math.min(this.maxValue, Math.max(this.minValue, value))
    }
}

/*
this.oscillator_a.frequency.modulations.push(
    this.lfo.value * 20
)

pulseWidth =
    0.5 + lfo.value * 0.2
*/

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

            //sample = phase * 2 - 1
            sample = Math.sin(phase * Math.PI * 2)
            //sample = 1 - Math.abs(phase * 2 - 1) * 2
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


            let drive = 0.7
            //sample = Math.tanh(sample * drive)

            //sample = Math.max(-0.98, Math.min(0.98, sample))


*/
export class Oscillator implements Signal {

    frequency: Parameter
    gain: Parameter
    pulseWidth: Parameter

    phase = 0

    waveform: WaveForm = 'sine'

    constructor(readonly sampleRate: number) {
        this.frequency = new Parameter(20, 20000, 440)
        this.gain = new Parameter(0, 1, 0.5)
        this.pulseWidth = new Parameter(0.01, 0.99, 0.5)
    }

    process() {

        let sampleRate = this.sampleRate

        let freq = this.frequency.getValue()
        let gain = this.gain.getValue()

        this.phase += freq / sampleRate

        if (this.phase >= 1) {
            this.phase -= 1;
        }


        let value = getWaveformValue(this.waveform, this.pulseWidth, this.phase)

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
        this.frequency = new Parameter(20, 20000, 440)
        this.gain = new Parameter(0, 1, 0.5)
        this.pulseWidth = new Parameter(0.01, 0.99, 0.5)
    }

    getValue(): number {
        let value = getWaveformValue(this.waveform, this.pulseWidth, this.phase)
        return value * this.gain.getValue()
    }

    process( ){
        let sampleRate = this.sampleRate

        let freq = this.frequency.getValue()
        let gain = this.gain.getValue()


        this.phase += freq / sampleRate

        if (this.phase >= 1) {
            this.phase -= 1
        }

        let value = getWaveformValue(this.waveform, this.pulseWidth, this.phase)

        return value * gain
    }

}


function getWaveformValue(waveform: WaveForm, pulseWidth: Parameter, phase: number): number {
    switch (waveform) {
        case 'sine':
            return Math.sin(phase * Math.PI * 2)
        case 'triangle':
            return 1 - Math.abs(phase * 4 - 2)
        case 'sawtooth':
            return phase * 2 - 1
        case 'square':
            let pw = pulseWidth.getValue()
            return phase < pw ? 1 : -1
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
        this.filter.gain.setValue(2)
        this.filter.resonance.setValue(1)
        this.filter.cutoff.setValue(400)

        this.oscillator_a.pulseWidth.setValue(0.25)
        this.modMatrix.connect(this.filterEnvelope, this.filter.cutoff, 1000)
        this.modMatrix.connect(this.lfo, this.oscillator_a.pulseWidth, 0.5)

        this.lfo.frequency.setValue(60)

    }

    noteOn(freq: number) {
        this.lfo.phase = Math.random()
        this.oscillator_a.phase = Math.random()
        this.oscillator_a.frequency.setValue(freq)
        //this.oscillator_a.frequency.setValue(freq * Math.pow(2, cents / 1200))

        this.ampEnvelope.trigger()
        this.filterEnvelope.trigger()
    }

    noteOff() {
        this.ampEnvelope.release()
        this.filterEnvelope.release()
    }

    processBlock() {
        this.lfo.process()
    }

    process() {
        this.ampEnvelope.process()
        this.filterEnvelope.process()

        this.modMatrix.process()

        let a = this.oscillator_a.process()
        let mixed = a

        mixed = this.filter.process(mixed)

        let drive = 13
        mixed = Math.tanh(mixed * drive)

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


/*
processBlock()
processSample()
*/
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