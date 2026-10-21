/**
 * Временная мелодия дизайна, сгенерированная кодом (WebAudio), — пока нет настоящих записей.
 * Дизайн описывает ноты (Score), движок их играет по кругу.
 * Создаётся только по нажатию гостя (иначе телефон не даст звук).
 */

export type Instrument =
  | "dutor" // щипковый, тёплый (дутор/рубоб)
  | "chang" // молоточковый, звонкий (чанг)
  | "nay" // флейта с вибрато (най)
  | "surnay" // носовой духовой, праздничный (сурнай) — осторожно, громкий
  | "bell" // колокольчик
  | "pad" // мягкая подложка аккордов
  | "bass"; // мягкий бас

export type Drum =
  | "dum" // низкий удар в центр дойры
  | "tak" // звонкий удар по краю
  | "zang"; // только бубенцы-кольца дойры

/** [доля от начала цикла, нота («D4», «F#4», «Bb3»), длительность в долях, громкость 0..1] */
export type Note = [beat: number, pitch: string, length: number, velocity?: number];
/** [доля, удар, громкость 0..1] */
export type Hit = [beat: number, drum: Drum, velocity?: number];

export type Track = {
  instrument: Instrument;
  notes: Note[];
  gain?: number; // громкость дорожки, по умолчанию 1
  pan?: number; // -1 левее … 1 правее
};

export type Score = {
  bpm: number;
  /** Длина цикла в долях (после неё мелодия повторяется) */
  loopBeats: number;
  tracks: Track[];
  drums?: { hits: Hit[]; gain?: number };
  /** Сколько «зала» (реверберации): 0..1, по умолчанию 0.25 */
  reverb?: number;
};

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToFreq(pitch: string) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(pitch);
  if (!m) throw new Error(`Нота не распознана: ${pitch}`);
  const midi =
    12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

type Ctx = AudioContext;

/** Проигрыватель одной партитуры */
export class SynthPlayer {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private wet: GainNode | null = null;
  private dry: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private nextLoop = 0; // номер цикла, который ещё не запланирован
  playing = false;

  constructor(private score: Score) {}

  /** Вызывать прямо в обработчике нажатия */
  play() {
    if (!this.ctx) this.init();
    const ctx = this.ctx!;
    void ctx.resume();
    const now = ctx.currentTime;
    this.master!.gain.cancelScheduledValues(now);
    this.master!.gain.setValueAtTime(this.master!.gain.value, now);
    this.master!.gain.linearRampToValueAtTime(0.55, now + 1.2);
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 60);
    this.schedule();
    this.playing = true;
  }

  pause() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.25);
    const ctx = this.ctx;
    setTimeout(() => {
      if (!this.playing) void ctx.suspend();
    }, 300);
    this.playing = false;
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.close();
    this.ctx = null;
    this.playing = false;
  }

  private init() {
    // iPhone: без этого WebAudio молчит, если включён беззвучный режим
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";

    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    this.dry = ctx.createGain();
    this.dry.connect(this.master);

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 2.6);
    this.wet = ctx.createGain();
    this.wet.gain.value = this.score.reverb ?? 0.25;
    this.wet.connect(reverb);
    reverb.connect(this.master);

    this.noise = makeNoise(ctx);
    this.startTime = ctx.currentTime + 0.12;
    this.nextLoop = 0;
  }

  /** Цикл планируется целиком, когда до его начала остаётся меньше 0,4 с */
  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    const spb = 60 / this.score.bpm;
    const loopLen = this.score.loopBeats * spb;
    while (this.startTime + this.nextLoop * loopLen < ctx.currentTime + 0.4) {
      const t0 = this.startTime + this.nextLoop * loopLen;
      // если вкладка спала и мы отстали — пропускаем старые циклы
      if (t0 + loopLen < ctx.currentTime) {
        this.nextLoop++;
        continue;
      }
      this.scheduleLoop(t0, spb);
      this.nextLoop++;
    }
  }

  private scheduleLoop(t0: number, spb: number) {
    const ctx = this.ctx!;
    for (const track of this.score.tracks) {
      const bus = ctx.createGain();
      bus.gain.value = track.gain ?? 1;
      const pan = ctx.createStereoPanner();
      pan.pan.value = track.pan ?? 0;
      bus.connect(pan);
      pan.connect(this.dry!);
      pan.connect(this.wet!);
      for (const [beat, pitch, len, vel = 0.8] of track.notes) {
        const at = Math.max(t0 + beat * spb, ctx.currentTime);
        voice(ctx, track.instrument, bus, at, len * spb, noteToFreq(pitch), vel, this.noise!);
      }
    }
    const drums = this.score.drums;
    if (drums) {
      const bus = ctx.createGain();
      bus.gain.value = drums.gain ?? 1;
      bus.connect(this.dry!);
      const send = ctx.createGain();
      send.gain.value = 0.35;
      bus.connect(send);
      send.connect(this.wet!);
      for (const [beat, drum, vel = 0.8] of drums.hits) {
        drumHit(ctx, drum, bus, Math.max(t0 + beat * spb, ctx.currentTime), vel, this.noise!);
      }
    }
  }
}

function makeNoise(ctx: Ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function makeImpulse(ctx: Ctx, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  return buf;
}

function env(g: GainNode, at: number, peak: number, attack: number, hold: number, release: number) {
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.setValueAtTime(peak, at + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
}

function osc(ctx: Ctx, type: OscillatorType, freq: number, at: number, stop: number, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.start(at);
  o.stop(stop);
  return o;
}

function voice(
  ctx: Ctx,
  inst: Instrument,
  out: AudioNode,
  at: number,
  dur: number,
  f: number,
  vel: number,
  noise: AudioBuffer,
) {
  const g = ctx.createGain();
  g.connect(out);

  switch (inst) {
    case "dutor": {
      const end = at + Math.max(dur, 0.25) + 1.2;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(Math.min(f * 8, 5000), at);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 300), at + 0.6);
      lp.connect(g);
      osc(ctx, "sawtooth", f, at, end, -4).connect(lp);
      osc(ctx, "triangle", f, at, end, 5).connect(lp);
      env(g, at, 0.22 * vel, 0.004, 0.02, Math.max(dur, 0.25) + 0.9);
      break;
    }
    case "chang": {
      const end = at + 2;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 180;
      hp.connect(g);
      osc(ctx, "triangle", f, at, end, -6).connect(hp);
      osc(ctx, "triangle", f, at, end, 6).connect(hp);
      const shimmer = ctx.createGain();
      shimmer.gain.value = 0.25;
      shimmer.connect(hp);
      osc(ctx, "sine", f * 2, at, end).connect(shimmer);
      env(g, at, 0.2 * vel, 0.002, 0.01, 1.6);
      break;
    }
    case "nay": {
      const end = at + dur + 0.4;
      const lfo = osc(ctx, "sine", 5.2, at, end);
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, at);
      depth.gain.linearRampToValueAtTime(f * 0.006, at + Math.min(0.35, dur));
      lfo.connect(depth);
      const o1 = osc(ctx, "sine", f, at, end);
      const o2 = osc(ctx, "triangle", f, at, end);
      depth.connect(o1.frequency);
      depth.connect(o2.frequency);
      const mix = ctx.createGain();
      mix.gain.value = 0.35;
      o2.connect(mix);
      mix.connect(g);
      o1.connect(g);
      // дыхание
      const n = ctx.createBufferSource();
      n.buffer = noise;
      n.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f * 2;
      bp.Q.value = 3;
      const ng = ctx.createGain();
      ng.gain.value = 0.05;
      n.connect(bp).connect(ng).connect(g);
      n.start(at);
      n.stop(end);
      env(g, at, 0.2 * vel, 0.08, Math.max(dur - 0.1, 0.05), 0.25);
      break;
    }
    case "surnay": {
      const end = at + dur + 0.2;
      const lfo = osc(ctx, "sine", 6, at, end);
      const depth = ctx.createGain();
      depth.gain.value = f * 0.008;
      lfo.connect(depth);
      const o = osc(ctx, "sawtooth", f, at, end);
      depth.connect(o.frequency);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1400;
      bp.Q.value = 1.2;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3200;
      o.connect(bp).connect(lp).connect(g);
      env(g, at, 0.12 * vel, 0.03, Math.max(dur - 0.05, 0.05), 0.12);
      break;
    }
    case "bell": {
      const end = at + 3;
      for (const [ratio, amp, decay] of [
        [1, 1, 2.4],
        [2.76, 0.35, 1.2],
        [5.4, 0.15, 0.6],
      ] as const) {
        const pg = ctx.createGain();
        pg.connect(g);
        env(pg, at, amp, 0.002, 0, decay);
        osc(ctx, "sine", f * ratio, at, end).connect(pg);
      }
      g.gain.value = 0.12 * vel;
      break;
    }
    case "pad": {
      const end = at + dur + 1.4;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1100;
      lp.connect(g);
      osc(ctx, "sawtooth", f, at, end, -8).connect(lp);
      osc(ctx, "sawtooth", f, at, end, 8).connect(lp);
      osc(ctx, "sine", f / 2, at, end).connect(lp);
      env(g, at, 0.045 * vel, 0.6, Math.max(dur - 0.6, 0.1), 1.2);
      break;
    }
    case "bass": {
      const end = at + dur + 0.5;
      osc(ctx, "sine", f, at, end).connect(g);
      const h = ctx.createGain();
      h.gain.value = 0.2;
      h.connect(g);
      osc(ctx, "triangle", f * 2, at, end).connect(h);
      env(g, at, 0.3 * vel, 0.02, Math.max(dur - 0.1, 0.05), 0.35);
      break;
    }
  }
}

function drumHit(ctx: Ctx, drum: Drum, out: AudioNode, at: number, vel: number, noise: AudioBuffer) {
  const jingle = (amp: number, decay: number) => {
    const n = ctx.createBufferSource();
    n.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6500;
    const g = ctx.createGain();
    n.connect(hp).connect(g).connect(out);
    env(g, at, amp * vel, 0.002, 0.01, decay);
    n.start(at, Math.random() * 0.5);
    n.stop(at + decay + 0.05);
  };

  if (drum === "dum") {
    const g = ctx.createGain();
    g.connect(out);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(110, at);
    o.frequency.exponentialRampToValueAtTime(52, at + 0.25);
    o.connect(g);
    o.start(at);
    o.stop(at + 0.6);
    env(g, at, 0.55 * vel, 0.004, 0.02, 0.45);
    jingle(0.06, 0.25);
  } else if (drum === "tak") {
    const n = ctx.createBufferSource();
    n.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2300;
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    n.connect(bp).connect(g).connect(out);
    env(g, at, 0.45 * vel, 0.001, 0.005, 0.07);
    n.start(at, Math.random() * 0.5);
    n.stop(at + 0.12);
    jingle(0.12, 0.3);
  } else {
    jingle(0.16, 0.35);
  }
}

/**
 * Арпеджио по аккордам: по аккорду на такт, ноты аккорда идут по шаблону индексов.
 * arpeggiate([["A3","C4","E4","A4"], …], [0,1,2,1,3,2,1,2], 0.5) — восьмыми.
 */
export function arpeggiate(
  bars: string[][],
  pattern: number[],
  step: number,
  { beatsPerBar = 4, velocity = 0.5, accent = 0.15 } = {},
): Note[] {
  const notes: Note[] = [];
  bars.forEach((chord, bar) => {
    pattern.forEach((idx, i) => {
      const beat = bar * beatsPerBar + i * step;
      if (beat >= (bar + 1) * beatsPerBar) return;
      // первая нота такта чуть громче — так арпеджио «дышит»
      notes.push([beat, chord[idx % chord.length], step * 1.5, velocity + (i === 0 ? accent : 0)]);
    });
  });
  return notes;
}
