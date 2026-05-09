class ScopeProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
        const input = inputs[0]

        const output = outputs[0]

        if (input.length > 0) {
            const channel = input[0]
            this.port.postMessage(channel)
        }

        let channel = 0
        let inputChannel = input[channel]
        let outputChannel = output[channel]

        if (inputChannel && outputChannel) {
            outputChannel.set(inputChannel)
        }
        return true
    }
}

registerProcessor('scope-processor', ScopeProcessor)