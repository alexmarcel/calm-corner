// Original 16-bar cafe composition. All instruments and cup clinks are synthesized.
import fs from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

export function composeCafe() {
  const rate = 44100,
    seconds = 48,
    beat = 60 / 80;
  const samples = new Float64Array(rate * seconds);
  let seed = 87031;
  const random = () =>
    ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const hz = (note) => 440 * 2 ** ((note - 69) / 12);
  // Wrap release tails into the opening so the arrangement repeats naturally.
  function event(start, duration, voice) {
    const offset = Math.round(start * rate);
    for (let i = 0; i < duration * rate; i++) {
      samples[(offset + i) % samples.length] += voice(i / rate, i);
    }
  }
  function piano(start, note, gain = 0.075, duration = 2.6) {
    const frequency = hz(note);
    event(start, duration, (t) => {
      const attack = 1 - Math.exp(-t * 160);
      const release = Math.min(1, (duration - t) / 0.18);
      let value = 0;
      for (let harmonic = 1; harmonic <= 5; harmonic++) {
        value +=
          (Math.sin(
            2 *
              Math.PI *
              frequency *
              harmonic *
              (1 + 0.00012 * harmonic * harmonic) *
              t,
          ) *
            Math.exp(-t * (1.5 + harmonic * 0.45))) /
          (harmonic * harmonic);
      }
      return value * attack * release * gain;
    });
  }
  const chords = [
    [50, 60, 64, 65, 69],
    [43, 59, 64, 65, 69],
    [48, 59, 62, 64, 67],
    [45, 61, 64, 67, 70],
    [50, 60, 64, 65, 69],
    [43, 59, 64, 65, 69],
    [48, 59, 62, 64, 67],
    [48, 59, 62, 64, 69],
    [53, 60, 64, 67, 69],
    [46, 60, 62, 65, 68],
    [52, 59, 62, 67, 71],
    [45, 61, 64, 67, 70],
    [50, 60, 64, 65, 69],
    [43, 59, 64, 65, 69],
    [48, 59, 62, 64, 67],
    [45, 61, 64, 67, 70],
  ];
  chords.forEach(([root, ...voicing], bar) => {
    const start = bar * 4 * beat;
    for (const [position, gain] of [
      [0.08, 0.064],
      [2.65, 0.043],
    ]) {
      voicing.forEach((note, index) =>
        piano(start + position * beat + index * 0.016, note, gain),
      );
    }
    // Sparse answering melody leaves space between phrases.
    if (bar % 2 === 0) {
      piano(start + 1.65 * beat, voicing[3] + 12, 0.043);
      piano(start + 3.3 * beat, voicing[2] + 12, 0.032);
    }
    for (const [position, note] of [
      [0, root - 12],
      [2, root - 5],
    ]) {
      const frequency = hz(note);
      event(
        start + position * beat,
        1.6,
        (t) =>
          0.13 *
          (1 - Math.exp(-t * 100)) *
          Math.exp(-t * 3) *
          Math.min(1, (1.6 - t) / 0.15) *
          (Math.sin(2 * Math.PI * frequency * t) +
            0.22 * Math.sin(4 * Math.PI * frequency * t)),
      );
    }
    for (let pulse = 0; pulse < 4; pulse++) {
      let filtered = 0;
      event(start + pulse * beat + 0.015, 0.32, (t) => {
        filtered = filtered * 0.72 + random() * 0.28;
        return (
          filtered *
          (pulse % 2 ? 0.035 : 0.018) *
          Math.sin((Math.PI * t) / 0.32) ** 2
        );
      });
    }
    if ([2, 6, 11, 14].includes(bar)) {
      event(
        start + 1.25 * beat,
        0.7,
        (t) =>
          0.012 *
          (1 - Math.exp(-t * 180)) *
          Math.exp(-t * 11) *
          Math.min(1, (0.7 - t) / 0.1) *
          (Math.sin(2 * Math.PI * 1830 * t) +
            0.35 * Math.sin(2 * Math.PI * 2910 * t)),
      );
    }
  });
  const dry = samples.slice();
  for (const [delay, gain] of [
    [0.113, 0.12],
    [0.197, 0.075],
    [0.307, 0.04],
  ]) {
    const offset = Math.round(delay * rate);
    for (let i = 0; i < samples.length; i++)
      samples[i] += dry[(i - offset + samples.length) % samples.length] * gain;
  }
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const gain = 0.65 / Math.max(peak, 0.001);
  const pcm = Int16Array.from(samples, (value) =>
    Math.round(value * gain * 32767),
  );
  return {
    rate,
    seconds,
    pcm,
    peak: 0.65,
    boundaryStep: Math.abs(pcm[0] - pcm.at(-1)) / 32767,
  };
}

export function writeCafe() {
  const { rate, seconds, pcm, peak, boundaryStep } = composeCafe();
  const context = {};
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync("node_modules/lamejs/lame.all.js", "utf8"),
    context,
  );
  const encoder = new context.lamejs.Mp3Encoder(1, rate, 128);
  const buffers = [];
  for (let i = 0; i < pcm.length; i += 1152)
    buffers.push(Buffer.from(encoder.encodeBuffer(pcm.subarray(i, i + 1152))));
  buffers.push(Buffer.from(encoder.flush()));
  fs.mkdirSync("public/audio", { recursive: true });
  const result = Buffer.concat(buffers);
  fs.writeFileSync("public/audio/cafe.mp3", result);
  console.log(
    JSON.stringify({
      track: "cafe.mp3",
      seconds,
      bytes: result.length,
      peak,
      boundaryStep,
    }),
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  writeCafe();
