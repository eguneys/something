function getFrequency(noteStr: string): number {
    const notes: Record<string, number> = {
        "c": -9, "c#": -8, "db": -8, "d": -7, "d#": -6, "eb": -6,
        "e": -5, "f": -4, "f#": -3, "gb": -3, "g": -2, "g#": -1,
        "ab": -1, "a": 0, "a#": 1, "bB": 1, "b": 2
    };

    // Match: [Note Letter + optional # or b] [Octave Number]
    const match = noteStr.match(/^([a-g][#b]?)([0-9])$/);
    if (!match) return 440;

    const letter = match[1];
    const octave = parseInt(match[2]);

    // A4 is our anchor. Calculate steps from A4.
    // Each octave is 12 steps. (octave - 4) * 12 gets us to the right octave.
    const steps = notes[letter] + (octave - 4) * 12;

    return 440 * Math.pow(2, steps / 12);
}


export type InstrumentType = 'bass' | 'lead'
export class Sequencer {

    activeNotes: number[] = []

    play(synth_worklet: AudioWorkletNode, type: InstrumentType, events: NoteEvent[], bpm: number = 120) {
        const beatToMs = (60 / bpm) * 1000

        events.forEach(({ time, freq, duration }) => {
            setTimeout(() => {
                synth_worklet.port.postMessage({ [type]: { noteOn: freq } })
                this.activeNotes.push(freq)
            }, time * beatToMs)

            setTimeout(() => {
                synth_worklet.port.postMessage({ [type]: { noteOff: freq } })
                this.activeNotes = []
            }, (time + duration) * beatToMs - 50)
        })
    }

    static parse(pattern: string): NoteEvent[] {
        return parseMultiLineSequence(pattern)
    }
}

export interface NoteEvent {
    freq: number;
    time: number; // in beats
    duration: number; // in beats
}

function parseMultiLineSequence(sheetMusic: string): NoteEvent[] {
  // 1. Clean up: Remove line breaks and treat the whole thing as one string
  // 2. Split by measures (|)
  const measures = sheetMusic
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .split('|')
    .map(m => m.trim())
    .filter(m => m.length > 0); // Ignore empty strings from trailing pipes

  const events: NoteEvent[] = [];
  let currentBeat = 0;

  measures.forEach((measure) => {
    // Split by spaces to get individual steps (A4, -, etc.)
    const steps = measure.split(/\s+/); 
    
    steps.forEach((step) => {
      const beatsPerStep = 1; // Base timing unit

      if (step === '-') {
        // Extend the previous note
        if (events.length > 0) {
          events[events.length - 1].duration += beatsPerStep;
        }
      } else {
        // Create a new note
        events.push({
          freq: getFrequency(step),
          time: currentBeat,
          duration: beatsPerStep
        });
      }
      // Advance the timeline regardless of whether it was a note or a rest
      currentBeat += beatsPerStep;
    });
  });

  return events;
}