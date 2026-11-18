import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rate = 22050;
const clamp = (value) => Math.max(-1, Math.min(1, value));
const hash = (text) => [...text].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
function random(seed) { let state = seed >>> 0; return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; }
function envelope(time, duration, attack = .01, release = .08) { return Math.min(1, time / attack, (duration - time) / release); }
function tone(duration, notes, { noise = 0, sweep = 0, attack = .01, release = .1 } = {}) {
  const frames = Math.ceil(duration * rate); const samples = new Float32Array(frames); const rand = random(hash(notes.map((note) => note[0]).join("-")));
  for (let i = 0; i < frames; i += 1) {
    const time = i / rate; let value = 0;
    for (const [frequency, start = 0, length = duration, gain = 1, wave = "sine"] of notes) {
      if (time < start || time > start + length) continue;
      const local = time - start; const phase = 2 * Math.PI * (frequency * local + sweep * local * local / 2);
      const oscillator = wave === "square" ? Math.sign(Math.sin(phase)) : wave === "triangle" ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase);
      value += oscillator * gain * envelope(local, length, attack, release);
    }
    samples[i] = clamp(value + rand() * noise * envelope(time, duration, attack, release));
  }
  return samples;
}
function music(duration, scale, seed, tempo, warmth) {
  const frames = Math.ceil(duration * rate); const samples = new Float32Array(frames); const rand = random(seed); const beat = 60 / tempo;
  for (let i = 0; i < frames; i += 1) {
    const time = i / rate; const step = Math.floor(time / (beat / 2)); const note = scale[(step * 5 + Math.floor(step / 7)) % scale.length];
    const local = time % (beat / 2); const lead = Math.sin(2 * Math.PI * note * time) * envelope(local, beat / 2, .012, .09) * .18;
    const bassNote = scale[Math.floor(step / 4) % 4] / 2; const bass = Math.sin(2 * Math.PI * bassNote * time) * .12;
    const pad = Math.sin(2 * Math.PI * (scale[(Math.floor(time / (beat * 4)) + 2) % scale.length] / 2) * time) * warmth;
    const pulse = local < .028 ? (rand() * .12) * (1 - local / .028) : 0;
    const edgeFade = Math.min(1, time / .08, (duration - time) / .08);
    samples[i] = clamp((lead + bass + pad + pulse) * edgeFade);
  }
  return samples;
}
function wav(samples) {
  const bytes = Buffer.alloc(44 + samples.length * 2); bytes.write("RIFF", 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write("data", 36); bytes.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => bytes.writeInt16LE(Math.round(clamp(sample) * 32767), 44 + index * 2)); return bytes;
}
async function emit(path, samples) { const target = resolve(root, path); await mkdir(dirname(target), { recursive: true }); await writeFile(target, wav(samples)); }

const files = [
  ["assets/audio/bgm/dragon-island-loop.wav", music(16, [261.63, 293.66, 329.63, 392, 440], 11, 96, .07)],
  ["assets/audio/bgm/study-focus-loop.wav", music(16, [220, 261.63, 293.66, 329.63, 392], 29, 76, .055)],
  ["assets/audio/bgm/battle-loop.wav", music(16, [196, 233.08, 261.63, 293.66, 329.63], 47, 122, .045)],
  ["assets/audio/sfx/ui/click.wav", tone(.09, [[640, 0, .08, .25, "triangle"]])],
  ["assets/audio/sfx/ui/correct.wav", tone(.42, [[523.25, 0, .18, .35], [659.25, .12, .24, .35], [783.99, .24, .18, .32]])],
  ["assets/audio/sfx/ui/wrong.wav", tone(.28, [[329.63, 0, .22, .24, "triangle"], [261.63, .08, .18, .22, "triangle"]])],
  ["assets/audio/sfx/ui/energy-gain.wav", tone(.5, [[440, 0, .3, .17], [660, .1, .3, .2], [880, .22, .24, .2]], { sweep: 700 })],
  ["assets/audio/sfx/ui/energy-spend.wav", tone(.34, [[740, 0, .3, .22, "triangle"]], { sweep: -950 })],
  ["assets/audio/sfx/ui/locked.wav", tone(.14, [[196, 0, .11, .18, "square"]])],
  ["assets/audio/sfx/battle/start.wav", tone(.7, [[196, 0, .4, .3, "triangle"], [293.66, .16, .45, .28], [392, .32, .32, .25]])],
  ["assets/audio/sfx/battle/claw-windup.wav", tone(.18, [[290, 0, .17, .18]], { noise: .09, sweep: 1000 })],
  ["assets/audio/sfx/battle/claw-hit.wav", tone(.22, [[110, 0, .18, .28, "square"], [220, .01, .12, .16]], { noise: .24 })],
  ["assets/audio/sfx/battle/enemy-hit.wav", tone(.2, [[155, 0, .17, .22, "triangle"]], { noise: .12 })],
  ["assets/audio/sfx/battle/defeated.wav", tone(.48, [[440, 0, .42, .18]], { noise: .07, sweep: -800 })],
  ["assets/audio/sfx/battle/win.wav", tone(.82, [[523.25, 0, .3, .26], [659.25, .17, .3, .28], [783.99, .34, .42, .3]])],
  ["assets/audio/sfx/battle/lose.wav", tone(.72, [[349.23, 0, .35, .2, "triangle"], [261.63, .2, .45, .22, "triangle"]])],
  ["assets/audio/sfx/battle/flee.wav", tone(.32, [[260, 0, .3, .2]], { noise: .1, sweep: 1200 })],
  ["assets/audio/sfx/skills/fire-cast.wav", tone(.35, [[130, 0, .32, .18, "square"]], { noise: .18, sweep: 1500 })],
  ["assets/audio/sfx/skills/fire-hit.wav", tone(.3, [[92, 0, .25, .28, "square"], [490, .04, .2, .12]], { noise: .3 })],
  ["assets/audio/sfx/skills/moon-cast.wav", tone(.55, [[180, 0, .5, .23], [270, .08, .42, .16]], { sweep: -90 })],
  ["assets/audio/sfx/skills/moon-apply.wav", tone(.34, [[210, 0, .28, .16, "triangle"]], { noise: .08, sweep: -300 })],
  ["assets/audio/sfx/skills/vine-cast.wav", tone(.45, [[160, 0, .4, .16], [240, .12, .3, .16]], { sweep: 220 })],
  ["assets/audio/sfx/skills/vine-bind.wav", tone(.28, [[120, 0, .24, .2, "triangle"]], { noise: .1 })]
];
for (const [path, samples] of files) await emit(path, samples);
console.log(`Generated ${files.length} WAV files in assets/audio.`);
