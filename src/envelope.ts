type EnvelopeState = "attack" | "decay" | "sustain" | "release" | "idle"

export type EnvelopeParams = {
    attackTimeInSeconds: number,
    decayTimeInSeconds: number,
    sustainLevel: number,
    releaseTimeInSeconds: number,
}

export default class Envelope {

    private envState!: EnvelopeState

    private attackRate!: number
    private decayRate!: number
    private sustainLevel!: number
    private releaseRate!: number

    constructor(private SampleRate: number) { 
        this.envState = 'idle'
        this.envelope = 0
    }

    private envelope!: number

    get value() {
        return this.envelope
    }

    set_envelope(params: EnvelopeParams) {
        let {
            attackTimeInSeconds,
            decayTimeInSeconds,
            sustainLevel,
            releaseTimeInSeconds,
        } = params
        let { SampleRate } = this
        this.envelope = 0
        this.envState = 'attack'

        this.sustainLevel = sustainLevel
        this.attackRate = 1.0 / (attackTimeInSeconds * SampleRate)
        this.decayRate = 1.0 / (decayTimeInSeconds * SampleRate)
        this.releaseRate = 1.0 / (releaseTimeInSeconds * SampleRate)
    }

    release() {
        this.envState = 'release'
    }

    step() {
        switch (this.envState) {

            case "attack":

                this.envelope += this.attackRate;

                if (this.envelope >= 1) {
                    this.envelope = 1;
                    this.envState = "decay";
                }

                break;

            case "decay":

                this.envelope -= this.decayRate;

                if (this.envelope <= this.sustainLevel) {
                    this.envelope = this.sustainLevel;
                    this.envState = "sustain";
                }

                break;

            case "sustain":

                break;

            case "release":

                this.envelope -= this.releaseRate;

                if (this.envelope <= 0) {
                    this.envelope = 0;
                    this.envState = "idle";
                }

                break;
        }
    }
}