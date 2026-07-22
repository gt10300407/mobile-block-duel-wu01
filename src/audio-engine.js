let audioContext = null;
let masterGain = null;
let soundEnabled = true;

function getAudioContextClass() {
  return window.AudioContext || window.webkitAudioContext || null;
}

export function setSoundEnabled(value) {
  soundEnabled = Boolean(value);
}

export function isSoundSupported() {
  return Boolean(getAudioContextClass());
}

export async function unlockAudio() {
  if (!soundEnabled) return false;
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return false;

  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.22;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch {
      return false;
    }
  }

  return audioContext.state === 'running';
}

function tone({ frequency, duration = 0.06, delay = 0, type = 'sine', volume = 0.08, slideTo = null }) {
  if (!audioContext || !masterGain) return;
  const start = audioContext.currentTime + delay;
  const end = start + duration;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), end);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(start);
  oscillator.stop(end + 0.01);
}

export async function playSound(name) {
  if (!soundEnabled || !(await unlockAudio())) return;

  switch (name) {
    case 'rotate':
      tone({ frequency: 470, duration: 0.035, type: 'square', volume: 0.035 });
      tone({ frequency: 620, duration: 0.045, delay: 0.025, type: 'square', volume: 0.03 });
      break;
    case 'hold':
      tone({ frequency: 330, duration: 0.055, type: 'triangle', volume: 0.05 });
      tone({ frequency: 495, duration: 0.055, delay: 0.04, type: 'triangle', volume: 0.045 });
      break;
    case 'hard':
      tone({ frequency: 150, slideTo: 68, duration: 0.09, type: 'sawtooth', volume: 0.09 });
      break;
    case 'line1':
      tone({ frequency: 520, duration: 0.07, type: 'triangle', volume: 0.06 });
      break;
    case 'line2':
      tone({ frequency: 500, duration: 0.06, type: 'triangle', volume: 0.06 });
      tone({ frequency: 650, duration: 0.07, delay: 0.045, type: 'triangle', volume: 0.06 });
      break;
    case 'line3':
      [480, 620, 780].forEach((frequency, index) => tone({ frequency, duration: 0.065, delay: index * 0.04, type: 'triangle', volume: 0.065 }));
      break;
    case 'line4':
      [420, 560, 720, 920].forEach((frequency, index) => tone({ frequency, duration: 0.075, delay: index * 0.035, type: 'square', volume: 0.055 }));
      break;
    case 'perfect':
      [523, 659, 784, 1047].forEach((frequency, index) => tone({ frequency, duration: 0.18, delay: index * 0.025, type: 'sine', volume: 0.045 }));
      break;
    case 'gameOver':
      [360, 280, 210, 150].forEach((frequency, index) => tone({ frequency, duration: 0.12, delay: index * 0.08, type: 'sawtooth', volume: 0.05 }));
      break;
    case 'confirm':
      tone({ frequency: 660, duration: 0.055, type: 'sine', volume: 0.05 });
      break;
    default:
      break;
  }
}
