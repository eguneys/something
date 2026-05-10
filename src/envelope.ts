import { Parameter, type Modulator } from "./modulator"

type EnvelopeState = "attack" | "decay" | "sustain" | "release" | "idle"

export type EnvelopeParams = {
    attackTimeInSeconds: number,
    decayTimeInSeconds: number,
    sustainLevel: number,
    releaseTimeInSeconds: number,
}

export default class Envelope implements Modulator {

    private state: EnvelopeState

    private attack: Parameter
    private decay: Parameter
    private sustain: Parameter
    private releaseParameter: Parameter

    constructor(private SampleRate: number) { 
        this.state = 'idle'
        this.level = 0

        this.attack = new Parameter(0.001, 10, 0.01)
        this.decay = new Parameter(0.001, 10, 0.1)
        this.sustain = new Parameter(0, 1, 0.7)
        this.releaseParameter = new Parameter(0.001, 10, 0.5)
    }

    private level!: number

    getValue() {
        return this.level
    }

    set_envelope(params: EnvelopeParams) {
        let {
            attackTimeInSeconds,
            decayTimeInSeconds,
            sustainLevel,
            releaseTimeInSeconds,
        } = params
        this.sustain.setValue(sustainLevel)
        this.attack.setValue(attackTimeInSeconds)
        this.decay.setValue(decayTimeInSeconds)
        this.releaseParameter.setValue(releaseTimeInSeconds)
    }

    trigger() {
        this.state = 'attack'
        this.level = 0
    }

    release() {
        if (this.state !== 'idle') {
            this.state = 'release'
        }
    }

    reset() {
        this.state = 'idle'
        this.level = 0
    }

    process() {
        const dt = 1 / this.SampleRate

        switch (this.state) {

            case "attack":
                this.level += dt / Math.max(0.001, this.attack.getValue())
                if (this.level >= 1) {
                    this.level= 1;
                    this.state = "decay";
                }
                break;
            case "decay":

                this.level -= dt / Math.max(0.001, this.decay.getValue())

                if (this.level <= this.sustain.getValue()) {
                    this.level = this.sustain.getValue();
                    this.state = "sustain";
                }
                break;
            case "sustain":
                break;
            case "release":
                this.level -= dt / Math.max(0.001, this.releaseParameter.getValue())
                if (this.level <= 0) {
                    this.level = 0;
                    this.state = "idle";
                }
                break;
        }
        return this.level
    }
}