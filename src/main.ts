import './style.css'

let audioCtx: AudioContext
async function init_context() {
  audioCtx ??= new AudioContext()
  //init_oscilloscope()
  await init_audioworklet()
}

import workletUrl from './scope-processor?worker&url'

let worklet: AudioWorkletNode
async function init_audioworklet() {
  await audioCtx.audioWorklet.addModule(workletUrl)
  worklet = new AudioWorkletNode(audioCtx, 'scope-processor')

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
      playSound()
    }
  })
}

function playSound() {

  if (worklet === undefined) {
    return
  }

  let now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';

  osc.frequency.setValueAtTime(220, now);
  //osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

  gain.gain.setValueAtTime(0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  //gain.connect(analyser);
  //analyser.connect(audioCtx.destination);

  gain.connect(worklet)
  worklet.connect(audioCtx.destination)

  osc.start(now);
  osc.stop(now + 0.1);
}

let analyser: AnalyserNode
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

function draw_oscilloscope(width: number, height: number) {

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

function worklet_frame() {
  const searchStart = (writeIndex - 4096 + BUFFER_SIZE) % BUFFER_SIZE

  const trigger = findTrigger(sampleBuffer, searchStart, 4096)

  const window = extractWindow(trigger)

  draw_samples(window, 1920, 1080/2, 600)
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