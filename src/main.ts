import './style.css'

let audioCtx: AudioContext


let worklet: AudioWorkletNode
let synth_worklet: AudioWorkletNode

async function init_context() {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    //init_oscilloscope()
    await init_audioworklet()
    init_gains()
  }
}


let bins: Float32Array<ArrayBuffer>
let analyser: AnalyserNode
function init_gains() {

  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 2048
  bins = new Float32Array(analyser.frequencyBinCount)
  analyser.smoothingTimeConstant = 0.79

  synth_worklet.connect(worklet)
  worklet.connect(analyser)
  analyser.connect(audioCtx.destination)


  synth_worklet.port.postMessage({
    envelope: {
      attackTimeInSeconds: 0.01,
      decayTimeInSeconds: 0.1,
      sustainLevel: 1,
      releaseTimeInSeconds: 0.2
    }
  })
}

import workletUrl from './scope-processor?worker&url'
import synthworkletUrl from './synth-processor?worker&url'

async function init_audioworklet() {
  await audioCtx.audioWorklet.addModule(workletUrl)
  await audioCtx.audioWorklet.addModule(synthworkletUrl)
  worklet = new AudioWorkletNode(audioCtx, 'scope-processor')
  synth_worklet = new AudioWorkletNode(audioCtx, 'synth-processor')

  worklet.port.onmessage = (e) => {
    const samples = e.data
    for (let i = 0; i < samples.length; i++) {
      sampleBuffer[writeIndex] = samples[i]

      writeIndex++
      writeIndex %= BUFFER_SIZE
    }
  }

}

const BUFFER_SIZE = 65536

const sampleBuffer = new Float32Array(BUFFER_SIZE)

let writeIndex = 0

function findTrigger(buffer: Float32Array, start: number, size: number) {

  let threshold = 0.01
  for (let i = 1; i < size; i++) {

    const a = buffer[(start + i - 1) % BUFFER_SIZE]
    const b = buffer[(start + i) % BUFFER_SIZE]

    // rising edge trigger

    if (a < threshold && b >= threshold) {
    //if (a < 0 && b >= 0) {
      return (start + i) % BUFFER_SIZE
    }
  }

  return start
}

const WINDOW_SIZE = 2048

function extractWindow(triggerIndex: number) {

  const out = new Float32Array(WINDOW_SIZE)

  for (let i = 0; i < WINDOW_SIZE; i++) {

    out[i] = sampleBuffer[
      (triggerIndex + i) % BUFFER_SIZE
    ]
  }

  return out
}

function init_keyboard() {

  document.addEventListener('keydown', (e) => {
    init_context()

    if (e.key === ' ') {
      //playSound()

      playSong()
    }
  })
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

  /*
  song = [
    [0, 40, 3],
    [3, 640, 3],
    [6, 8080, 3],
  ]
    */

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

let buffer: Float32Array<ArrayBuffer>

export function init_oscilloscope() {
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  buffer = new Float32Array(analyser.fftSize);

}

function draw_samples(samples: Float32Array, width: number, middle_y: number, height: number) {

  cx.strokeStyle = "#00ff88";
  cx.lineWidth = 4;
  cx.beginPath()

  for (let i = 0; i < samples.length; i++) {

    const x = i / samples.length * width

    const y =
      middle_y
      - samples[i] * height

    if (i === 0)
      cx.moveTo(x, y)
    else
      cx.lineTo(x, y)
  }

  cx.stroke()
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

function draw_fft(width: number, height: number) {

  if (analyser === undefined) {
    return
  }

  const minFreq = 20 // 20Hz
  const maxFreq = 12000 // 12kHz


  cx.fillStyle = '#00aaff'
  analyser.getFloatFrequencyData(bins)

  for (let i = 0; i < bins.length; i++) {

    const freq = i * audioCtx.sampleRate / analyser.fftSize

    if (freq < minFreq || freq > maxFreq) continue
    // map frequency to X position (logarithmic for natural feel)
    const logFreq = Math.log(freq / minFreq) / Math.log(maxFreq / minFreq)
    let x = logFreq * width

    let db = bins[i]

    const minDB = -100
    const maxDB = 0

    const normalizedDB = Math.max(minDB, Math.min(maxDB, db))

    let normalized = (normalizedDB - minDB) / (maxDB - minDB)

    let magnitude = Math.pow(normalized, 1.5) * height

    //let x = i * 4
    let h = Math.max(1, magnitude)

    cx.fillRect(x, height - h, 3, h)
  }

}

// Add piano note grid lines to your visualizer!
function drawPianoGrid(width: number, height: number) {
  const minFreq = 20;
  const maxFreq = 20000;

  // Note frequencies: C4=261.63Hz, C5=523.25Hz, C6=1046.50Hz
  const noteFreqs = [130.81, 261.63, 523.25, 1046.50, 2093.00, 4186.01];
  const noteNames = ['C3', 'C4', 'C5', 'C6', 'C7', 'C8'];

  cx.font = '30px Arial'

  noteFreqs.forEach((freq, idx) => {
    // Use SAME log formula from your visualizer
    const logFreq = Math.log(freq / minFreq) / Math.log(maxFreq / minFreq);
    const x = logFreq * width;

    cx.strokeStyle = '#ffffff80';
    cx.beginPath();
    cx.moveTo(x, 0);
    cx.lineTo(x, height * 0.5);
    cx.stroke();

    cx.fillStyle = 'white';
    cx.fillText(noteNames[idx], x + 2, 40);
  });


  // 3. Highlight specific notes being played
  //const activeNotes = [440, 880, 1760]; // A4, A5, A6
  activeNotes.forEach(freq => {
    const logFreq = Math.log(freq / 20) / Math.log(20000 / 20);
    const x = logFreq * width;
    cx.fillStyle = '#ff000080';
    cx.fillRect(x - 2, 0, 4, height * 0.5);
  });
}

function worklet_frame() {
  const searchStart = (writeIndex - 4096 + BUFFER_SIZE) % BUFFER_SIZE

  const trigger = findTrigger(sampleBuffer, searchStart, 4096)

  const window = extractWindow(trigger)

  draw_samples(window, 1920, 1080/2, 520)
  draw_fft(1920, 1080)
  drawPianoGrid(1920, 1080)

}


let cx: CanvasRenderingContext2D

function app(el: HTMLElement) {

  let canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1080

  cx = canvas.getContext('2d')!


  init_keyboard()

  function step() {
    cx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    cx.fillRect(0, 0, 1920, 1080)
    //draw_oscilloscope(1920, 1080)
    worklet_frame()

    requestAnimationFrame(step)
  }
    requestAnimationFrame(step)

  let content = document.createElement('div')
  content.classList.add('content')

  content.appendChild(canvas)
  el.appendChild(content)
}

app(document.getElementById('app')!)