let audioContext = null;
let masterGain = null;
let soundEnabled = true;
let unlocked = false;

function getAudioContextClass() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

export function setSoundEnabled(value) {
  soundEnabled = Boolean(value);
}

export function isSoundSupported() {
  return Boolean(getAudioContextClass());
}

export function getAudioStatus() {
  if (!isSoundSupported()) return 'unsupported';
  if (!audioContext) return 'locked';
  return audioContext.state === 'running' && unlocked ? 'ready' : audioContext.state;
}

function ensureContext() {
  if (audioContext) return true;
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return false;
  audioContext = new AudioContextClass();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.52;
  masterGain.connect(audioContext.destination);
  return true;
}

function playSilentUnlockBuffer() {
  if (!audioContext || !masterGain) return;
  const buffer = audioContext.createBuffer(1, 1, 22050);
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  gain.gain.value = 0.00001;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(masterGain);
  source.start(0);
}

export async function unlockAudio() {
  if (!soundEnabled) return false;
  if (!ensureContext()) return false;
  try {
    if (audioContext.state !== 'running') await audioContext.resume();
    playSilentUnlockBuffer();
    unlocked = audioContext.state === 'running';
    return unlocked;
  } catch {
    unlocked = false;
    return false;
  }
}

function tone({ frequency, duration = 0.07, delay = 0, type = 'sine', volume = 0.11, slideTo = null }) {
  if (!audioContext || !masterGain || audioContext.state !== 'running') return;
  const start = audioContext.currentTime + delay;
  const end = start + duration;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(start);
  oscillator.stop(end + 0.015);
}

export async function playSound(name) {
  if (!soundEnabled || !(await unlockAudio())) return false;
  switch (name) {
    case 'rotate':
      tone({ frequency: 510, duration: 0.04, type: 'square', volume: 0.07 });
      tone({ frequency: 720, duration: 0.045, delay: 0.022, type: 'square', volume: 0.06 });
      break;
    case 'hold':
      tone({ frequency: 350, duration: 0.07, type: 'triangle', volume: 0.09 });
      tone({ frequency: 520, duration: 0.07, delay: 0.045, type: 'triangle', volume: 0.08 });
      break;
    case 'hard':
      tone({ frequency: 190, slideTo: 58, duration: 0.12, type: 'sawtooth', volume: 0.15 });
      break;
    case 'line1':
      tone({ frequency: 560, duration: 0.09, type: 'triangle', volume: 0.11 });
      break;
    case 'line2':
      tone({ frequency: 520, duration: 0.075, type: 'triangle', volume: 0.1 });
      tone({ frequency: 700, duration: 0.085, delay: 0.05, type: 'triangle', volume: 0.1 });
      break;
    case 'line3':
      [500, 670, 860].forEach((f, i) => tone({ frequency: f, duration: 0.08, delay: i * 0.045, type: 'triangle', volume: 0.11 }));
      break;
    case 'line4':
      [440, 590, 780, 1040].forEach((f, i) => tone({ frequency: f, duration: 0.09, delay: i * 0.04, type: 'square', volume: 0.09 }));
      break;
    case 'perfect':
      [523, 659, 784, 1047].forEach((f, i) => tone({ frequency: f, duration: 0.22, delay: i * 0.03, type: 'sine', volume: 0.075 }));
      break;
    case 'gameOver':
      [390, 300, 220, 145].forEach((f, i) => tone({ frequency: f, duration: 0.14, delay: i * 0.085, type: 'sawtooth', volume: 0.105 }));
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((f, i) => tone({ frequency: f, duration: 0.13, delay: i * 0.07, type: 'triangle', volume: 0.095 }));
      break;
    case 'confirm':
      tone({ frequency: 700, duration: 0.08, type: 'sine', volume: 0.11 });
      tone({ frequency: 920, duration: 0.08, delay: 0.05, type: 'sine', volume: 0.09 });
      break;
    default:
      return false;
  }
  return true;
}
