// @ts-nocheck


let buffer: Float32Array<ArrayBuffer>

export function init_oscilloscope() {
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  buffer = new Float32Array(analyser.fftSize);

}



export function draw_oscilloscope(width: number, height: number) {

  if (analyser === undefined) {
    return
  }

  let middle_y = height * 0.5
  let top_y = height * 2

  analyser.getFloatTimeDomainData(buffer);

  cx.strokeStyle = "#00ff88";
  cx.lineWidth = 4;

  cx.beginPath();

  const visibleSamples = 512;
  const trigger = 0.02;

  let start = 0;

  for (let i = 1; i < buffer.length - visibleSamples; i++) {

    const a = buffer[i - 1];
    const b = buffer[i];

    if (
      a < trigger &&
      b >= trigger &&
      (b - a) > 0.01
    ) {
      start = i;
      break;
    }
  }

  for (let x = 0; x < width; x++) {

    const index =
      start +
      Math.floor(x * visibleSamples / width);

    const sample = buffer[index];

    const y =
      middle_y -
      sample * top_y;

    if (x === 0)
      cx.moveTo(x, y);
    else
      cx.lineTo(x, y);
  }
  cx.stroke()
}



let activeNotes: number[] = []
function playSong() {
  if (synth_worklet === undefined) {
    return
  }
  let song = [
    [0.0, 440, 0.5],   // At 0 seconds, play A for 0.5 seconds
    [0.5, 494, 0.5],   // At 0.5 seconds, play B for 0.5 seconds
    [1.0, 523, 0.5],   // At 1.0 seconds, play C for 0.5 seconds
    [1.5, 587, 1.0],   // At 1.5 seconds, play D for 1.0 seconds
    [2.5, 523, 0.5],
    [3.0, 494, 0.5],
    [3.5, 440, 1.0]
  ];

  song = [
    [0.0, 440, 1.5],   // At 0 seconds, play A for 0.5 seconds
    [1.5, 494, 1.5],   // At 0.5 seconds, play B for 0.5 seconds
    [2.0, 523, 1.5],   // At 1.0 seconds, play C for 0.5 seconds
    [3.5, 587, 2.0],   // At 1.5 seconds, play D for 1.0 seconds
    [5.5, 523, 1.5],
    [6.0, 494, 1.5],
    [7.5, 440, 2.0],
    [9.5, 440, 0.5],
    [10, 494, 0.5],
    [10.5, 523, 0.5],
    [11.0, 587, 1.0],
    [12.0, 523, 0.5],
    [12.5, 494, 0.5],
    [13.0, 440, 1.0]
  ]

  song.forEach(event => {
    const [time, frequency, duration] = event

    setTimeout(() => {
      synth_worklet.port.postMessage({ frequency })
      activeNotes.push(frequency)
    }, time * 1000)

    setTimeout(() => {
      synth_worklet.port.postMessage({ noteOff: true })
      activeNotes = []
    }, (time + duration - 0.4) * 1000)
  })
}

