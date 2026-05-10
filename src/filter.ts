import { Parameter, type Signal } from "./modulator"

export class LowPassFilter2Pole implements Signal {
    cutoff = new Parameter()
    resonance = new Parameter()  // 0 to 1 (self-oscillation at 1)
    gain = new Parameter()
    
    // Internal state
    private z1: number = 0
    private z2: number = 0
    
    constructor(readonly sampleRate: number) {}
    
    process(input: number) {
        let cutoff = this.cutoff.getValue()
        let resonance = this.resonance.getValue()
        let gain = this.gain.getValue()
        
        // Clamp resonance
        let r = Math.min(0.99, Math.max(0, resonance))
        
        // Calculate coefficient (0 to 1)
        let c = 1 / Math.tan(Math.PI * cutoff / this.sampleRate)
        let c2 = c * c
        let sqrt2 = Math.sqrt(2)
        
        // Filter coefficients
        let d = 1 / (1 + sqrt2 * c + c2)
        
        // Apply resonance (feedback)
        let feedback = r * this.z1
        
        // Process sample
        let output = (input + feedback - (sqrt2 * c + c2) * this.z1 - this.z2) * d
        
        // Update state
        let newZ1 = output + this.z1
        this.z2 = this.z1
        this.z1 = newZ1
        
        return output * gain
    }
    
    reset() {
        this.z1 = 0
        this.z2 = 0
    }
}

export class BiquadFilter implements Signal {
    cutoff = new Parameter()
    resonance = new Parameter()  // Q factor
    gain = new Parameter()
    
    // Filter type
    type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' = 'lowpass'
    
    // Coefficients
    private b0: number = 1
    private b1: number = 0
    private b2: number = 0
    private a1: number = 0
    private a2: number = 0
    
    // State (previous samples)
    private z1: number = 0  // x[n-1], y[n-1]
    private z2: number = 0  // x[n-2], y[n-2]
    
    constructor(readonly sampleRate: number) {
        this.updateCoefficients()
    }
    
    private updateCoefficients() {
        let cutoff = this.cutoff.getValue()
        let q = this.resonance.getValue()
        if (q < 0.001) q = 0.001  // Prevent division by zero
        
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
                     this.b1 * this.z1 + 
                     this.b2 * this.z2 - 
                     this.a1 * this.z1 - 
                     this.a2 * this.z2
        
        // Update delay lines
        this.z2 = this.z1
        this.z1 = output
        
        return output * this.gain.getValue()
    }
    
    reset() {
        this.z1 = 0
        this.z2 = 0
    }
}