// Centralized audio management module
// Exports individual sound constants, utility functions, and shared lists

const assetUrl = relativePath => new URL(relativePath, import.meta.url).href;
const createAudio = relativePath => new Audio(assetUrl(relativePath));

export const soundCorrect = createAudio('../assets/sounds/correct.mp3');
export const soundWrong = createAudio('../assets/sounds/wrong.mp3');
export const soundWrongStudy = createAudio('../assets/sounds/wongstudy.mp3');
export const soundClick = createAudio('../assets/sounds/click.mp3');
export const soundStart = createAudio('../assets/sounds/start-verb.mp3');
export const soundSkip = createAudio('../assets/sounds/skip.mp3');
export const menuMusic = createAudio('../assets/sounds/musicmenu.mp3');
menuMusic.loop = true;
export const gameMusic = createAudio('../assets/sounds/musicgame.mp3');
gameMusic.loop = true;
export const soundGameOver = createAudio('../assets/sounds/gameover.mp3');
export const soundbubblepop = createAudio('../assets/sounds/soundbubblepop.mp3');
export const soundLifeGained = createAudio('../assets/sounds/soundLifeGained.mp3');
export const soundElectricShock = createAudio('../assets/sounds/electricshock.mp3');
export const soundTicking = createAudio('../assets/sounds/ticking.mp3');
export const chuacheSound = createAudio('../assets/sounds/talks.mp3');
export const soundLevelUp = createAudio('../assets/sounds/levelup.mp3');
export const bossDigitalCorrupted = createAudio('../assets/sounds/bossDigitalCorrupted.mp3');
export const systemRepaired = createAudio('../assets/sounds/systemRepaired.mp3');
export const bossSkynetGlitch = createAudio('../assets/sounds/bossSkynetGlitch.mp3');
export const bossNuclearCountdown = createAudio('../assets/sounds/bossNuclearCountdown.mp3');
export const nuclearExplosion = createAudio('../assets/sounds/nuclearExplosion.mp3');
export const bombDefused = createAudio('../assets/sounds/bombDefused.mp3');
export const bossT1000Mirror = createAudio('../assets/sounds/bossT1000Mirror.mp3');
export const mirrorShattered = createAudio('../assets/sounds/mirrorShattered.mp3');

// Collect all audio instances in a single array for bulk operations
export const audioElements = [
  soundCorrect,
  soundWrong,
  soundWrongStudy,
  soundClick,
  soundStart,
  soundSkip,
  menuMusic,
  gameMusic,
  soundGameOver,
  soundbubblepop,
  soundLifeGained,
  soundElectricShock,
  soundTicking,
  chuacheSound,
  soundLevelUp,
  bossDigitalCorrupted,
  systemRepaired,
  bossSkynetGlitch,
  bossNuclearCountdown,
  nuclearExplosion,
  bombDefused,
  bossT1000Mirror,
  mirrorShattered
];

// Preload frequently used images to avoid delays during config screens
export function preloadImages() {
  const sources = [
    '../assets/images/conjucityhk.webp',
    '../assets/images/conjuchuache.webp',
    '../assets/images/musicon.webp',
    '../assets/images/musicoff.webp',
    '../assets/images/pixel_bubble.webp',
    '../assets/images/iconquestion.webp'
  ].map(assetUrl);
  sources.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

// Preload all audio to reduce playback latency
export function preloadAudio() {
  let loaded = 0;
  audioElements.forEach(audio => {
    audio.preload = 'auto';
    audio.addEventListener(
      'canplaythrough',
      () => {
        loaded++;
        // Optional: track progress with loaded / audioElements.length
      },
      { once: true }
    );
    audio.load();
  });
}

// Safe media playback utility
export function safePlay(media) {
  if (!media || (typeof media.play !== 'function' && !media.src)) return;

  // If it's a video element, configure extra properties
  if (media.tagName && media.tagName.toLowerCase() === 'video') {
    media.muted = true;
    media.playsInline = true;
  }

  const p = media.play();
  if (p && typeof p.catch === 'function') {
    p.catch(err => {
      if (err.name !== 'AbortError') {
        console.error('Media play failed:', err);
      }
    });
  }
}

