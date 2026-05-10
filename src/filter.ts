import { Parameter, type Signal } from "./modulator"

// Typical synth parameter ranges
export const PARAMETER_RANGES = {
    // Oscillator
    OSC_FREQ: { min: 20, max: 20000, default: 440 },    // Hz
    OSC_GAIN: { min: 0, max: 1, default: 0.5 },    // Linear
    OSC_PULSE: { min: 0.01, max: 0.99, default: 0.5 },    // Ratio

    // Filter
    FILT_CUTOFF: { min: 20, max: 20000, default: 1000 },    // Hz
    FILT_RES: { min: 0.707, max: 20, default: 0.707 },   // Q factor
    FILT_GAIN: { min: 0, max: 2, default: 1 },       // Linear

    // LFO
    LFO_FREQ: { min: 0.01, max: 20, default: 2 },       // Hz
    LFO_GAIN: { min: 0, max: 1, default: 0.5 },     // Linear

    // Envelope
    ENV_ATTACK: { min: 0.001, max: 10, default: 0.01 },    // Seconds
    ENV_DECAY: { min: 0.001, max: 10, default: 0.1 },     // Seconds
    ENV_SUSTAIN: { min: 0, max: 1, default: 0.7 },     // Level
    ENV_RELEASE: { min: 0.001, max: 10, default: 0.5 },     // Seconds
}

export class StateVariableFilter implements Signal {

    cutoff: Parameter
    resonance: Parameter
    gain: Parameter

    // filter state
    private low = 0
    private band = 0

    constructor(readonly sampleRate: number) {

        this.cutoff = new Parameter(
            20,
            sampleRate * 0.45,
            1000
        )

        // resonance/Q
        this.resonance = new Parameter(
            0.1,
            10,
            0.707
        )

        this.gain = new Parameter(
            0,
            2,
            1
        )
    }

    process(input: number): number {

        let cutoff = this.cutoff.getValue()
        let q = this.resonance.getValue()

        // stability clamp
        cutoff = Math.max(
            20,
            Math.min(this.sampleRate * 0.45, cutoff)
        )

        q = Math.max(0.001, q)

        // normalized frequency
        let f =
            2 *
            Math.sin(
                Math.PI * cutoff / this.sampleRate
            )

        // damping
        let damp = 1 / q

        // SVF core
        let high =
            input -
            this.low -
            damp * this.band

        this.band += f * high
        this.low += f * this.band

        // outputs
        let lowpass = this.low

        // optional:
        // let bandpass = this.band
        // let highpass = high
        // let notch = high + lowpass

        return lowpass * this.gain.getValue()
    }

    reset() {
        this.low = 0
        this.band = 0
    }
}

export class BiquadFilter implements Signal {
    cutoff: Parameter
    resonance: Parameter
    gain: Parameter
    
    // Filter type
    type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' = 'lowpass'
    
    // Coefficients
    private b0: number = 1
    private b1: number = 0
    private b2: number = 0
    private a1: number = 0
    private a2: number = 0
    
    // State (previous samples)
    private x1 = 0
    private x2 = 0
    private y1 = 0
    private y2 = 0
    
    constructor(readonly sampleRate: number) {
        this.cutoff = new Parameter(20, 20000, 1000) // 1kHz default
        this.resonance = new Parameter(0.707, 20, 0.707) // Butterworth (no resonance peak)
        this.gain = new Parameter(0, 2, 1)
        this.updateCoefficients()
    }

    lastCutoff?: number
    lastQ?: number
    
    private updateCoefficients() {


        let cutoff = this.cutoff.getValue()
        let q = this.resonance.getValue()
        if (q < 0.001) q = 0.001  // Prevent division by zero


        cutoff = Math.max(
            20,
            Math.min(this.sampleRate * 0.45, cutoff)
        )

        if (cutoff !== this.lastCutoff || q !== this.lastQ) {
            this.lastCutoff = cutoff
            this.lastQ = q
        }


        
        let w0 = 2 * Math.PI * cutoff / this.sampleRate
        let cos = Math.cos(w0)
        let sin = Math.sin(w0)
        let alpha = sin / (2 * q)
        
        // Calculate coefficients based on filter type
        switch(this.type) {
            case 'lowpass':
                this.b0 = (1 - cos) / 2
                this.b1 = 1 - cos
                this.b2 = (1 - cos) / 2
                this.a1 = -2 * cos
                this.a2 = 1 - alpha
                break
                
            case 'highpass':
                this.b0 = (1 + cos) / 2
                this.b1 = -(1 + cos)
                this.b2 = (1 + cos) / 2
                this.a1 = -2 * cos
                this.a2 = 1 - alpha
                break
                
            case 'bandpass':
                this.b0 = alpha
                this.b1 = 0
                this.b2 = -alpha
                this.a1 = -2 * cos
                this.a2 = 1 - alpha
                break
                
            case 'notch':
                this.b0 = 1
                this.b1 = -2 * cos
                this.b2 = 1
                this.a1 = -2 * cos
                this.a2 = 1 - alpha
                break
        }
        
        // Normalize
        let a0 = 1 + alpha
        this.b0 /= a0
        this.b1 /= a0
        this.b2 /= a0
        this.a1 /= a0
        this.a2 /= a0
    }
    
    process(input: number): number {
        // Update coefficients if parameters changed
        this.updateCoefficients()
        
        // Apply filter
        let output = this.b0 * input + 
                     this.b1 * this.x1 + 
                     this.b2 * this.x2 - 
                     this.a1 * this.y1 - 
                     this.a2 * this.y2
        
        // shift input history
        this.x2 = this.x1
        this.x1 = input

        // shift output history
        this.y2 = this.y1
        this.y1 = output

        
        return output * this.gain.getValue()
    }
    
    reset() {
        this.x1 = 0
        this.x2 = 0
        this.y1 = 0
        this.y2 = 0
    }
}