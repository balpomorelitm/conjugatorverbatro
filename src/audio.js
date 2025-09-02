// Centralized audio management module
// Exports individual sound constants, utility functions, and shared lists

export const soundCorrect = new Audio('../assets/sounds/correct.mp3');
export const soundWrong = new Audio('../assets/sounds/wrong.mp3');
export const soundWrongStudy = new Audio('../assets/sounds/wongstudy.mp3');
export const soundClick = new Audio('../assets/sounds/click.mp3');
export const soundStart = new Audio('../assets/sounds/start-verb.mp3');
export const soundSkip = new Audio('../assets/sounds/skip.mp3');
export const menuMusic = new Audio('../assets/sounds/musicmenu.mp3');
menuMusic.loop = true;
export const gameMusic = new Audio('../assets/sounds/musicgame.mp3');
gameMusic.loop = true;
export const soundGameOver = new Audio('../assets/sounds/gameover.mp3');
export const soundbubblepop = new Audio('../assets/sounds/soundbubblepop.mp3');
export const soundLifeGained = new Audio('../assets/sounds/soundLifeGained.mp3');
export const soundElectricShock = new Audio('../assets/sounds/electricshock.mp3');
export const soundTicking = new Audio('../assets/sounds/ticking.mp3');
export const chuacheSound = new Audio('../assets/sounds/talks.mp3');
export const soundLevelUp = new Audio('../assets/sounds/levelup.mp3');
export const bossDigitalCorrupted = new Audio('../assets/sounds/bossDigitalCorrupted.mp3');
export const systemRepaired = new Audio('../assets/sounds/systemRepaired.mp3');
export const bossSkynetGlitch = new Audio('../assets/sounds/bossSkynetGlitch.mp3');
export const bossNuclearCountdown = new Audio('../assets/sounds/bossNuclearCountdown.mp3');
export const nuclearExplosion = new Audio('../assets/sounds/nuclearExplosion.mp3');
export const bombDefused = new Audio('../assets/sounds/bombDefused.mp3');
export const bossT1000Mirror = new Audio('../assets/sounds/bossT1000Mirror.mp3');
export const mirrorShattered = new Audio('../assets/sounds/mirrorShattered.mp3');

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
  ];
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

