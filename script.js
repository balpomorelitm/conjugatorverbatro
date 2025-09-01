let typeInterval; // Variable global para controlar el intervalo de la animación

const soundCorrect = new Audio('sounds/correct.mp3');
const soundWrong = new Audio('sounds/wrong.mp3');
const soundWrongStudy = new Audio('sounds/wongstudy.mp3');
const soundClick = new Audio('sounds/click.mp3');
const soundStart = new Audio('sounds/start-verb.mp3');
const soundSkip = new Audio('sounds/skip.mp3');
const menuMusic = new Audio('sounds/musicmenu.mp3');
const gameMusic = new Audio('sounds/musicgame.mp3');
let currentMusic = menuMusic;
const soundGameOver = new Audio('sounds/gameover.mp3');
const soundbubblepop = new Audio('sounds/soundbubblepop.mp3');
const soundLifeGained = new Audio('sounds/soundLifeGained.mp3');
const soundElectricShock = new Audio('sounds/electricshock.mp3');
const soundTicking = new Audio('sounds/ticking.mp3');
const chuacheSound = new Audio('sounds/talks.mp3');
const soundLevelUp = new Audio('sounds/levelup.mp3');
// Boss Battle Sounds - Add after existing sound declarations
const bossDigitalCorrupted = new Audio('sounds/bossDigitalCorrupted.mp3');
const systemRepaired = new Audio('sounds/systemRepaired.mp3');
const bossSkynetGlitch = new Audio('sounds/bossSkynetGlitch.mp3');
const bossNuclearCountdown = new Audio('sounds/bossNuclearCountdown.mp3');
const nuclearExplosion = new Audio('sounds/nuclearExplosion.mp3');
const bombDefused = new Audio('sounds/bombDefused.mp3');
const bossT1000Mirror = new Audio('sounds/bossT1000Mirror.mp3');
const mirrorShattered = new Audio('sounds/mirrorShattered.mp3');
menuMusic.loop = true;
gameMusic.loop = true;

// ---- Recorder compatibility check ----
// Global flag used to disable recorder functionality when unsupported
window.recorderEnabled = true;

async function requestRecorderState() {
  // Verify the environment supports recording APIs
  if (!navigator.mediaDevices || typeof window.MediaRecorder === 'undefined') {
    console.warn('Recorder API not supported; disabling recorder.');
    window.recorderEnabled = false;
    return { supported: false };
  }
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    console.warn('Service worker controller missing; recorder disabled.');
    window.recorderEnabled = false;
    return { supported: false };
  }

  // Send a message to the service worker and wait for a response
  const channel = new MessageChannel();
  const responsePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('request-get-recorder-state timed out')), 3000);
    channel.port1.onmessage = event => {
      clearTimeout(timer);
      resolve(event.data);
    };
  });

  try {
    navigator.serviceWorker.controller.postMessage({ type: 'request-get-recorder-state' }, [channel.port2]);
    const result = await responsePromise;
    window.recorderEnabled = !!(result && result.supported);
    if (!window.recorderEnabled) {
      console.warn('Recorder disabled by service worker response.');
    }
    return result;
  } catch (err) {
    console.error('Could not obtain recorder state:', err);
    window.recorderEnabled = false;
    return { supported: false };
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready
    .then(() => requestRecorderState())
    .catch(err => {
      console.error('Recorder state check failed:', err);
      window.recorderEnabled = false;
    });
} else {
  console.warn('Service workers are not supported; recorder disabled.');
  window.recorderEnabled = false;
}

function safePlay(media) {
  if (!media || (typeof media.play !== 'function' && !media.src)) return;

  // Si es un video, configurar propiedades adicionales
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

// Level progression state
let bossesEncounteredTotal = 0;
let currentBossNumber = 0;
let correctAnswersTotal = 0;
let currentLevel = 0;

// Temporary level goals for testing
const LEVEL_GOAL_TIMER = 10;
const LEVEL_GOAL_LIVES = 10; // Survival mode

// Global settings defaults
window.animationsEnabled = false;
const storedNemesis = localStorage.getItem('chuacheReactionsEnabled');
window.chuacheReactionsEnabled = storedNemesis !== null ? storedNemesis === 'true' : true;
applyChuacheVisibility();
window.defaultVosEnabled = false;

// ---------------- Level Up Visual Effects -----------------
// Trigger a quick screen shake when leveling up.
function triggerLevelUpShake() {
  const gameContainer = document.body;
  gameContainer.classList.remove('level-up-shake');
  setTimeout(() => {
    gameContainer.classList.add('level-up-shake');
  }, 10);
}

// Update the level text with a fade transition.
function updateLevelText(newText) {
  const levelElement = document.getElementById('level-text');
  if (!levelElement) return;
  levelElement.classList.add('is-fading');
  setTimeout(() => {
    levelElement.innerText = newText;
    levelElement.classList.remove('is-fading');
  }, 300);
}

/**
 * Darkens a HEX color by a given percentage.
 * @param {string} hex - The hex color string (e.g., '#RRGGBB').
 * @param {number} percent - The percentage to darken by (e.g., 20 for 20%).
 * @returns {string} The new, darker hex color string.
 */
function darkenColor(hex, percent) {
  let f = parseInt(hex.slice(1), 16),
      t = percent / 100,
      r = f >> 16,
      g = (f >> 8) & 0x00ff,
      b = f & 0x0000ff;
  r = Math.round(r * (1 - t));
  g = Math.round(g * (1 - t));
  b = Math.round(b * (1 - t));
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function saveSetting(key, value) {
  localStorage.setItem(key, value);
}

function loadSettings() {
  const musicVol = localStorage.getItem('musicVolume');
  const sfxVol = localStorage.getItem('sfxVolume');
  const anim = localStorage.getItem('animationsEnabled');
  const chuache = localStorage.getItem('chuacheReactionsEnabled');
  const vos = localStorage.getItem('defaultVosEnabled');

  window.animationsEnabled = anim !== null ? anim === 'true' : false;
  window.chuacheReactionsEnabled = chuache !== null ? chuache === 'true' : true;
  window.defaultVosEnabled = vos === 'true';

  if (musicVol !== null) {
    const vol = parseFloat(musicVol);
    menuMusic.volume = vol;
    gameMusic.volume = vol;
    if (typeof targetVolume !== 'undefined') targetVolume = vol;
    const slider = document.getElementById('music-volume-slider');
    if (slider) slider.value = vol;
  } else {
    const slider = document.getElementById('music-volume-slider');
    if (slider) slider.value = 0.2;
    menuMusic.volume = 0.2;
    gameMusic.volume = 0.2;
    if (typeof targetVolume !== 'undefined') targetVolume = 0.2;
  }

  if (sfxVol !== null) {
    const vol = parseFloat(sfxVol);
    [soundCorrect, soundWrong, soundWrongStudy, soundClick, soundStart, soundSkip,
     soundGameOver, soundbubblepop, soundLifeGained, soundElectricShock, soundTicking,
     chuacheSound, soundLevelUp, bossDigitalCorrupted, systemRepaired, bossSkynetGlitch,
     bossNuclearCountdown, nuclearExplosion, bombDefused, bossT1000Mirror, mirrorShattered].forEach(a => { a.volume = vol; });
    const sfxSlider = document.getElementById('sfx-volume-slider');
    if (sfxSlider) sfxSlider.value = vol;
  } else {
    const sfxSlider = document.getElementById('sfx-volume-slider');
    if (sfxSlider) sfxSlider.value = 1.0;
    [soundCorrect, soundWrong, soundWrongStudy, soundClick, soundStart, soundSkip,
     soundGameOver, soundbubblepop, soundLifeGained, soundElectricShock, soundTicking,
     chuacheSound, soundLevelUp, bossDigitalCorrupted, systemRepaired, bossSkynetGlitch,
     bossNuclearCountdown, nuclearExplosion, bombDefused, bossT1000Mirror, mirrorShattered].forEach(a => { a.volume = 1.0; });
  }

  const animChk = document.getElementById('toggle-animations-setting');
  if (animChk) animChk.checked = window.animationsEnabled;
  const chuacheChk = document.getElementById('toggle-chuache-reactions-setting');
  if (chuacheChk) chuacheChk.checked = window.chuacheReactionsEnabled;
  const vosChk = document.getElementById('default-enable-vos-setting');
  if (vosChk) vosChk.checked = window.defaultVosEnabled;

  applyChuacheVisibility();
}

function applyChuacheVisibility() {
  const box = document.getElementById('chuache-box');
  const headerChar = document.querySelector('.header-char');
  if (window.chuacheReactionsEnabled) {
    if (box) box.style.display = '';
    if (headerChar) headerChar.style.display = '';
  } else {
    if (box) box.style.display = 'none';
    if (headerChar) headerChar.style.display = 'none';
  }
}
// Begin fetching verb data as early as possible to utilize the preload
const verbosJsonPromise = fetch('verbos.json')
  .then(resp => {
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  })
  .catch(err => {
    console.error('Could not fetch verbos.json:', err);
    alert('Error cargando datos de los verbos.');
    return [];
  });

// Supabase initialization

let supabase;

// Fallback data used when Supabase is unavailable
const SAMPLE_RECORDS = {
  timer: [
    { name: 'Alice', score: 100, level: 5 },
    { name: 'Bob', score: 80, level: 4 }
  ],
  lives: [
    { name: 'Charlie', score: 120, level: 3 },
    { name: 'Dana', score: 100, level: 2 }
  ]
};


// `config.js` or inline script in index.html should define SUPABASE_URL and
// SUPABASE_ANON_KEY. These may be injected during the build process. Ensure the
// variables contain real values before initializing the client.
if (
  typeof window !== 'undefined' &&
  window.supabase &&
  typeof SUPABASE_URL !== 'undefined' &&
  typeof SUPABASE_ANON_KEY !== 'undefined' &&
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !String(SUPABASE_URL).includes('%%') &&
  !String(SUPABASE_ANON_KEY).includes('%%')
) {
  // Initialize Supabase client only when the library and credentials exist
  supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
} else {
  console.error(
    'Supabase client unavailable. Hall of Fame records will not load.'
  );
}

// Track last index used for each type of reaction
const lastChuacheIndex = {
  correct: -1,
  wrong: -1,
  skip: -1,
  gameover: -1
};

const chuacheReactions = {
  correct: [
    "You have been upgraded from 'terrible' to 'adequate'.",
    "I am programmed to simulate enthusiasm: 'Yay'.",
    "Your conjugation is... bueno. For a human.",
    "You have acquired a new skill. You are less useless now."
  ],
  wrong: [
    "No problemo. Just kidding. That was terrible.",
    "Your Spanish has been terminated.",
    "Negative. Your response is illogical.",
    "Wrong!",
    "I'll be back... You can't handle this one.",
    "Talk to the mano",
    "HASTA LA VISTA, streak."
  ],
  // He interprets skipping as weakness and cowardice.
  skip: [
    "Retreat is the optimal strategy... for losers.",
    "You'll be back. And you'll probably be wrong again.",
    "Behavioral analysis: cowardice detected.",
    "You can't skip your destiny. Or the next question.",
    "Running away? A predictable human response.",
    "A T-1000 would not skip. It's an organic design flaw.",
    "I am The Conjuchuache. You cannot hide.",
    "I'll be waiting for you... at the Game Over screen.",
    "Target evaded. Re-acquiring."
  ],
  gameover: [
    "Volverás.",
    "Has sido... conjugado.",
    "Game over, human.",
    "You’ve been terminated.",
    "La resistencia ha caído.",
    "Your verbs betrayed you.",
    "Hasta la vista, conjugador.",
    "Mission: complete."
  ]
};

function chuacheSpeaks(type) {
  if (window.selectedGameMode === 'study' || !window.chuacheReactionsEnabled) return;
  const image = document.getElementById("chuache-image");
  const bubble = document.getElementById("speech-bubble");
  if (!image || !bubble) return;

  const messages = chuacheReactions[type];
  if (!messages || messages.length === 0) return;

  let index;
  do {
    index = Math.floor(Math.random() * messages.length);
  } while (index === lastChuacheIndex[type] && messages.length > 1);
  lastChuacheIndex[type] = index;
  const message = messages[index];

  image.src = "images/chuachetalks.gif";
  bubble.textContent = message;
  bubble.classList.remove("hidden");
  if (type === "wrong" || type === "skip") bubble.classList.add("error");
  else bubble.classList.remove("error");

  playFromStart(chuacheSound);

  setTimeout(() => {
    image.src = "images/conjuchuache.webp";
    bubble.classList.add("hidden");
    bubble.classList.remove("error");
  }, 3000);
}

function playFromStart(audio) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  safePlay(audio);
}

// Ensure antagonist container stays at the right of the game layout
function ensureChuachePosition() {
  const layout = document.getElementById('game-layout');
  const box = document.getElementById('chuache-box');
  if (layout && box && box.parentNode !== layout) {
    layout.appendChild(box);
  }
}

function animateChuacheToGame() {
  const headerChar = document.querySelector('.header-char');
  const targetImg = document.getElementById('chuache-image');
  if (!headerChar || !targetImg) return;

  targetImg.classList.add('invisible');
  const startRect = headerChar.getBoundingClientRect();
  const endRect = targetImg.getBoundingClientRect();

  const clone = headerChar.cloneNode(true);
  clone.style.position = 'fixed';
  clone.style.left = `${startRect.left}px`;
  clone.style.top = `${startRect.top}px`;
  clone.style.width = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;
  clone.style.transformOrigin = 'bottom right';
  clone.style.zIndex = '1000';
  document.body.appendChild(clone);

  headerChar.style.visibility = 'hidden';

  const dx = endRect.left - startRect.left;
  const dy = endRect.top - startRect.top;
  const sx = endRect.width / startRect.width;
  const sy = endRect.height / startRect.height;

  requestAnimationFrame(() => {
    clone.style.transition = 'transform 0.8s ease-out';
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  });

  clone.addEventListener('transitionend', () => {
    clone.remove();
    headerChar.style.display = 'none';
    targetImg.classList.remove('invisible');
  }, { once: true });
}


/**
 * Simulates a typewriter effect on an HTML element.
 * @param {HTMLElement} element - The target element to display the typing.
 * @param {string} text - The text to type out.
 * @param {number} [speed=150] - The delay between characters in milliseconds.
 */
function typeWriter(element, text, speed = 120) {
  if (element._twInterval) clearInterval(element._twInterval);
  element.innerHTML = '';
  let i = 0, cursorVisible = true;
  const cursorSpan = document.createElement('span');
  cursorSpan.className = 'typing-cursor';

  element.appendChild(document.createTextNode(''));

  element._twInterval = setInterval(() => {
    if (element.contains(cursorSpan)) {
      element.removeChild(cursorSpan);
    }

    if (i < text.length) {
      element.firstChild.nodeValue += text.charAt(i++);
      element.appendChild(cursorSpan);
    } else {
      cursorSpan.style.visibility = cursorVisible ? 'visible' : 'hidden';
      cursorVisible = !cursorVisible;
      if (!element.contains(cursorSpan)) element.appendChild(cursorSpan);
    }
  }, speed);
}


function handleIgnoreAccentsToggle() {
    const btn = document.getElementById('toggle-ignore-accents');
    if (!btn) return;
    btn.classList.toggle('selected');
    if (typeof soundClick !== 'undefined') safePlay(soundClick);
}



let openFilterDropdownMenu = null;
let tenseDropdownInitialized = false;

/**
 * Creates and appends fire particles to the streak bar container.
 */
function createFireParticles() {
  const fireContainer = document.getElementById('streak-fire');
  if (!fireContainer) return;

  fireContainer.innerHTML = '';
  const particleCount = 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');

    particle.style.animationDelay = `${Math.random()}s`;
    particle.style.left = `calc((100% - 5em) * ${i / particleCount})`;

    fireContainer.appendChild(particle);
  }
}

/**
 * Updates the height of the streak fire animation based on the current streak.
 * The fire grows in steps until it reaches a maximum height.
 * @param {number} currentStreak - The player's current consecutive correct answers.
 */
function updateStreakFire(currentStreak) {
  const fireElement = document.getElementById('streak-fire');
  if (!fireElement) return;

  const MAX_STREAK_FOR_GROWTH = 12; // The streak count at which the fire is at its maximum height.
  const MAX_RISE_HEIGHT = -35;      // The maximum vertical travel in 'em' units.
  const INITIAL_RISE_HEIGHT = -5;   // The base height when streak is 1.

  // Make the fire visible as soon as the streak starts.
  fireElement.style.opacity = currentStreak > 0 ? '1' : '0';

  if (currentStreak > 0) {
    // Calculate the growth progress as a percentage (0 to 1).
    const progress = Math.min(currentStreak / MAX_STREAK_FOR_GROWTH, 1);

    // Linearly interpolate the height from initial to max based on progress.
    const newHeight = INITIAL_RISE_HEIGHT + progress * (MAX_RISE_HEIGHT - INITIAL_RISE_HEIGHT);

    // Apply the new height to the CSS custom property.
    fireElement.style.setProperty('--fire-rise-height', `${newHeight}em`);
  } else {
    // Reset to initial state when streak is 0.
    fireElement.style.setProperty('--fire-rise-height', `${INITIAL_RISE_HEIGHT}em`);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  let selectedGameMode = null;
  let allVerbData = [];
  let currentQuestion = {};
  let currentOptions = {};
  let score = 0, streak = 0, multiplier = 1.0, startTime = 0;
  let bestStreak = 0;
  let countdownTimer;
  let countdownTime = 240;
  let remainingLives = 5;
  let targetVolume=0.2;
  loadSettings();
  let timerTimeLeft = 0;
  let tickingSoundPlaying = false;
  let freeClues = 0;
  const defaultBackgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-color').trim();

  // Elements for Boss Battle transitions
  const gameContainer = document.getElementById('game-container');
  const chuacheImage = document.getElementById('chuache-image');
  const bossImage = document.getElementById('boss-image');
  const progressContainer = document.getElementById('level-text');

  const game = {
    score: 0,
    level: 1,
    verbsInPhaseCount: 0,
    gameState: 'PLAYING', // Possible states: PLAYING, BOSS_BATTLE
    currentVerbs: [],
    currentVerbIndex: 0,
    isGameOver: false,
    boss: null, // Will hold the current boss battle state

    lastBossUsed: null // Track the previously selected boss
  };

  // Bosses definition
  const bosses = {
    verbRepairer: {
      name: 'Digital Corrupted',
      description: 'Una interferencia digital ha dañado los verbos.',
      verbsToComplete: 3,
      init: function() {
        const multiplier = this.reappearanceMultiplier || 1;
        this.baseVerbsToComplete = this.baseVerbsToComplete || this.verbsToComplete;
        this.verbsToComplete = Math.floor(this.baseVerbsToComplete * multiplier);

        // Step 1: Filter all verbs to those with long infinitives and at least one regular tense.
        const filteredVerbs = allVerbData.filter(v => {
          if (!v.infinitive_es || v.infinitive_es.length <= 5) return false;
          return currentOptions.tenses.some(t => Array.isArray(v.types?.[t]) && v.types[t].includes('regular'));
        });

        // Step 2: Randomly select the verbs for this battle.
        const shuffled = filteredVerbs.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, this.verbsToComplete);

        // Step 3: Handle the case where not enough verbs are available.
        if (selected.length < this.verbsToComplete) {
          console.error('Not enough compatible verbs to start Digital Corrupted boss.');
          endBossBattle(false, 'ERROR: No hay verbos compatibles.');
          return;
        }

        // Step 4: Build the challenge verbs with random tense and pronoun.
        const pronounList = window.pronouns || pronouns;
        const challengeVerbs = [];

        selected.forEach(verb => {
          const possibleTenses = currentOptions.tenses.filter(t => Array.isArray(verb.types?.[t]) && verb.types[t].includes('regular'));
          const tense = possibleTenses[Math.floor(Math.random() * possibleTenses.length)];
          const pronoun = pronounList[Math.floor(Math.random() * pronounList.length)];
          const correctAnswer = verb.conjugations?.[tense]?.[pronoun];
          if (!correctAnswer) {
            console.error(`Missing conjugation for ${verb.infinitive_es} in ${tense} (${pronoun}).`);
            return;
          }
          const glitchedForm = glitchVerb(correctAnswer);
          challengeVerbs.push({
            infinitive: verb.infinitive_es,
            tense,
            pronoun,
            correctAnswer,
            conjugations: [correctAnswer],
            glitchedForm
          });
        });

        if (challengeVerbs.length < this.verbsToComplete) {
          console.error('Not enough challenge verbs after processing for Digital Corrupted.');
          endBossBattle(false, 'ERROR: No hay verbos compatibles.');
          return;
        }

        // Step 5: Set up the boss state
        game.boss = {
          id: 'verbRepairer',
          verbsCompleted: 0,
          challengeVerbs,
          totalVerbsNeeded: this.verbsToComplete
        };

        console.log('Digital Corrupted challenge verbs:', game.boss.challengeVerbs);

        // Step 6: Display the first glitched verb
        displayNextBossVerb();
      }
    },
  skynetGlitch: {
    name: 'Skynet Glitch',
    description: 'Skynet has corrupted the infinitives and pronouns. Decode and conjugate!',
    verbsToComplete: 2, // Por defecto, se ajustará según dificultad
    init: function() {
      // Ajustar cantidad según dificultad
      if (currentOptions.mode === 'receptive') {
        this.verbsToComplete = 2; // Modo fácil
      } else if (currentOptions.mode === 'productive_easy') {
        this.verbsToComplete = 2; // Modo normal
      } else if (currentOptions.mode === 'productive') {
        this.verbsToComplete = 3; // Modo difícil
      }
      const multiplier = this.reappearanceMultiplier || 1;
      this.verbsToComplete = Math.floor(this.verbsToComplete * multiplier);

      // Filtrar verbos según la selección actual del jugador
      const selectedVerbElements = Array.from(document.querySelectorAll('#verb-buttons .verb-button.selected'));
      const selectedVerbInfinitives = selectedVerbElements.map(btn => btn.dataset.value);

      let verbsToConsider = [];
      if (selectedVerbInfinitives.length > 0) {
        verbsToConsider = allVerbData.filter(v =>
          selectedVerbInfinitives.includes(v.infinitive_es)
        );
      } else {
        const selectedTypeBtns = Array.from(document.querySelectorAll('.verb-type-button.selected:not(:disabled)'));
        const selectedTypes = selectedTypeBtns.map(b => b.dataset.value);

        verbsToConsider = allVerbData.filter(v =>
          currentOptions.tenses.some(tenseKey =>
            (v.types[tenseKey] || []).some(typeInVerb =>
              selectedTypes.includes(typeInVerb)
            )
          )
        );
      }

      // Filtrar solo verbos que tengan conjugaciones disponibles para los tiempos seleccionados
      const filteredVerbs = verbsToConsider.filter(v =>
        currentOptions.tenses.some(tenseKey => v.conjugations[tenseKey] !== undefined)
      );

      // Filtrar verbos que sean suficientemente largos para poder "glitchear"
      const longEnoughVerbs = filteredVerbs.filter(v => 
        v.infinitive_es.length >= 4 // Mínimo 4 letras para que tenga sentido ocultar una
      );

      const shuffled = longEnoughVerbs.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, this.verbsToComplete);

      if (selected.length < this.verbsToComplete) {
        console.error('Not enough compatible verbs for Skynet Glitch boss.');
        endBossBattle(false, 'ERROR: Not enough compatible verbs.');
        return;
      }

      const pronounList = window.pronouns || pronouns;
      const challengeVerbs = [];

      selected.forEach(verb => {
        const possibleTenses = currentOptions.tenses.filter(t =>
          verb.conjugations[t] !== undefined
        );
        const tense = possibleTenses[Math.floor(Math.random() * possibleTenses.length)];
        const pronoun = pronounList[Math.floor(Math.random() * pronounList.length)];
        const correctAnswer = verb.conjugations[tense][pronoun];

        if (!correctAnswer) {
          console.error(`Missing conjugation for ${verb.infinitive_es} in ${tense} (${pronoun}).`);
          return;
        }

        // Crear las versiones "glitcheadas" del infinitivo y pronombre
        const glitchedInfinitive = this.glitchInfinitive(verb.infinitive_es);
        const glitchedPronoun = this.glitchPronoun(pronoun);

        challengeVerbs.push({
          infinitive: verb.infinitive_es,        // Original para referencia
          glitchedInfinitive: glitchedInfinitive, // Con letra faltante
          pronoun: pronoun,                      // Original para referencia  
          glitchedPronoun: glitchedPronoun,      // Con letra faltante
          tense,
          correctAnswer,
          conjugations: [correctAnswer]
        });
      });

      if (challengeVerbs.length < this.verbsToComplete) {
        console.error('Not enough challenge verbs for Skynet Glitch boss.');
        endBossBattle(false, 'ERROR: Not enough compatible verbs.');
        return;
      }

      game.boss = {
        id: 'skynetGlitch',
        verbsCompleted: 0,
        challengeVerbs,
        totalVerbsNeeded: this.verbsToComplete
      };

      console.log('Skynet Glitch challenge verbs:', game.boss.challengeVerbs);
      displayNextBossVerb();
    },

    // Función para "glitchear" el infinitivo (quitar una letra aleatoria)
    glitchInfinitive: function(infinitive) {
      if (infinitive.length < 4) return infinitive; // Muy corto para glitchear
      
      // Evitar glitchear la terminación (-ar, -er, -ir, -se)
      let maxIndex = infinitive.length;
      if (infinitive.endsWith('se')) {
        maxIndex = infinitive.length - 4; // Evitar -arse, -erse, -irse
      } else {
        maxIndex = infinitive.length - 2; // Evitar -ar, -er, -ir
      }
      
      // No glitchear la primera letra tampoco
      const minIndex = 1;
      
      if (maxIndex <= minIndex) return infinitive; // No hay letras "seguras" para glitchear
      
      const randomIndex = minIndex + Math.floor(Math.random() * (maxIndex - minIndex));
      return infinitive.substring(0, randomIndex) + '_' + infinitive.substring(randomIndex + 1);
    },

    // Función para "glitchear" el pronombre (quitar una letra aleatoria)
    glitchPronoun: function(pronoun) {
      if (pronoun.length < 2) return pronoun; // Muy corto
      
      const randomIndex = Math.floor(Math.random() * pronoun.length);
      return pronoun.substring(0, randomIndex) + '_' + pronoun.substring(randomIndex + 1);
    }
  },
    nuclearBomb: {
      name: 'Nuclear Countdown',
      description: 'Defuse the nuclear bomb before time runs out!',
      verbsToComplete: 4,
      timeLimit: 30, // 30 seconds
      init: function() {
        const multiplier = this.reappearanceMultiplier || 1;
        this.baseVerbsToComplete = this.baseVerbsToComplete || this.verbsToComplete;
        this.verbsToComplete = Math.floor(this.baseVerbsToComplete * multiplier);

        // Filter verbs from current game selection
        const selectedVerbElements = Array.from(document.querySelectorAll('#verb-buttons .verb-button.selected'));
        const selectedVerbInfinitives = selectedVerbElements.map(btn => btn.dataset.value);

        let verbsToConsider = [];
        if (selectedVerbInfinitives.length > 0) {
          verbsToConsider = allVerbData.filter(v =>
            selectedVerbInfinitives.includes(v.infinitive_es)
          );
        } else {
          const selectedTypeBtns = Array.from(document.querySelectorAll('.verb-type-button.selected:not(:disabled)'));
          const selectedTypes = selectedTypeBtns.map(b => b.dataset.value);

          verbsToConsider = allVerbData.filter(v =>
            currentOptions.tenses.some(tenseKey =>
              (v.types[tenseKey] || []).some(typeInVerb =>
                selectedTypes.includes(typeInVerb)
              )
            )
          );
        }

        // Filter for available conjugations
        const filteredVerbs = verbsToConsider.filter(v =>
          currentOptions.tenses.some(tenseKey => v.conjugations[tenseKey] !== undefined)
        );

        const shuffled = filteredVerbs.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, this.verbsToComplete);

        if (selected.length < this.verbsToComplete) {
          console.error('Not enough compatible verbs for Nuclear Bomb boss.');
          endBossBattle(false, 'ERROR: Not enough compatible verbs.');
          return;
        }

        const pronounList = window.pronouns || pronouns;
        const challengeVerbs = [];

        selected.forEach(verb => {
          const possibleTenses = currentOptions.tenses.filter(t =>
            verb.conjugations[t] !== undefined
          );
          const tense = possibleTenses[Math.floor(Math.random() * possibleTenses.length)];
          const pronoun = pronounList[Math.floor(Math.random() * pronounList.length)];
          const correctAnswer = verb.conjugations[tense][pronoun];

          if (!correctAnswer) {
            console.error(`Missing conjugation for ${verb.infinitive_es} in ${tense} (${pronoun}).`);
            return;
          }

          challengeVerbs.push({
            infinitive: verb.infinitive_es,
            tense,
            pronoun,
            correctAnswer,
            conjugations: [correctAnswer]
          });
        });

        if (challengeVerbs.length < this.verbsToComplete) {
          console.error('Not enough challenge verbs for Nuclear Bomb boss.');
          endBossBattle(false, 'ERROR: Not enough compatible verbs.');
          return;
        }

        game.boss = {
          id: 'nuclearBomb',
          verbsCompleted: 0,
          challengeVerbs,
          totalVerbsNeeded: this.verbsToComplete,
          timeLeft: this.timeLimit,
          countdownInterval: null
        };

        // Start the countdown
        startNuclearCountdown();
        displayNextBossVerb();
      }
    },
    mirrorT1000: {
      name: 'T-1000 Mirror',
      description: 'The T-1000 mimics your conjugations in reverse.',
      verbsToComplete: 1, // Will be overridden based on difficulty
      init: function() {
        // Adjust verbs needed based on difficulty
        if (currentOptions.mode === 'receptive') {
          this.verbsToComplete = 1;
        } else if (currentOptions.mode === 'productive_easy') {
          this.verbsToComplete = 2;
        } else if (currentOptions.mode === 'productive') {
          this.verbsToComplete = 3;
        }
        const multiplier = this.reappearanceMultiplier || 1;
        this.verbsToComplete = Math.floor(this.verbsToComplete * multiplier);

        // Filter verbs based on current game selection
        const selectedVerbElements = Array.from(document.querySelectorAll('#verb-buttons .verb-button.selected'));
        const selectedVerbInfinitives = selectedVerbElements.map(btn => btn.dataset.value);

        let verbsToConsider = [];
        if (selectedVerbInfinitives.length > 0) {
          verbsToConsider = allVerbData.filter(v =>
            selectedVerbInfinitives.includes(v.infinitive_es)
          );
        } else {
          const selectedTypeBtns = Array.from(document.querySelectorAll('.verb-type-button.selected:not(:disabled)'));
          const selectedTypes = selectedTypeBtns.map(b => b.dataset.value);

          verbsToConsider = allVerbData.filter(v =>
            currentOptions.tenses.some(tenseKey =>
              (v.types[tenseKey] || []).some(typeInVerb =>
                selectedTypes.includes(typeInVerb)
              )
            )
          );
        }

        // Filter for available conjugations
        const filteredVerbs = verbsToConsider.filter(v =>
          currentOptions.tenses.some(tenseKey => v.conjugations[tenseKey] !== undefined)
        );

        const shuffled = filteredVerbs.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, this.verbsToComplete);

        if (selected.length < this.verbsToComplete) {
          console.error('Not enough compatible verbs for T-1000 Mirror boss.');
          endBossBattle(false, 'ERROR: Not enough compatible verbs.');
          return;
        }

        const pronounList = window.pronouns || pronouns;
        const challengeVerbs = [];

        selected.forEach(verb => {
          const possibleTenses = currentOptions.tenses.filter(t =>
            verb.conjugations[t] !== undefined
          );
          const tense = possibleTenses[Math.floor(Math.random() * possibleTenses.length)];
          const pronoun = pronounList[Math.floor(Math.random() * pronounList.length)];

          let correctAnswer, englishInfinitive;

          if (currentOptions.mode === 'receptive') {
            correctAnswer = verb.conjugations[tense][pronoun];
            englishInfinitive = verb.infinitive_en;
          } else if (currentOptions.mode === 'productive_easy') {
            correctAnswer = verb.conjugations[tense][pronoun];
          } else {
            correctAnswer = verb.conjugations[tense][pronoun];
            englishInfinitive = verb.infinitive_en;
          }

          if (!correctAnswer) {
            console.error(`Missing conjugation for ${verb.infinitive_es} in ${tense} (${pronoun}).`);
            return;
          }

          challengeVerbs.push({
            infinitive: verb.infinitive_es,
            englishInfinitive: englishInfinitive,
            tense,
            pronoun,
            correctAnswer,
            reversedAnswer: correctAnswer.split('').reverse().join(''),
            conjugations: [correctAnswer]
          });
        });

        if (challengeVerbs.length < this.verbsToComplete) {
          console.error('Not enough challenge verbs for T-1000 Mirror boss.');
          endBossBattle(false, 'ERROR: Not enough compatible verbs.');
          return;
        }

        game.boss = {
          id: 'mirrorT1000',
          verbsCompleted: 0,
          challengeVerbs,
          totalVerbsNeeded: this.verbsToComplete,
          explanationShown: false
        };

        console.log('T-1000 Mirror challenge verbs:', game.boss.challengeVerbs);

        // Show explanation before first verb
        showT1000Explanation();
      }
    }
  };
function showT1000Explanation() {
  if (!game.boss || game.boss.id !== 'mirrorT1000') return;
  
  const tenseEl = document.getElementById('tense-label');
  if (tenseEl) tenseEl.textContent = 'T-1000 MIRROR ACTIVATED';
  
  let explanationHTML = `
    <div class="t1000-explanation">
      <div class="t1000-title">🤖 T-1000 MIRROR ACTIVATED 🤖</div>
      <div class="t1000-subtitle">"I can mimic anything... including your conjugations. But in REVERSE."</div>
      <div class="t1000-example">
        <strong>EXAMPLE:</strong><br>
  `;
  
  if (currentOptions.mode === 'receptive') {
    explanationHTML += `
        Normal: Spanish "comes" → English "you eat"<br>
        <span class="t1000-mirror">MIRROR MODE: Spanish "comes" → Type "tae uoy"</span>
    `;
  } else if (currentOptions.mode === 'productive_easy') {
    explanationHTML += `
        Normal: "Present: hablar + tú" → "hablas"<br>
        <span class="t1000-mirror">MIRROR MODE: "Present: hablar + tú" → Type "salbah"</span>
    `;
  } else {
    explanationHTML += `
        Normal: "Present: to speak + tú" → "hablas"<br>
        <span class="t1000-mirror">MIRROR MODE: "Present: to speak + tú" → Type "salbah"</span>
    `;
  }
  
  explanationHTML += `
      </div>
      <div class="t1000-ready">Ready to face your reflection?</div>
    </div>
  `;
  
  if (qPrompt) {
    qPrompt.innerHTML = explanationHTML;
  }
  
  if (ansES) {
    ansES.value = '';
    ansES.placeholder = 'Click here when ready...';
    ansES.addEventListener('focus', startT1000Battle, { once: true });
    ansES.focus();
  }
}

function startT1000Battle() {
  if (ansES) {
    ansES.placeholder = 'Type the answer BACKWARDS...';
  }
  displayNextT1000Verb();
}
function displayNextT1000Verb() {
  if (!game.boss || game.boss.id !== 'mirrorT1000' || !game.boss.challengeVerbs) {
    console.error("T-1000 boss battle state is missing.");
    return;
  }

  const currentChallenge = game.boss.challengeVerbs[game.boss.verbsCompleted];
  if (!currentChallenge) {
    console.error("No current T-1000 challenge found.");
    return;
  }

  const tenseEl = document.getElementById('tense-label');
  if (tenseEl) {
    // Add tooltip to boss title
    tenseEl.innerHTML = `<span class="boss-title-with-tooltip" data-info-key="t1000BossInfo">T-1000 Mirror (${game.boss.verbsCompleted + 1}/${game.boss.totalVerbsNeeded}) <span class="context-info-icon" data-info-key="t1000BossInfo"></span></span>`;
    const tooltipIcon = tenseEl.querySelector('.context-info-icon');
    const titleWithTooltip = tenseEl.querySelector('.boss-title-with-tooltip');
    if (tooltipIcon) {
      tooltipIcon.addEventListener('click', e => {
        e.stopPropagation();
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal('t1000BossInfo');
      });
    }
    if (titleWithTooltip) {
      titleWithTooltip.addEventListener('click', () => {
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal('t1000BossInfo');
      });
    }
  }

  let promptHTML = '';
  const tKey = currentChallenge.tense;
  const tenseObj = tenses.find(t => t.value === tKey) || {};
  const tenseLabel = tenseObj.name || tKey;
  const infoKey = tenseObj.infoKey || '';
  const tenseBadge = `<span class="tense-badge ${tKey}" data-info-key="${infoKey}">${tenseLabel}<span class="context-info-icon" data-info-key="${infoKey}"></span></span>`;

  // NEW: Do not show the reversed answer
  if (currentOptions.mode === 'receptive') {
    promptHTML = `🪞 MIRROR: ${tenseBadge} "${currentChallenge.correctAnswer}" → <span class="t1000-hint">(Type the English translation backwards)</span>`;
  } else if (currentOptions.mode === 'productive_easy') {
    promptHTML = `🪞 MIRROR: ${tenseBadge} "${currentChallenge.infinitive}" – <span class="pronoun" id="${currentChallenge.pronoun}">${currentChallenge.pronoun}</span>`;
  } else {
    promptHTML = `🪞 MIRROR: ${tenseBadge} "${currentChallenge.englishInfinitive}" – <span class="pronoun" id="${currentChallenge.pronoun}">${currentChallenge.pronoun}</span>`;
  }

  if (qPrompt) {
    qPrompt.innerHTML = promptHTML;
    const promptBadge = qPrompt.querySelector('.tense-badge');
const promptIcon = qPrompt.querySelector('.context-info-icon');
    if (promptBadge && promptBadge.dataset.infoKey) {
      promptBadge.addEventListener('click', () => {
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal(promptBadge.dataset.infoKey);
      });
    }
    if (promptIcon && promptIcon.dataset.infoKey) {
      promptIcon.addEventListener('click', e => {
        e.stopPropagation();
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal(promptIcon.dataset.infoKey);
      });
    }
  }

  if (ansES) {
    ansES.value = '';
    ansES.placeholder = 'Type the conjugation backwards...';
    ansES.focus();
  }
}


	function validateT1000Answer(userInput, currentChallenge) {
  const cleanInput = userInput.trim().toLowerCase();
  
  if (currentOptions.mode === 'receptive') {
    // For receptive mode, we need to reverse the English translation
    const verbData = currentChallenge;
    const tense = currentChallenge.tenseKey || currentChallenge.tense;
    const spanishForm = currentChallenge.correctAnswer;
    
    // Get the English translation (this is complex, so we'll use a simplified approach)
    const englishTranslations = getEnglishTranslation(verbData, tense, currentChallenge.pronoun);
    
    if (englishTranslations.length > 0) {
      // Check if any of the possible translations, when reversed, match user input
      return englishTranslations.some(translation => {
        const reversedTranslation = translation.toLowerCase().split('').reverse().join('');
        return cleanInput === reversedTranslation;
      });
    }
    return false;
  } else {
    // For productive modes, reverse the Spanish conjugation
    const reversedCorrect = currentChallenge.correctAnswer.toLowerCase().split('').reverse().join('');
    return cleanInput === reversedCorrect;
  }
}

function getEnglishTranslation(verbData, tense, pronoun) {
  // Simplified English translation logic
  // This should match the logic used in the main game for receptive mode
  const pronounMap = {
    'yo': ['I'],
    'tú': ['you'],
    'él': ['he', 'she'],
    'nosotros': ['we'],
    'vosotros': ['you'],
    'ellos': ['they']
  };
  
  const englishPronouns = pronounMap[pronoun] || [pronoun];
  const conjugationsEN = verbData.conjugations_en && verbData.conjugations_en[tense];
  
  if (!conjugationsEN) {
    return [`${englishPronouns[0]} ${verbData.infinitive_en.replace('to ', '')}`];
  }
  
  const translations = [];
  englishPronouns.forEach(engPronoun => {
    const formKey = engPronoun === 'I' ? 'I' : engPronoun.toLowerCase();
    const verbForm = conjugationsEN[formKey];
    if (verbForm) {
      translations.push(`${engPronoun.toLowerCase()} ${verbForm.toLowerCase()}`);
    }
  });
  
  return translations.length > 0 ? translations : [`${englishPronouns[0]} ${verbData.infinitive_en.replace('to ', '')}`];
}

	
	/**
   * Glitch an infinitive by hiding one letter (excluding the ending).
   */
  function glitchInfinitive(inf) {
    if (inf.length < 6) return inf;
    const hideIndex = Math.floor(Math.random() * (inf.length - 2));
    return inf.slice(0, hideIndex) + '_' + inf.slice(hideIndex + 1);
  }

  /**
   * Applies a simple "glitch" effect to a word by hiding one random letter.
   */
  function glitchVerb(word) {
    if (word.length < 2) return word; // Avoid glitching very short words

    // Select a random index to hide a character
    const hideIndex = Math.floor(Math.random() * word.length);

    // Build the new string with the hidden character
    const glitchedWord = word.substring(0, hideIndex) + '_' + word.substring(hideIndex + 1);

    return glitchedWord;
  }

  /**
   * Glitches an infinitive by hiding a random internal letter while
   * preserving common verb endings.
   */
  function glitchInfinitive(infinitive) {
    if (infinitive.length < 4) return infinitive;

    let hideEnd = infinitive.length - 1; // avoid the last character by default

    if (infinitive.endsWith('se')) {
      const stem = infinitive.slice(0, -2);
      hideEnd = stem.endsWith('ar') || stem.endsWith('er') || stem.endsWith('ir')
        ? infinitive.length - 4
        : infinitive.length - 2;
    } else if (
      infinitive.endsWith('ar') ||
      infinitive.endsWith('er') ||
      infinitive.endsWith('ir')
    ) {
      hideEnd = infinitive.length - 2;
    }

    const start = 1; // avoid the first character
    if (hideEnd <= start) return infinitive;

    const hideIndex = start + Math.floor(Math.random() * (hideEnd - start));
    return (
      infinitive.substring(0, hideIndex) + '_' + infinitive.substring(hideIndex + 1)
    );
  }

  window.glitchInfinitive = glitchInfinitive;

  // ADD these functions for nuclear bomb boss:
  function startNuclearCountdown() {
    if (!game.boss || game.boss.id !== 'nuclearBomb') return;

    const countdownDisplay = document.getElementById('nuclear-countdown');
    const chuacheBox = document.getElementById('chuache-box');

    if (bossImage) bossImage.classList.add('hidden');

    // Hide Chuache and show countdown
    if (chuacheBox) {
      chuacheBox.classList.add('nuclear-mode');
    }

    if (countdownDisplay) {
      countdownDisplay.style.display = 'block';
      updateCountdownDisplay();
    }

    // Start the countdown interval
    game.boss.countdownInterval = setInterval(() => {
      game.boss.timeLeft--;
      updateCountdownDisplay();

      if (game.boss.timeLeft <= 0) {
        clearInterval(game.boss.countdownInterval);
        explodeNuclearBomb();
      }
    }, 1000);
  }

  function updateCountdownDisplay() {
    const countdownDisplay = document.getElementById('nuclear-countdown');
    const timeDisplay = document.getElementById('nuclear-time');

    if (timeDisplay && game.boss) {
      timeDisplay.textContent = game.boss.timeLeft;

      // Add urgency classes
      if (game.boss.timeLeft <= 10) {
        countdownDisplay.classList.add('critical');
      } else if (game.boss.timeLeft <= 20) {
        countdownDisplay.classList.add('warning');
      }
    }
  }

  function explodeNuclearBomb() {
    // Game over - nuclear explosion
    safePlay(nuclearExplosion);
    chuacheSpeaks('gameover');

    const gameTitle = document.getElementById('game-title');
    if (gameTitle) gameTitle.textContent = '\uD83D\uDCA5 NUCLEAR EXPLOSION! GAME OVER! \uD83D\uDCA5';

    // Disable all inputs
    if (ansES) ansES.disabled = true;
    if (ansEN) ansEN.disabled = true;
    if (checkAnswerButton) checkAnswerButton.disabled = true;
    if (clueButton) clueButton.disabled = true;
    if (skipButton) skipButton.disabled = true;

    // End the game after showing explosion effect
    setTimeout(() => {
      endNuclearBoss(false, 'Nuclear explosion! Mission failed.');
    }, 3000);
  }

  function defuseNuclearBomb() {
    // Success - bomb defused
    clearInterval(game.boss.countdownInterval);

    const countdownDisplay = document.getElementById('nuclear-countdown');
    if (countdownDisplay) {
      countdownDisplay.classList.add('defused');
    }
    if (progressContainer) {
      progressContainer.textContent = `Level Boss #${currentBossNumber} - 3/4 (${game.boss.totalVerbsNeeded}/${game.boss.totalVerbsNeeded}) | Total Score: ${score}`;
    }

    endNuclearBoss(true, 'BOMB DEFUSED!');
  }

  function endNuclearBoss(success, message) {
    // Clean up nuclear bomb UI
    const countdownDisplay = document.getElementById('nuclear-countdown');
    const chuacheBox = document.getElementById('chuache-box');

    if (countdownDisplay) {
      countdownDisplay.style.display = 'none';
      countdownDisplay.classList.remove('critical', 'warning', 'defused');
    }

    if (chuacheBox) {
      chuacheBox.classList.remove('nuclear-mode');
    }

    if (game.boss && game.boss.countdownInterval) {
      clearInterval(game.boss.countdownInterval);
    }

    // Call the standard end boss battle
    if (success) {
      endBossBattle(true, message);
    } else {
      // Explosion sound already handled separately
      game.boss = null;
      endBossBattle(false, message);
    }
  }

  function showT1000Explanation() {
    if (!game.boss || game.boss.id !== 'mirrorT1000') return;
    if (game.boss.explanationShown) {
      displayNextBossVerb();
      return;
    }

    const tenseEl = document.getElementById('tense-label');
    if (tenseEl) tenseEl.textContent = 'Mirror Challenge';
    if (qPrompt) {
      qPrompt.innerHTML =
        'The T-1000 shows conjugations <span class="boss-challenge">reversed</span>. Type the correct form to defeat it.';
    }

    game.boss.explanationShown = true;

    setTimeout(() => {
      displayNextBossVerb();
    }, 3000);
  }

function displayNextBossVerb() {
  if (!game.boss || !game.boss.challengeVerbs) {
    console.error("Boss battle state is missing.");
    return;
  }

  // Special handling for T-1000 Mirror Boss
  if (game.boss.id === 'mirrorT1000') {
    displayNextT1000Verb();
    return;
  }

  const currentChallenge = game.boss.challengeVerbs[game.boss.verbsCompleted];
  if (!currentChallenge) {
    console.error("No current boss challenge found.");
    return;
  }

  const tenseEl = document.getElementById('tense-label');
  let promptHTML = '';

  // Añadir tooltips específicos para cada boss
  if (game.boss.id === 'verbRepairer') {
    if (tenseEl) {
      tenseEl.innerHTML = `<span class="boss-title-with-tooltip" data-info-key="verbRepairerBossInfo">Digital Corrupted (${game.boss.verbsCompleted + 1}/${game.boss.totalVerbsNeeded}) <span class="context-info-icon" data-info-key="verbRepairerBossInfo"></span></span>`;
    }
    const tKey = currentChallenge.tense;
    const tenseObj = tenses.find(t => t.value === tKey) || {};
    const tenseLabel = tenseObj.name || tKey;
    const infoKey = tenseObj.infoKey || '';
    const tenseBadge = `<span class="tense-badge ${tKey}" data-info-key="${infoKey}">${tenseLabel}<span class="context-info-icon" data-info-key="${infoKey}"></span></span>`;
    promptHTML = `${tenseBadge} <span class="boss-challenge">${currentChallenge.glitchedForm}</span>`;

  } else if (game.boss.id === 'skynetGlitch') {
    if (tenseEl) {
      tenseEl.innerHTML = `<span class="boss-title-with-tooltip" data-info-key="skynetGlitchBossInfo">Skynet Glitch (${game.boss.verbsCompleted + 1}/${game.boss.totalVerbsNeeded}) <span class="context-info-icon" data-info-key="skynetGlitchBossInfo"></span></span>`;
    }
    const tKey = currentChallenge.tense;
    const tenseObj = tenses.find(t => t.value === tKey) || {};
    const tenseLabel = tenseObj.name || tKey;
    const infoKey = tenseObj.infoKey || '';
    const tenseBadge = `<span class="tense-badge ${tKey}" data-info-key="${infoKey}">${tenseLabel}<span class="context-info-icon" data-info-key="${infoKey}"></span></span>`;
    promptHTML = `${tenseBadge}: <span class="boss-challenge">${currentChallenge.glitchedInfinitive}</span> – <span class="boss-challenge-pronoun">${currentChallenge.glitchedPronoun}</span>`;

  } else if (game.boss.id === 'nuclearBomb') {
    if (tenseEl) {
      tenseEl.innerHTML = `<span class="boss-title-with-tooltip" data-info-key="nuclearBombBossInfo">Nuclear Countdown (${game.boss.verbsCompleted + 1}/${game.boss.totalVerbsNeeded}) <span class="context-info-icon" data-info-key="nuclearBombBossInfo"></span></span>`;
    }
    const tKey = currentChallenge.tense;
    const tenseObj = tenses.find(t => t.value === tKey) || {};
    const tenseLabel = tenseObj.name || tKey;
    const infoKey = tenseObj.infoKey || '';
    const tenseBadge = `<span class="tense-badge ${tKey}" data-info-key="${infoKey}">${tenseLabel}<span class="context-info-icon" data-info-key="${infoKey}"></span></span>`;
    promptHTML = `${tenseBadge}: "${currentChallenge.infinitive}" – <span class="pronoun" id="${currentChallenge.pronoun}">${currentChallenge.pronoun}</span>`;
  }

  // Añadir event listeners para los tooltips de los títulos
  if (tenseEl) {
    const tooltipIcon = tenseEl.querySelector('.context-info-icon');
    const titleWithTooltip = tenseEl.querySelector('.boss-title-with-tooltip');
    if (tooltipIcon) {
      tooltipIcon.addEventListener('click', e => {
        e.stopPropagation();
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        const infoKey = tooltipIcon.dataset.infoKey;
        if (infoKey) openSpecificModal(infoKey);
      });
    }
    if (titleWithTooltip) {
      titleWithTooltip.addEventListener('click', () => {
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        const infoKey = titleWithTooltip.dataset.infoKey;
        if (infoKey) openSpecificModal(infoKey);
      });
    }
  }

  if (qPrompt) {
    qPrompt.innerHTML = promptHTML;
    const promptBadge = qPrompt.querySelector('.tense-badge');
    const promptIcon = qPrompt.querySelector('.context-info-icon');
    if (promptBadge && promptBadge.dataset.infoKey) {
      promptBadge.addEventListener('click', () => {
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal(promptBadge.dataset.infoKey);
      });
    }
    if (promptIcon && promptIcon.dataset.infoKey) {
      promptIcon.addEventListener('click', e => {
        e.stopPropagation();
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal(promptIcon.dataset.infoKey);
      });
    }
  }

  if (ansES) {
    ansES.value = '';
    ansES.focus();
  }
}


function endBossBattle(playerWon, message = "") {
  // Play boss-specific end sound
  if (game.boss && game.boss.id) {
    if (playerWon) {
      // Victory sounds
      if (game.boss.id === 'verbRepairer' || game.boss.id === 'skynetGlitch') {
        safePlay(systemRepaired);
      } else if (game.boss.id === 'nuclearBomb') {
        safePlay(bombDefused);
      } else if (game.boss.id === 'mirrorT1000') {
        safePlay(mirrorShattered);
      }
    } else if (game.boss.id === 'nuclearBomb') {
      // Special case: Nuclear explosion on failure
      safePlay(nuclearExplosion);
    }
  }

  if (ansES) ansES.disabled = false;

  if (checkAnswerButton) checkAnswerButton.disabled = false;
  if (skipButton) skipButton.disabled = false;
  if (clueButton) {
    clueButton.disabled = false;
    updateClueButtonUI();
  }

  const tenseEl = document.getElementById('tense-label');

  if (playerWon) {
    const bonusPoints = 500 * (game.boss?.reappearanceMultiplier || 1);
    game.score += bonusPoints;
    score = game.score; // keep legacy score in sync
    if (qPrompt) qPrompt.textContent = 'SYSTEM RESTORED';
    if (tenseEl) tenseEl.textContent = 'Boss defeated!';
    if (feedback) feedback.innerHTML = `<span class="feedback-points">Boss Bonus: +${bonusPoints} Points!</span>`;
    updateScore();
  } else {
    if (qPrompt) qPrompt.textContent = message || 'SYSTEM FAILURE';
    if (tenseEl) tenseEl.textContent = message ? '' : 'Try again next time.';
  }

  // Pausar video si existe
  if (bossImage && bossImage.tagName && bossImage.tagName.toLowerCase() === 'video') {
    bossImage.pause();
    bossImage.currentTime = 0;
  }

  setTimeout(() => {
    document.body.classList.remove('boss-battle-bg', 't1000-mode');
    document.getElementById('game-screen').classList.remove('t1000-active');
    if (gameContainer) gameContainer.classList.remove('boss-battle-bg');
    if (bossImage) bossImage.classList.add('hidden');
    if (chuacheImage) chuacheImage.classList.remove('hidden', 'fade-out');
    if (progressContainer) {
      progressContainer.style.color = '';
    }

    game.verbsInPhaseCount = 0;
    game.gameState = 'PLAYING';
    game.boss = null;

    if (progressContainer) updateProgressUI();

    prepareNextQuestion();
  }, 3000);
}


function resetBackgroundColor() {
  const gameMainPanel = document.getElementById('game-main-panel');
  const gameHeaderPanel = document.getElementById('game-header-panel');
  const bottomPanel = document.getElementById('bottom-panel');
  const chuacheBox = document.getElementById('chuache-box');

  // Resetear estilos inline
  document.body.style.backgroundColor = '';
  document.body.style.background = '';
  if (gameMainPanel) {
    gameMainPanel.style.backgroundColor = '';
    gameMainPanel.style.background = '';
  }
  if (gameHeaderPanel) {
    gameHeaderPanel.style.backgroundColor = '';
    gameHeaderPanel.style.background = '';
  }
  if (bottomPanel) {
    bottomPanel.style.backgroundColor = '';
    bottomPanel.style.background = '';
  }
  if (chuacheBox) {
    chuacheBox.style.backgroundColor = '';
    chuacheBox.style.background = '';
  }

  // Limpiar clases CSS problemáticas
  document.body.classList.remove('iridescent-level', 'boss-battle-bg', 't1000-mode');
}
	
  function updateBackgroundForLevel(level) {
    const body = document.body;
    if (level >= 8) {
      body.classList.add('iridescent-level');
    } else {
      body.classList.remove('iridescent-level');
    }
  }

  function updateClueButtonUI() {
    if (!clueButton) return;

    if (selectedGameMode === 'timer') {
      if (freeClues > 0) {
        clueButton.textContent = `Use Clue (${freeClues})`;
      } else {
        const penalty = calculateTimePenalty(currentLevel);
        clueButton.textContent = `Get Clue (Cost: ${penalty}s)`;
      }
    } else if (selectedGameMode === 'lives') {
      if (freeClues > 0) {
        clueButton.textContent = `Use Clue (${freeClues})`;
      } else {
        const penalty = 1 + currentLevel;
        const lifeText = penalty === 1 ? 'life' : 'lives';
        clueButton.textContent = `Get Clue (Cost: ${penalty} ${lifeText})`;
      }
    } else {
      clueButton.textContent = 'Get Clue';
    }
  }

  function checkTickingSound() {
    // Only relevant in timer mode; ensure sound doesn't play in other modes
    if (selectedGameMode !== 'timer') {
      if (tickingSoundPlaying) {
        soundTicking.pause();
        soundTicking.currentTime = 0;
        tickingSoundPlaying = false;
      }
      return;
    }

    if (timerTimeLeft <= 10) {
      if (!tickingSoundPlaying) {
        soundTicking.currentTime = 0;
        safePlay(soundTicking);
        tickingSoundPlaying = true;
      }
    } else if (tickingSoundPlaying) {
      soundTicking.pause();
      soundTicking.currentTime = 0;
      tickingSoundPlaying = false;
    }
  }
  soundTicking.addEventListener('ended', () => { tickingSoundPlaying = false; });
        function formatTime(sec) {
          const m = Math.floor(sec / 60);
          const s = sec % 60;
          return `${m}:${s.toString().padStart(2,'0')}`;
        }


  function showTimeChange(amount) {
          const clockEl = document.getElementById('timer-clock');
          const el      = document.getElementById('time-change');
          if (!clockEl || !el) return;

        el.textContent = `${amount > 0 ? '+' : ''}${amount}s`;
        el.style.color = amount < 0 ? 'red' : 'lightgreen';

        clockEl.classList.add('show-time-change');
        clearTimeout(clockEl._timeChangeTimeout);
        clockEl._timeChangeTimeout = setTimeout(() => {
              clockEl.classList.remove('show-time-change');
        }, 2000);
        el.classList.remove('vibrate');
        void el.offsetWidth;
        el.classList.add('vibrate');
        }

  function calculateTimePenalty(level) {
    if (level === 0) return 3;
    if (level === 1) return 6;
    if (level === 2) return 13;
    if (level === 3) return 25;
    return 25 * Math.pow(2, level - 3);
  }

// Add this new unified function
function displayUnifiedClue() {
  if (currentOptions.mode === 'receptive') {
    const verbData = currentQuestion.verb;
    feedback.innerHTML = `💡 The English infinitive is <strong>${verbData.infinitive_en}</strong>.`;
    ansEN.value = '';
    setTimeout(() => ansEN.focus(), 0);
  } else if (currentOptions.mode === 'productive' || currentOptions.mode === 'productive_easy') {
    if (currentOptions.mode === 'productive_easy') {
      if (currentQuestion.hintLevel === 0) {
        const conjTenseKey = currentQuestion.tenseKey;
        const conj = currentQuestion.verb.conjugations[conjTenseKey];
        
        // Get active pronouns from player configuration
        const activePronounButtons = Array.from(document.querySelectorAll('.pronoun-group-button.selected'));
        const activePronouns = activePronounButtons.flatMap(btn => JSON.parse(btn.dataset.values));
        
        // Correct pronoun order for display
        const pronounOrder = ['yo', 'tú', 'vos', 'él', 'nosotros', 'vosotros', 'ellos'];
        
        // Filter and order conjugations
        const conjugationsToShow = pronounOrder
          .filter(pr => pr !== currentQuestion.pronoun && activePronouns.includes(pr))
          .filter(pr => conj[pr]) // Ensure conjugation exists
          .map(pr => `<span class="hint-btn ${pr}">${conj[pr]}</span>`)
          .join('');
        
        const tooltipText = "Color order: yo(yellow), tú(orange), vos(dark orange), él/ella(pink), nosotros(purple), vosotros(blue), ellos/ellas(white)";
        feedback.innerHTML = `❌ <em>Clue 1:</em> <span title="${tooltipText}">ℹ️</span> ` + conjugationsToShow;
        playFromStart(soundElectricShock);
        currentQuestion.hintLevel = 1;
      }
    } else {
      if (currentQuestion.hintLevel === 0) {
        feedback.innerHTML = `❌ <em>Clue 1:</em> infinitive is <strong>${currentQuestion.verb.infinitive_es}</strong>.`;
        playFromStart(soundElectricShock);
        currentQuestion.hintLevel = 1;
      } else if (currentQuestion.hintLevel === 1) {
        const conjTenseKey = currentQuestion.tenseKey;
        const conj = currentQuestion.verb.conjugations[conjTenseKey];
        
        // Use the same color system as the clue button
        const activePronounButtons = Array.from(document.querySelectorAll('.pronoun-group-button.selected'));
        const activePronouns = activePronounButtons.flatMap(btn => JSON.parse(btn.dataset.values));
        const pronounOrder = ['yo', 'tú', 'vos', 'él', 'nosotros', 'vosotros', 'ellos'];
        
        const conjugationsToShow = pronounOrder
          .filter(pr => pr !== currentQuestion.pronoun && activePronouns.includes(pr))
          .filter(pr => conj[pr])
          .map(pr => `<span class="hint-btn ${pr}">${conj[pr]}</span>`)
          .join('');
        
        feedback.innerHTML = `❌ <em>Clue 2:</em> <span class="context-info-icon" data-info-key="clueColorsInfo"></span> ` + conjugationsToShow;
        playFromStart(soundElectricShock);
        currentQuestion.hintLevel = 2;
      }
    }
    ansES.value = '';
    setTimeout(() => ansES.focus(), 0);
  }
}

// Update the existing displayClue function to use the unified system
function displayClue() {
  displayUnifiedClue();
}

  function onClueButtonClick() {
    feedback.innerHTML = '';

    if (game.gameState === 'BOSS_BATTLE') {
      if (game.boss && game.boss.id === 'mirrorT1000') {
        // NUEVO SISTEMA DE PISTAS PARA T-1000
        if (freeClues > 0) {
          freeClues--;
        } else {
          if (selectedGameMode === 'timer') {
            const penalty = calculateTimePenalty(currentLevel);
            timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
            checkTickingSound();
            showTimeChange(-penalty);
          } else if (selectedGameMode === 'lives') {
            const penalty = 1 + currentLevel;
            remainingLives -= penalty;
            updateGameTitle();
          }
          streak = 0;
        }

        const currentChallenge = game.boss.challengeVerbs[game.boss.verbsCompleted];
        if (!currentChallenge) return;

        // Determinar qué pista mostrar
        if (!game.boss.hintLevel) game.boss.hintLevel = 0;

        if (game.boss.hintLevel === 0) {
          // Primera pista: mostrar la conjugación normal
          feedback.innerHTML = `💡 <em>Clue 1:</em> The normal conjugation is: <strong>${currentChallenge.correctAnswer}</strong>`;
          game.boss.hintLevel = 1;
        } else if (game.boss.hintLevel === 1) {
          // Segunda pista: mostrar la conjugación normal → al revés
          feedback.innerHTML = `💡 <em>Final Clue:</em> <strong>${currentChallenge.correctAnswer}</strong> → <strong>${currentChallenge.reversedAnswer}</strong>`;
          game.boss.hintLevel = 2;
        } else {
          // Ya se usaron todas las pistas
          feedback.innerHTML = `💡 No more clues available.`;
        }

        playFromStart(soundElectricShock);
        updateClueButtonUI();

        if (ansES) {
          ansES.value = '';
          setTimeout(() => ansES.focus(), 0);
        }
        return;
      } else if (game.boss && game.boss.id === 'skynetGlitch') {
        if (selectedGameMode !== 'timer' && selectedGameMode !== 'lives') {
          timerTimeLeft = Math.max(0, timerTimeLeft - 3);
          checkTickingSound();
        } else if (freeClues > 0) {
          freeClues--;
        } else {
          if (selectedGameMode === 'timer') {
            const penalty = calculateTimePenalty(currentLevel);
            timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
            checkTickingSound();
            showTimeChange(-penalty);
          } else {
            const penalty = 1 + currentLevel;
            remainingLives -= penalty;
            updateGameTitle();
          }
          streak = 0;
        }

        const currentChallenge =
          game.boss && game.boss.challengeVerbs
            ? game.boss.challengeVerbs[game.boss.verbsCompleted]
            : null;
        if (currentChallenge) {
          feedback.innerHTML = `💡 Infinitive is <strong>${currentChallenge.infinitive}</strong>.`;
        }
        playFromStart(soundElectricShock);
        updateClueButtonUI();
      } else if (game.boss && game.boss.id === 'nuclearBomb') {
        // Allow hints for nuclear bomb (time pressure makes it fair)
        feedback.innerHTML = '';

        if (freeClues > 0) {
          freeClues--;
          updateClueButtonUI();
        } else {
          if (selectedGameMode === 'timer') {
            const penalty = calculateTimePenalty(currentLevel);
            timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
            checkTickingSound();
            showTimeChange(-penalty);
          } else if (selectedGameMode === 'lives') {
            const penalty = 1 + currentLevel;
            remainingLives -= penalty;
            updateGameTitle();
          }
          updateClueButtonUI();
        }

        // Display hint for nuclear bomb
        const currentChallenge = game.boss.challengeVerbs[game.boss.verbsCompleted];
        if (currentChallenge) {
          feedback.innerHTML = `💡 The infinitive is <strong>${currentChallenge.infinitive}</strong>`;
          playFromStart(soundElectricShock);
        }

        if (ansES) {
          ansES.value = '';
          setTimeout(() => ansES.focus(), 0);
        }
      } else {
        feedback.textContent = 'No hints available';
        playFromStart(soundElectricShock);
        if (ansES) {
          ansES.value = '';
          setTimeout(() => ansES.focus(), 0);
        }
      }
      return;
    }

    if (selectedGameMode !== 'timer' && selectedGameMode !== 'lives') {
      timerTimeLeft = Math.max(0, timerTimeLeft - 3);
      checkTickingSound();
      playFromStart(soundElectricShock);
      displayClue();
      return;
    }

    if (freeClues > 0) {
      freeClues--;
      displayClue();
    } else {
      if (selectedGameMode === 'timer') {
        const penalty = calculateTimePenalty(currentLevel);
        timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
        checkTickingSound();
        showTimeChange(-penalty);
      } else {
        const penalty = 1 + currentLevel;
        remainingLives -= penalty;
        updateGameTitle();
      }
      streak = 0;
      displayClue();
    }
    updateClueButtonUI();
  }

  function resetLevelState() {
    if (game.boss && game.boss.countdownInterval) {
      clearInterval(game.boss.countdownInterval);
      game.boss.countdownInterval = null;
    }
    correctAnswersTotal = 0;
    currentLevel = 0;

    const levelText = document.getElementById('level-text');
    if (levelText) {
      const goal = selectedGameMode === 'lives' ? LEVEL_GOAL_LIVES : LEVEL_GOAL_TIMER;
      levelText.textContent = `Level 1 (0/${goal}) | Total Score: ${score}`;
    }
  }

  function updateLevelAndVisuals() {
    let newLevel = 0;
    const timeMode = selectedGameMode === 'timer';
    const livesMode = selectedGameMode === 'lives';

    if (timeMode) {
      newLevel = Math.floor(correctAnswersTotal / LEVEL_GOAL_TIMER);
    } else if (livesMode) {
      newLevel = Math.floor(correctAnswersTotal / LEVEL_GOAL_LIVES);
    }

    if (newLevel > currentLevel) {
      currentLevel = newLevel;
      freeClues++;
      updateClueButtonUI();

      const levelColors = [
        '#2913CE', // Level 2
        '#54067C', // Level 3
        '#5B3704', // Level 4
        '#7C1717', // Level 5
        '#254747', // Level 6
        '#000000', // Level 7
        '#000000'  // Level 8+
      ];

      const colorIndex = Math.min(currentLevel - 1, levelColors.length - 1);
      const newBodyColor = levelColors[colorIndex];
      const newPanelColor = darkenColor(newBodyColor, 15);

      const gameMainPanel = document.getElementById('game-main-panel');
      const gameHeaderPanel = document.getElementById('game-header-panel');
      const bottomPanel = document.getElementById('bottom-panel');
      const chuacheBox = document.getElementById('chuache-box');

      triggerLevelUpShake();
      playFromStart(soundLevelUp);
      const goal = livesMode ? LEVEL_GOAL_LIVES : LEVEL_GOAL_TIMER;
      updateLevelText(`Level ${currentLevel + 1} (0/${goal}) | Total Score: ${score}`);
      document.body.style.backgroundColor = newBodyColor;
      if (gameMainPanel) gameMainPanel.style.backgroundColor = newPanelColor;
      if (gameHeaderPanel) gameHeaderPanel.style.backgroundColor = newPanelColor;
      if (bottomPanel) bottomPanel.style.backgroundColor = newPanelColor;
      if (chuacheBox) chuacheBox.style.backgroundColor = darkenColor(newBodyColor, 25);

      updateProgressUI();
      updateBackgroundForLevel(currentLevel + 1);
    }
  }

  function updateProgressUI() {
    if (game.gameState !== 'PLAYING') return;
    const levelText = progressContainer;
    if (!levelText) return;

    const goal = selectedGameMode === 'lives' ? LEVEL_GOAL_LIVES : LEVEL_GOAL_TIMER;
    const progress = correctAnswersTotal % goal;

    const newText = `Level ${currentLevel + 1} (${progress}/${goal}) | Total Score: ${score}`;
    updateLevelText(newText);
  }
  let totalPlayedSeconds = 0;
  let totalQuestions = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalResponseTime = 0;
  let verbsMissed = [];
  let fastestAnswer = Infinity;
  let questionStartTime = 0;
  let initialRawVerbData = [];
  const gameScreen   = document.getElementById('game-screen');
  const quitButton   = document.getElementById('quit-button');
  const scoreDisplay = document.getElementById('score-display');
  const streakFireEl = document.getElementById('streak-fire');
  const gameTitle    = document.getElementById('game-title');
  createFireParticles();
  const qPrompt      = document.getElementById('question-prompt');
  const esContainer  = document.getElementById('input-es-container');
  const enContainer  = document.getElementById('input-en-container');
  const feedback     = document.getElementById('feedback-message');
  const settingsButton = document.getElementById('settings-button');
  const salonButton = document.getElementById('salon-button');
  const hallOfFameBtn = document.getElementById('hall-of-fame-btn');
  const hallOfFameNewBtn = document.getElementById('hall-of-fame-new-btn');
  const closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
  const settingsModal = document.getElementById('settings-modal');
  const settingsBackdrop = document.getElementById('settings-modal-backdrop');
  const hofModal = document.getElementById('hof-modal');
  const hofBackdrop = document.getElementById('hof-modal-backdrop');
  const closeHofModalBtn = document.getElementById('close-hof-modal-btn');
  const musicVolumeSlider = document.getElementById('music-volume-slider');
  const sfxVolumeSlider = document.getElementById('sfx-volume-slider');
  const muteAllButton = document.getElementById('mute-all-button');
  const resetSettingsButton = document.getElementById('reset-settings-button');
  const tooltip = document.getElementById('tooltip');
  const generalBackdrop = document.querySelector('.modal-backdrop');
  const salonOverlay = document.getElementById('salon-overlay');
  const salonCloseBtn = document.getElementById('salon-close-btn');
  const salonRecordsContainer = document.getElementById('salon-records-container');
  const toggleReflexiveBtn = document.getElementById('toggle-reflexive');
  const toggleIgnoreAccentsBtn = document.getElementById('toggle-ignore-accents');
  const titleElement = document.querySelector('.glitch-title');
  const verbTypeLabels = Array.from(document.querySelectorAll('label[data-times]'));

  // --- Automatically load records into the splash screen box ---
  const recordsContainer = document.getElementById('records-display-container');

  async function displaySplashRecords() {
    if (!recordsContainer) {
      console.error('Error: records-display-container not found!');
      return;
    }
    recordsContainer.innerHTML = '<h3>Cargando r\xE9cords...</h3>';

    const modes = ['timer', 'lives'];
    let content = '';

    for (const mode of modes) {
      const modeTitle = mode === 'timer' ? 'Time Attackers ⏱️🧨' : 'Sulvivalistas ❤️‍🩹';
      let recordsHtml = `\n                <div class="hof-record-block" data-mode="${mode}">\n                    <h3 class="record-mode-title">${modeTitle}</h3>\n                    <ul class="record-list">`;

      try {
        if (typeof supabase === 'undefined') throw new Error('Supabase client not defined.');

        const { data, error } = await supabase
          .from('records')
          .select('name, score, level')
          .eq('mode', mode)
          .order('score', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (data && data.length > 0) {
          data.forEach((record, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      const levelInfo = record.level ? ` - lvl. ${record.level}` : '';
      recordsHtml += `<li><div class="record-item"><span class="medal">${medal}</span><strong>${record.name}:</strong> ${record.score}${levelInfo}</div></li>`;
          });
        } else {
          recordsHtml += '<li>A\xFAn no hay r\xE9cords.</li>';
        }
      } catch (err) {
        console.error(`Error loading ${mode} records:`, err);
        recordsHtml += '<li>Error al cargar los r\xE9cords.</li>';
      }
      recordsHtml += '</ul></div>';
      content += recordsHtml;
    }
    recordsContainer.innerHTML = content;
  }

  // --- Hall of Fame Modal Logic ---
  const hofOverlay = document.getElementById('hof-overlay');
  const hofCloseBtn = document.querySelector('#hof-overlay .hof-close-btn');

  async function openHallOfFame() {
    if (!hofOverlay) return;
    if (hofOverlay.classList.contains('is-visible')) {
      return;
    }
    console.log('Opening Hall of Fame overlay');

    try {
      await renderSetupRecords();
    } catch (err) {
      console.error('Error rendering records:', err);
      const setupContainer = document.getElementById('setup-records');
      if (setupContainer) setupContainer.innerHTML = '<p>No records available.</p>';
    }
    // Ensure overlay is visible even if some style disabled it
    hofOverlay.style.display = 'flex';
    // Use requestAnimationFrame for smoother transition
    requestAnimationFrame(() => {
      hofOverlay.classList.add('is-visible');
    });
    document.body.classList.add('tooltip-open-no-scroll');
    console.log('Hall of Fame opened');
  }

  function closeHallOfFame() {
    if (hofOverlay) {
      console.log('Closing Hall of Fame overlay');
      hofOverlay.classList.remove('is-visible');
      const cleanup = () => {
        hofOverlay.style.display = 'none';
        hofOverlay.removeEventListener('transitionend', cleanup);
      };
      hofOverlay.addEventListener('transitionend', cleanup);
      document.body.classList.remove('tooltip-open-no-scroll');

    }

  }

  // --- "Sal\xF3n" Modal Logic ---

  async function openSalon() {
      if (!salonOverlay) return;
      await renderSalonRecords();
      salonOverlay.style.display = 'flex';
      document.body.classList.add('tooltip-open-no-scroll');
  }

  function closeSalon() {
      if (salonOverlay) {
          salonOverlay.style.display = 'none';
          document.body.classList.remove('tooltip-open-no-scroll');
      }
  }

  async function renderSalonRecords() {
      if (!salonRecordsContainer) return;
      salonRecordsContainer.innerHTML = '<h3>Cargando r\xE9cords...</h3>';

      const modes = ['timer', 'lives'];
      let content = '';

    for (const mode of modes) {
      const modeTitle = mode === 'timer' ? 'Time Attackers ⏱️🧨' : 'Sulvivalistas ❤️‍🩹';
      let recordsHtml = `\n                <div class="hof-record-block" data-mode="${mode}">\n                    <h3 class="record-mode-title">${modeTitle}</h3>\n                    <ul class="record-list">`;

          try {
              const { data, error } = await supabase
                  .from('records')
                  .select('name, score, level')
                  .eq('mode', mode)
                  .order('score', { ascending: false })
                  .limit(10);

              if (error) throw error;

              if (data && data.length > 0) {
                  data.forEach((record, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                    const levelInfo = record.level ? ` - lvl. ${record.level}` : '';
                    recordsHtml += `<li><div class="record-item"><span class="medal">${medal}</span><strong>${record.name}:</strong> ${record.score}${levelInfo}</div></li>`;
                  });
              } else {
                  recordsHtml += '<li>A\xFAn no hay r\xE9cords.</li>';
              }
          } catch (err) {
              console.error(`Error loading ${mode} records:`, err);
              recordsHtml += '<li>Error al cargar los r\xE9cords.</li>';
          }
          recordsHtml += '</ul></div>';
          content += recordsHtml;
      }
      salonRecordsContainer.innerHTML = content;
  }


  if (hallOfFameBtn) {
    console.log('Hall of Fame button listener attached');
    hallOfFameBtn.addEventListener('click', openHallOfFame);

  }
  if (hofCloseBtn) hofCloseBtn.addEventListener('click', closeHallOfFame);

  if (hofOverlay) {
    hofOverlay.addEventListener('click', (event) => {
      if (event.target === hofOverlay) {
        closeHallOfFame();
      }
    });
  }

  if (salonButton) {
    salonButton.addEventListener('click', openSalon);
  }

  if (salonCloseBtn) salonCloseBtn.addEventListener('click', closeSalon);

  if (salonOverlay) {
    salonOverlay.addEventListener('click', (event) => {
      if (event.target === salonOverlay) {
        closeSalon();
      }
    });
  }

  if (generalBackdrop) {
    generalBackdrop.addEventListener('click', closeSalon);
  }
  
  const container = document.getElementById('verb-buttons');
  // Use a live query so replacing the container element doesn't break references
  const allBtns   = () => Array.from(document.querySelectorAll('#verb-buttons .verb-button'));

  if (settingsButton && settingsModal && settingsBackdrop) {
    settingsButton.addEventListener('click', () => {
      settingsModal.style.display = 'block';
      settingsBackdrop.style.display = 'block';
    });
    const closeFn = () => {
      settingsModal.style.display = 'none';
      settingsBackdrop.style.display = 'none';
    };
    if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', closeFn);
    settingsBackdrop.addEventListener('click', closeFn);
  }

  if (hallOfFameNewBtn && hofModal && hofBackdrop) {
    hallOfFameNewBtn.addEventListener('click', () => {
      renderSetupRecords();
      hofModal.style.display = 'block';
      hofBackdrop.style.display = 'block';
    });

    const closeHofFn = () => {
      hofModal.style.display = 'none';
      hofBackdrop.style.display = 'none';
    };

    if (closeHofModalBtn) closeHofModalBtn.addEventListener('click', closeHofFn);
    hofBackdrop.addEventListener('click', closeHofFn);
  }

  if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener('input', () => {
      const val = parseFloat(musicVolumeSlider.value);
      menuMusic.volume = val;
      gameMusic.volume = val;
      targetVolume = val;
      saveSetting('musicVolume', val);
    });
  }

  const allSfx = [soundCorrect, soundWrong, soundWrongStudy, soundClick, soundStart,
                   soundSkip, soundGameOver, soundbubblepop, soundLifeGained,
                   soundElectricShock, soundTicking, chuacheSound, soundLevelUp];

  if (sfxVolumeSlider) {
    sfxVolumeSlider.addEventListener('input', () => {
      const val = parseFloat(sfxVolumeSlider.value);
      allSfx.forEach(a => { a.volume = val; });
      saveSetting('sfxVolume', val);
    });
  }

  if (muteAllButton) {
    muteAllButton.addEventListener('click', () => {
      if (musicVolumeSlider) musicVolumeSlider.value = 0;
      if (sfxVolumeSlider) sfxVolumeSlider.value = 0;
      menuMusic.volume = 0; gameMusic.volume = 0; targetVolume = 0;
      allSfx.forEach(a => { a.volume = 0; });
      saveSetting('musicVolume', 0);
      saveSetting('sfxVolume', 0);
    });
  }

  const animChk = document.getElementById('toggle-animations-setting');
  if (animChk) {
    animChk.addEventListener('change', () => {
      window.animationsEnabled = animChk.checked;
      saveSetting('animationsEnabled', animChk.checked);
    });
  }
  const chChk = document.getElementById('toggle-chuache-reactions-setting');
  if (chChk) {
    chChk.addEventListener('change', () => {
      window.chuacheReactionsEnabled = chChk.checked;
      saveSetting('chuacheReactionsEnabled', chChk.checked);
      applyChuacheVisibility();
    });
  }
  const vosChk = document.getElementById('default-enable-vos-setting');
  if (vosChk) {
    vosChk.addEventListener('change', () => {
      window.defaultVosEnabled = vosChk.checked;
      saveSetting('defaultVosEnabled', vosChk.checked);
    });
  }

  if (resetSettingsButton) {
    resetSettingsButton.addEventListener('click', () => {
      localStorage.removeItem('musicVolume');
      localStorage.removeItem('sfxVolume');
      localStorage.removeItem('animationsEnabled');
      localStorage.removeItem('chuacheReactionsEnabled');
      localStorage.removeItem('defaultVosEnabled');
      loadSettings();
    });
  }

  /**
   * Gradually reduces the volume of an audio element and pauses it.
   * @param {HTMLAudioElement} audio - The audio element to fade out.
   * @param {number} duration - Duration of the fade in milliseconds.
   * @param {Function} [callback] - Optional callback after fade completes.
   */
  function fadeOutAudio(audio, duration = 1000, callback) {
    if (!audio) return;
    if (audio._fadeInterval) clearInterval(audio._fadeInterval);
    const steps = 10;
    const stepTime = duration / steps;
    const startVolume = audio.volume;
    const volumeStep = startVolume / steps;
    audio._fadeInterval = setInterval(() => {
      const newVol = Math.max(0, audio.volume - volumeStep);
      audio.volume = newVol;
      if (newVol <= 0) {
        clearInterval(audio._fadeInterval);
        audio.pause();
        audio.currentTime = 0;
        if (callback) callback();
      }
    }, stepTime);
  }

  /**
   * Gradually increases the volume of an audio element up to a target value.
   * @param {HTMLAudioElement} audio - The audio element to fade in.
   * @param {number} target - The desired volume level (0-1).
   * @param {number} duration - Duration of the fade in milliseconds.
   */
  function fadeInAudio(audio, target = 1, duration = 5000) {
    if (!audio) return;
    if (audio._fadeInterval) clearInterval(audio._fadeInterval);
    const steps = 10;
    const stepTime = duration / steps;
    const volumeStep = target / steps;
    audio.volume = 0;
    safePlay(audio);
    audio._fadeInterval = setInterval(() => {
      const newVol = Math.min(target, audio.volume + volumeStep);
      audio.volume = newVol;
      if (newVol >= target) {
        clearInterval(audio._fadeInterval);
      }
    }, stepTime);
  }

  function handleReflexiveToggle() {
    const btn = document.getElementById('toggle-reflexive');
    if (!btn) return;

    btn.classList.toggle('selected');
    const shouldSelect = btn.classList.contains('selected');

    const reflexiveButtons = Array.from(document.querySelectorAll('#verb-buttons .verb-button'))
      .filter(b => b.dataset.value.endsWith('se'));
    reflexiveButtons.forEach(b => b.classList.toggle('selected', shouldSelect));

    updateVerbDropdownCount();
    updateDeselectAllButton();
    updateGroupButtons();
    updateVerbTypeButtonsVisualState();

    if (typeof soundClick !== 'undefined') safePlay(soundClick);
  }

  if (toggleReflexiveBtn) {
    toggleReflexiveBtn.addEventListener('click', handleReflexiveToggle);
  }
  if (toggleIgnoreAccentsBtn) {
    toggleIgnoreAccentsBtn.addEventListener('click', handleIgnoreAccentsToggle);
  }
let currentConfigStep = 'splash'; // 'splash', 'mode', 'difficulty', 'details'
let selectedMode = null;
let selectedDifficulty = null;
const DEFAULT_MODE = 'timer';
const DEFAULT_DIFFICULTY = 'productive_easy';
let provisionallySelectedOption = null;

const configFlowScreen = document.getElementById('config-flow-screen');
const splashStep = document.getElementById('splash-step');
const initialStartButton = document.getElementById('initial-start-button');

const modeSelectionStep = document.getElementById('mode-step');
const gameModesContainer = document.getElementById('game-modes-container');
const confirmModeButton = document.getElementById('confirm-mode-button');

const difficultySelectionStep = document.getElementById('difficulty-step');
const difficultyButtonsContainer = document.getElementById('difficulty-buttons-container');
const confirmDifficultyButton = document.getElementById('confirm-difficulty-button');

const detailsConfigStep = document.getElementById('details-config-step');
const finalStartGameButton = document.getElementById('final-start-game-button');
const backButton = document.getElementById('back-button');
const scorePreviewValue = document.getElementById('score-preview-value');

const infoPanelTitle = document.getElementById('info-panel-title');
const infoPanelContent = document.getElementById('info-panel-content');

const configButtonsData = {}; // Se llenará al inicializar

confirmModeButton.addEventListener('click', () => {
    if (provisionallySelectedOption) {
        playFromStart(soundElectricShock);
        confirmModeButton.classList.add('electric-effect');
        setTimeout(() => confirmModeButton.classList.remove('electric-effect'), 1000);
        selectedMode = provisionallySelectedOption.dataset.mode;
        window.selectedGameMode = selectedMode;
        selectedGameMode = selectedMode; // Mantener sincronizado el modo seleccionado

        gameModesContainer.querySelectorAll('.config-flow-button').forEach(btn => {
            btn.classList.remove('provisional-selection');
            if (btn === provisionallySelectedOption) {
                btn.classList.add('confirmed-selection');
                btn.style.display = ''; // Asegurar que es visible
            } else {
                btn.classList.remove('confirmed-selection');
                btn.style.display = 'none'; // Ocultar los no seleccionados
            }
        });

        if (modeSelectionStep) {
            modeSelectionStep.classList.add('step-section-completed');
            const modeHeading = modeSelectionStep.querySelector('h3');
            if (modeHeading) modeHeading.style.display = 'none';
        }

        confirmModeButton.style.display = 'none';
        navigateToStep('difficulty');
    }
});

confirmDifficultyButton.addEventListener('click', () => {
    if (provisionallySelectedOption) {
        playFromStart(soundElectricShock);
        confirmDifficultyButton.classList.add('electric-effect');
        setTimeout(() => confirmDifficultyButton.classList.remove('electric-effect'), 1000);
        selectedDifficulty = provisionallySelectedOption.dataset.mode;

        difficultyButtonsContainer.querySelectorAll('.config-flow-button').forEach(btn => {
            btn.classList.remove('provisional-selection');
            if (btn === provisionallySelectedOption) {
                btn.classList.add('confirmed-selection');
                btn.style.display = '';
            } else {
                btn.classList.remove('confirmed-selection');
                btn.style.display = 'none';
            }
        });

        if (difficultySelectionStep) {
            difficultySelectionStep.classList.add('step-section-completed');
            const diffHeading = difficultySelectionStep.querySelector('h3');
            if (diffHeading) diffHeading.style.display = 'none';
        }

        confirmDifficultyButton.style.display = 'none';
        navigateToStep('details');
    }
});
backButton.addEventListener('click', () => {
    if (soundClick) safePlay(soundClick);
    let targetStepToGoBackTo = '';

    if (currentConfigStep === 'details') {
        document.getElementById('details-step').classList.remove('active-step');
        document.getElementById('details-step').style.display = 'none'; 

        const difficultyStepDiv = document.getElementById('difficulty-step');
        if (difficultyStepDiv) { // Comprobar si existe
            difficultyStepDiv.classList.remove('step-section-completed');
            const diffHeading = difficultyStepDiv.querySelector('h3');
            if (diffHeading) diffHeading.style.display = '';
            difficultyButtonsContainer.querySelectorAll('.config-flow-button').forEach(btn => {
                btn.style.display = ''; 
                btn.disabled = false;
                btn.classList.remove('confirmed-selection', 'provisional-selection');
            });
            if (configButtonsData[selectedDifficulty]?.buttonElement) {
                configButtonsData[selectedDifficulty].buttonElement.classList.remove('confirmed-selection');
            }
        }
        selectedDifficulty = null; 
        targetStepToGoBackTo = 'difficulty';

    } else if (currentConfigStep === 'difficulty') {
        const difficultyStepDiv = document.getElementById('difficulty-step');
        if (difficultyStepDiv) {
            difficultyStepDiv.classList.remove('active-step', 'step-section-completed');
            difficultyStepDiv.style.display = 'none';
        }

        const modeStepDiv = document.getElementById('mode-step');
        if (modeStepDiv) {
            modeStepDiv.classList.remove('step-section-completed');
            const modeHeading = modeStepDiv.querySelector('h3');
            if (modeHeading) modeHeading.style.display = '';
            gameModesContainer.querySelectorAll('.config-flow-button').forEach(btn => {
                btn.style.display = ''; 
                btn.disabled = false;
                btn.classList.remove('confirmed-selection', 'provisional-selection');
            });
            if (configButtonsData[selectedMode]?.buttonElement) {
               configButtonsData[selectedMode].buttonElement.classList.remove('confirmed-selection');
            }
        }
        selectedMode = null;
        window.selectedGameMode = null;
        selectedGameMode = null;
        targetStepToGoBackTo = 'mode';

    } else if (currentConfigStep === 'mode') {
        const modeStepDiv = document.getElementById('mode-step');
        if (modeStepDiv) {
             modeStepDiv.classList.remove('active-step', 'step-section-completed');
             modeStepDiv.style.display = 'none';
             const modeHeading = modeStepDiv.querySelector('h3');
             if (modeHeading) modeHeading.style.display = '';
        }
        targetStepToGoBackTo = 'splash';
    }

    if(targetStepToGoBackTo) {
        navigateToStep(targetStepToGoBackTo); 
    }
});
  if (!sessionStorage.getItem('musicStarted')) {
    fadeInAudio(menuMusic, targetVolume, 5000);
    sessionStorage.setItem('musicStarted', 'true');
  } else {
    menuMusic.volume = targetVolume;
    safePlay(menuMusic);
  }
  currentMusic = menuMusic;
  setInterval(() => {
    titleElement.classList.add('glitch-active');
    setTimeout(() => {
      titleElement.classList.remove('glitch-active');
    }, 600);
  }, 3000);

        const titleEl = document.querySelector('.glitch-title, #main-title');
        if (titleEl) {
          const words = titleEl.textContent.trim().split(/\s+/);
          let seenT = false;
          let seenC = false;

          const processed = words.map(word => {
            const letters = Array.from(word).map(ch => {
              let extraClass = '';
              if (ch === 'T' && !seenT) {
                extraClass = ' big-letter';
                seenT = true;
              }
              if (ch === 'C' && !seenC) {
                extraClass += ' big-letter';
                seenC = true;
              }
              return `<span class="letter${extraClass}">${ch}</span>`;
            }).join('');
            return `<span class="word">${letters}</span>`;
          }).join('<span class="letter space">&nbsp;</span>');

          titleEl.innerHTML = processed;
        }
    let loaded = false;
    try {
      initialRawVerbData = await verbosJsonPromise;
      loaded = Array.isArray(initialRawVerbData) && initialRawVerbData.length > 0;
    } catch (err) {
      console.error('Could not fetch verbos.json:', err);
      alert('Error cargando datos de los verbos.');
    }
 

  const pronouns = ['yo','tú','vos','él','nosotros','vosotros','ellos'];
  const pronounMap = {
    yo: ['I'],
    tú: ['you'],
    él: ['he', 'she'],
        usted: ['he', 'she'],
    vos: ['you'],
    nosotros: ['we'],
    vosotros: ['you'],
    ellos: ['they'],
    nosotras: ['we'], 
    vosotras: ['you'], 
    ellas: ['they'], 
    ustedes: ['you'] 
};
window.addEventListener("load", () => {
  document.body.classList.remove("is-loading");
  if (!localStorage.getItem('introPlayed')) {
    document.body.classList.add('fade-in');
    document.body.addEventListener('animationend', () => {
      document.body.classList.remove('fade-in');
    }, { once: true });
    localStorage.setItem('introPlayed', 'true');
  }
});

const pronounGroups = [
  { label: 'yo',                   values: ['yo'] },
  { label: 'tú',                   values: ['tú'] },
  { label: 'vos',                  values: ['vos'] },
  { label: 'él / ella / usted',    values: ['él'] },
  { label: 'nosotros / nosotras',  values: ['nosotros'] },
  { label: 'vosotros / vosotras',  values: ['vosotros'] },
  { label: 'ellos / ellas / ustedes', values: ['ellos'] }
];

function updatePronounDropdownCount() {
  const btns     = document.querySelectorAll('.pronoun-group-button');
  const selected = document.querySelectorAll('.pronoun-group-button.selected').length;
  document.getElementById('pronoun-dropdown-count')
          .textContent = `(${selected}/${btns.length})`;
}

  const irregularityTypes = [
    { value: 'regular', name: 'Regular',
      times: ['present', 'past_simple', 'present_perfect', 'future_simple', 'condicional_simple', 'imperfect_indicative'],
      hint: '', infoKey: 'regularInfo' },
    { value: 'first_person_irregular', name: '1st Person', times: ['present'],
      hint: '⚙️ salir -> salgo', infoKey: 'firstPersonInfo' },
    { value: 'stem_changing', name: 'Stem Change', times: ['present'],
      hint: '⚙️ dormir -> duermo', infoKey: 'stemChangingInfo' },
    { value: 'multiple_irregularities', name: 'Multiple', times: ['present'],
      hint: '⚙️ tener -> tengo, tienes', infoKey: 'multipleIrregularInfo' },
    { value: 'y_change', name: 'Y Change', times: ['present','past_simple'],
      hint: '⚙️ oír -> oyes', infoKey: 'yChangeInfo' },
    { value: 'irregular_root', name: 'Irreg. Root', times: ['past_simple'],
      hint: '⚙️ estar -> estuve', infoKey: 'irregularRootInfo' },
    { value: 'stem_change_3rd_person', name: 'Stem 3rd P.', times: ['past_simple'],
      hint: '⚙️ morir -> murió', infoKey: 'stemChange3rdInfo' },
    { value: 'totally_irregular', name: 'Totally Irreg.', times: ['past_simple'],
      hint: '⚙️ ser/ir -> fui', infoKey: 'totallyIrregularInfo' },
    { value: 'irregular_participle', name: 'Irreg. Participle', times: ['present_perfect'],
      hint: '⚙️ ver -> visto', infoKey: 'irregularParticipleInfo' },
    { value: 'irregular_future_conditional', name: 'Irregular Future / Conditional',
      times: ['future_simple', 'condicional_simple'], hint: '⚙️ tener -> tendré',
      infoKey: 'irregularFutureInfo' },
    { value: 'irregular_imperfect', name: 'Irregular imperfect', times: ['imperfect_indicative'],
      hint: '⚙️ ir -> iba', infoKey: 'irregularImperfectInfo' }
  ];
  const tenses = [
    { value: 'present',        name: 'Present',         infoKey: 'presentInfo' },
    { value: 'past_simple',    name: 'Simple Past',     infoKey: 'pastSimpleInfo' },
    { value: 'present_perfect',name: 'Present Perfect', infoKey: 'presentPerfectInfo' },
    { value: 'imperfect_indicative', name: 'Imperfect', infoKey: 'imperfectInfo' },
    { value: 'future_simple',        name: 'Future',    infoKey: 'futureInfo' },
    { value: 'condicional_simple',   name: 'Condicional', infoKey: 'conditionalInfo' }
  ];

  let totalCorrectAnswersForLife = 0; 
  let correctAnswersToNextLife = 10;  // Objetivo inicial para Mecánica 1
  let nextLifeIncrement = 10;         // El 'n' inicial para la progresión de Mecánica 1

  let currentStreakForLife = 0;       // Para Mecánica 2
  let streakGoalForLife = 5;          // Objetivo inicial para Mecánica 2
  let lastStreakGoalAchieved = 0;     // Para recordar la última meta de racha alcanzada

  let isPrizeVerbActive = false;      
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
                        if (specificModal && (specificModal.style.display === 'flex' || specificModal.style.display === 'block') ) {
				closeSpecificModal();
				return; // Importante: no procesar más el Escape si se cerró un modal
			}
			if (tooltip && tooltip.style.display === 'block') {
				tooltip.style.display = 'none';
				if (document.body) document.body.classList.remove('tooltip-open-no-scroll');
				if (window.typeInterval) clearInterval(window.typeInterval);
				return; // Importante: no procesar más el Escape si se cerró un tooltip
			}

                        if (configFlowScreen.style.display === 'flex') { // Asegurarse que la pantalla de config esté activa
				if (currentConfigStep === 'details' || currentConfigStep === 'difficulty') {
					if (backButton.style.display !== 'none') { // Si el botón back está visible (debería estarlo)
						backButton.click(); // Simula el clic en el botón "Back"
					}
                                } else if (currentConfigStep === 'mode') {
                                        navigateToStep('splash');
                                }
                                // No hacemos nada con Escape si estamos en 'splash' o si la pantalla de config no está visible
			}
		}
	});
function playHeaderIntro() {
  const header = document.querySelector('.main-header');
  header.classList.remove('animate');
  void header.offsetWidth;
  header.classList.add('animate');
}
playHeaderIntro();
function navigateToStep(stepName) {
    // Ensure Hall of Fame tooltip is hidden outside the splash step
    if (stepName !== 'splash') {
        closeHallOfFame();
        closeSalon();
    }
    const allSteps = document.querySelectorAll('.config-step');
    const stepsOrder = ['splash', 'mode', 'difficulty', 'details'];
    const targetIndex = stepsOrder.indexOf(stepName);
    const configFlowScreenDiv = document.getElementById('config-flow-screen'); // Necesaria para .splash-active
    const infoPanel = document.querySelector('.config-info-panel'); // Referencia al panel derecho
    // No longer toggle records on the splash screen; records are shown in the
    // Hall of Fame overlay instead.

    allSteps.forEach(stepDiv => {
        const stepIdWithoutSuffix = stepDiv.id.replace('-step', '');
        const stepIndexInOrder = stepsOrder.indexOf(stepIdWithoutSuffix);

        if (stepIndexInOrder === targetIndex) {
            stepDiv.classList.add('active-step');
            stepDiv.classList.remove('step-section-completed');
            stepDiv.style.display = 'block';
        } else if (stepDiv.classList.contains('step-section-completed') && stepIndexInOrder < targetIndex) {
            stepDiv.classList.remove('active-step');
            stepDiv.style.display = 'block';
        } else {
            stepDiv.classList.remove('active-step', 'step-section-completed');
            stepDiv.style.display = 'none';
        }
    });

    currentConfigStep = stepName;
    provisionallySelectedOption = null; 

    if (confirmModeButton) confirmModeButton.style.display = 'none';
    if (confirmDifficultyButton) confirmDifficultyButton.style.display = 'none';

    if (stepName === 'splash' || stepName === 'mode') {
        if (configFlowScreenDiv) {
            if (stepName === 'splash') configFlowScreenDiv.classList.add('splash-active');
            else configFlowScreenDiv.classList.remove('splash-active');
        }
        if (infoPanel) infoPanel.style.display = stepName === 'splash' ? 'none' : 'block';
        if (backButton) {
            if (stepName === 'splash') {
                backButton.style.display = 'none';
            } else {
                backButton.style.display = 'block';
                if (confirmModeButton) confirmModeButton.insertAdjacentElement('afterend', backButton);
            }
        }

        if (stepName === 'splash') {
            if (initialStartButton) initialStartButton.disabled = false;
            focusSplashButton(0);
            // Limpiar todas las selecciones y estados de completado al volver al splash
            allSteps.forEach(s => {
                if (s.id !== 'splash-step') {
                    s.classList.remove('active-step', 'step-section-completed');
                    s.style.display = 'none';
                    s.querySelectorAll('.config-flow-button').forEach(btn => {
                        btn.classList.remove('confirmed-selection', 'provisional-selection');
                        btn.style.display = '';
                        btn.disabled = false;
                    });
                }
            });
            selectedMode = null; window.selectedGameMode = null; selectedGameMode = null;
            selectedDifficulty = null;
        } else { // stepName === 'mode'
            if (initialStartButton) initialStartButton.disabled = true;
            updateInfoPanelContent('Select Game Mode', '<p>Choose how you want to play. Details will appear here when you select a mode.</p>');

            if (!selectedMode) {
                const defaultBtn = gameModesContainer.querySelector(`[data-mode="${DEFAULT_MODE}"]`);
                if (defaultBtn) {
                    handleOptionProvisionalSelection(defaultBtn, 'mode', defaultBtn.dataset.infokey);
                }
            }

            const firstModeButton = gameModesContainer.querySelector('.config-flow-button:not([style*="display: none"])');
            if (firstModeButton) focusOption(firstModeButton, gameModesContainer);
        }

    } else { // Para 'difficulty' y 'details'
        if (configFlowScreenDiv) configFlowScreenDiv.classList.remove('splash-active'); // Para que CSS pueda mostrar el panel derecho
        if (infoPanel) infoPanel.style.display = 'block'; // Mostrar explícitamente el panel derecho
        if (backButton) {
            backButton.style.display = 'block';
            if (stepName === 'difficulty' && difficultySelectionStep) {
                difficultySelectionStep.appendChild(backButton);
            } else if (stepName === 'details' && finalStartGameButton) {
                finalStartGameButton.insertAdjacentElement('afterend', backButton);
            }
        }
        if (initialStartButton) initialStartButton.disabled = true;

        const modeInfoTitle = selectedMode ? (specificInfoData[configButtonsData[selectedMode]?.infoKey]?.title || selectedMode.replace(/_/g, ' ')) : "Not selected";
        const diffInfoTitle = selectedDifficulty ? (specificInfoData[configButtonsData[selectedDifficulty]?.infoKey]?.title || selectedDifficulty.replace(/_/g, ' ')) : "Not selected";

        if (stepName === 'difficulty') {
            if (!selectedDifficulty) {
                const defaultBtn = difficultyButtonsContainer.querySelector(`[data-mode="${DEFAULT_DIFFICULTY}"]`);
                if (defaultBtn) {
                    handleOptionProvisionalSelection(defaultBtn, 'difficulty', defaultBtn.dataset.infokey);
                }
            }
            updateInfoPanelContent('Select Difficulty', `<p>Mode: <strong>${modeInfoTitle}</strong>.<br>Choose the game's challenge level. Details for the selected difficulty will appear here.</p>`);
            const firstDiffButton = difficultyButtonsContainer.querySelector('.config-flow-button:not([style*="display: none"])');
            if (firstDiffButton) focusOption(firstDiffButton, difficultyButtonsContainer);
        } else if (stepName === 'details') {
            updateInfoPanelContent('Customize Your Game', `<p> <strong><span class="math-inline">\</strong\> </strong>.<br>Adjust tenses, verbs, pronouns, and other options.</p>`);
            checkFinalStartButtonState();
            updateScorePreview();
        }
    }
}
function updateInfoPanelContent(title, htmlContent) {
    if (!infoPanelTitle || !infoPanelContent) return;

    infoPanelTitle.textContent = title;
    infoPanelContent.innerHTML = htmlContent;

    const recallAnim = infoPanelContent.querySelector('#recall-example-anim');
    const conjugateAnim = infoPanelContent.querySelector('#conjugate-example-anim');
    const produceAnim = infoPanelContent.querySelector('#produce-example-anim');

    if (window.typeInterval) clearInterval(window.typeInterval); // Limpiar global

    if (recallAnim) setTimeout(() => typeWriter(recallAnim, 'I ate', 150), 50);
    if (conjugateAnim) setTimeout(() => typeWriter(conjugateAnim, 'conjugamos', 150), 50);
    if (produceAnim) setTimeout(() => typeWriter(produceAnim, 'amo', 150), 50);
}
function updateSelectAllPronounsButtonText() {
  const pronounButtons = document.querySelectorAll('#pronoun-buttons .pronoun-group-button');
  const selectAllPronounsBtn = document.getElementById('select-all-pronouns');

  if (!selectAllPronounsBtn || pronounButtons.length === 0) {
    if (selectAllPronounsBtn) selectAllPronounsBtn.textContent = 'Seleccionar Todo';
    return;
  }

  const allSelected = Array.from(pronounButtons).every(btn => btn.classList.contains('selected'));
  selectAllPronounsBtn.textContent = allSelected ? 'No pronouns' : 'All pronouns';
}

function closeOtherFilterDropdowns(currentMenuToIgnore) {
    const allFilterMenus = document.querySelectorAll('.filter-bar .dropdown-menu');
    allFilterMenus.forEach(menu => {
        if (menu !== currentMenuToIgnore) {
            menu.classList.add('hidden');
        }
    });
    if (currentMenuToIgnore && !currentMenuToIgnore.classList.contains('hidden')) {
        openFilterDropdownMenu = currentMenuToIgnore;
    } else {
        openFilterDropdownMenu = null;
    }
}

function updateVerbDropdownCount() {
  const buttons = document.querySelectorAll('#verb-buttons .verb-button');
  const selected = Array.from(buttons)
                        .filter(b => b.classList.contains('selected'))
                        .length;
  const total = buttons.length;
  document.getElementById('verb-dropdown-count')
          .textContent = `(${selected}/${total})`;
}
if (loaded) {
  renderVerbButtons();
  initVerbDropdown();
  renderTenseButtons();
  initTenseDropdown();
  renderPronounButtons();
  initPronounDropdown();
  renderVerbTypeButtons();
  filterVerbTypes();  
  renderSetupRecords();
}
  const dropdownBtn     = document.getElementById('verb-dropdown-button');
  const dropdownMenu    = document.getElementById('verb-dropdown-menu');
  const selectAllBtn    = document.getElementById('select-all-verbs');
  const allButtons      = () => Array.from(document.querySelectorAll('.verb-button'));
  

  
  document.querySelectorAll('input[type="checkbox"], input[type="radio"], select')
    .forEach(el => {
      el.addEventListener('change', () => {
        safePlay(soundClick);
      });
    });
	
   function updateTenseDropdownCount() {
		const tenseButtonsNodeList = document.querySelectorAll('#tense-buttons .tense-button'); 
		const total = tenseButtonsNodeList.length;
		const selected = Array.from(tenseButtonsNodeList).filter(btn => btn.classList.contains('selected')).length;
		
		const countElement = document.getElementById('tense-dropdown-count');
		if (countElement) {
			countElement.textContent = `(${selected}/${total})`;
		}
   }
	
  function renderTenseButtons() {
    const container = document.getElementById('tense-buttons');
    container.innerHTML = '';
    tenses.forEach(t => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('tense-button');
      btn.dataset.value = t.value;
      btn.dataset.infokey = t.infoKey;
      btn.innerHTML = `${t.name} <span class="context-info-icon" data-info-key="${t.infoKey}"></span>`;
      if (t.value === 'present') btn.classList.add('selected');
      btn.addEventListener('click', (e) => {
        if (e.target.closest('.context-info-icon')) return;
        safePlay(soundClick);
        btn.classList.toggle('selected');
        document.querySelectorAll('.verb-type-button.selected').forEach(typeBtn => {
            typeBtn.classList.remove('selected'); // Desmarcar todos primero
        });

        const regularTypeBtn = document.querySelector('.verb-type-button[data-value="regular"]');
        if (regularTypeBtn && !regularTypeBtn.disabled) { // Si 'regular' existe y no está deshabilitado por el tiempo actual
            regularTypeBtn.classList.add('selected');
        }
        filterVerbTypes();
                updateTenseDropdownCount(); // Ya la tienes
        updateSelectAllTensesButtonText(); // << --- AÑADIR ESTA LLAMADA
      });
      const icon = btn.querySelector('.context-info-icon');
      if (icon) {
        icon.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof soundClick !== 'undefined') safePlay(soundClick);
          openSpecificModal(icon.dataset.infoKey);
        });
      }
      container.appendChild(btn);
    });
    updateTenseDropdownCount(); // Llamada existente
    updateSelectAllTensesButtonText(); // << --- AÑADIR ESTA LLAMADA (actualización inicial)
    }

function initTenseDropdown() {
  let dropdownBtnEl = document.getElementById('tense-dropdown-button');
  let dropdownMenuEl = document.getElementById('tense-dropdown-menu');
  let selectAllTensesEl = document.getElementById('select-all-tenses');

  if (dropdownBtnEl) {
    let newDropdownBtn = dropdownBtnEl.cloneNode(true); // true para clonar hijos (texto, spans)
    dropdownBtnEl.parentNode.replaceChild(newDropdownBtn, dropdownBtnEl);
    dropdownBtnEl = newDropdownBtn; // Actualizamos la referencia al nuevo botón
  }

  if (selectAllTensesEl) {
    let newSelectAllTenses = selectAllTensesEl.cloneNode(true);
    selectAllTensesEl.parentNode.replaceChild(newSelectAllTenses, selectAllTensesEl);
    selectAllTensesEl = newSelectAllTenses; // Actualizamos la referencia
  }
  // Ahora, los listeners se añaden a los botones "limpios"
  if (dropdownBtnEl && dropdownMenuEl) {
    dropdownBtnEl.addEventListener('click', e => {
      e.stopPropagation();
      const isCurrentlyHidden = dropdownMenuEl.classList.contains('hidden');

      if (isCurrentlyHidden) {
        // Si está oculto, cerramos cualquier otro menú de filtro abierto y luego abrimos este
        closeOtherFilterDropdowns(null); // Cierra todos los demás
        dropdownMenuEl.classList.remove('hidden');
        openFilterDropdownMenu = dropdownMenuEl; // Marcar este como el abierto
      } else {
        // Si está visible, simplemente lo ocultamos (toggle off)
        dropdownMenuEl.classList.add('hidden');
        if (openFilterDropdownMenu === dropdownMenuEl) {
          openFilterDropdownMenu = null; // Ya no hay ninguno abierto
        }
      }
    });
  }

  if (selectAllTensesEl) {
    selectAllTensesEl.addEventListener('click', () => {
      if (typeof soundClick !== 'undefined' && soundClick.play) {
          safePlay(soundClick);
      }
      
      const currentTenseButtons = Array.from(document.querySelectorAll('#tense-buttons .tense-button'));
      const allCurrentlySelected = currentTenseButtons.length > 0 && currentTenseButtons.every(btn => btn.classList.contains('selected'));
      
      currentTenseButtons.forEach(btn => {
          btn.classList.toggle('selected', !allCurrentlySelected);
      });
      
      filterVerbTypes();
      updateTenseDropdownCount();
      updateSelectAllTensesButtonText(); 
    });
  }

  updateTenseDropdownCount();
  updateSelectAllTensesButtonText();
}
	
function updateCurrentPronouns() {
  const selectedBtns = Array.from(document.querySelectorAll('.pronoun-group-button'))
                            .filter(b => b.classList.contains('selected'));
  const flat = selectedBtns.flatMap(b => JSON.parse(b.dataset.values));
  // Sobrescribe el array global pronouns:
  window.pronouns = flat;
}
  
function filterVerbTypes() {
  const selectedTenses = getSelectedTenses();

  document.querySelectorAll('.verb-type-button').forEach(button => {
    const applicableTensesForButton = button.dataset.times.split(',');
    const isEnabled = applicableTensesForButton.some(t => selectedTenses.includes(t));
    
    button.disabled = !isEnabled;
    button.classList.toggle('disabled', !isEnabled);

    if (!isEnabled && button.classList.contains('selected')) {
      button.classList.remove('selected');

      if (selectedTenses.includes('present')) {
        const verbTypeValue = button.dataset.value;
        const typeInfoFromArray = irregularityTypes.find(it => it.value === verbTypeValue); 
        const multipleIrrBtn = document.querySelector('.verb-type-button[data-value="multiple_irregularities"]');

        if (multipleIrrBtn && multipleIrrBtn.classList.contains('selected')) {
          const irregularRootDef = irregularityTypes.find(it => it.value === 'irregular_root');
          const irregularRootAppliesToPresent = irregularRootDef ? irregularRootDef.times.includes('present') : false;
          
          if (verbTypeValue === 'first_person_irregular' || 
              (verbTypeValue === 'irregular_root' && irregularRootAppliesToPresent)) {
            multipleIrrBtn.classList.remove('selected');
          }
        }
      }
    }
  });

  applyIrregularityAndTenseFiltersToVerbList();
  updateVerbTypeButtonsVisualState();
}

  const gameModeButtons = document.querySelectorAll('#game-modes .mode-button');
  gameModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedGameMode = btn.dataset.mode;
      safePlay(soundClick);
      gameModeButtons.forEach(b => b.classList.remove('selected-mode'));
      btn.classList.add('selected-mode');
      document.getElementById('setup-screen').style.display = 'block';
      filterVerbTypes();
    });
  });

  const configButtons = document.querySelectorAll('.config-button');
  configButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentOptions.mode = btn.dataset.mode;
      safePlay(soundClick);
      configButtons.forEach(b => b.classList.remove('selected-mode'));
      btn.classList.add('selected-mode');
    });
  });


const musicToggle = document.getElementById('music-toggle');
const musicIcon = document.getElementById('music-icon');
const volumeSlider = document.getElementById('volume-slider');
volumeSlider.value = targetVolume;  
volumeSlider.addEventListener('input', () => {
  targetVolume = parseFloat(volumeSlider.value);
  currentMusic.volume = targetVolume;
});

let musicPlaying = true;

musicToggle.addEventListener('click', () => {
  if (currentMusic.paused) {
    currentMusic.volume = targetVolume;  // inicia directamente al 20%
    safePlay(currentMusic);
    if (musicIcon) {
      musicIcon.src = 'images/musicon.webp';
      musicIcon.alt = 'Music on';
    }
    volumeSlider.disabled = false;
  } else {
    currentMusic.pause();
    if (musicIcon) {
      musicIcon.src = 'images/musicoff.webp';
      musicIcon.alt = 'Music off';
    }
    volumeSlider.disabled = true;
  }
  musicPlaying = !currentMusic.paused;
});

function renderVerbButtons() {
  const container = document.getElementById('verb-buttons');
  container.innerHTML = '';

  const verbsSorted = [...initialRawVerbData].sort((a, b) =>
    a.infinitive_es.localeCompare(b.infinitive_es, 'es', { sensitivity: 'base' })
  );

  verbsSorted.forEach(v => {
    const btn = document.createElement('button');
    btn.type          = 'button';
    const infinitive = v.infinitive_es.trim();
    btn.classList.add('verb-button');

    if (infinitive.endsWith('se')) {
      btn.classList.add('verb-button-reflexive');
    } else if (infinitive.endsWith('ar')) {
      btn.classList.add('verb-button-ar');
    } else if (infinitive.endsWith('er')) {
      btn.classList.add('verb-button-er');
    } else if (infinitive.endsWith('ir')) {
      btn.classList.add('verb-button-ir');
    }

    //const typesInPresent = v.types['present'] || [];
    //if (!infinitive.endsWith('se') && typesInPresent.includes('regular')) {
        //btn.classList.add('selected');
    //}

    btn.dataset.value = infinitive;
    btn.innerHTML = `
      <span class="tick"></span>
      <span class="label">${infinitive} — ${v.infinitive_en}</span>
    `;
    container.appendChild(btn);
  });
}
	
	// Recorre cada group-button y marca .active si TODOS sus verbos están seleccionados
	function updateGroupButtons() {
	  // Ya NO necesitas definir 'container' ni 'allBtns' localmente si usas las globales.
	  // const container = document.getElementById('verb-buttons'); // COMENTA O QUITA ESTO
	  // const allBtns   = Array.from(container.querySelectorAll('.verb-button')); // COMENTA O QUITA ESTO

	  // Llama a la función global allBtns() para obtener el array de botones
	  const currentVerbButtons = allBtns(); // <--- Esta línea obtiene el array de la función global

	  document.querySelectorAll('#verb-groups-panel .group-button')
		.forEach(gb => {
		  const grp = gb.dataset.group;

		  // USA 'currentVerbButtons' para filtrar, NO 'allBtns' directamente
		  const matched = currentVerbButtons.filter(b => { // <--- CAMBIO CRUCIAL AQUÍ: usa currentVerbButtons
			const inf = b.dataset.value;
			const normalizedInf = removeAccents(inf); // Asumo que tienes removeAccents globalmente

			if (grp === 'all') return true;
			if (grp === 'reflexive') return inf.endsWith('se');
			// Tu lógica original para ar, er, ir:
			if (grp === 'ar') return !inf.endsWith('se') && inf.endsWith('ar'); 
			if (grp === 'er') return !inf.endsWith('se') && inf.endsWith('er');
			if (grp === 'ir') return !inf.endsWith('se') && inf.endsWith('ir');
			// Esto era de mi ejemplo, tu lógica puede ser diferente, adáptala si es necesario
			// return inf.endsWith(grp); 
			return false; // Fallback si no es ninguno de los anteriores
		  });

		  const allOn = matched.length > 0 && matched.every(b => b.classList.contains('selected'));
		  gb.classList.toggle('active', allOn);
		});
	}
	function updateSelectAllTensesButtonText() {
	  const tenseButtons = document.querySelectorAll('#tense-buttons .tense-button');
	  const selectAllTensesBtn = document.getElementById('select-all-tenses');

	  if (!selectAllTensesBtn || tenseButtons.length === 0) {
		if (selectAllTensesBtn) selectAllTensesBtn.textContent = 'Seleccionar Todo';
		return;
	  }

	  const allSelected = Array.from(tenseButtons).every(btn => btn.classList.contains('selected'));
	  selectAllTensesBtn.textContent = allSelected ? 'No tenses...' : 'All tenses!';
	}
	function updateDeselectAllButton() {
	  const verbButtons = allBtns(); 
	  const deselectAllBtn = document.getElementById('deselect-all-verbs'); // Asegúrate de tener la referencia

	  if (verbButtons.length === 0) {
		deselectAllBtn.textContent = 'Seleccionar Todo';
		return;
	  }
	  // Comprueba si TODOS los botones de verbo están seleccionados
	  const allSelected = verbButtons.every(b => b.classList.contains('selected'));
	  deselectAllBtn.textContent = allSelected
		? 'No verbs'
		: 'All verbs';
	}
        function initVerbDropdown() {
          let ddBtn          = document.getElementById('verb-dropdown-button');
          const menu         = document.getElementById('verb-dropdown-menu');
          let deselectAllBtn = document.getElementById('deselect-all-verbs');
          let groupsBtn      = document.getElementById('verb-groups-button');
          let groupsPanel    = document.getElementById('verb-groups-panel');
          let searchInput    = document.getElementById('verb-search');
          let container      = document.getElementById('verb-buttons');

          // Replace elements with clones to remove old listeners
          if (ddBtn) {
            const newEl = ddBtn.cloneNode(true);
            ddBtn.parentNode.replaceChild(newEl, ddBtn);
            ddBtn = newEl;
          }
          if (deselectAllBtn) {
            const newEl = deselectAllBtn.cloneNode(true);
            deselectAllBtn.parentNode.replaceChild(newEl, deselectAllBtn);
            deselectAllBtn = newEl;
          }
          if (groupsBtn) {
            const newEl = groupsBtn.cloneNode(true);
            groupsBtn.parentNode.replaceChild(newEl, groupsBtn);
            groupsBtn = newEl;
          }
          if (groupsPanel) {
            const newEl = groupsPanel.cloneNode(true);
            groupsPanel.parentNode.replaceChild(newEl, groupsPanel);
            groupsPanel = newEl;
          }
          if (searchInput) {
            const newEl = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newEl, searchInput);
            searchInput = newEl;
          }
          if (container) {
            const newEl = container.cloneNode(true);
            container.parentNode.replaceChild(newEl, container);
            container = newEl;
          }


	  // 0) Abrir/Cerrar el menú
		ddBtn.addEventListener('click', e => {
			e.stopPropagation();
			const isOpening = menu.classList.contains('hidden');

			closeOtherFilterDropdowns(null); // Cierra otros o este mismo si estaba abierto

			if (isOpening) {
				menu.classList.remove('hidden');
				openFilterDropdownMenu = menu; 
				searchInput.focus();
			}
			// El panel de grupos debería permanecer oculto al abrir el menú principal de verbos
			groupsPanel.classList.add('hidden'); 
		});

	  // 1) Toggle Selección total / Deselección total
		deselectAllBtn.addEventListener('click', () => {
		  const verbButtons = allBtns();
		  // Determina si todos están seleccionados ANTES de cambiar algo
		  const allCurrentlySelected = verbButtons.length > 0 && verbButtons.every(b => b.classList.contains('selected'));

		  // Si todos están seleccionados, deselecciona todos. Si no, selecciona todos.
		  verbButtons.forEach(b => b.classList.toggle('selected', !allCurrentlySelected));
		  
		  updateVerbDropdownCount();
		  updateDeselectAllButton(); // Actualiza el texto del botón
		  updateGroupButtons();
		  updateVerbTypeButtonsVisualState();
		});

	  // 2) Abrir/Ocultar panel de Grupos
	  groupsBtn.addEventListener('click', e => {
		e.stopPropagation();
		groupsPanel.classList.toggle('hidden');
	  });

		// 3) Filtrar por grupos con TOGGLE y marcar el propio botón
		groupsPanel.querySelectorAll('.group-button').forEach(gb => {
		  gb.addEventListener('click', e => {
			e.preventDefault();
			if (soundClick) safePlay(soundClick); 
			const grp = gb.dataset.group; // "all" | "reflexive" | "ar" | "er" | "ir"

			// ① Recoger solo los botones de verbo que pertenecen a este grupo
			const matched = allBtns().filter(b => {
			  const inf = b.dataset.value;
			  const normalizedInf = removeAccents(inf);
			  
			  if (grp === 'all') return true;
			  if (grp === 'reflexive') return inf.endsWith('se');
			  if (grp === 'ar') return normalizedInf.endsWith('ar');
			  if (grp === 'er') return normalizedInf.endsWith('er');
			  if (grp === 'ir') return normalizedInf.endsWith('ir');
			  
			  return inf.endsWith(grp);
			});

			// ② Decidir si los apagamos (si todos ya estaban seleccionados) o los encendemos
			const allCurrentlyOn = matched.every(b => b.classList.contains('selected'));
			matched.forEach(b => 
			  b.classList.toggle('selected', !allCurrentlyOn)
			);

			// ③ Marcar el propio botón de grupo como activo/inactivo
			gb.classList.toggle('active', !allCurrentlyOn);

			// ④ Actualizar contador y texto “todo”
			updateVerbDropdownCount();
			updateDeselectAllButton();
			updateGroupButtons();
			updateVerbTypeButtonsVisualState();
		});
	  });

		// Modificación en initVerbDropdown:
		searchInput.addEventListener('input', () => {
			const q = searchInput.value.trim().toLowerCase();
			let visibleCount = 0;
			const noResultsMessage = document.getElementById('verb-search-no-results');

			allBtns().forEach(b => {
				const isVisible = b.textContent.toLowerCase().includes(q);
				b.style.display = isVisible ? '' : 'none';
				if (isVisible) {
					visibleCount++;
				}
			});

			// Mostrar u ocultar el mensaje de "no resultados"
			if (noResultsMessage) {
				if (visibleCount === 0 && q !== '') { // Mostrar solo si hay búsqueda y 0 resultados
					noResultsMessage.classList.remove('hidden');
				} else {
					noResultsMessage.classList.add('hidden');
				}
			}
		});
			searchInput.addEventListener('keydown', e => {
				if (e.key === 'Enter' || e.keyCode === 13) { // 'Enter' o código 13 para Enter
					e.preventDefault(); // Previene la acción por defecto (enviar el formulario)

				}
			});
	  // 5) Delegación de clicks para toggle individual
		container.addEventListener('click', e => {
		  const btn = e.target.closest('.verb-button');
		  if (!btn) return;
		  safePlay(soundClick);
		  btn.classList.toggle('selected');

		  updateVerbDropdownCount();
		  updateDeselectAllButton(); // Texto del botón "Seleccionar/Deseleccionar Todos los Verbos"
		  updateGroupButtons();      // Estado 'active' de -ar, -er, -ir, -se
		  updateVerbTypeButtonsVisualState(); // << --- AÑADIR ESTA LLAMADA
		});

	  // 7) Inicializar contador y texto del botón la primera vez
	  updateVerbDropdownCount();
	  updateDeselectAllButton();
	  updateGroupButtons();
	}
	
	function renderPronounButtons() {
	  const container = document.getElementById('pronoun-buttons');
	  container.innerHTML = '';

	  pronounGroups.forEach(group => {
		const btn = document.createElement('button');
		btn.type              = 'button';
		btn.classList.add('pronoun-group-button');
		btn.dataset.values    = JSON.stringify(group.values);
		btn.textContent       = group.label;
                if (group.label !== 'vos') {
                    btn.classList.add('selected');  // todos activos por defecto
                }
		container.appendChild(btn);
	  });
	}

function initPronounDropdown() {
  let ddBtn     = document.getElementById('pronoun-dropdown-button');
  const ddMenu  = document.getElementById('pronoun-dropdown-menu');
  let selectAll = document.getElementById('select-all-pronouns');
  let container = document.getElementById('pronoun-buttons');

  if (ddBtn) {
    const newEl = ddBtn.cloneNode(true);
    ddBtn.parentNode.replaceChild(newEl, ddBtn);
    ddBtn = newEl;
  }
  if (selectAll) {
    const newEl = selectAll.cloneNode(true);
    selectAll.parentNode.replaceChild(newEl, selectAll);
    selectAll = newEl;
  }
  if (container) {
    const newEl = container.cloneNode(true);
    container.parentNode.replaceChild(newEl, container);
    container = newEl;
  }
  
  // Función auxiliar para obtener todos los botones de grupo de pronombres
  const getAllPronounGroupButtons = () => Array.from(document.querySelectorAll('#pronoun-buttons .pronoun-group-button'));

  // 1) Abrir/cerrar menú (tu lógica actual está bien)
  ddBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpening = ddMenu.classList.contains('hidden');
    closeOtherFilterDropdowns(null); 
    if (isOpening) {
      ddMenu.classList.remove('hidden');
      openFilterDropdownMenu = ddMenu;
    }
  });

  // 2) Lógica para el botón “Seleccionar Todo / Deseleccionar Todo” de Pronombres
  selectAll.addEventListener('click', () => {
    if (typeof soundClick !== 'undefined' && soundClick.play) {
        safePlay(soundClick);
    }
    
    const currentPronounButtons = getAllPronounGroupButtons();
    
    // Determinar si todos los botones de pronombre están actualmente seleccionados
    const allCurrentlySelected = currentPronounButtons.length > 0 && currentPronounButtons.every(b => b.classList.contains('selected'));
    
    // Si todos están seleccionados, la acción es deseleccionar todos.
    // Si no todos están seleccionados (o ninguno), la acción es seleccionar todos.
    currentPronounButtons.forEach(b => {
        b.classList.toggle('selected', !allCurrentlySelected);
    });
    
    updatePronounDropdownCount();        // Actualiza el contador numérico (ej. "3/6")
    updateSelectAllPronounsButtonText(); // << --- ¡Importante! Actualiza el texto de este botón
    updateCurrentPronouns();             // Actualiza la lista global de pronombres
  });

  // 3) Toggle individual de cada botón de grupo de pronombre
  getAllPronounGroupButtons().forEach(b => { // Itera sobre los botones obtenidos
    b.addEventListener('click', () => {
      if (typeof soundClick !== 'undefined' && soundClick.play) {
          safePlay(soundClick);
      }
      b.classList.toggle('selected');
      updatePronounDropdownCount();
      updateSelectAllPronounsButtonText(); // << --- ¡Importante! Actualiza el texto del botón principal
      updateCurrentPronouns();
    });
  });

  // 4) Inicia el contador y el texto del botón "Seleccionar/Deseleccionar Todo" con el estado actual
  updatePronounDropdownCount();
  updateSelectAllPronounsButtonText(); // << --- ¡Importante! Llamada inicial para el texto del botón
  updateCurrentPronouns(); // Ya lo tenías, está bien
}
	
document.addEventListener('click', e => {
    if (openFilterDropdownMenu) { // Si hay un menú de filtro (Tense, Verb, o Pronoun) abierto

        // Comprobamos si el clic fue en alguno de los botones que abren los menús
        const isClickOnAnyToggleButton = 
            document.getElementById('tense-dropdown-button').contains(e.target) ||
            document.getElementById('verb-dropdown-button').contains(e.target) ||
            document.getElementById('pronoun-dropdown-button').contains(e.target);

        // Comprobamos si el clic fue dentro del menú que está actualmente abierto
        const isClickInsideOpenMenu = openFilterDropdownMenu.contains(e.target);

        if (!isClickOnAnyToggleButton && !isClickInsideOpenMenu) {
            // Si el clic NO fue en un botón toggle Y NO fue dentro del menú abierto,
            // entonces cerramos el menú.
            openFilterDropdownMenu.classList.add('hidden');

            // Importante: Si el menú de verbos está abierto y su panel de grupos también,
            // también debemos cerrar el panel de grupos.
            if (openFilterDropdownMenu.id === 'verb-dropdown-menu') {
                const groupsPanel = document.getElementById('verb-groups-panel');
                if (groupsPanel) {
                    groupsPanel.classList.add('hidden');
                }
            }

            openFilterDropdownMenu = null; // Ya no hay ninguno "oficialmente" abierto
        }
    }
});
function initStepButtons(container, stepType) {
    const buttons = container.querySelectorAll('.config-flow-button');
    buttons.forEach((button, index) => {
        const dataMode = button.dataset.mode;
        const infoKey = button.dataset.infokey; // Asegúrate que tus botones HTML tengan data-infokey
        configButtonsData[dataMode] = { buttonElement: button, infoKey: infoKey };

		button.addEventListener('click', () => {
			if (button.classList.contains('confirmed-selection')) { // <<== AÑADIR ESTA CONDICIÓN
				return; // No hacer nada si ya está confirmado
			}
			handleOptionProvisionalSelection(button, stepType, infoKey);
		});

        // Para navegación con teclado
        button.addEventListener('focus', () => {
            // Si no hay una selección provisional, el panel se actualiza con el foco
            if (!provisionallySelectedOption || provisionallySelectedOption.parentElement !== container) {
                const info = specificInfoData[infoKey];
                if (info) {
                    updateInfoPanelContent(info.title, info.html);
                }
            }
        });
    });

    // Navegación con teclado para este grupo de botones
    container.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            const currentFocused = Array.from(buttons).indexOf(document.activeElement);
            const nextButton = buttons[(currentFocused + 1) % buttons.length];
            if (nextButton) nextButton.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const currentFocused = Array.from(buttons).indexOf(document.activeElement);
            const prevButton = buttons[(currentFocused - 1 + buttons.length) % buttons.length];
            if (prevButton) prevButton.focus();
        } else if (e.key === 'Enter' && document.activeElement.classList.contains('config-flow-button')) {
            e.preventDefault();
            const activeBtn = document.activeElement;
            handleOptionProvisionalSelection(activeBtn, stepType, activeBtn.dataset.infokey);
        }
    });
}

function handleOptionProvisionalSelection(buttonElement, stepType, infoKeyToDisplay) {
    if (soundClick) safePlay(soundClick);
    const container = buttonElement.parentElement;
    container.querySelectorAll('.config-flow-button').forEach(btn => {
        btn.classList.remove('provisional-selection');
    });
    buttonElement.classList.add('provisional-selection');
    provisionallySelectedOption = buttonElement;

    const info = specificInfoData[infoKeyToDisplay]; // Usa la infoKey del botón clickeado
    if (info) {
        updateInfoPanelContent(info.title, info.html);
    }

    if (stepType === 'mode') {
        confirmModeButton.style.display = 'block';
        confirmModeButton.focus(); // Enfocar el botón de confirmar
    } else if (stepType === 'difficulty') {
        confirmDifficultyButton.style.display = 'block';
        confirmDifficultyButton.focus();
    }
}

function focusOption(buttonElement, container) {
    if (!buttonElement) return;
    container.querySelectorAll('.config-flow-button').forEach(btn => btn.classList.remove('provisional-selection')); // Quitar otros parpadeos
    buttonElement.focus(); // Esto debería activar el listener de focus en initStepButtons
}

// Permite navegar con las flechas incluso cuando el botón de confirmar está enfocado
function initConfirmButtonNavigation(confirmBtn, container) {
    if (!confirmBtn || !container) return;

    confirmBtn.addEventListener('keydown', (e) => {
        const buttons = Array.from(container.querySelectorAll('.config-flow-button'));
        if (!buttons.length) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            const currentIndex = buttons.indexOf(provisionallySelectedOption) >= 0 ?
                                   buttons.indexOf(provisionallySelectedOption) : 0;
            const nextButton = buttons[(currentIndex + 1) % buttons.length];
            focusOption(nextButton, container);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const currentIndex = buttons.indexOf(provisionallySelectedOption) >= 0 ?
                                   buttons.indexOf(provisionallySelectedOption) : 0;
            const prevButton = buttons[(currentIndex - 1 + buttons.length) % buttons.length];
            focusOption(prevButton, container);
        } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            confirmBtn.click();
        }
    });
}
async function renderSetupRecords() {
  const container = document.getElementById('setup-records');
  if (!container) return;

  if (!supabase) {
    container.querySelectorAll('.mode-records').forEach((div) => {
      const mode = div.dataset.mode;
      const ul = div.querySelector('.record-list');
      const records = SAMPLE_RECORDS[mode] || [];
      if (records.length === 0) {
        ul.innerHTML = '<li>Records unavailable</li>';
        return;
      }
      ul.innerHTML = '';
      records.forEach((record, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const levelInfo =
          (mode === 'timer' || mode === 'lives') && record.level
            ? ` - lvl. ${record.level}`
            : '';
        const li = document.createElement('li');
        li.innerHTML =
          `<div class="record-item"><span class="medal">${medal}</span><strong>${record.name}:</strong> ${record.score}${levelInfo}</div>`;
        ul.appendChild(li);
      });
    });
    return;
  }

  container.querySelectorAll('.mode-records').forEach(async (div) => {
    const mode = div.dataset.mode;
    const ul = div.querySelector('.record-list');
    ul.innerHTML = '<li>Loading...</li>';

    try {
      const { data, error } = await supabase
        .from('records')
        // Selecting all columns avoids errors if some do not exist
        .select('*')
        .eq('mode', mode)
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        ul.innerHTML = '<li>No records yet</li>';
        return;
      }

      ul.innerHTML = '';
      data.forEach((record, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const li = document.createElement('li');
        const levelInfo = (mode === 'timer' || mode === 'lives') && record.level ? ` - lvl. ${record.level}` : '';
        li.innerHTML = `
          <div class="record-item">
            <span class="medal">${medal}</span>
            <strong>${record.name}:</strong> ${record.score}${levelInfo}
          </div>`;
        ul.appendChild(li);
      });
    } catch (error) {
      console.error('Error loading records:', error.message);
      ul.innerHTML = '<li>Error loading records</li>';
    }
  });
}

  function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }


async function loadVerbs() {
  if (!initialRawVerbData || initialRawVerbData.length === 0) {
    try {
      initialRawVerbData = await verbosJsonPromise;
    } catch (error) {
      console.error("Error fetching raw verb data:", error);
      alert("Could not load verb data file.");
      return false;
    }
  }

  // 1) Filtrado por tipos de irregularidad
  const selectedTypeBtns = Array.from(
    document.querySelectorAll('.verb-type-button.selected')
  );
  const selectedTypes = selectedTypeBtns.map(b => b.dataset.value);
  if (selectedTypes.length === 0) {
    alert('Please select at least one verb type.');
	allVerbData = []
    return false;
  }

  // Verbos seleccionados manualmente por el usuario en la lista desplegable
  const manuallySelectedVerbInfinitives = Array.from(
    document.querySelectorAll('#verb-buttons .verb-button.selected')
  ).map(b => b.dataset.value);

  let verbsToConsiderForGame = [];

  if (manuallySelectedVerbInfinitives.length > 0) {
    // **CASO 1: El usuario ha seleccionado verbos específicos manualmente.**

    // Empezamos con los verbos crudos que coinciden con la selección manual
    verbsToConsiderForGame = initialRawVerbData.filter(v => 
        manuallySelectedVerbInfinitives.includes(v.infinitive_es)
    );

    verbsToConsiderForGame = verbsToConsiderForGame.filter(v =>
      currentOptions.tenses.some(tenseKey => v.conjugations[tenseKey] !== undefined)
    );

    if (verbsToConsiderForGame.length === 0) {
      alert('None of the verbs you manually selected are available for the chosen tenses. Please adjust the tenses or your verb selection.');
      allVerbData = [];
      return false;
    }

  } else {

    if (selectedselectedTypes.length === 0) {
      alert('Please select at least one type of irregularity if you do not choose specific verbs..');
      allVerbData = [];
      return false;
    }

    verbsToConsiderForGame = initialRawVerbData.filter(v =>
      currentOptions.tenses.some(tenseKey => // Para cada tiempo seleccionado...
        (v.types[tenseKey] || []).some(typeInVerb => // ...el verbo debe tener un tipo de irregularidad...
          selectedIrregularityTypes.includes(typeInVerb) // ...que esté en los tipos de irregularidad seleccionados por el usuario.
        )
      )
    );
  }

  // Comprobación final y asignación
  if (verbsToConsiderForGame.length === 0) {
    alert('No verbs are available for the selected criteria. Try other filters.');
    allVerbData = [];
    return false;
  }

  allVerbData = verbsToConsiderForGame;
  return true;
}
// Helper para obtener los tiempos seleccionados
function getSelectedTenses() {
    return Array.from(document.querySelectorAll('#tense-buttons .tense-button.selected'))
                .map(btn => btn.dataset.value);
}

// Helper para obtener el objeto verbo completo desde initialRawVerbData
function getVerbObjectByInfinitive(infinitiveEs) {
    return initialRawVerbData.find(v => v.infinitive_es === infinitiveEs);
}

// Helper para obtener los tipos de irregularidad de un verbo para los tiempos seleccionados
function getIrregularityTypesForVerb(verbObj, selectedTenses) {
    const types = new Set();
    if (verbObj && verbObj.types && selectedTenses) {
        selectedTenses.forEach(tenseKey => {
            (verbObj.types[tenseKey] || []).forEach(type => types.add(type));
        });
    }
    return Array.from(types);
}
function updateVerbTypeButtonsVisualState() {
    const selectedVerbElements = Array.from(document.querySelectorAll('#verb-buttons .verb-button.selected'));
    const selectedVerbInfinitives = selectedVerbElements.map(btn => btn.dataset.value);
    const currentSelectedTenses = getSelectedTenses();
    const allActiveIrregularityTypes = new Set();

    selectedVerbInfinitives.forEach(infinitiveEs => {
        const verbObj = getVerbObjectByInfinitive(infinitiveEs);
        if (verbObj) {
            const typesForVerb = getIrregularityTypesForVerb(verbObj, currentSelectedTenses);
            typesForVerb.forEach(type => allActiveIrregularityTypes.add(type));
        }
    });

    document.querySelectorAll('.verb-type-button').forEach(typeButton => {
        const typeValue = typeButton.dataset.value;
        // Un tipo se marca como seleccionado si está presente en AL MENOS UNO de los verbos seleccionados
        // Y si el botón no está deshabilitado por filterVerbTypes()
        if (!typeButton.disabled && allActiveIrregularityTypes.has(typeValue)) {
            typeButton.classList.add('selected');
        } else {
            // Se deselecciona si no hay verbos seleccionados que lo tengan, o si está deshabilitado
            typeButton.classList.remove('selected');
        }
    });
}
function applyIrregularityAndTenseFiltersToVerbList() {
    const currentSelectedTenses = getSelectedTenses();
    const activeIrregularityTypes = Array.from(document.querySelectorAll('.verb-type-button.selected:not(:disabled)'))
                                        .map(btn => btn.dataset.value);

    document.querySelectorAll('#verb-buttons .verb-button').forEach(verbButton => {
        const infinitiveEs = verbButton.dataset.value;

        // IGNORAR VERBOS REFLEXIVOS para la selección basada en filtros de irregularidad.
        // Su estado 'selected' se maneja por el botón de grupo 'Reflexive v.' o selección manual.
        if (infinitiveEs.endsWith('se')) {
            // Si deseas que los reflexivos se DESELECCIONEN si 'Reflexive v.' no está activo
            // Y ningún filtro de irregularidad está activo (o el que está activo no los afecta),
            // esa lógica iría aquí o en el manejador del botón de grupo reflexivo.
            // Por ahora, esta función no altera los reflexivos.
            return; 
        }

        // Para verbos NO REFLEXIVOS:
        const verbObj = getVerbObjectByInfinitive(infinitiveEs);
        if (!verbObj) return;

        const typesForThisVerbInSelectedTenses = getIrregularityTypesForVerb(verbObj, currentSelectedTenses);
        let verbShouldBeSelectedByIrregularity = false;

        if (activeIrregularityTypes.length > 0) {

            verbShouldBeSelectedByIrregularity = typesForThisVerbInSelectedTenses.some(verbIrregularityType =>
                activeIrregularityTypes.includes(verbIrregularityType)
            );
        } else {
            verbShouldBeSelectedByIrregularity = false;
        }
        verbButton.classList.toggle('selected', verbShouldBeSelectedByIrregularity);
    });

    updateVerbDropdownCount();
    updateDeselectAllButton();
    updateGroupButtons();
}

  function updateScore() {
    if (selectedGameMode === 'study') return;

    if (scoreDisplay) {
      scoreDisplay.innerHTML =
        `<strong>Score:</strong> ${score}` +
        ` | <strong>Streak:</strong> ${streak}` +
        ` = <strong>×${multiplier.toFixed(1)}</strong>`;
    }

    // --- START: New Fire Streak Animation Logic ---
    updateStreakFire(streak);
    // --- END: New Fire Streak Animation Logic ---

    const streakElement = document.getElementById('streak-display');
    if (streakElement) {
      if (streak >= 2 && streak <= 8) {
        streakElement.classList.add('vibrate');
      } else {
        streakElement.classList.remove('vibrate');
      }
    }
    updateProgressUI();
  }

let usedVerbs = [];  

	/*const pronounButtons = document.querySelectorAll('#pronoun-buttons .pronoun-group-button');
	const selectedPronouns = Array.from(pronounButtons)
	  .filter(btn => btn.classList.contains('selected'))
	  .map(btn => btn.getAttribute('data-pronoun'));
	const pronounsToShow = selectedPronouns.length > 0
	  ? selectedPronouns
	  : pronouns;*/
	configFlowScreen.style.display = 'flex'; // Mostrar la nueva pantalla


        function handleInitialStart() {
                playFromStart(soundElectricShock);
                if (initialStartButton) {
                        initialStartButton.classList.add('electric-effect');
                        setTimeout(() => initialStartButton.classList.remove('electric-effect'), 1000);
                }
                navigateToStep('mode');
        }
        const splashButtons = [initialStartButton, settingsButton, hallOfFameBtn].filter(Boolean);
        let currentSplashIndex = 0;
        function focusSplashButton(i) {
                if (!splashButtons[i]) return;
                splashButtons.forEach(btn => btn.classList.remove('selected'));
                const btn = splashButtons[i];
                btn.classList.add('selected');
                btn.focus();
                currentSplashIndex = i;
        }
        function handleSplashNavigation(e) {
                if (currentConfigStep !== 'splash') return;
                if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        focusSplashButton((currentSplashIndex + 1) % splashButtons.length);
                } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        focusSplashButton((currentSplashIndex - 1 + splashButtons.length) % splashButtons.length);
                } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                        e.preventDefault();
                        splashButtons[currentSplashIndex].click();
                }
        }
        document.addEventListener('keydown', handleSplashNavigation);
        initialStartButton.addEventListener('click', handleInitialStart);


        // Inicializar botones de modo y dificultad
        initStepButtons(gameModesContainer, 'mode');
        initStepButtons(difficultyButtonsContainer, 'difficulty');
        initConfirmButtonNavigation(confirmModeButton, gameModesContainer);
        initConfirmButtonNavigation(confirmDifficultyButton, difficultyButtonsContainer);

	navigateToStep('splash'); // Empezar en el splash screen  
function prepareNextQuestion() {
  if (game.gameState === 'BOSS_BATTLE') return;
  const feedback = document.getElementById('feedback-message');
  // feedback.innerHTML = '';
  feedback.classList.remove('vibrate');
  const oldNote = document.getElementById('prize-note');
  if (oldNote) oldNote.remove();
  if (!allVerbData || allVerbData.length === 0) {
    console.error("No valid verb data.");
    feedback.textContent = "Error: Could not load verb data.";
    return;
  }

  const unusedVerbs = allVerbData.filter(v => !usedVerbs.includes(v.infinitive_es));
  if (unusedVerbs.length === 0) usedVerbs = [];
  const sourceArray = unusedVerbs.length > 0 ? unusedVerbs : allVerbData;

     const v = sourceArray[Math.floor(Math.random() * sourceArray.length)];
     if (!v || !v.conjugations || !v.infinitive_en) {
       console.error("Selected verb is invalid:", v);
       setTimeout(prepareNextQuestion, 50);
       return;
     }

     if (!usedVerbs.includes(v.infinitive_es)){
          usedVerbs.push(v.infinitive_es);
     }
     
   // ←──— INSERCIÓN A partir de aquí ───—
   // Paso 1: lee los botones de pronombre activos
   const selectedBtns = Array
     .from(document.querySelectorAll('.pronoun-group-button'))
     .filter(btn => btn.classList.contains('selected'));
 
   // aplana sus valores JSON en un solo array
   const allowedPronouns = selectedBtns.flatMap(btn =>
     JSON.parse(btn.dataset.values)
   );
 
   // Paso 2: construye pronList con fallback a la lista global
   const pronList = allowedPronouns.length > 0
     ? allowedPronouns
    : pronouns;   // ['yo','tú','vos','él','nosotros','vosotros','ellos']
 
   // Paso 3: elige el pronombre interno de pronList
   const originalPronoun = pronList[
     Math.floor(Math.random() * pronList.length)
   ];
	  const displayPronoun = (function() {
		const map = {
		  él:       ['él','ella','usted'],
		  nosotros: ['nosotros','nosotras'],
		  ellos:    ['ellos','ellas','ustedes']
		};
		const arr = map[originalPronoun] || [originalPronoun];
		return arr[Math.floor(Math.random() * arr.length)];
	  })();
  const tKey = currentOptions.tenses[Math.floor(Math.random() * currentOptions.tenses.length)];
  const tenseObj = tenses.find(t => t.value === tKey);
  const tenseLabel = tenseObj ? tenseObj.name : tKey;

  const forms = v.conjugations[tKey];
  if (!forms) {
    console.error(`Missing conjugations for ${v.infinitive_es} in ${tKey}`);
    setTimeout(prepareNextQuestion, 50);
    return;
  }
  const correctES = forms[originalPronoun];
  if (!correctES) {
    console.error(`Missing ${originalPronoun} form for ${v.infinitive_es} in ${tKey}`);
    setTimeout(prepareNextQuestion, 50);
    return;
  }

  const rawEN = v.infinitive_en.toLowerCase();                   // p.ej. "to remember / to recall"
  const expectedEN = rawEN
    .split(/\s*\/\s*/)                                           // ["to remember", "to recall"]
    .map(s => s.replace(/^to\s+/, '').trim());                  // ["remember","recall"]

  currentQuestion = {
    verb: v,
    pronoun: originalPronoun,
    displayPronoun,
    answer: correctES,
    expectedEN,                                                  // ahora es array
    tenseKey: tKey,
    hintLevel: 0
  };
  startTime = Date.now();
  questionStartTime = Date.now();
  totalQuestions++;
  ansES.value = '';
  ansEN.value = '';
  updateClueButtonUI();
    isPrizeVerbActive = false; // Reset por defecto
        qPrompt.classList.remove('prize-verb-active'); // Quitar estilo especial

	if (selectedGameMode === 'lives' && (currentOptions.mode === 'productive_easy' || currentOptions.mode === 'productive')) {
	  let prizeChance = 0;
	  if (currentOptions.mode === 'productive_easy') { // Conjugate
		prizeChance = 1/30;
	  } else if (currentOptions.mode === 'productive') { // Produce
		prizeChance = 1/20;
	  }

	  const isVerbReflexive = currentQuestion.verb.infinitive_es.endsWith('se');
	  const typesForCurrentTense = currentQuestion.verb.types[currentQuestion.tenseKey] || [];
	  const isVerbIrregular = typesForCurrentTense.some(type => type !== 'regular') || typesForCurrentTense.length === 0; // Asume que si no tiene 'regular', es irregular.

	  if (Math.random() < prizeChance && (isVerbIrregular || isVerbReflexive)) {
		isPrizeVerbActive = true;
		// Aplicar estilo visual especial (ver punto 🧩3)
		qPrompt.classList.add('prize-verb-active'); // Añadir clase para CSS
		 const prizeNote = document.createElement('div');
		 prizeNote.id = 'prize-note';
		 prizeNote.textContent = '🎁Lucky life if you conjugate this one correctly🎁!';
		 qPrompt.parentNode.insertBefore(prizeNote, qPrompt.nextSibling);
		// TODO: Modificar promptText para indicar que es premio
	  }
	}

  const tenseBadge =
    `<span class="tense-badge ${tKey}" data-info-key="${tenseObj.infoKey}">${tenseLabel}<span class="context-info-icon" data-info-key="${tenseObj.infoKey}"></span></span>`;

  let promptText;
  if (currentOptions.mode === 'productive') {
    promptText = `${tenseBadge}: "${v.infinitive_en}" – ` +
                 `<span class="pronoun" id="${displayPronoun}">${displayPronoun}</span>`;
    qPrompt.innerHTML = promptText;
    esContainer.style.display = 'block';
    enContainer.style.display = 'none';
    ansES.focus();
  } else if (currentOptions.mode === 'productive_easy') {
    promptText = `${tenseBadge}: "${v.infinitive_es}" – ` +
                 `<span class="pronoun" id="${displayPronoun}">${displayPronoun}</span>`;
    qPrompt.innerHTML = promptText;
    esContainer.style.display = 'block';
    enContainer.style.display = 'none';
    ansES.focus();
  } else {
    // sólo la forma en español, p.ej. “come”
    promptText = `${tenseBadge}: "${currentQuestion.answer}"`;
    qPrompt.innerHTML = promptText;
    esContainer.style.display = 'none';
    enContainer.style.display = 'block';
    ansEN.focus();
  }

  const promptBadge = qPrompt.querySelector('.tense-badge');
  const promptIcon = qPrompt.querySelector('.context-info-icon');
  if (promptBadge && promptBadge.dataset.infoKey) {
    promptBadge.addEventListener('click', () => {
      if (typeof soundClick !== 'undefined') safePlay(soundClick);
      openSpecificModal(promptBadge.dataset.infoKey);
    });
  }
  if (promptIcon && promptIcon.dataset.infoKey) {
    promptIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof soundClick !== 'undefined') safePlay(soundClick);
      openSpecificModal(promptIcon.dataset.infoKey);
    });
  }
}

// Función para configurar video de boss
function configureBossVideo(bossImage, videoSrc) {
  // Cambiar el elemento img a video si es necesario
  if (bossImage.tagName.toLowerCase() === 'img') {
    const video = document.createElement('video');
    video.id = bossImage.id;
    video.className = bossImage.className;
    video.style.cssText = bossImage.style.cssText;
    video.autoplay = true;
    video.loop = true;
    video.muted = true; // Importante para autoplay
    video.playsInline = true; // Para dispositivos móviles

    bossImage.parentNode.replaceChild(video, bossImage);
    return video;
  }
  return bossImage;
}

function startBossBattle() {
  if (selectedGameMode === 'study') return;
  bossesEncounteredTotal++;
  currentBossNumber++;
  document.body.classList.add('boss-battle-bg');
  if (gameContainer) gameContainer.classList.add('boss-battle-bg');

  let bossKeys = Object.keys(bosses);
  if (bossKeys.length > 1 && game.lastBossUsed) {
    bossKeys = bossKeys.filter(key => key !== game.lastBossUsed);
  }
  const selectedBossKey = bossKeys[Math.floor(Math.random() * bossKeys.length)];
  const currentBoss = bosses[selectedBossKey];
  game.lastBossUsed = selectedBossKey;

  // Play boss-specific start sound
  if (selectedBossKey === 'verbRepairer') {
    safePlay(bossDigitalCorrupted);
  } else if (selectedBossKey === 'skynetGlitch') {
    safePlay(bossSkynetGlitch);
  } else if (selectedBossKey === 'nuclearBomb') {
    safePlay(bossNuclearCountdown);
  } else if (selectedBossKey === 'mirrorT1000') {
    safePlay(bossT1000Mirror);
  }

  // Determine multiplier based on how many boss cycles the player has completed
  const cycleIndex = Math.floor((currentBossNumber - 1) / 4);
  const cycleMultiplier = Math.pow(2, cycleIndex);
  currentBoss.reappearanceMultiplier = cycleMultiplier;

  if (bossImage) {
    if (selectedBossKey === 'verbRepairer') {
      // Asegurar que es una imagen para Boss 1
      if (bossImage.tagName.toLowerCase() === 'video') {
        const img = document.createElement('img');
        img.id = bossImage.id;
        img.className = bossImage.className;
        img.style.cssText = bossImage.style.cssText;
        bossImage.parentNode.replaceChild(img, bossImage);
        bossImage = img;
      }
      bossImage.src = 'images/bosshack.webp';
    } else if (selectedBossKey === 'skynetGlitch') {
      // Configurar como video para Boss 2
      bossImage = configureBossVideo(bossImage, 'images/bosssg.webm');
      bossImage.src = 'images/bosssg.webm';
      safePlay(bossImage); // Iniciar reproducción
    } else if (selectedBossKey === 'nuclearBomb') {
      // Skip assigning src so the nuclear boss image remains hidden
    } else if (selectedBossKey === 'mirrorT1000') {
      // Asegurar que es una imagen para Boss 3
      if (bossImage.tagName.toLowerCase() === 'video') {
        const img = document.createElement('img');
        img.id = bossImage.id;
        img.className = bossImage.className;
        img.style.cssText = bossImage.style.cssText;
        bossImage.parentNode.replaceChild(img, bossImage);
        bossImage = img;
      }
      bossImage.src = 'images/bosst-1000.webp';
    }
  }

  // Apply special styling for T-1000 Mirror Boss
  if (selectedBossKey === 'mirrorT1000') {
    document.body.classList.remove('boss-battle-bg');
    document.body.classList.add('boss-battle-bg', 't1000-mode');
    document.getElementById('game-screen').classList.add('t1000-active');
  }

  if (chuacheImage) {
    chuacheImage.classList.add('fade-out');
    setTimeout(() => {
      chuacheImage.classList.add('hidden');
      if (bossImage && selectedBossKey !== 'nuclearBomb') bossImage.classList.remove('hidden');
    }, 500);
  }

  if (qPrompt) qPrompt.textContent = 'Initializing Boss Battle...';
  const tenseEl = document.getElementById('tense-label');
  if (tenseEl) tenseEl.textContent = currentBoss.description;
  if (ansES) {
    ansES.disabled = false;
    setTimeout(() => ansES.focus(), 0);
  }
  if (ansEN) ansEN.disabled = true;

  currentBoss.init();

  if (game.boss) {
    game.boss.reappearanceMultiplier = cycleMultiplier;
  }

  if (progressContainer && game.boss) {
    const bossTypeNumber =
      selectedBossKey === 'verbRepairer' ? 1 :
      selectedBossKey === 'skynetGlitch' ? 2 :
      selectedBossKey === 'nuclearBomb' ? 3 :
      selectedBossKey === 'mirrorT1000' ? 4 : 1;

    progressContainer.textContent =
      `Level Boss #${currentBossNumber} - ${bossTypeNumber}/4 (0/${game.boss.totalVerbsNeeded}) | Total Score: ${score}`;
    progressContainer.style.color = '#FF0000';
  }

  if (checkAnswerButton) checkAnswerButton.disabled = false;
  if (skipButton) skipButton.disabled = true;
  if (clueButton) {
    if (selectedBossKey === 'skynetGlitch' || selectedBossKey === 'nuclearBomb') {
      clueButton.disabled = false;
      updateClueButtonUI();
    } else {
      clueButton.disabled = true;
      clueButton.textContent = 'No Hints.';
    }
  }
}

function checkAnswer() {
  // --- Boss Battle Logic ---
  if (game.gameState === 'BOSS_BATTLE') {
    // Ensure boss state and challenges exist
    if (!game.boss || !Array.isArray(game.boss.challengeVerbs)) {
      console.error('Boss state is missing.');
      if (ansES) ansES.value = '';
      console.log(`Stats: ${totalCorrect}/${totalQuestions} correct, ${totalIncorrect} incorrect`);
      return;
    }

    const index = game.boss.verbsCompleted;
    const currentChallenge = game.boss.challengeVerbs[index];

    if (!currentChallenge || typeof currentChallenge.correctAnswer !== 'string') {
      console.error('Invalid boss challenge at index', index);
      if (ansES) ansES.value = '';
      return;
    }

    // SPECIAL HANDLING FOR T-1000 MIRROR BOSS
    if (game.boss.id === 'mirrorT1000') {
      const isCorrect = validateT1000Answer(ansES.value, currentChallenge);
      
      if (isCorrect) {
        totalCorrect++;
        game.boss.verbsCompleted++;
        const basePoints = 75;
        const pointsEarned = basePoints * (game.boss.reappearanceMultiplier || 1);
        game.score += pointsEarned; // Higher reward for difficulty
        score = game.score;
        updateScore();
        
        if (progressContainer) {
          progressContainer.textContent = `Level Boss #${currentBossNumber} - T-1000 (${game.boss.verbsCompleted}/${game.boss.totalVerbsNeeded}) | Total Score: ${score}`;
        }
        
        let feedbackText = '';
        if (currentOptions.mode === 'receptive') {
          const englishTranslations = getEnglishTranslation(currentChallenge, currentChallenge.tense, currentChallenge.pronoun);
          const originalEnglish = englishTranslations[0] || 'translation';
          const reversedEnglish = originalEnglish.split('').reverse().join('');
          feedbackText = `✅ Mirror shattered! "${originalEnglish}" → "${reversedEnglish}" (+${pointsEarned} points)`;
        } else {
          feedbackText = `✅ Perfect reflection! "${currentChallenge.correctAnswer}" → "${currentChallenge.reversedAnswer}" (+${pointsEarned} points)`;
        }
        
        if (feedback) feedback.textContent = feedbackText;
        safePlay(soundCorrect);

        if (game.boss.verbsCompleted >= game.boss.totalVerbsNeeded) {
          endBossBattle(true);
        } else {
          setTimeout(displayNextT1000Verb, 1500);
        }
      } else {
        // Handle wrong answer for T-1000
        totalIncorrect++;
        game.score = Math.max(0, game.score - 20);
        score = game.score;
        updateScore();
        
        if (selectedGameMode === 'timer') {
          const penalty = calculateTimePenalty(currentLevel);
          timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
          checkTickingSound();
          showTimeChange(-penalty);
        } else if (selectedGameMode === 'lives') {
          const penalty = 1 + currentLevel;
          remainingLives -= penalty;
          currentStreakForLife = 0;
          updateTotalCorrectForLifeDisplay();
          updateStreakForLifeDisplay();
          updateGameTitle();
          if (remainingLives <= 0) {
            safePlay(soundGameOver);
            chuacheSpeaks('gameover');
            if (gameTitle) gameTitle.textContent = '💀 ¡Estás MUERTO!';
            endBossBattle(false);
            console.log(`Stats: ${totalCorrect}/${totalQuestions} correct, ${totalIncorrect} incorrect`);
            return;
          }
        }

        streak = 0;
        multiplier = 1.0;
        
        let correctAnswerText = '';
        if (currentOptions.mode === 'receptive') {
          const englishTranslations = getEnglishTranslation(currentChallenge, currentChallenge.tense, currentChallenge.pronoun);
          const originalEnglish = englishTranslations[0] || 'translation';
          const reversedEnglish = originalEnglish.split('').reverse().join('');
          correctAnswerText = `❌ The correct mirror was: "${originalEnglish}" → "${reversedEnglish}"`;
        } else {
          correctAnswerText = `❌ The correct mirror was: "${currentChallenge.correctAnswer}" → "${currentChallenge.reversedAnswer}"`;
        }
        
        if (feedback) feedback.textContent = correctAnswerText;
        safePlay(soundWrong);

        if (gameContainer) {
          gameContainer.classList.add('shake');
          setTimeout(() => gameContainer.classList.remove('shake'), 500);
        }

        setTimeout(displayNextT1000Verb, 2000);
      }

      if (ansES) ansES.value = '';
      return;
    }

    // EXISTING LOGIC FOR OTHER BOSSES
    const rawUserInput = ansES.value;
    const rawCorrectAnswer = currentChallenge.correctAnswer;

    let userInput = rawUserInput.trim().toLowerCase();
    let correctAnswer = rawCorrectAnswer.trim().toLowerCase();

    if (currentOptions.ignoreAccents) {
      userInput = removeAccents(userInput);
      correctAnswer = removeAccents(correctAnswer);
    }

    const challengeDisplay =
      game.boss.id === 'verbRepairer'
        ? currentChallenge.glitchedForm
        : game.boss.id === 'skynetGlitch'
          ? `${currentChallenge.pronoun} - ${currentChallenge.glitchedConjugation} (${currentChallenge.tense})`
          : `${currentChallenge.infinitive} - ${currentChallenge.pronoun} (${currentChallenge.tense})`;

    if (userInput === correctAnswer) {
      totalCorrect++;
      game.boss.verbsCompleted++;
      const basePoints = 50;
      const pointsEarned = basePoints * (game.boss.reappearanceMultiplier || 1);
      game.score += pointsEarned;
      score = game.score; // keep legacy score in sync
      updateScore();
      if (progressContainer) {
        let bossTypeNumber;
        if (game.boss.id === 'verbRepairer') bossTypeNumber = 1;
        else if (game.boss.id === 'skynetGlitch') bossTypeNumber = 2;
        else if (game.boss.id === 'nuclearBomb') bossTypeNumber = 3;

        const currentBossNumber = currentLevel + 1;
        const currentBoss = bosses[game.boss.id];
        progressContainer.textContent = `Level Boss #${currentBossNumber} - ${bossTypeNumber}/3 (${game.boss.verbsCompleted}/${currentBoss.verbsToComplete}) | Total Score: ${score}`;

      }
      if (feedback)
        feedback.textContent = `✅ Correct! "${challengeDisplay}" → "${rawCorrectAnswer}" (+${pointsEarned} points)`;

      safePlay(soundCorrect);

      if (game.boss.verbsCompleted >= bosses[game.boss.id].verbsToComplete) {
        // SPECIAL handling for nuclear bomb:
        if (game.boss.id === 'nuclearBomb') {
          defuseNuclearBomb();
        } else {
          endBossBattle(true);
        }
      } else {
        displayNextBossVerb();
      }
    } else {
      totalIncorrect++;
      game.score = Math.max(0, game.score - 20);
      score = game.score; // keep legacy score in sync
      updateScore();
      if (selectedGameMode === 'timer') {
        const penalty = calculateTimePenalty(currentLevel);
        timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
        checkTickingSound();
        showTimeChange(-penalty);
      } else if (selectedGameMode === 'lives') {
        const penalty = 1 + currentLevel;
        remainingLives -= penalty;
        currentStreakForLife = 0;
        isPrizeVerbActive = false;
        updateTotalCorrectForLifeDisplay();
        updateStreakForLifeDisplay();
        updateGameTitle();
        if (remainingLives <= 0) {
          safePlay(soundGameOver);
          chuacheSpeaks('gameover');
          if (gameTitle) gameTitle.textContent = '💀 ¡Estás MUERTO!';
          if (checkAnswerButton) checkAnswerButton.disabled = true;
          if (clueButton) clueButton.disabled = true;
          if (skipButton) skipButton.disabled = true;
          if (ansEN) ansEN.disabled = true;
          if (ansES) ansES.disabled = true;
          endBossBattle(false);
          if (name) {
            const recordData = {
              name: name,
              score: score,
              mode: selectedGameMode,
              streak: bestStreak,
              level: (selectedGameMode === 'timer' || selectedGameMode === 'lives') ? currentLevel + 1 : null
            };
            (async () => {
              try {
                const { error } = await supabase.from('records').insert([recordData]);
                if (error) throw error;
                renderSetupRecords();
              } catch (error) {
                console.error("Error saving record:", error.message);
              } finally {
                fadeOutToMenu(quitToSettings);
              }
            })();
          }
          if (ansES) ansES.value = '';
          return;
        }
      }

      streak = 0;
      multiplier = 1.0;
      if (feedback) {
        const msg = game.boss.id === 'verbRepairer'
          ? `❌ Incorrect. Try to repair: "${challengeDisplay}"`
          : `❌ Incorrect. "${challengeDisplay}"`;
        feedback.textContent = msg;
      }

      safePlay(soundWrong);

      if (gameContainer) {
        gameContainer.classList.add('shake');
        setTimeout(() => gameContainer.classList.remove('shake'), 500);
      }

      // Replay the same challenge
      displayNextBossVerb();
    }

    if (ansES) ansES.value = '';
    console.log(`Stats: ${totalCorrect}/${totalQuestions} correct, ${totalIncorrect} incorrect`);
    return;
  }

  // [EL RESTO DE TU CÓDIGO PERMANECE IGUAL...]
  // feedback.innerHTML is NO LONGER cleared here.
  const isStudyMode = (selectedGameMode === 'study');
  let possibleCorrectAnswers = [];
  const rt    = (Date.now() - startTime) / 1000;
  const bonus = Math.max(1, 2 - Math.max(0, rt - 5) * 0.1);
  const irregularities = currentQuestion.verb.types[currentQuestion.tenseKey] || [];
  let correct  = false;
  let accentBonus = 0;
  const rawAnswerES = ansES.value.trim();
  let irregularBonus = 0;
  let reflexiveBonus  = 0;
  if (irregularities.length > 0 && !irregularities.includes('regular')) {
    irregularBonus = 10 * irregularities.length;  // 5 puntos por cada tipo de irregularidad
  }
  
  const isReflexive = currentQuestion.verb.infinitive_es.endsWith('se');
  if (isReflexive && toggleReflexiveBtn && toggleReflexiveBtn.classList.contains('selected')) {
  reflexiveBonus = 10;
  }

  if (currentOptions.mode === 'productive' || currentOptions.mode === 'productive_easy') {
    let ans = ansES.value.trim().toLowerCase();
    let cor = currentQuestion.answer.toLowerCase();
    if (currentOptions.ignoreAccents) {
      ans = removeAccents(ans);
      cor = removeAccents(cor);
    }
    correct = ans === cor;

    if (correct && !currentOptions.ignoreAccents) {
      if (/[áéíóúÁÉÍÓÚ]/.test(currentQuestion.answer)) {
        accentBonus = 8; 
      }
    }
  } else {
    const ans = ansEN.value.trim().toLowerCase();
    const tense = currentQuestion.tenseKey;        // p.ej. 'present'
    const spanishForm = currentQuestion.answer;    
    const verbData = currentQuestion.verb;


    const allForms = verbData.conjugations[tense];
    if (!allForms) {
        console.error(`Modo Receptivo: Faltan conjugaciones para ${verbData.infinitive_es} en ${tense}`);
        timerTimeLeft = Math.max(0, timerTimeLeft - 3);
        checkTickingSound();
        feedback.innerHTML = "Error: Datos del verbo incompletos para esta pregunta.";
        return;
    }
    // Paso 3A: quedarnos solo con los pronombres que estén activos (window.pronouns)
    const spPronouns = Object
      .entries(allForms)
      .filter(([p, form]) =>
        pronouns.includes(p) && form === spanishForm
      )
      .map(([p]) => p);         
const pronounGroupMap = {
  yo:       ['I'],
  tú:       ['you'],
  él:       ['he','she','you'],
  ella:     ['he','she','you'],
  usted:    ['you'],      
  nosotros: ['we'],
  nosotras: ['we'],

  vosotros: ['you all'],
  vosotras: ['you all'],
  ellos:    ['they','you all'],
  ellas:    ['they','you all'],
  ustedes:  ['you all']
};

    const engProns = Array.from(new Set(
        spPronouns.flatMap(sp => pronounGroupMap[sp] || [])
    ));

    if (engProns.length === 0 && spPronouns.length > 0) {
        if (ans !== '') { 
            timerTimeLeft = Math.max(0, timerTimeLeft - 3);
            checkTickingSound();
            playFromStart(soundElectricShock);
                        feedback.innerHTML = `❌ Pista: el infinitivo es <strong>${verbData.infinitive_en}</strong>.`;
            currentQuestion.hintLevel = 1;
            ansEN.value = '';
            ansEN.focus();
        }
        return;
    } else if (engProns.length === 0 && spPronouns.length === 0) {
       console.error(`Modo Receptivo: No se encontraron pronombres en español para la forma '${spanishForm}' del verbo '${verbData.infinitive_es}'.`);
       feedback.innerHTML = `Error: No se pudo procesar la pregunta. La pista es el infinitivo: <strong>${verbData.infinitive_en}</strong>.`;
       playFromStart(soundElectricShock);
       currentQuestion.hintLevel = 1;
       ansEN.value = '';
       ansEN.focus();
       return;
    }

const formsForCurrentTenseEN = verbData.conjugations_en[tense];

if (!formsForCurrentTenseEN) {
console.error(`Receptive Mode: Missing ENGLISH conjugations for ${verbData.infinitive_en} in tense ${tense}`);
feedback.innerHTML = `Error: English conjugation data is missing for the tense '${tense}'.`; // English
return;
}

possibleCorrectAnswers = engProns.flatMap(englishPronoun => {
  // 1) Determinamos la clave para indexar el JSON de EN:
  let formKey;
  if (englishPronoun === 'I') {
formKey = 'I';
  } else if (englishPronoun === 'you all') {
formKey = 'you';
  } else {
formKey = englishPronoun.toLowerCase();
  }

  // 2) Recuperamos la forma conjugada en inglés
  const verbEN = formsForCurrentTenseEN[formKey];
  if (!verbEN) return [];

  const base = verbEN.toLowerCase();

  // 3) Para cada infinitivo (sinónimos) en expectedEN:
  return currentQuestion.expectedEN.flatMap(inf => {
// inf es p.ej. "remember" o "recall" o "be at"
const parts = inf.split(' ');
const suffix = parts.length > 1
  ? ' ' + parts.slice(1).join(' ')
  : '';
// 4) Construir la respuesta según el pronombre
if (englishPronoun === 'I') {
  return [
`I ${base}${suffix}`,
`i ${base}${suffix}`
  ];
}
if (englishPronoun === 'you all') {
  return [`you all ${base}${suffix}`];
}
const pronLower = englishPronoun.toLowerCase();
return [`${pronLower} ${base}${suffix}`];
  });
});

if (possibleCorrectAnswers.length === 0 && engProns.length > 0) {
console.error(`Receptive Mode: Could not form any English answers for ${verbData.infinitive_en} (tense: ${tense}) with English pronouns: ${engProns.join(', ')}. Check conjugations_en in verbos.json.`);
feedback.innerHTML = `Error: No English conjugated forms found for the tense '${tense}'.`; // English
return;
}

correct = possibleCorrectAnswers.includes(ans);
}

  if (correct) {
    totalCorrect++;
    // *** MODIFICATION START ***
    feedback.innerHTML = ''; // Clear feedback area ONLY on correct answer.
    // *** MODIFICATION END ***

    const responseTime = (Date.now() - questionStartTime) / 1000;
    totalResponseTime += responseTime;
    if (responseTime < fastestAnswer) fastestAnswer = responseTime;

    // Manejo del sonido
    if (soundCorrect) {
      soundCorrect.pause();
      soundCorrect.currentTime = 0;
      soundCorrect.play().catch(()=>{/* ignora errores por autoplay */});
    }
    chuacheSpeaks('correct');

    if (selectedGameMode === 'timer' || selectedGameMode === 'lives') {
      correctAnswersTotal++;
      updateLevelAndVisuals();
      updateProgressUI();
    }

    if (isStudyMode) {
      feedback.textContent = 'Correct!';
      setTimeout(prepareNextQuestion, 200);
      return;
    }

    // El resto de la lógica para una respuesta correcta DEBE ESTAR AQUÍ DENTRO
    streak++;
    if (streak > bestStreak) bestStreak = streak;
    multiplier = Math.min(5, multiplier + 0.5);
    
    let basePoints = 10;
    if (currentOptions.mode === 'receptive') {
      basePoints = 5;
    } else if (currentOptions.mode === 'productive') {
      basePoints = 15;
    }
    const tenseBonus = Math.max(0, (currentOptions.tenses?.length || 1) - 1) * 2;
    basePoints += tenseBonus;

    // --- Bonus Points for Pronoun and Verb Quantity ---
    const pronounButtons = Array.from(document.querySelectorAll('.pronoun-group-button.selected'));
    const selectedPronouns = pronounButtons.flatMap(btn => JSON.parse(btn.dataset.values));
    const selectedVerbs   = Array.from(document.querySelectorAll('#verb-buttons .verb-button.selected'));

    const pronounBonusValue = 0.5; // Points per extra pronoun
    const verbBonusValue    = 0.1; // Points per extra verb

    const pronounBonus = (selectedPronouns.length > 1)
      ? (selectedPronouns.length - 1) * pronounBonusValue
      : 0;
    const verbBonus = (selectedVerbs.length > 1)
      ? (selectedVerbs.length - 1) * verbBonusValue
      : 0;
    // ----------------------------------------------------
    multiplier = 1 + 0.1 * streak;

    const pts = Math.round(
      basePoints * multiplier * bonus +
      accentBonus +
      irregularBonus +
      reflexiveBonus +
      pronounBonus +
      verbBonus
    );

    score += pts;
    let feedbackText = `✅<span class="feedback-time">⏱️${rt.toFixed(1)}s ×${bonus.toFixed(1)}</span> + <span class="feedback-streak">${streak} streak x${multiplier.toFixed(1)}</span>`;
    if (accentBonus > 0) {
       feedbackText += ` +${accentBonus} accent bonus!`; 
    }

let timeBonus;
if (streak <= 2)       timeBonus = 5;
else if (streak <= 4)  timeBonus = 6;
else if (streak <= 6)  timeBonus = 7;
else if (streak <= 8)  timeBonus = 8;
else if (streak <= 10) timeBonus = 9;
else                   timeBonus = 10;
        // add time without an upper limit
        timerTimeLeft += timeBonus;
        checkTickingSound();
        showTimeChange(timeBonus);

    updateScore();

    game.verbsInPhaseCount++;
    // TODO: Restore threshold to 9 for production
    if (game.verbsInPhaseCount === 3 && selectedGameMode !== 'study') {
      game.gameState = 'BOSS_BATTLE';
      startBossBattle();
      return;
    }

    setTimeout(prepareNextQuestion, 200);

    const irregularityEmojis = {
      "first_person_irregular": "🧏‍♀️",
      "stem_changing": "🌱",
      "multiple_irregularities": "🎭",
      "y_change": "➰",
      "irregular_root": "🌳",
      "stem_change_3rd_person": "🧍",
      "totally_irregular": "🤯",
      "irregular_participle": "🧩",
      "regular": "✅"
    };
    const irregularityNames = {
      "first_person_irregular": "First person",
      "stem_changing": "Stem change",
      "multiple_irregularities": "Multiple changes",
      "y_change": "Y change",
      "irregular_root": "Irregular root",
      "stem_change_3rd_person": "3rd person stem change",
      "totally_irregular": "Totally irregular",
      "irregular_participle": "Irregular participle",
      "regular": "Regular"
    };
   const irregularityDescriptions = irregularities
     .filter(type => type !== 'regular')
     .map(type => `${irregularityEmojis[type] || ''} ${type.replace(/_/g, ' ')}`)
     .join('<br>');
   
   if (selectedGameMode === 'lives') {
    totalCorrectAnswersForLife++; // Este es el que acumula para esta mecánica específica

    if (totalCorrectAnswersForLife >= correctAnswersToNextLife) {
      remainingLives++;
      // TODO: Llamar a función para animación/sonido de ganar vida
  // refrescar UI de vidas y título ANTES de la animación
      updateTotalCorrectForLifeDisplay();
      updateGameTitle();
      showLifeGainedAnimation(); // Implementar esta función más adelante

      nextLifeIncrement++; // El siguiente incremento es uno más
      correctAnswersToNextLife += nextLifeIncrement; // Nuevo objetivo
    }
    updateTotalCorrectForLifeDisplay(); // Actualizar visualización

    currentStreakForLife++;
    if (currentStreakForLife >= streakGoalForLife) {
      remainingLives++;
  updateGameTitle();
  updateStreakForLifeDisplay();
  updateTotalCorrectForLifeDisplay();
      showLifeGainedAnimation();

      lastStreakGoalAchieved = streakGoalForLife; // Guardar el objetivo que acabamos de alcanzar
      streakGoalForLife += 2; // Siguiente objetivo
      currentStreakForLife = 0;
  updateGameTitle();
      updateStreakForLifeDisplay();
    }
    updateStreakForLifeDisplay();
        
    if (isPrizeVerbActive) {
      remainingLives++;
      // TODO: Llamar a función para animación/sonido de ganar vida (SONIDO ESPECIAL)
      showLifeGainedAnimation(true); // true indica que es por verbo premio para sonido especial

      isPrizeVerbActive = false; // Se consume el premio
      qPrompt.classList.remove('prize-verb-active'); // Quitar estilo
    }
    }

if (irregularBonus > 0) {
       feedbackText += `<br>+${irregularBonus} irregularity bonus!`;
       feedbackText += `<br><small>${irregularityDescriptions}</small>`;
    }

if (reflexiveBonus > 0) {
    feedbackText += `<br>+${reflexiveBonus} 🧩reflexive bonus!`;
    }

        const sign = pts > 0 ? '+' : '';
        feedbackText += `<br><span class="feedback-points">Points: ${sign}${pts}</span>`;
    feedback.innerHTML = feedbackText;
    feedback.classList.add('vibrate'); 

    return;   
  } else {
    // --- INCORRECT ANSWER ---
    totalIncorrect++;
    verbsMissed.push({
      verb: currentQuestion.verb.infinitive_es,
      english: currentQuestion.verb.infinitive_en,
      tense: currentQuestion.tenseKey
    });

    if (isStudyMode) {
      safePlay(soundWrongStudy);
    } else {
      safePlay(soundWrong);
    }
    chuacheSpeaks('wrong');
    streak = 0;
    multiplier = 1.0;

    if (isPrizeVerbActive) {
      isPrizeVerbActive = false;
      qPrompt.classList.remove('prize-verb-active');
    }

    if (selectedGameMode === 'timer') {
      const penalty = calculateTimePenalty(currentLevel);
      timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
      checkTickingSound();
      showTimeChange(-penalty);
    } else {
      timerTimeLeft = Math.max(0, timerTimeLeft - 3);
      checkTickingSound();
      showTimeChange(-3);
    }

    if (selectedGameMode === 'lives') {
        const penalty = 1 + currentLevel;
        remainingLives -= penalty;
        currentStreakForLife = 0;
        isPrizeVerbActive = false;
        updateTotalCorrectForLifeDisplay();
        updateStreakForLifeDisplay();
        currentStreakForLife = 0;
        updateStreakForLifeDisplay();
        updateGameTitle();              
        if (remainingLives <= 0) {
            safePlay(soundGameOver);
            chuacheSpeaks('gameover');
            gameTitle.textContent = '💀 ¡Estás MUERTO!';
            checkAnswerButton.disabled = true;
            clueButton.disabled = true;
            skipButton.disabled  = true;
            ansEN.disabled = true;
            ansES.disabled = true;

            if (name) {
                const recordData = {
                    name: name,
                    score: score,
                    mode: selectedGameMode,
                    streak: bestStreak,
                    level: (selectedGameMode === 'timer' || selectedGameMode === 'lives') ? currentLevel + 1 : null
                };
                (async () => {
                    try {
                        const { error } = await supabase.from('records').insert([recordData]);
                        if (error) throw error;
                        renderSetupRecords();
                    } catch (error) {
                        console.error("Error saving record:", error.message);
                    } finally {
                        fadeOutToMenu(quitToSettings);
                    }
                })();
            }
            console.log(`Stats: ${totalCorrect}/${totalQuestions} correct, ${totalIncorrect} incorrect`);
            return;
        }
    } else {
        updateGameTitle();
    }
    updateScore();

    // *** MODIFICATION START ***
    // Check if a hint is already showing. If not, generate a new one.
const hintIsAlreadyShowing = feedback.innerHTML.includes('💡') || 
                            feedback.innerHTML.includes('❌') || 
                            feedback.innerHTML.includes('hint-btn');

if (!hintIsAlreadyShowing) {
    displayUnifiedClue();
}
    // If hintIsAlreadyShowing is true, this block is skipped, preserving the existing hint.
    // *** MODIFICATION END ***
  }
  console.log(`Stats: ${totalCorrect}/${totalQuestions} correct, ${totalIncorrect} incorrect`);
}
	
function startTimerMode() {
  if (game.boss && game.boss.countdownInterval) {
    clearInterval(game.boss.countdownInterval);
    game.boss.countdownInterval = null;
  }
  totalQuestions = 0;
  totalCorrect = 0;
  totalIncorrect = 0;
  totalResponseTime = 0;
  verbsMissed = [];
  fastestAnswer = Infinity;
  bestStreak = 0;
  bossesEncounteredTotal = 0;
  currentBossNumber = 0;
  document.getElementById('timer-container').style.display = 'flex';
  freeClues = 3;
  updateClueButtonUI();
  resetLevelState();
  updateProgressUI();
  updateBackgroundForLevel(currentLevel + 1);
  timerTimeLeft      = countdownTime;
  soundTicking.pause();
  soundTicking.currentTime = 0;
  tickingSoundPlaying = false;
  totalPlayedSeconds = 0;
  document.getElementById('timer-clock').textContent   = `⏳ ${formatTime(timerTimeLeft)}`;
  document.getElementById('total-time').textContent    = `🏁 ${formatTime(totalPlayedSeconds)}`;
  document.getElementById('time-change').textContent   = '';  // vacío al inicio
  
  feedback.innerHTML = '';
  feedback.classList.remove('vibrate');
  score = 0; streak = 0; multiplier = 1.0;
  updateScore();
  configFlowScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  updateGameTitle();
  safePlay(soundStart);
  fadeOutAudio(menuMusic, 3000);

    setTimeout(() => {
      currentMusic = gameMusic;
      gameMusic.volume = targetVolume;    // reinicia con el volumen definido
      safePlay(gameMusic);

    musicToggle.style.display = 'block';
    volumeSlider.style.display = 'block';
    volumeSlider.value = targetVolume;
    volumeSlider.disabled = false;
  }, 3000);

  prepareNextQuestion();

        countdownTimer = setInterval(() => {
          timerTimeLeft--;
          checkTickingSound();
          totalPlayedSeconds++;
	document.getElementById('timer-clock').textContent  = `⏳ ${formatTime(timerTimeLeft)}`;
	document.getElementById('total-time').textContent   = `🏁 ${formatTime(totalPlayedSeconds)}`;


	  const clk = document.getElementById('timer-clock');
	  if (timerTimeLeft <= 10) {
		clk.style.color = '#ff4c4c';
		clk.style.transform = 'scale(1.1)';
	  } else {
		clk.style.color = 'white';
		clk.style.transform = 'scale(1)';
	  }

  if (timerTimeLeft <= 0) {
          soundTicking.pause();
          soundTicking.currentTime = 0;
          tickingSoundPlaying = false;
          safePlay(soundGameOver);
          chuacheSpeaks('gameover');
      clearInterval(countdownTimer);
  
      setTimeout(() => { showStatsModal(); }, 2000);
    }
  }, 1000);
}

function startLivesMode() {
  if (game.boss && game.boss.countdownInterval) {
    clearInterval(game.boss.countdownInterval);
    game.boss.countdownInterval = null;
  }
  totalQuestions = 0;
  totalCorrect = 0;
  totalIncorrect = 0;
  totalResponseTime = 0;
  verbsMissed = [];
  fastestAnswer = Infinity;
  bestStreak = 0;
  bossesEncounteredTotal = 0;
  currentBossNumber = 0;
  freeClues = 3;
  updateClueButtonUI();
  resetLevelState();
  updateProgressUI();
  updateBackgroundForLevel(currentLevel + 1);
  feedback.innerHTML = '';
  feedback.classList.remove('vibrate');
  score = 0; streak = 0; multiplier = 1.0;
  updateScore();
  configFlowScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  updateGameTitle();
  safePlay(soundStart);
  fadeOutAudio(menuMusic, 1000);
  setTimeout(() => {
    currentMusic = gameMusic;
    gameMusic.volume = targetVolume;
    safePlay(gameMusic);
    musicToggle.style.display = 'block';
    volumeSlider.style.display = 'block';
    volumeSlider.value = targetVolume;
    volumeSlider.disabled = false;
  }, 1000);
  prepareNextQuestion();
}

function updateTotalCorrectForLifeDisplay() {
  const displayElement = document.getElementById('total-correct-for-life-display');
  if (displayElement && selectedGameMode === 'lives') {
    const needed = correctAnswersToNextLife - totalCorrectAnswersForLife;
    displayElement.textContent = `🎯 ${needed} to get 1❤️`;
  } else if (displayElement) {
    displayElement.textContent = ''; // Limpiar si no es modo vidas
  }
}

function skipQuestion() {
  if (game.gameState === 'BOSS_BATTLE') return;
  feedback.innerHTML = '';
        if (soundSkip) {
          soundSkip
                .play()
                .catch(err => console.error('❌ skip sound error:', err));
        } else {
          console.error('❌ soundSkip is undefined');
        }
    chuacheSpeaks('skip');
    streak = 0;
    multiplier = 1.0;
    updateScore();
   // *** CORRECCIÓN: USAR LOS MISMOS PENALTIES QUE UN ERROR ***
  if (selectedGameMode === 'timer') {
    const penalty = calculateTimePenalty(currentLevel);  // ← CAMBIO: usar penalty escalado
    timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
    checkTickingSound();
    showTimeChange(-penalty);
  } else if (selectedGameMode === 'lives') {
    const penalty = 1 + currentLevel;  // ← CAMBIO: usar penalty escalado
    remainingLives -= penalty;
    currentStreakForLife = 0;
    updateStreakForLifeDisplay();
    updateGameTitle();
    updateTotalCorrectForLifeDisplay();

    // Verificar game over
    if (remainingLives <= 0) {
      safePlay(soundGameOver);
      chuacheSpeaks('gameover');
      gameTitle.textContent = '💀¡Estás MUERTO!💀';
      checkAnswerButton.disabled = true;
      clueButton.disabled = true;
      skipButton.disabled = true;
      ansEN.disabled = true;
      ansES.disabled = true;

      if (name) {
        const recordData = {
          name: name,
          score: score,
          mode: selectedGameMode,
          streak: bestStreak,
          level: (selectedGameMode === 'timer' || selectedGameMode === 'lives') ? currentLevel + 1 : null
        };
        (async () => {
          try {
            const { error } = await supabase.from('records').insert([recordData]);
            if (error) throw error;
            renderSetupRecords();
            quitToSettings();
          } catch (error) {
            console.error(error.message);
          }
        })();
      }
      return; // NO llamamos a prepareNextQuestion
    }
  } else {
    // Study mode o otros modos
    timerTimeLeft = Math.max(0, timerTimeLeft - 3);
    checkTickingSound();
    showTimeChange(-3);
  }

    let feedbackMessage;

    if (currentOptions.mode === 'receptive') {
		const tense = currentQuestion.tenseKey;
		const spanishForm = currentQuestion.answer;
		const verbData = currentQuestion.verb;

		const allFormsForTenseES = verbData.conjugations[tense];
		if (!allFormsForTenseES) {
			feedbackMessage = `⏭ Skipped. Error: Spanish verb data incomplete for tense '${tense}'. English Infinitive: <strong>${verbData.infinitive_en}</strong>`;
		} else {
			const spPronounsMatchingForm = Object.keys(allFormsForTenseES)
				.filter(p => allFormsForTenseES[p] === spanishForm);

			const pronounGroupMap = { /* ... your existing pronounGroupMap ... */
				yo: ['I'], tú: ['you'], él: ['he', 'she', 'you'], ella: ['he', 'she', 'you'],
				usted: ['you'], nosotros: ['we'], nosotras: ['we'], vosotros: ['you'],
				vosotras: ['you'], ellos: ['they', 'you'], ellas: ['they', 'you'], ustedes: ['you']
			};

			const engProns = Array.from(new Set(
				spPronounsMatchingForm.flatMap(sp => pronounGroupMap[sp] || [])
			));

			if (engProns.length > 0) {
				const formsForCurrentTenseEN_Skip = verbData.conjugations_en[tense];

				if (!formsForCurrentTenseEN_Skip) {
					feedbackMessage = `⏭ Skipped. Error: Missing ENGLISH conjugations for '${verbData.infinitive_en}' in tense '${tense}'. English Infinitive: <strong>${verbData.infinitive_en}</strong>`;
				} else {
					const expectedAnswersArray = engProns.flatMap(englishPronoun => {
						let formKey = englishPronoun.toLowerCase();
						if (englishPronoun === 'I') {
							formKey = 'I';
						}
						const conjugatedVerbEN = formsForCurrentTenseEN_Skip[formKey];
						if (conjugatedVerbEN) {
							return [`<strong>${englishPronoun.toLowerCase()} ${conjugatedVerbEN.toLowerCase()}</strong>`];
						}
						return [];
					});

					if (expectedAnswersArray.length > 0) {
						feedbackMessage = `⏭ Skipped. The correct answer was: ${expectedAnswersArray.join(' or ')}.`;
					} else {
						feedbackMessage = `⏭ Skipped. The English infinitive is <strong>${verbData.infinitive_en}</strong>. (Could not determine specific English conjugation for '${spanishForm}' in tense '${tense}')`;
					}
				}
			} else {
				feedbackMessage = `⏭ Skipped. The English infinitive is <strong>${verbData.infinitive_en}</strong>. (Could not determine English pronouns for '${spanishForm}')`;
			}
		}
	} else {
    // Original logic for productive modes (should be in English)
		const correctAnswer = currentQuestion.answer;
		feedbackMessage = `⏭ Skipped. The right conjugation was <strong>"${correctAnswer}"</strong>.`;
	}
        if (selectedGameMode === 'lives') {
                // 1) Reset de racha
                currentStreakForLife = 0;
                updateStreakForLifeDisplay();

		// 2) Quitar 1 vida
		remainingLives--;
		updateGameTitle();
		updateTotalCorrectForLifeDisplay();

		// 3) Comprobar GAME OVER
                if (remainingLives <= 0) {
                  safePlay(soundGameOver);
                  chuacheSpeaks('gameover');
                  gameTitle.textContent   = '💀¡Estás MUERTO!💀';
                  checkAnswerButton.disabled    = true;
                  clueButton.disabled     = true;
		  skipButton.disabled     = true;
		  ansEN.disabled          = true;
		  ansES.disabled          = true;

                  if (name) {
                        const recordData = {
                          name: name,
                          score: score,
                          mode: selectedGameMode,
                          streak: bestStreak,
                          level: (selectedGameMode === 'timer' || selectedGameMode === 'lives') ? currentLevel + 1 : null
                        };
                        (async () => {
                          try {
                            const { error } = await supabase.from('records').insert([recordData]);
                            if (error) throw error;
                            renderSetupRecords();
                            quitToSettings();
                          } catch (error) {
                            console.error(error.message);
                          }
                        })();
                  }
                  return;  // NO llamamos a prepareNextQuestion
                }
          }

          feedback.innerHTML = feedbackMessage;
          feedback.classList.remove('vibrate');

          // Si no es game-over, preparamos la siguiente pregunta
          setTimeout(prepareNextQuestion, 1500);
        }

function updateStreakForLifeDisplay() {
  const el = document.getElementById('streak-for-life-display');
  if (!el || selectedGameMode !== 'lives') {
    if (el) el.textContent = '';
    return;
  }

  const remaining = Math.max(streakGoalForLife - currentStreakForLife, 0);
  el.innerHTML = `🔥 <span class="math-inline">${remaining}</span> to get 1❤️`;
}

function quitToSettings() {

  // Timer principal del juego (modo timer)
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  
  // Timers de boss battles (especialmente nuclear bomb)
  if (game.boss && game.boss.countdownInterval) {
    clearInterval(game.boss.countdownInterval);
    game.boss.countdownInterval = null;
  }
  
  // Cualquier otro timer que pueda existir
  if (typeof typeInterval !== 'undefined' && typeInterval) {
    clearInterval(typeInterval);
    typeInterval = null;
  }
  
  // Detener sonido de ticking
  if (soundTicking) {
    soundTicking.pause();
    soundTicking.currentTime = 0;
  }
  tickingSoundPlaying = false;
  
  // Pausar música de juego
  if (gameMusic) {
    gameMusic.pause();
    gameMusic.currentTime = 0;
  }
  

  // Resetear estado de boss battle
  game.boss = null;
  game.gameState = 'PLAYING';
  
  // Resetear variables de juego
  bossesEncounteredTotal = 0;
  currentBossNumber = 0;
  correctAnswersTotal = 0;
  currentLevel = 0;
  
  // Ocultar elementos específicos del juego
  const timerContainer = document.getElementById('timer-container');
  const gameScreen = document.getElementById('game-screen');
  const configFlowScreen = document.getElementById('config-flow-screen');
  
  if (timerContainer) timerContainer.style.display = 'none';
  if (gameScreen) gameScreen.classList.remove('study-mode-active', 't1000-active');
  
  // Detener animaciones de burbujas
  stopBubbles();
  
  // Cambiar a música de menú
  currentMusic = menuMusic;
  if (musicPlaying) {
    menuMusic.volume = targetVolume;
    safePlay(menuMusic);
  }
  
  // Actualizar iconos de música
  if (musicIcon) {
    musicIcon.src = musicPlaying ? 'images/musicon.webp' : 'images/musicoff.webp';
    musicIcon.alt = musicPlaying ? 'Music on' : 'Music off';
  }
  
  // Ocultar controles de música del juego
  const musicToggle = document.getElementById('music-toggle');
  const volumeSlider = document.getElementById('volume-slider');
  if (musicToggle) musicToggle.style.display = 'none';
  if (volumeSlider) {
    volumeSlider.disabled = false;
    volumeSlider.style.display = 'none';
  }
  
  // Resetear fuego de streak
  const streakFireEl = document.getElementById('streak-fire');
  if (streakFireEl) {
    streakFireEl.style.height = '0px';
    streakFireEl.style.opacity = '0';
    streakFireEl.style.setProperty('--fire-rise-height', '-5em');
  }
  
  // Restaurar visibilidad del personaje del header
  const headerChar = document.querySelector('.header-char');
  if (headerChar) {
    headerChar.style.visibility = 'visible';
    headerChar.style.display = '';
  }
  
  // Aplicar configuración de visibilidad de Chuache
  applyChuacheVisibility();
  

  // Limpiar clases del body
  document.body.classList.remove(
    'boss-battle-bg', 
    't1000-mode', 
    'game-active', 
    'iridescent-level',
    'level-up-shake',
    'tooltip-open-no-scroll'
  );
  
  // Limpiar clases de elementos específicos
  if (gameScreen) {
    gameScreen.classList.remove('t1000-active', 'fade-out');
  }
  
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    gameContainer.classList.remove('boss-battle-bg', 'shake', 'level-up-shake');
  }
  

  resetBackgroundColor();
  

  // Resetear variables de modo y dificultad
  selectedMode = null;
  selectedDifficulty = null;
  window.selectedGameMode = null;
  selectedGameMode = null;
  
  // Limpiar selecciones provisionales
  if (gameModesContainer) {
    gameModesContainer.querySelectorAll('.config-flow-button').forEach(btn => {
      btn.classList.remove('confirmed-selection', 'provisional-selection');
      btn.disabled = false;
      btn.style.display = '';
    });
  }
  
  if (difficultyButtonsContainer) {
    difficultyButtonsContainer.querySelectorAll('.config-flow-button').forEach(btn => {
      btn.classList.remove('confirmed-selection', 'provisional-selection');
      btn.disabled = false;
      btn.style.display = '';
    });
  }
  

  // Reinicializar componentes con sus valores por defecto
  if (typeof renderTenseButtons === 'function') {
    renderTenseButtons(); // Selecciona "Present" por defecto
  }
  if (typeof initTenseDropdown === 'function') {
    initTenseDropdown();
  }
  if (typeof renderVerbButtons === 'function') {
    renderVerbButtons(); // Verbos por defecto
  }
  if (typeof initVerbDropdown === 'function') {
    initVerbDropdown();
  }
  if (typeof renderPronounButtons === 'function') {
    renderPronounButtons(); // "vos" desactivado por defecto
  }
  if (typeof initPronounDropdown === 'function') {
    initPronounDropdown();
  }
  if (typeof renderVerbTypeButtons === 'function') {
    renderVerbTypeButtons(); // "regular" seleccionado por defecto
  }
  if (typeof filterVerbTypes === 'function') {
    filterVerbTypes();
  }
  
  // Resetear botones de toggle
  const reflexBtn = document.getElementById('toggle-reflexive');
  if (reflexBtn) {
    reflexBtn.classList.remove('selected');
  }
  
  const ignoreAccentsBtn = document.getElementById('toggle-ignore-accents');
  if (ignoreAccentsBtn) {
    ignoreAccentsBtn.classList.add('selected');
  }
  

  // Ocultar pantalla de juego y mostrar configuración
  if (gameScreen) gameScreen.style.display = 'none';
  if (configFlowScreen) configFlowScreen.style.display = 'flex';
  
  // Navegar al paso inicial del flujo
  if (typeof navigateToStep === 'function') {
    navigateToStep('splash');
  }
  
  // Reproducir animación del header
  if (typeof playHeaderIntro === 'function') {
    playHeaderIntro();
  }
  
  // Verificar estado del botón de inicio final
  if (typeof checkFinalStartButtonState === 'function') {
    checkFinalStartButtonState();
  }
  

  // Cerrar cualquier modal o tooltip abierto
  const modals = document.querySelectorAll('.specific-modal, .hof-overlay');
  const backdrops = document.querySelectorAll('.specific-modal-backdrop');
  
  modals.forEach(modal => {
    if (modal) modal.style.display = 'none';
  });
  
  backdrops.forEach(backdrop => {
    if (backdrop) backdrop.style.display = 'none';
  });
  
  // Cerrar tooltips
  const tooltip = document.getElementById('tooltip');
  if (tooltip) tooltip.style.display = 'none';
  

  // Actualizar records en la pantalla de splash
  if (typeof displaySplashRecords === 'function') {
    displaySplashRecords();
  }
}
function fadeOutToMenu(callback) {
  const screen = document.getElementById('game-screen');
  if (!screen) { callback(); return; }
  screen.classList.add('fade-out');
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    clearTimeout(fallback);
    screen.classList.remove('fade-out');
    screen.removeEventListener('transitionend', onEnd);
    callback();
  };
  const onEnd = e => {
    if (e.target === screen) cleanup();
  };
  screen.addEventListener('transitionend', onEnd);
  const fallback = setTimeout(cleanup, 700);
}
    remainingLives = 5;


finalStartGameButton.addEventListener('click', async () => {
    // Ensure Hall of Fame tooltip is closed when starting a game
    closeHallOfFame();
    closeSalon();
    const selTenses = Array.from(
        document.querySelectorAll('#tense-buttons .tense-button.selected')
    ).map(btn => btn.dataset.value);

    // Validar que haya selecciones mínimas
    if (!selectedMode || !selectedDifficulty) {
        alert('Please complete mode and difficulty selection.');
        return;
    }
    if (selTenses.length === 0) {
        alert('Please select at least one tense.');
        return;
    }
     // Validar tipos de verbos si no hay selección manual de verbos
    const manuallySelectedVerbsCount = document.querySelectorAll('#verb-buttons .verb-button.selected').length;
    const selectedVerbTypesCount = document.querySelectorAll('.verb-type-button.selected:not(:disabled)').length;

    if (manuallySelectedVerbsCount === 0 && selectedVerbTypesCount === 0) {
        alert('Please select at least one verb type if no specific verbs are chosen.');
        return;
    }

    // Sincronizar el modo global por si acaso
    selectedGameMode = window.selectedGameMode || selectedMode;

    if (window.defaultVosEnabled) {
        const vosBtn = Array.from(document.querySelectorAll('#pronoun-buttons .pronoun-group-button'))
                          .find(b => JSON.parse(b.dataset.values).includes('vos'));
        if (vosBtn && !vosBtn.classList.contains('selected')) {
            vosBtn.classList.add('selected');
            updatePronounDropdownCount();
            updateSelectAllPronounsButtonText();
            updateCurrentPronouns();
        }
    }

    playFromStart(soundElectricShock);
    finalStartGameButton.classList.add('glitch-effect');
    setTimeout(() => finalStartGameButton.classList.remove('glitch-effect'), 1000);

    currentOptions = {
        mode: selectedDifficulty, // Este es el modo de juego (receptive, productive_easy, productive)
        tenses: selTenses,
        ignoreAccents: toggleIgnoreAccentsBtn && toggleIgnoreAccentsBtn.classList.contains('selected')
    };
    resetBackgroundColor();
    updateBackgroundForLevel(1);
    // selectedGameMode ya debería estar seteado por el `selectedMode` de este nuevo flujo
    // Asegúrate de que `selectedGameMode` (variable global) se actualice con `selectedMode`
    // cuando se confirma el modo. Ej: selectedGameMode = selectedMode;

    if (!await loadVerbs()) return; // loadVerbs necesita usar los filtros correctos

    // Ocultar pantalla de configuración de flujo y mostrar pantalla de juego
    configFlowScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    gameScreen.classList.remove('study-mode-active');
    if (selectedGameMode === 'study') {
        gameScreen.classList.add('study-mode-active');
    }
    if (window.chuacheReactionsEnabled) {
        ensureChuachePosition();
        animateChuacheToGame();
    }
    if (window.innerWidth > 1200) startBubbles();
    // El resto de tu lógica de inicio de juego (setupScreen.style.display = 'none'; gameScreen.style.display = 'block'; etc.)
    // ...
    feedback.innerHTML = '';
    feedback.classList.remove('vibrate');
    score = 0; streak = 0; multiplier = 1.0; bestStreak = 0; // Resetear bestStreak también
    updateScore();
    // updateGameTitle(); // Ya debería tener selectedDifficulty y selTenses

    const livesMechanicsDisplay = document.getElementById('lives-mechanics-display');
    if (window.selectedGameMode === 'lives') { // Usar window.selectedGameMode que se actualizó
        livesMechanicsDisplay.style.display = 'block';
        remainingLives = 5;
        totalCorrectAnswersForLife = 0;
        currentStreakForLife = 0;
        nextLifeIncrement = 10; // O tu valor inicial
        correctAnswersToNextLife = 10; // O tu valor inicial
        streakGoalForLife = 5; // O tu valor inicial
        lastStreakGoalAchieved = 0;
        updateTotalCorrectForLifeDisplay();
        updateStreakForLifeDisplay();
    } else {
        livesMechanicsDisplay.style.display = 'none';
    }
    updateGameTitle(); // Actualiza el título con todo

    if (window.selectedGameMode === 'timer') {
        startTimerMode();
    } else if (window.selectedGameMode === 'lives') {
        startLivesMode();
    } else {
        bossesEncounteredTotal = 0;
        currentBossNumber = 0;
        freeClues = 0;
        updateClueButtonUI();
        safePlay(soundStart);
        fadeOutAudio(menuMusic, 1000);
        setTimeout(() => {
            if (currentMusic !== gameMusic) {
                currentMusic = gameMusic;
            }
            if (selectedGameMode !== 'study' && gameMusic.paused && musicPlaying) {
                gameMusic.volume = targetVolume;
                safePlay(gameMusic);
            } else {
                gameMusic.pause();
                if (musicIcon) {
                    musicIcon.src = 'images/musicoff.webp';
                    musicIcon.alt = 'Music off';
                }
            }
            musicToggle.style.display = 'block';
            volumeSlider.style.display = 'block';
            volumeSlider.value = targetVolume;
            volumeSlider.disabled = gameMusic.paused;
        }, 1000);
        prepareNextQuestion();
    }
}); 

function checkFinalStartButtonState() {
    const selTenses = document.querySelectorAll('#tense-buttons .tense-button.selected').length;
    const manuallySelectedVerbs = document.querySelectorAll('#verb-buttons .verb-button.selected').length;
    const selectedVerbTypes = document.querySelectorAll('.verb-type-button.selected:not(:disabled)').length;
    let 조건 = false;

    if (manuallySelectedVerbs > 0) { 
        조건 = selTenses > 0;
    } else { 
        조건 = selTenses > 0 && selectedVerbTypes > 0;
    }

    finalStartGameButton.disabled = !조건;
    if (!조건 && finalStartGameButton.title !== "Please select tenses and verb types/specific verbs.") {
        finalStartGameButton.title = "Please select tenses and verb types/specific verbs.";
    } else if (조건) {
        finalStartGameButton.title = "";
    }
}

function updateScorePreview() {
    if (!scorePreviewValue) return;

    let basePoints = 10;
    if (selectedDifficulty === 'receptive') {
        basePoints = 5;
    } else if (selectedDifficulty === 'productive') {
        basePoints = 15;
    }

    const selectedTensesCount = document.querySelectorAll('#tense-buttons .tense-button.selected').length;
    const tenseBonus = (selectedTensesCount > 0) ? (selectedTensesCount - 1) * 2 : 0;

    const selectedPronounsCount = document.querySelectorAll('#pronoun-buttons .pronoun-group-button.selected').length;
    const selectedVerbsCount = document.querySelectorAll('#verb-buttons .verb-button.selected').length;

    const pronounBonusValue = 0.5;
    const verbBonusValue = 0.1;

    const pronounBonus = (selectedPronounsCount > 1) ? (selectedPronounsCount - 1) * pronounBonusValue : 0;
    const verbBonus = (selectedVerbsCount > 1) ? (selectedVerbsCount - 1) * verbBonusValue : 0;

    const ignoreAccentsBtn = document.getElementById('toggle-ignore-accents');
    const accentBonus = (ignoreAccentsBtn && !ignoreAccentsBtn.classList.contains('selected')) ? 8 : 0;

    const totalPoints = basePoints + tenseBonus + pronounBonus + verbBonus + accentBonus;
    scorePreviewValue.textContent = Math.round(totalPoints);
}

const filterBar = document.getElementById('filter-bar-container');
if (filterBar) {
    filterBar.addEventListener('click', () => setTimeout(updateScorePreview, 50));
}
const irregularitiesContainer = document.getElementById('verb-irregularities-container');
if (irregularitiesContainer) {
    irregularitiesContainer.addEventListener('click', () => setTimeout(updateScorePreview, 50));
}
	document.getElementById('tense-buttons').addEventListener('click', checkFinalStartButtonState);
	document.getElementById('verb-buttons').addEventListener('click', checkFinalStartButtonState);
	document.getElementById('verb-type-buttons').addEventListener('click', checkFinalStartButtonState);

    //prepareNextQuestion(); // Mantenla comentada por ahora hasta que todo el flujo funcione
    // <<<< INICIO DE LAS LÍNEAS MOVIDAS >>>>
    const checkAnswerButton = document.getElementById('check-answer-button');
    const clueButton        = document.getElementById('clue-button');
    const skipButton        = document.getElementById('skip-button');   // dentro de DOMContentLoaded si no son globales
    const endButton         = document.getElementById('end-button');
    const ansES             = document.getElementById('answer-input-es');
    const ansEN             = document.getElementById('answer-input-en');
    // (Estas ya las tienes definidas más arriba, así que no necesitas redeclararlas, solo asegúrate de que su ámbito sea accesible aquí)

    if (checkAnswerButton) checkAnswerButton.addEventListener('click', checkAnswer);
    if (clueButton) clueButton.addEventListener('click', onClueButtonClick);
    if (skipButton) skipButton.addEventListener('click', skipQuestion);
    if (endButton) {
  endButton.addEventListener('click', () => {
    playFromStart(soundElectricShock);
    safePlay(soundGameOver);
    chuacheSpeaks('gameover');
    endButton.classList.add('electric-effect');
    setTimeout(() => endButton.classList.remove('electric-effect'), 1000);

    // *** CORRECCIÓN: LIMPIAR ESTADO COMPLETAMENTE ***
    
    // 1. Detener todos los timers
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    
    // 2. Detener timers de boss battles
    if (game.boss && game.boss.countdownInterval) {
      clearInterval(game.boss.countdownInterval);
      game.boss.countdownInterval = null;
    }
    
    // 3. Detener sonido de ticking
    if (soundTicking) {
      soundTicking.pause();
      soundTicking.currentTime = 0;
    }
    tickingSoundPlaying = false;
    
    // 4. Limpiar estado de boss battle
    game.boss = null;
    game.gameState = 'PLAYING';
    
    // 5. Deshabilitar todos los controles de juego
    checkAnswerButton.disabled = true;
    clueButton.disabled = true;
    skipButton.disabled = true;
    endButton.disabled = true;
    ansEN.disabled = true;
    ansES.disabled = true;
    
    // 6. Limpiar clases CSS problemáticas
    document.body.classList.remove('boss-battle-bg', 't1000-mode', 'game-active');
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
      gameScreen.classList.remove('t1000-active');
    }
    
    // 7. Resetear background a normal
    resetBackgroundColor();
    
    // *** FIN DE LA CORRECCIÓN ***

    // Mostrar estadísticas después de 2 segundos
    setTimeout(() => { 
      showStatsModal(); 
    }, 2000);
  });
}

    if (ansES) ansES.addEventListener('keypress', e => { if (e.key === 'Enter') checkAnswer(); });
    if (ansEN) ansEN.addEventListener('keypress', e => { if (e.key === 'Enter') checkAnswer(); });

    const statsModal = document.getElementById('stats-modal');
    const statsBackdrop = document.getElementById('stats-modal-backdrop');
    const statsContinueButton = document.getElementById('stats-continue-button');
    const closeStatsModalBtn = document.getElementById('close-stats-modal-btn');
    function closeStatsModal() {
      if (statsModal && statsBackdrop) {
        statsModal.style.display = 'none';
        statsBackdrop.style.display = 'none';
        document.body.classList.remove('tooltip-open-no-scroll');
      }
    }
    if (statsContinueButton) {
      statsContinueButton.addEventListener('click', () => {
        closeStatsModal();
        qualifiesForRecord(score, selectedGameMode).then(qualifies => {
          if (!qualifies) { fadeOutToMenu(quitToSettings); return; }
          openNameModal('¿Cómo te llamas?', function(name) {
            if (name) {
              const recordData = {
                name: name,
                score: score,
                mode: selectedGameMode,
                streak: bestStreak,
                level: (selectedGameMode === 'timer' || selectedGameMode === 'lives') ? currentLevel + 1 : null
              };
              (async () => {
                try {
                  const { error } = await supabase.from('records').insert([recordData]);
                  if (error) throw error;
                  renderSetupRecords();
                } catch (error) {
                  console.error("Error saving record (statsContinue):", error.message);
                } finally {
                  fadeOutToMenu(quitToSettings);
                }
              })();
            } else {
              fadeOutToMenu(quitToSettings);
            }
          });
        });
      });
    }
    if (closeStatsModalBtn) closeStatsModalBtn.addEventListener('click', closeStatsModal);
    if (statsBackdrop) statsBackdrop.addEventListener('click', closeStatsModal);
function renderVerbTypeButtons() {
  const container = document.getElementById('verb-type-buttons');
  container.innerHTML = ''; 

  irregularityTypes.forEach(type => {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('verb-type-button');
    button.dataset.value = type.value;
    button.dataset.times = type.times.join(',');
    button.dataset.infokey = type.infoKey;
    button.innerHTML = `
      <span class="verb-type-name">${type.name}</span>
      <span class="context-info-icon" data-info-key="${type.infoKey}"></span>
      ${type.hint ? `<br><span class="verb-type-hint">${type.hint}</span>` : ''}
    `;

    const icon = button.querySelector('.context-info-icon');
    if (icon) {
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal(icon.dataset.infoKey);
      });
    }

    // Selección por defecto: solo "regular"
    if (type.value === 'regular') {
      button.classList.add('selected');
    }

    // --- LISTENER DE CLIC COMPLETO Y CORRECTO ---
    button.addEventListener('click', () => { // (el listener permanece como estaba en tu código original)
      if (soundClick) safePlay(soundClick);
      
      button.classList.toggle('selected'); 
      const isNowSelected = button.classList.contains('selected');

      // Lógica de dependencia (Presente)
      const currentSelectedTenses = getSelectedTenses();
      if (currentSelectedTenses.includes('present')) {
        const multipleIrrBtn = document.querySelector('.verb-type-button[data-value="multiple_irregularities"]');
        if (multipleIrrBtn && multipleIrrBtn.classList.contains('selected')) { 
          const irregularRootDef = irregularityTypes.find(it => it.value === 'irregular_root');
          const irregularRootAppliesToPresent = irregularRootDef ? irregularRootDef.times.includes('present') : false;
          
          if ((button.dataset.value === 'first_person_irregular' || 
              (button.dataset.value === 'irregular_root' && irregularRootAppliesToPresent)) && 
              !isNowSelected) { 
            multipleIrrBtn.classList.remove('selected');
          }
        }
      }
      
		applyIrregularityAndTenseFiltersToVerbList(); 
        updateVerbTypeButtonsVisualState(); // Añadido en tu código original, mantenerlo.
    });

    container.appendChild(button);
  });
}

const specificModal = document.getElementById('specific-info-modal');
const specificModalBackdrop = document.getElementById('specific-modal-backdrop');
const specificModalContent = specificModal.querySelector('.specific-modal-content');
const closeSpecificModalBtn = document.getElementById('close-specific-modal-btn');


function openSpecificModal(infoKey) {
  const info = specificInfoData[infoKey];
  if (info && specificModal && specificModalContent && specificModalBackdrop) {
    specificModalContent.innerHTML = `<h2>${info.title}</h2>${info.html}`;
    specificModal.style.display = 'flex';
    specificModalBackdrop.style.display = 'block';
    document.body.classList.add('tooltip-open-no-scroll');

    // Limpiar intervalo anterior si existiera (de la función typeWriter global)
    if (window.typeInterval) clearInterval(window.typeInterval);
    
    // Activar nuevas animaciones de typewriter
    const recallAnim = specificModalContent.querySelector('#recall-example-anim');
    const conjugateAnim = specificModalContent.querySelector('#conjugate-example-anim');
    const produceAnim = specificModalContent.querySelector('#produce-example-anim');

    if (recallAnim) setTimeout(() => typeWriter(recallAnim, 'I ate', 150), 50);
    if (conjugateAnim) setTimeout(() => typeWriter(conjugateAnim, 'conjugamos', 150), 50);
    if (produceAnim) setTimeout(() => typeWriter(produceAnim, 'amo', 150), 50);

  } else {
  }
}

function closeSpecificModal() {
  if (specificModal && specificModalBackdrop) {
    specificModal.style.display = 'none';
    specificModalBackdrop.style.display = 'none';
    document.body.classList.remove('tooltip-open-no-scroll');
  }
}

const infoIcons = document.querySelectorAll('.context-info-icon');
infoIcons.forEach(icon => {
  icon.addEventListener('click', function() {
    if (typeof soundClick !== 'undefined') safePlay(soundClick);
    const infoKey = this.dataset.infoKey;
    openSpecificModal(infoKey);
  });
});

if (closeSpecificModalBtn) {
  closeSpecificModalBtn.addEventListener('click', closeSpecificModal);
}

if (specificModalBackdrop) {
  specificModalBackdrop.addEventListener('click', closeSpecificModal);
}

async function qualifiesForRecord(score, mode) {
    if (score <= 0) return false;
    try {
        const { data, error, count } = await supabase
            .from('records')
            .select('score', { count: 'exact' })
            .eq('mode', mode)
            .order('score', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (count < 10) return true;

        const minScore = data[data.length - 1]?.score || 0;
        return score > minScore;

    } catch (error) {
        console.error('Error checking record qualification:', error.message);
        return false;
    }
}

// ----- Name Entry Modal -----
const nameModal = document.getElementById('name-entry-modal');
const nameModalBackdrop = document.getElementById('name-modal-backdrop');
const nameModalMessage = document.getElementById('name-entry-message');
const playerNameInput = document.getElementById('player-name-input');
const nameSubmitButton = document.getElementById('name-submit-button');
const closeNameModalBtn = document.getElementById('close-name-modal-btn');

function openNameModal(message, callback) {
  if (!nameModal || !nameModalBackdrop) return;
  nameModalMessage.textContent = message;
  nameModal.style.display = 'flex';
  nameModalBackdrop.style.display = 'block';
  document.body.classList.add('tooltip-open-no-scroll');
  if (playerNameInput) {
    playerNameInput.value = '';
    playerNameInput.focus();
  }

  function cleanup() {
    nameModal.style.display = 'none';
    nameModalBackdrop.style.display = 'none';
    document.body.classList.remove('tooltip-open-no-scroll');
    nameSubmitButton.removeEventListener('click', submitHandler);
    playerNameInput.removeEventListener('keydown', keyHandler);
    if (closeNameModalBtn) closeNameModalBtn.removeEventListener('click', cancelHandler);
    nameModalBackdrop.removeEventListener('click', cancelHandler);
  }

  function submitHandler() {
    const val = playerNameInput ? playerNameInput.value.trim() : '';
    cleanup();
    callback(val);
  }

  function cancelHandler() {
    cleanup();
    callback(null);
  }

  function keyHandler(e) { if (e.key === 'Enter') submitHandler(); }

  nameSubmitButton.addEventListener('click', submitHandler);
  playerNameInput.addEventListener('keydown', keyHandler);
  if (closeNameModalBtn) closeNameModalBtn.addEventListener('click', cancelHandler);
  nameModalBackdrop.addEventListener('click', cancelHandler);
}

function updateGameTitle() {
  // Use short labels for the in-game display
  const shortModeLabels = {
    'timer': 'Time Attack',
    'lives': 'Survival',
    'receptive': 'ReCall',
    'productive_easy': 'ConjugaATE',
    'productive': 'Pr0duc€'
  };
  const displayMode = shortModeLabels[currentOptions.mode] || currentOptions.mode;

  const tenseObjs = currentOptions.tenses.map(tKey => {
    const obj = tenses.find(t => t.value === tKey);
    return { key: tKey, name: obj ? obj.name : tKey.replace('_', ' '), infoKey: obj?.infoKey || '' };
  });
  const tenseNames = tenseObjs.map(o => o.name);

  const modeInfoKey = configButtonsData[currentOptions.mode]?.infoKey || '';
  const modeBtn = `<span class="mode-badge ${currentOptions.mode}" data-info-key="${modeInfoKey}">${displayMode}<span class="context-info-icon" data-info-key="${modeInfoKey}"></span></span>`;

  const tenseBtns = tenseObjs.map(o => {
    const cls = 'tense-badge ' + o.key.replace(/\s+/g, '_');
    return `<span class="${cls}" data-info-key="${o.infoKey}">${o.name}<span class="context-info-icon" data-info-key="${o.infoKey}"></span></span>`;
  }).join(' ');

  let html = `
    <div class="mode-tense-container">
      <div class="mode-container">
        <span class="badge-label">Mode</span>
        ${modeBtn}
      </div>
      <div class="tense-container">
        <span class="badge-label">${tenseNames.length > 1 ? 'Tenses' : 'Tense'}</span>
        <div class="tense-badges">
          ${tenseBtns}
        </div>
      </div>
    </div>
  `;

  gameTitle.innerHTML = html;

  const livesWrapper = document.getElementById('lives-count-wrapper');
  if (livesWrapper) {
    if (selectedGameMode === 'lives') {
      livesWrapper.innerHTML = `<span id="lives-count">${remainingLives}</span><img src="images/heart.webp" alt="life" style="width:40px; height:40px; vertical-align: middle; margin-left: 6px;">`;
    } else {
      livesWrapper.innerHTML = '';
    }
  }

  const modeBadgeEl = gameTitle.querySelector('.mode-badge');
  if (modeBadgeEl && modeBadgeEl.dataset.infoKey) {
    modeBadgeEl.addEventListener('click', () => {
      if (typeof soundClick !== 'undefined') safePlay(soundClick);
      openSpecificModal(modeBadgeEl.dataset.infoKey);
    });
  }

  const tenseBadgeEls = gameTitle.querySelectorAll('.tense-badge');
  tenseBadgeEls.forEach(tb => {
    const key = tb.dataset.infoKey;
    if (key) {
      tb.addEventListener('click', () => {
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal(key);
      });
    }
  });
}

function typewriterEffect(textElement, text, interval) {
  let index = 0;
  const typeInterval = setInterval(() => {
    textElement.textContent += text[index];
    index++;
    if (index === text.length) {
      clearInterval(typeInterval);
    }
  }, interval);
}


        // old Game Summary tooltip removed

const leftBubbles = document.getElementById('left-bubbles');
const rightBubbles = document.getElementById('right-bubbles');
let bubblesActive = false;
let leftBubbleInterval, rightBubbleInterval;

// Avoid blocking UI clicks before animations start
if (leftBubbles) leftBubbles.style.pointerEvents = 'none';
if (rightBubbles) rightBubbles.style.pointerEvents = 'none';

function showLifeGainedAnimation() {
	
  // 1) SONIDO: ver si la variable existe y está lista
  if (soundLifeGained) {
    try {
      soundLifeGained.currentTime = 0;
      safePlay(soundLifeGained);
    } catch (e) {
      console.error('⚠️ Excepción al reproducir sonido:', e);
    }
  }
  
  // 2) POP en contador de vidas
  const livesEl = document.getElementById('lives-count');
  if (livesEl) {
    livesEl.classList.add('just-gained');
    livesEl.addEventListener('animationend', () => {
      livesEl.classList.remove('just-gained');
    }, { once: true });
  }

  // 3) CONFETI: asegurarnos de que el canvas está visible
  const canvas = document.getElementById('life-confetti-canvas');
  if (!canvas) return;
  // mostrarlo explícitamente
  canvas.style.display = 'block';

  
  const ctx  = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = rect.height;

  // generar partículas…
  const particles = [];
  const total     = 80;
  const colors    = ['#ff5e5e', '#ffb3b3', '#ffe2e2', 'lightgreen', '#90ee90']; // Añadido verdes
    
	function drawHeart(x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    const topY = y - size / 3;
    ctx.moveTo(x, topY);
    ctx.bezierCurveTo(x, y - size, x - size, y - size/3, x, y + size);
    ctx.bezierCurveTo(x + size, y - size/3, x, y - size, x, topY);
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < total; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 50, // Iniciar desde abajo o justo fuera de la vista
      vx: Math.random() * 8 + 2,              // entre +2 y +10 px/frame
      vy: -Math.random() * 15 - 8,    
      size: Math.random() * 10 + 5,           // Tamaños un poco más grandes
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() < 0.5 ? 'heart' : 'square', // Más corazones
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 5
    });
  }

  let start = null;
  function animate(ts){
    if(!start) start = ts;
    const elapsed = ts - start;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // Gravedad un poco más fuerte
      p.rotation += p.rotationSpeed;
      if(p.shape==='heart'){
        drawHeart(p.x,p.y,p.size,p.color);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x,p.y,p.size,p.size);
      }
    });
    if(elapsed < 2500){
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      canvas.style.display = 'none';
    }
  }
  requestAnimationFrame(animate);
}


  if (specificModal) specificModal.style.display = 'none';
  if (specificModalBackdrop) specificModalBackdrop.style.display = 'none';

  if (tooltip) tooltip.style.display = 'none';
  if (generalBackdrop) generalBackdrop.style.display = 'none';
  
function startBubbles() {
  if (!window.animationsEnabled) return;
  if (bubblesActive) return;   // ya arrancadas
  bubblesActive = true;
  if (leftBubbles) leftBubbles.style.pointerEvents = 'auto';
  if (rightBubbles) rightBubbles.style.pointerEvents = 'auto';
  leftBubbleInterval = setInterval(() => {
    createBubble('left');
  }, 1800);
  rightBubbleInterval = setInterval(() => {
    createBubble('right');
  }, 2100);
}

function stopBubbles() {
  bubblesActive = false;
  clearInterval(leftBubbleInterval);
  clearInterval(rightBubbleInterval);
  if (leftBubbles) leftBubbles.style.pointerEvents = 'none';
  if (rightBubbles) rightBubbles.style.pointerEvents = 'none';
  leftBubbles.innerHTML  = '';
  rightBubbles.innerHTML = '';
}

function createBubble(side) {
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');

  const verb = allVerbData[Math.floor(Math.random() * allVerbData.length)];
  if (!verb) return;

  const availableTenseValues = tenses.map(t => t.value);
  const tense = availableTenseValues[Math.floor(Math.random() * availableTenseValues.length)];
  const pronounKeys = Object.keys(verb.conjugations[tense] || {});
  const pronoun = pronounKeys[Math.floor(Math.random() * pronounKeys.length)];
  const conjugation = verb.conjugations[tense]?.[pronoun];

  bubble.textContent = conjugation || verb.infinitive_es;

  bubble.style.left = Math.random() * 70 + 'px'; // margen interno
  bubble.style.fontSize = (Math.random() * 6 + 14) + 'px'; // variar tamaño

  const container = side === 'left' ? leftBubbles : rightBubbles;
  container.appendChild(bubble);
  bubble.addEventListener('click', () => {
  // 1) Reproducir solo el sonido
  soundbubblepop.currentTime = 0;
  safePlay(soundbubblepop);

  // 2) Quitar la burbuja
  bubble.remove();
  });
}

window.addEventListener('resize', () => {
  if (window.innerWidth <= 1200) {
    stopBubbles();
  } else {
    startBubbles();
  }
});

  if (specificModal) specificModal.style.display = 'none';
  if (specificModalBackdrop) specificModalBackdrop.style.display = 'none';

  const generalTooltipForHiding = document.getElementById('tooltip');
  const generalBackdropForHiding = document.querySelector('.modal-backdrop:not(.specific-modal-backdrop)');

  if (generalTooltipForHiding) generalTooltipForHiding.style.display = 'none';
  if (generalBackdropForHiding) generalBackdropForHiding.style.display = 'none';

  const coffeeLink = document.getElementById('coffee-link');
  if (coffeeLink) {
    coffeeLink.addEventListener('click', () => {
      const original = coffeeLink.textContent;
      coffeeLink.textContent = 'THANKS!';
      setTimeout(() => { coffeeLink.textContent = original; }, 1500);
    });
  }

  function calculateGameStats() {
    const accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const avgTime = totalQuestions ? (totalResponseTime / totalQuestions).toFixed(1) : 0;
    let speedRating = 'Steady';
    if (avgTime < 3) speedRating = '⚡ Lightning';
    else if (avgTime < 5) speedRating = '🚀 Fast';
    else if (avgTime < 8) speedRating = '🐢 Careful';
    let encouragement = 'Keep practicing!';
    if (accuracy >= 90) encouragement = '🏆 Excellent work!';
    else if (accuracy >= 75) encouragement = '👍 Great job!';
    else if (accuracy >= 50) encouragement = '📚 Good effort!';
    return {
      accuracy,
      avgTime,
      speedRating,
      encouragement,
      totalQuestions,
      totalCorrect,
      bestStreak,
      fastestAnswer: fastestAnswer === Infinity ? 0 : fastestAnswer.toFixed(1)
    };
  }

  function showStatsModal() {
    const stats = calculateGameStats();
    const statsContent = document.getElementById('stats-content');
    let missedVerbsHtml = '';
    if (verbsMissed.length) {
      const uniqueMissed = [...new Set(verbsMissed.map(v => v.verb))];
      missedVerbsHtml = `<div class="stat-row"><span class="stat-label">❌ Missed verbs:</span><span class="stat-value">${uniqueMissed.slice(0,3).join(', ')}</span></div>`;
    }
    statsContent.innerHTML = `
      <div class="stats-grid">
        <div class="stat-row"><span class="stat-label">🎯 Accuracy:</span><span class="stat-value">${stats.accuracy}% (${stats.totalCorrect}/${stats.totalQuestions})</span></div>
        <div class="stat-row"><span class="stat-label">⏱️ Average time:</span><span class="stat-value">${stats.avgTime}s per question</span></div>
        <div class="stat-row"><span class="stat-label">🚀 Speed:</span><span class="stat-value">${stats.speedRating}</span></div>
        <div class="stat-row"><span class="stat-label">🔥 Best streak:</span><span class="stat-value">${stats.bestStreak} in a row</span></div>
        ${missedVerbsHtml}
        <div class="encouragement">${stats.encouragement}</div>
      </div>`;
    document.getElementById('stats-modal').style.display = 'flex';
    document.getElementById('stats-modal-backdrop').style.display = 'block';
    document.body.classList.add('tooltip-open-no-scroll');
  }

  // Call the function to load the records as soon as the page is ready
  displaySplashRecords();

});

// © 2025 Pablo Torrado, University of Hong Kong.
// Licensed under CC BY-NC-ND 4.0: https://creativecommons.org/licenses/by-nc-nd/4.0/
