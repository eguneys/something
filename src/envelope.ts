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

    private attackRate = new Parameter()
    private decayRate = new Parameter()
    private sustainLevel = new Parameter()
    private releaseRate = new Parameter()

    constructor(private SampleRate: number) { 
        this.state = 'idle'
        this.level = 0
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
        let { SampleRate } = this

        this.sustainLevel.setValue(sustainLevel)
        this.attackRate.setValue(1.0 / (attackTimeInSeconds * SampleRate))
        this.decayRate.setValue(1.0 / (decayTimeInSeconds * SampleRate))
        this.releaseRate.setValue(1.0 / (releaseTimeInSeconds * SampleRate))
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
                this.level += dt / Math.max(0.001, this.attackRate.getValue())
                if (this.level >= 1) {
                    this.level= 1;
                    this.state = "decay";
                }
                break;
            case "decay":

                this.level -= dt / Math.max(0.001, this.decayRate.getValue())

                if (this.level <= this.sustainLevel.getValue()) {
                    this.level = this.sustainLevel.getValue();
                    this.state = "sustain";
                }
                break;
            case "sustain":
                break;
            case "release":
                this.level -= dt / Math.max(0.001, this.releaseRate.getValue())
                if (this.level <= 0) {
                    this.level = 0;
                    this.state = "idle";
                }
                break;
        }
        return this.level
    }
}