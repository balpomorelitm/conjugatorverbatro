import {
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
  mirrorShattered,
  preloadAudio,
  preloadImages,
  safePlay,
  audioElements
} from './audio.js';
import { requestRecorderState } from './recorder.js';
import {
  levelState,
  LEVEL_GOAL_TIMER,
  LEVEL_GOAL_LIVES,
  triggerLevelUpShake,
  updateLevelText,
  darkenColor,
  updateBackgroundForLevel,
  calculateTimePenalty,
  updateClueButtonUI,
  resetLevelState,
  updateLevelAndVisuals,
  updateProgressUI
} from './level.js';
import { saveSetting, loadSettings, applyChuacheVisibility, settings } from './settings.js';

const assetUrl = relativePath => new URL(relativePath, import.meta.url).href;

const ASSET_URLS = {
  verbosData: assetUrl('../verbos.json'),
  jokersData: assetUrl('../jokers.json'),
  chuacheTalks: assetUrl('../assets/images/chuachetalks.gif'),
  conjuchuache: assetUrl('../assets/images/conjuchuache.webp'),
  bossPlaceholder: assetUrl('../assets/images/boss_imageplaceholder.png'),
  musicOn: assetUrl('../assets/images/musicon.webp'),
  musicOff: assetUrl('../assets/images/musicoff.webp'),
  bossHack: assetUrl('../assets/images/bosshack.webp'),
  bossSkynetVideo: assetUrl('../assets/images/bosssg.webm'),
  bossT1000: assetUrl('../assets/images/bosst-1000.webp'),
  heart: assetUrl('../assets/images/heart.webp'),
  helpIcon: assetUrl('../assets/images/iconquestion.webp')
};

const pronouns = ['yo', 'tú', 'vos', 'él', 'nosotros', 'vosotros', 'ellos'];

// Verbatro State Definition
const verbatroState = {
  active: false,
  round: 1,
  money: 4,
  currentScore: 0,
  targetScore: 300,
  handsRemaining: 8,
  maxHands: 8,
  baseChips: 10,
  baseMult: 1,
  inventory: [],
  shopInventory: [],
  jokerData: [],
  streak: 0,
  roundMistakes: 0,
  bossesDefeated: 0,
  backspaceUsed: false
};

const verbatroRoundConfigs = [
  { round: 1, targetScore: 300, maxHands: 8 },
  { round: 2, targetScore: 800, maxHands: 8 },
  { round: 3, targetScore: 2000, maxHands: 9 },
  { round: 4, targetScore: 5000, maxHands: 10 },
  { round: 5, targetScore: 10000, maxHands: 10 },
  { round: 6, targetScore: 18000, maxHands: 11 },
  { round: 7, targetScore: 30000, maxHands: 12 },
  { round: 8, targetScore: 50000, maxHands: 12 }
];

let typeInterval; // Variable global para controlar el intervalo de la animación
let isCheckingAnswer = false;
let currentMusic = menuMusic;

// Separate list excluding music tracks for SFX-specific operations
const sfxAudio = audioElements.filter(a => a !== menuMusic && a !== gameMusic);

// Track irregularity selections by tense so the UI can persist user choices.
const irregularitySelectionState = {};

// Initialize recorder state
requestRecorderState();
// Begin fetching verb data as early as possible to utilize the preload
const verbosJsonPromise = fetch(ASSET_URLS.verbosData)
  .then(resp => {
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  })
  .catch(err => {
    console.error('Could not fetch verbos.json:', err);
    alert('Error cargando datos de los verbos.');
    return [];
  });

const jokersJsonPromise = fetch(ASSET_URLS.jokersData)
  .then(resp => {
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  })
  .catch(err => {
    console.error('Could not fetch jokers.json:', err);
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
  if (window.selectedGameMode === 'study' || !settings.chuacheReactionsEnabled) return;
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

  image.src = ASSET_URLS.chuacheTalks;
  bubble.textContent = message;
  bubble.classList.remove("hidden");
  if (type === "wrong" || type === "skip") bubble.classList.add("error");
  else bubble.classList.remove("error");

  playFromStart(chuacheSound);

  setTimeout(() => {
    image.src = ASSET_URLS.conjuchuache;
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
  preloadImages();
  let selectedGameMode = null;
  let allVerbData = [];
  let currentQuestion = {};
  let currentOptions = {};
  let score = 0, streak = 0, multiplier = 1.0, startTime = 0;
  let bestStreak = 0;
  let countdownTimer;
  let countdownTime = 240;
  let remainingLives = 5;
  let targetVolume = loadSettings();
  preloadAudio();
  let timerTimeLeft = 0;
  let tickingSoundPlaying = false;
  const defaultBackgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-color').trim();

  // Elements for Boss Battle transitions
  const gameContainer = document.getElementById('game-container');
  const chuacheImage = document.getElementById('chuache-image');
  // Use a mutable reference because startBossBattle may replace the element
  let bossImage = document.getElementById('boss-image');
  const progressContainer = document.getElementById('level-text');

  // Number of regular verbs players must clear before triggering a boss fight.
  const VERBS_PER_PHASE_BEFORE_BOSS = 9;

  const game = {
    score: 0,
    level: 1,
    verbsInPhaseCount: 0,
    gameState: 'PLAYING', // Possible states: PLAYING, BOSS_BATTLE
    currentVerbs: [],
    currentVerbIndex: 0,
    isGameOver: false,
    boss: null, // Will hold the current boss battle state
    scanlineRemoved: false,
    lastBossUsed: null, // Track the previously selected boss
    usedBosses: [] // Track bosses encountered in the current cycle
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
        const pronounList = (Array.isArray(window.pronouns) && window.pronouns.length > 0)
          ? window.pronouns
          : pronouns;
        const challengeVerbs = [];

        selected.forEach(verb => {
          const possibleTenses = currentOptions.tenses.filter(t => Array.isArray(verb.types?.[t]) && verb.types[t].includes('regular'));
          const tense = possibleTenses[Math.floor(Math.random() * possibleTenses.length)];
          const formsForTense = verb.conjugations?.[tense];
          if (!formsForTense) {
            console.error(`Missing conjugations for ${verb.infinitive_es} in ${tense}.`);
            return;
          }

          const availablePronouns = pronounList
            .map(group => resolvePronounKeyForForms(group, formsForTense))
            .filter(Boolean);

          if (availablePronouns.length === 0) {
            console.error(`No compatible pronouns for ${verb.infinitive_es} in ${tense}.`);
            return;
          }

          const pronoun = availablePronouns[Math.floor(Math.random() * availablePronouns.length)];
          const correctAnswer = formsForTense[pronoun];
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

      const pronounList = (Array.isArray(window.pronouns) && window.pronouns.length > 0)
        ? window.pronouns
        : pronouns;
      const challengeVerbs = [];

      selected.forEach(verb => {
        const possibleTenses = currentOptions.tenses.filter(t =>
          verb.conjugations[t] !== undefined
        );
        const tense = possibleTenses[Math.floor(Math.random() * possibleTenses.length)];
        const formsForTense = verb.conjugations[tense];
        if (!formsForTense) {
          console.error(`Missing conjugations for ${verb.infinitive_es} in ${tense}.`);
          return;
        }

        const availablePronouns = pronounList
          .map(group => resolvePronounKeyForForms(group, formsForTense))
          .filter(Boolean);

        if (availablePronouns.length === 0) {
          console.error(`No compatible pronouns for ${verb.infinitive_es} in ${tense}.`);
          return;
        }

        const pronoun = availablePronouns[Math.floor(Math.random() * availablePronouns.length)];
        const correctAnswer = formsForTense[pronoun];

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
        this.timeLimit = this.verbsToComplete * 5;

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

        const pronounList = (Array.isArray(window.pronouns) && window.pronouns.length > 0)
          ? window.pronouns
          : pronouns;
        const challengeVerbs = [];

        selected.forEach(verb => {
          const possibleTenses = currentOptions.tenses.filter(t =>
            verb.conjugations[t] !== undefined
          );
          const tense = possibleTenses[Math.floor(Math.random() * possibleTenses.length)];
          const formsForTense = verb.conjugations[tense];
          if (!formsForTense) {
            console.error(`Missing conjugations for ${verb.infinitive_es} in ${tense}.`);
            return;
          }

          const availablePronouns = pronounList
            .map(group => resolvePronounKeyForForms(group, formsForTense))
            .filter(Boolean);

          if (availablePronouns.length === 0) {
            console.error(`No compatible pronouns for ${verb.infinitive_es} in ${tense}.`);
            return;
          }

          const pronoun = availablePronouns[Math.floor(Math.random() * availablePronouns.length)];
          const correctAnswer = formsForTense[pronoun];

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

        const pronounList = (Array.isArray(window.pronouns) && window.pronouns.length > 0)
          ? window.pronouns
          : pronouns;
        const challengeVerbs = [];

        selected.forEach(verb => {
          const possibleTenses = currentOptions.tenses.filter(t =>
            verb.conjugations[t] !== undefined
          );
          const tense = possibleTenses[Math.floor(Math.random() * possibleTenses.length)];
          const formsForTense = verb.conjugations[tense];
          if (!formsForTense) {
            console.error(`Missing conjugations for ${verb.infinitive_es} in ${tense}.`);
            return;
          }

          const availablePronouns = pronounList
            .map(group => resolvePronounKeyForForms(group, formsForTense))
            .filter(Boolean);

          if (availablePronouns.length === 0) {
            console.error(`No compatible pronouns for ${verb.infinitive_es} in ${tense}.`);
            return;
          }

          const pronoun = availablePronouns[Math.floor(Math.random() * availablePronouns.length)];

          let correctAnswer, englishInfinitive;

          if (currentOptions.mode === 'receptive') {
            correctAnswer = formsForTense[pronoun];
            englishInfinitive = verb.infinitive_en;
          } else if (currentOptions.mode === 'productive_easy') {
            correctAnswer = formsForTense[pronoun];
          } else {
            correctAnswer = formsForTense[pronoun];
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

function setupT1000MirrorInput() {
  const ansES = document.getElementById('answer-input-es');
  if (!ansES) return;

  // Store original value without transformation for validation
  let originalValue = '';

  ansES.addEventListener('input', function (e) {
    // Store the actual typed value
    originalValue = this.value;

    // For T-1000 boss, we'll rely on CSS transform for visual effect
    // The actual value remains normal for validation purposes
  });

  // Override the value getter/setter for T-1000 mode
  if (game.boss && game.boss.id === 'mirrorT1000') {
    // The CSS transform will handle the visual mirroring
    // The input's actual value remains unchanged for proper validation
  }
}

function startT1000Battle() {
  if (ansES) {
    ansES.placeholder = 'Type the answer BACKWARDS...';
    setupT1000MirrorInput();
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

  game.boss.hintLevel = 0;
  const mirrorActive = game.boss.verbsCompleted % 2 === 0;
  game.boss.mirrorActive = mirrorActive;

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

  const mirrorLabel = mirrorActive ? '🪞 MIRROR:' : '➡️ NORMAL:';
  if (currentOptions.mode === 'receptive') {
    const suffix = mirrorActive ? '<span class="t1000-hint">(Type the English translation backwards)</span>' : '<span class="t1000-hint">(Translate to English)</span>';
    promptHTML = `${mirrorLabel} ${tenseBadge} "${currentChallenge.correctAnswer}" → ${suffix}`;
  } else if (currentOptions.mode === 'productive_easy') {
    promptHTML = `${mirrorLabel} ${tenseBadge} "${currentChallenge.infinitive}" – <span class="pronoun" id="${currentChallenge.pronoun}">${currentChallenge.pronoun}</span>`;
  } else {
    promptHTML = `${mirrorLabel} ${tenseBadge} "${currentChallenge.englishInfinitive}" – <span class="pronoun" id="${currentChallenge.pronoun}">${currentChallenge.pronoun}</span>`;
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
    ansES.placeholder = mirrorActive ? 'Type the conjugation backwards...' : 'Type the conjugation';
    ansES.disabled = false;
    ansES.style.direction = 'ltr';
    ansES.focus();
  }
  const checkAnswerButton = document.getElementById('check-answer-button');
  if (checkAnswerButton) checkAnswerButton.disabled = false;
  isCheckingAnswer = false;
}

function validateT1000Answer(userInput, currentChallenge) {
  let cleanInput = userInput.trim().toLowerCase();
  if (currentOptions.ignoreAccents) {
    cleanInput = removeAccents(cleanInput);
  }

  const mirrorActive = !(game.boss && game.boss.id === 'mirrorT1000' && game.boss.mirrorActive === false);

  if (!mirrorActive) {
    if (currentOptions.mode === 'receptive') {
      const tense = currentChallenge.tenseKey || currentChallenge.tense;
      const translations = getEnglishTranslation(currentChallenge, tense, currentChallenge.pronoun) || [];
      return translations.some(translation => {
        let candidate = translation.toLowerCase();
        if (currentOptions.ignoreAccents) candidate = removeAccents(candidate);
        return cleanInput === candidate;
      });
    }
    let target = currentChallenge.correctAnswer.toLowerCase();
    if (currentOptions.ignoreAccents) target = removeAccents(target);
    return cleanInput === target;
  }

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
        let reversedTranslation = translation.toLowerCase();
        if (currentOptions.ignoreAccents) {
          reversedTranslation = removeAccents(reversedTranslation);
        }
        reversedTranslation = reversedTranslation.split('').reverse().join('');
        return cleanInput === reversedTranslation;
      });
    }
    return false;
  } else {
    // For productive modes, reverse the Spanish conjugation
    let reversedCorrect = currentChallenge.correctAnswer.toLowerCase();
    if (currentOptions.ignoreAccents) {
      reversedCorrect = removeAccents(reversedCorrect);
    }
    reversedCorrect = reversedCorrect.split('').reverse().join('');
    return cleanInput === reversedCorrect;
  }
}

function getEnglishTranslation(verbData, tense, pronoun) {
  const originalMappings = pronounToEnglishOptions[pronoun] || [{ display: pronoun, key: pronoun.toLowerCase() }];
  const shouldUseGenericYou =
    (pronoun === 'vosotros' || pronoun === 'vosotras') &&
    tense !== 'imperative' &&
    tense !== 'imperative_negative';

  const mappings = shouldUseGenericYou
    ? originalMappings.map(({ display, key }) => ({ display, key: key === 'you_plural_spain' ? 'you' : key }))
    : originalMappings;
  const conjugationsEN = verbData.conjugations_en && verbData.conjugations_en[tense];

  if (!conjugationsEN) {
    const displayText = mappings[0].display === 'I' ? 'I' : mappings[0].display.toLowerCase();
    return [`${displayText} ${verbData.infinitive_en.replace(/^to\s+/, '')}`];
  }

  const translations = mappings
    .map(({ display, key }) => {
      const verbForm = conjugationsEN[key];
      if (!verbForm) return null;
      const displayText = display === 'I' ? 'I' : display.toLowerCase();
      return `${displayText} ${verbForm.toLowerCase()}`;
    })
    .filter(Boolean);

  if (translations.length > 0) {
    return translations;
  }

  const fallbackDisplay = mappings[0].display === 'I' ? 'I' : mappings[0].display.toLowerCase();
  return [`${fallbackDisplay} ${verbData.infinitive_en.replace(/^to\s+/, '')}`];
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
      progressContainer.textContent = `Level Boss #${levelState.currentBossNumber} - 3/4 (${game.boss.totalVerbsNeeded}/${game.boss.totalVerbsNeeded}) | Total Score: ${score}`;
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
  isCheckingAnswer = false;
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
    const applyGlitch = game.boss.verbsCompleted % 2 === 0;
    const tKey = currentChallenge.tense;
    const tenseObj = tenses.find(t => t.value === tKey) || {};
    const tenseLabel = tenseObj.name || tKey;
    const infoKey = tenseObj.infoKey || '';
    const tenseBadge = `<span class="tense-badge ${tKey}" data-info-key="${infoKey}">${tenseLabel}<span class="context-info-icon" data-info-key="${infoKey}"></span></span>`;
    const shownInfinitive = applyGlitch ? currentChallenge.glitchedInfinitive : currentChallenge.infinitive;
    const shownPronoun = applyGlitch ? currentChallenge.glitchedPronoun : currentChallenge.pronoun;
    promptHTML = `${tenseBadge}: <span class="boss-challenge">${shownInfinitive}</span> – <span class="boss-challenge-pronoun">${shownPronoun}</span>`;

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

  if (currentOptions.mode === 'receptive') {
    if (ansEN) ansEN.value = '';
  } else if (ansES) {
    ansES.value = '';
  }
  focusAnswerInput();
}


function endBossBattle(playerWon, message = "", isGameOver = false) {
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

  if (!isGameOver) {
    if (ansES) ansES.disabled = false;

    if (checkAnswerButton) checkAnswerButton.disabled = false;
    if (skipButton) skipButton.disabled = false;
    if (clueButton) {
      clueButton.disabled = false;
      updateClueButtonUI(clueButton, selectedGameMode);
    }
  }

  const tenseEl = document.getElementById('tense-label');

  if (playerWon) {
    const bonusPoints = 500 * (game.boss?.reappearanceMultiplier || 1);
    game.score += bonusPoints;
    score = game.score; // keep legacy score in sync
    if (selectedGameMode === 'verbatro') {
      verbatroState.bossesDefeated += 1;
    }
    if (qPrompt) qPrompt.textContent = 'SYSTEM RESTORED';
    if (tenseEl) tenseEl.textContent = 'Boss defeated!';
    if (feedback) feedback.innerHTML = `<span class="feedback-points">Boss Bonus: +${bonusPoints} Points!</span>`;
    updateScore();

    if (selectedGameMode === 'timer' || selectedGameMode === 'lives') {
      levelState.correctAnswersTotal++;
      updateLevelAndVisuals({
        game,
        selectedGameMode,
        score,
        clueButton,
        playFromStart,
        soundLevelUp,
        progressContainer
      });
    }
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
    resetBossVisuals();
    document.getElementById('game-screen').classList.remove('t1000-active');
    if (chuacheImage) chuacheImage.classList.remove('hidden', 'fade-out');
    if (progressContainer) {
      progressContainer.style.color = '';
    }

    if (!isGameOver) {
      game.verbsInPhaseCount = 0;
      game.gameState = 'PLAYING';
      game.boss = null;

      if (!game.scanlineRemoved && levelState.bossesEncounteredTotal === 1) {
        const gs = document.getElementById('game-screen');
        if (gs) gs.classList.add('no-scanline');
        game.scanlineRemoved = true;
      }

      if (progressContainer) updateProgressUI(game, selectedGameMode, progressContainer, score);

      prepareNextQuestion();
    }
  }, 3000);
}

function triggerGameOver() {
  safePlay(soundGameOver);
  chuacheSpeaks('gameover');

  remainingLives = Math.max(remainingLives, 0);
  updateGameTitle();
  updateTotalCorrectForLifeDisplay();

  if (gameTitle) gameTitle.textContent = '💀 ¡Estás MUERTO!';
  if (checkAnswerButton) checkAnswerButton.disabled = true;
  if (clueButton) clueButton.disabled = true;
  if (skipButton) skipButton.disabled = true;
  if (ansEN) ansEN.disabled = true;
  if (ansES) ansES.disabled = true;

  endBossBattle(false, '', true);

  if (name) {
    const recordData = {
      name: name,
      score: score,
      mode: selectedGameMode,
      streak: bestStreak,
      level: (selectedGameMode === 'timer' || selectedGameMode === 'lives') ? levelState.currentLevel + 1 : null
    };
    (async () => {
      try {
        const { error } = await supabase.from('records').insert([recordData]);
        if (error) throw error;
        renderSetupRecords();
      } catch (error) {
        console.error('Error saving record:', error.message);
      } finally {
        fadeOutToMenu(quitToSettings);
      }
    })();
  } else {
    fadeOutToMenu(quitToSettings);
  }
}


function resetBossVisuals() {
  let bossImageEl = document.getElementById('boss-image');
  if (bossImageEl) {
    if (bossImageEl.tagName.toLowerCase() === 'video') {
      bossImageEl.pause();
      bossImageEl.currentTime = 0;
      const img = document.createElement('img');
      img.id = bossImageEl.id;
      img.className = bossImageEl.className;
      img.style.cssText = bossImageEl.style.cssText;
      bossImageEl.parentNode.replaceChild(img, bossImageEl);
      bossImageEl = img;
      bossImage = img;
    } else {
      bossImage = bossImageEl;
    }
    bossImageEl.src = ASSET_URLS.bossPlaceholder;
    bossImageEl.classList.add('hidden');
  }
  document.body.classList.remove('boss-battle-bg', 't1000-mode');
  if (gameContainer) gameContainer.classList.remove('boss-battle-bg', 't1000-mode');
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

// Add this new unified function
function displayUnifiedClue() {
  if (currentOptions.mode === 'receptive') {
    const verbData = currentQuestion.verb;
    feedback.innerHTML = `💡 The English infinitive is <strong>${verbData.infinitive_en}</strong>.`;
    currentQuestion.hintLevel = 1;
    ansEN.value = '';
    setTimeout(() => ansEN.focus(), 0);
  } else if (currentOptions.mode === 'productive_easy') {
    // CORRECCIÓN: Para productive_easy, mostrar las otras conjugaciones (NO el infinitivo)
    const conjTenseKey = currentQuestion.tenseKey;
    const conj = currentQuestion.verb.conjugations[conjTenseKey];
    const currentPronounGroup = currentQuestion.pronounGroup || getPronounGroupForActual(currentQuestion.pronoun);

    // Get active pronouns from player configuration
    const activePronounButtons = Array.from(document.querySelectorAll('.pronoun-group-button.selected'));
    const activePronouns = activePronounButtons.flatMap(btn => JSON.parse(btn.dataset.values));

    // Correct pronoun order for display
    const pronounOrder = ['yo', 'tú', 'vos', 'él', 'nosotros', 'vosotros', 'ellos'];

    // Filter and order conjugations
    const conjugationsToShow = pronounOrder
      .filter(pr => pr !== currentPronounGroup && activePronouns.includes(pr))
      .map(pr => {
        const resolvedPronoun = resolvePronounKeyForForms(pr, conj);
        if (!resolvedPronoun) return null;
        const form = conj[resolvedPronoun];
        if (!form) return null;
        return `<span class="hint-btn ${pr}">${form}</span>`;
      })
      .filter(Boolean)
      .join('');

    feedback.innerHTML = `❌ <em>Clue:</em> <span class="context-info-icon" data-info-key="clueColorsInfo"></span> ` + conjugationsToShow;
    const clueIcon = feedback.querySelector('.context-info-icon');
    if (clueIcon) {
      clueIcon.addEventListener('click', e => {
        e.stopPropagation();
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal(clueIcon.dataset.infoKey);
      });
    }
    playFromStart(soundElectricShock);
    currentQuestion.hintLevel = 1;

    ansES.value = '';
    setTimeout(() => ansES.focus(), 0);
  } else if (currentOptions.mode === 'productive') {
    // MANTENER: El sistema de 2 niveles para productive está bien
    if (currentQuestion.hintLevel === 0) {
      feedback.innerHTML = `❌ <em>Clue 1:</em> infinitive is <strong>${currentQuestion.verb.infinitive_es}</strong>.`;
      playFromStart(soundElectricShock);
      currentQuestion.hintLevel = 1;
    } else if (currentQuestion.hintLevel === 1) {
      const conjTenseKey = currentQuestion.tenseKey;
      const conj = currentQuestion.verb.conjugations[conjTenseKey];
      const currentPronounGroup = currentQuestion.pronounGroup || getPronounGroupForActual(currentQuestion.pronoun);

      const activePronounButtons = Array.from(document.querySelectorAll('.pronoun-group-button.selected'));
      const activePronouns = activePronounButtons.flatMap(btn => JSON.parse(btn.dataset.values));
      const pronounOrder = ['yo', 'tú', 'vos', 'él', 'nosotros', 'vosotros', 'ellos'];

      const conjugationsToShow = pronounOrder
        .filter(pr => pr !== currentPronounGroup && activePronouns.includes(pr))
        .map(pr => {
          const resolvedPronoun = resolvePronounKeyForForms(pr, conj);
          if (!resolvedPronoun) return null;
          const form = conj[resolvedPronoun];
          if (!form) return null;
          return `<span class="hint-btn ${pr}">${form}</span>`;
        })
        .filter(Boolean)
        .join('');

      feedback.innerHTML = `❌ <em>Clue 2:</em> <span class="context-info-icon" data-info-key="clueColorsInfo"></span> ` + conjugationsToShow;
      const clueIcon = feedback.querySelector('.context-info-icon');
      if (clueIcon) {
        clueIcon.addEventListener('click', e => {
          e.stopPropagation();
          if (typeof soundClick !== 'undefined') safePlay(soundClick);
          openSpecificModal(clueIcon.dataset.infoKey);
        });
      }
      playFromStart(soundElectricShock);
      currentQuestion.hintLevel = 2;
    }
    ansES.value = '';
    setTimeout(() => ansES.focus(), 0);
  }

  const clueButton = document.getElementById('clue-button');
  const maxHintLevel = currentOptions.mode === 'productive' ? 2 : 1;
  if (clueButton && currentQuestion.hintLevel >= maxHintLevel) {
    clueButton.disabled = true;
    clueButton.textContent = 'No more hints';
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
        // SPECIAL HANDLING FOR T-1000 MIRROR BOSS
        const currentChallenge = game.boss.challengeVerbs[game.boss.verbsCompleted];
        if (!currentChallenge) return;

        const isCorrect = validateT1000Answer(ansES.value, currentChallenge);

        if (levelState.freeClues > 0) {
          levelState.freeClues--;
        } else {
          if (selectedGameMode === 'timer') {
            const penalty = calculateTimePenalty(levelState.currentLevel);
            timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
            checkTickingSound();
            showTimeChange(-penalty);
          } else if (selectedGameMode === 'lives') {
            const penalty = 1 + levelState.currentLevel;
            remainingLives = Math.max(remainingLives - penalty, 0);
            updateGameTitle();
          }
          streak = 0;
        }

        // Initialize hint level if not set
        if (!game.boss.hintLevel) game.boss.hintLevel = 0;

        if (game.boss.hintLevel === 0) {
          // First hint: show the normal conjugation
          feedback.innerHTML = `💡 <em>Clue 1:</em> The normal conjugation is: <strong>${currentChallenge.correctAnswer}</strong>`;
          game.boss.hintLevel = 1;
        } else if (game.boss.hintLevel === 1) {
          // Second hint: show normal → reversed
          const reversedAnswer = currentChallenge.correctAnswer.split('').reverse().join('');
          feedback.innerHTML = `💡 <em>Final Clue:</em> <strong>${currentChallenge.correctAnswer}</strong> → <strong>${reversedAnswer}</strong>`;
          game.boss.hintLevel = 2;
        } else {
          // No more hints available
          feedback.innerHTML = `💡 No more clues available.`;
        }

        playFromStart(soundElectricShock);
        updateClueButtonUI(clueButton, selectedGameMode);

        if (ansES) {
          ansES.value = '';
          setTimeout(() => ansES.focus(), 0);
        }
        return;
      } else if (game.boss && game.boss.id === 'skynetGlitch') {
        if (selectedGameMode !== 'timer' && selectedGameMode !== 'lives') {
          timerTimeLeft = Math.max(0, timerTimeLeft - 3);
          checkTickingSound();
        } else if (levelState.freeClues > 0) {
          levelState.freeClues--;
        } else {
          if (selectedGameMode === 'timer') {
            const penalty = calculateTimePenalty(levelState.currentLevel);
            timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
            checkTickingSound();
            showTimeChange(-penalty);
          } else {
            const penalty = 1 + levelState.currentLevel;
            remainingLives = Math.max(remainingLives - penalty, 0);
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
        updateClueButtonUI(clueButton, selectedGameMode);
      } else if (game.boss && game.boss.id === 'nuclearBomb') {
        // Allow hints for nuclear bomb (time pressure makes it fair)
        feedback.innerHTML = '';

        if (levelState.freeClues > 0) {
          levelState.freeClues--;
          updateClueButtonUI(clueButton, selectedGameMode);
        } else {
          if (selectedGameMode === 'timer') {
            const penalty = calculateTimePenalty(levelState.currentLevel);
            timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
            checkTickingSound();
            showTimeChange(-penalty);
          } else if (selectedGameMode === 'lives') {
            const penalty = 1 + levelState.currentLevel;
            remainingLives = Math.max(remainingLives - penalty, 0);
            updateGameTitle();
          }
          updateClueButtonUI(clueButton, selectedGameMode);
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
      if (clueButton) {
        const maxHint = currentOptions.mode === 'productive' ? 2 : 1;
        if (currentQuestion.hintLevel >= maxHint) {
          clueButton.disabled = true;
          clueButton.textContent = 'No more hints';
        } else {
          updateClueButtonUI(clueButton, selectedGameMode);
        }
      }
      return;
    }

    if (levelState.freeClues > 0) {
      levelState.freeClues--;
      displayClue();
    } else {
      if (selectedGameMode === 'timer') {
        const penalty = calculateTimePenalty(levelState.currentLevel);
        timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
        checkTickingSound();
        showTimeChange(-penalty);
      } else {
        const penalty = 1 + levelState.currentLevel;
        remainingLives = Math.max(remainingLives - penalty, 0);
        updateGameTitle();
      }
      streak = 0;
      displayClue();
    }
    if (clueButton) {
      const maxHint = currentOptions.mode === 'productive' ? 2 : 1;
      if (currentQuestion.hintLevel >= maxHint) {
        clueButton.disabled = true;
        clueButton.textContent = 'No more hints';
      } else {
        updateClueButtonUI(clueButton, selectedGameMode);
      }
    }
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
  const verbatroHud = document.getElementById('verbatro-hud');
  const verbatroJokerArea = document.getElementById('verbatro-joker-area');
  const verbatroRoundEl = document.getElementById('verbatro-round');
  const verbatroChipsEl = document.getElementById('verbatro-chips');
  const verbatroMultEl = document.getElementById('verbatro-mult');
  const verbatroScoreEl = document.getElementById('verbatro-score');
  const verbatroTargetEl = document.getElementById('verbatro-target');
  const verbatroHandsEl = document.getElementById('verbatro-hands');
  const verbatroMoneyEl = document.getElementById('verbatro-money');
  const verbatroShopBtn = document.getElementById('verbatro-shop-button');
  const verbatroShop = document.getElementById('verbatro-shop');
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
  const toggleIgnoreAccentsBtn = document.getElementById('toggle-ignore-accents');
  const titleElement = document.querySelector('.glitch-title');
  const verbTypeLabels = Array.from(document.querySelectorAll('label[data-times]'));

  if (verbatroShopBtn && verbatroShop) {
    verbatroShopBtn.addEventListener('click', () => {
      if (!verbatroState.active) return;
      const nextDisplay = verbatroShop.style.display === 'none' || verbatroShop.style.display === '' ? 'grid' : 'none';
      verbatroShop.style.display = nextDisplay;
      if (nextDisplay !== 'none') {
        renderShop();
      }
    });
  }

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

  const allSfx = sfxAudio;

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

  const chChk = document.getElementById('toggle-chuache-reactions-setting');
  if (chChk) {
    chChk.addEventListener('change', () => {
      settings.chuacheReactionsEnabled = chChk.checked;
      window.chuacheReactionsEnabled = settings.chuacheReactionsEnabled;
      saveSetting('chuacheReactionsEnabled', chChk.checked);
      applyChuacheVisibility();
    });
  }
  const disableBossesChk = document.getElementById('disable-bosses-setting');
  if (disableBossesChk) {
    disableBossesChk.addEventListener('change', () => {
      settings.bossesDisabled = disableBossesChk.checked;
      window.bossesDisabled = settings.bossesDisabled;
      saveSetting('bossesDisabled', disableBossesChk.checked);
    });
  }
  const vosChk = document.getElementById('default-enable-vos-setting');
  if (vosChk) {
    vosChk.addEventListener('change', () => {
      settings.defaultVosEnabled = vosChk.checked;
      window.defaultVosEnabled = settings.defaultVosEnabled;
      saveSetting('defaultVosEnabled', vosChk.checked);
    });
  }

  if (resetSettingsButton) {
    resetSettingsButton.addEventListener('click', () => {
      localStorage.removeItem('musicVolume');
      localStorage.removeItem('sfxVolume');
      localStorage.removeItem('chuacheReactionsEnabled');
      localStorage.removeItem('defaultVosEnabled');
      localStorage.removeItem('bossesDisabled');
      targetVolume = loadSettings();
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
 

  const pronounMap = {
    yo: ['I'],
    tú: ['you'],
    vos: ['you'],
    él: ['he', 'she'],
    ella: ['she'],
    usted: ['you'],
    nosotros: ['we'],
    nosotras: ['we'],
    vosotros: ['you'],
    vosotras: ['you'],
    ellos: ['they'],
    ellas: ['they'],
    ustedes: ['you']
};

  const pronounGroupToActual = {
    yo: ['yo'],
    tú: ['tú'],
    vos: ['vos'],
    él: ['él', 'usted'],
    nosotros: ['nosotros'],
    vosotros: ['vosotros'],
    ellos: ['ellos', 'ustedes']
  };

  const actualPronounToGroup = {
    yo: 'yo',
    tú: 'tú',
    vos: 'vos',
    él: 'él',
    ella: 'él',
    usted: 'él',
    nosotros: 'nosotros',
    nosotras: 'nosotros',
    vosotros: 'vosotros',
    vosotras: 'vosotros',
    ellos: 'ellos',
    ellas: 'ellos',
    ustedes: 'ellos'
  };

  function resolvePronounKeyForForms(groupKey, forms) {
    const candidates = pronounGroupToActual[groupKey] || [groupKey];
    return candidates.find(candidate => forms && forms[candidate]);
  }

  function getPronounGroupForActual(actualPronoun) {
    return actualPronounToGroup[actualPronoun] || actualPronoun;
  }

  function getDisplayPronounForGroup(actualPronoun, groupKey) {
    if (actualPronoun === 'usted' || actualPronoun === 'ustedes') {
      return actualPronoun;
    }

    const displayMap = {
      yo: ['yo'],
      tú: ['tú'],
      vos: ['vos'],
      él: ['él', 'ella', 'usted'],
      nosotros: ['nosotros', 'nosotras'],
      vosotros: ['vosotros', 'vosotras'],
      ellos: ['ellos', 'ellas', 'ustedes']
    };

    const options = displayMap[groupKey] || [groupKey];
    return options[Math.floor(Math.random() * options.length)];
  }

  const pronounToEnglishOptions = {
    yo: [{ display: 'I', key: 'I' }],
    tú: [{ display: 'you', key: 'you' }],
    vos: [{ display: 'you', key: 'you' }],
    él: [{ display: 'he', key: 'he' }, { display: 'she', key: 'she' }],
    ella: [{ display: 'she', key: 'she' }],
    usted: [{ display: 'you', key: 'you_formal' }],
    nosotros: [{ display: 'we', key: 'we' }],
    nosotras: [{ display: 'we', key: 'we' }],
    vosotros: [{ display: 'you all', key: 'you_plural_spain' }],
    vosotras: [{ display: 'you all', key: 'you_plural_spain' }],
    ellos: [{ display: 'they', key: 'they' }],
    ellas: [{ display: 'they', key: 'they' }],
    ustedes: [{ display: 'you all', key: 'you_plural' }]
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

  // Catálogo maestro de irregularidades. Cada objeto describe cómo debe mostrarse y
  // comportarse una categoría dentro de la UI y de los filtros lógicos:
  //   • value: identificador único que se usa en los atributos `data-value` de los
  //     botones y en los listados de `verbObj.types` para hacer los cruces.
  //   • name: texto legible que se muestra en los botones de configuración.
  //   • times: lista de tiempos gramaticales en los que aplica la irregularidad. La
  //     lógica de `filterVerbTypes`, `renderVerbTypeButtons`,
  //     `updateVerbTypeButtonsVisualState` y
  //     `applyIrregularityAndTenseFiltersToVerbList` depende de esta relación para
  //     habilitar/deshabilitar opciones y sincronizar la selección automática.
  //   • hint: ejemplo que se enseña al usuario para recordar la irregularidad.
  //   • infoKey: clave que enlaza con la información contextual mostrada en los
  //     tooltips y modales (`openSpecificModal`).
  // ⚠️ Si se modifica `times`, hay que mantener en sincronía las clases y atributos
  // `.verb-type-button[data-times]` generados en `renderVerbTypeButtons`, ya que
  // `filterVerbTypes` y otros selectores confían en esos valores para evitar errores
  // al ajustar las irregularidades por tiempo verbal.
  const irregularityTypes = [
    { value: 'regular', name: 'Regular',
      times: ['present', 'past_simple', 'present_perfect', 'future_simple', 'condicional_simple', 'imperfect_indicative', 'imperative', 'imperative_negative'],
      hint: '', infoKey: 'regularInfo' },
    { value: 'reflexive', name: 'Reflexive',
      times: ['present', 'past_simple', 'present_perfect', 'future_simple', 'condicional_simple', 'imperfect_indicative', 'imperative', 'imperative_negative'],
      hint: '🪞 lavarse', infoKey: 'reflexiveInfo' },
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
      hint: '⚙️ ir -> iba', infoKey: 'irregularImperfectInfo' },
    { value: 'irregular_imperative', name: 'Irregular imperative', times: ['imperative'],
      hint: '⚙️ tener -> ten', infoKey: 'irregularImperativeInfo' },
    { value: 'irregular_imperative_negative', name: 'Irregular negative imperative', times: ['imperative_negative'],
      hint: '⚙️ ir -> no vayas', infoKey: 'irregularNegativeImperativeInfo' }
  ];

  const REGULAR_TYPE_VALUE = 'regular';
  const regularIrregularityDefinition = irregularityTypes.find(type => type.value === REGULAR_TYPE_VALUE);

  function regularTypeAvailableForTense(tenseKey) {
    return Boolean(regularIrregularityDefinition && regularIrregularityDefinition.times.includes(tenseKey));
  }
  const tenses = [
    { value: 'present', name: 'Present', infoKey: 'presentInfo', color: null },
    { value: 'past_simple', name: 'Simple Past', infoKey: 'pastSimpleInfo', color: 'rgba(183, 28, 28, 0.35)' },
    { value: 'present_perfect', name: 'Present Perfect', infoKey: 'presentPerfectInfo', color: 'rgba(239, 83, 80, 0.3)' },
    { value: 'imperfect_indicative', name: 'Imperfect', infoKey: 'imperfectInfo', color: 'rgba(56, 142, 60, 0.3)' },
    { value: 'future_simple', name: 'Future', infoKey: 'futureInfo', color: 'rgba(30, 136, 229, 0.3)' },
    { value: 'condicional_simple', name: 'Condicional', infoKey: 'conditionalInfo', color: 'rgba(126, 87, 194, 0.3)' },
    { value: 'imperative', name: 'Imperative (Affirmative)', infoKey: 'imperativeAffirmativeInfo', color: 'rgba(255, 202, 40, 0.3)' },
    { value: 'imperative_negative', name: 'Imperative (Negative)', infoKey: 'imperativeNegativeInfo', color: 'rgba(255, 112, 67, 0.3)' }
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

      // Re-renderizar los botones cuando cambien los tiempos
      renderVerbTypeButtons();

      // Aplicar filtros después del re-renderizado
      applyIrregularityAndTenseFiltersToVerbList();
      updateVerbTypeButtonsVisualState();
      updateTenseDropdownCount(); // Llamada existente
      updateSelectAllTensesButtonText(); // << --- AÑADIR ESTA LLAMADA (actualización inicial)
    });
    container.appendChild(btn);
  });
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

      const stateEntry = ensureIrregularityStateEntry(button.dataset.tense);
      stateEntry.selected.delete(button.dataset.value);

      if (selectedTenses.includes('present')) {
        const verbTypeValue = button.dataset.value;
        const multipleIrrBtn = document.querySelector('.verb-type-button[data-value="multiple_irregularities"]');

        if (multipleIrrBtn && multipleIrrBtn.classList.contains('selected')) {
          const irregularRootDef = irregularityTypes.find(it => it.value === 'irregular_root');
          const irregularRootAppliesToPresent = irregularRootDef ? irregularRootDef.times.includes('present') : false;

          if (verbTypeValue === 'first_person_irregular' ||
              (verbTypeValue === 'irregular_root' && irregularRootAppliesToPresent)) {
            multipleIrrBtn.classList.remove('selected');

            const multipleStateEntry = ensureIrregularityStateEntry(multipleIrrBtn.dataset.tense);
            multipleStateEntry.selected.delete(multipleIrrBtn.dataset.value);
          }
        }
      }
    }

    updateVerbTypeButtonLabel(button);
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
      musicIcon.src = ASSET_URLS.musicOn;
      musicIcon.alt = 'Music on';
    }
    volumeSlider.disabled = false;
  } else {
    currentMusic.pause();
    if (musicIcon) {
      musicIcon.src = ASSET_URLS.musicOff;
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

          const irregularFilterState = buildActiveIrregularityFilterState();
          const reflexiveCache = new Map();

          document.querySelectorAll('#verb-groups-panel .group-button')
                .forEach(gb => {
                  const grp = gb.dataset.group;

                  // USA 'currentVerbButtons' para filtrar, NO 'allBtns' directamente
                  const matched = currentVerbButtons.filter(b => { // <--- CAMBIO CRUCIAL AQUÍ: usa currentVerbButtons
                        const inf = b.dataset.value;

                        if (grp === 'all') return true;
                        if (grp === 'reflexive') {
                          if (!inf.endsWith('se')) return false;
                          if (!reflexiveCache.has(inf)) {
                            reflexiveCache.set(
                              inf,
                              shouldIncludeReflexiveVerb(inf, irregularFilterState)
                            );
                          }
                          return reflexiveCache.get(inf);
                        }
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

                        const irregularFilterState = buildActiveIrregularityFilterState();
                        const reflexiveCache = new Map();

                        // ① Recoger solo los botones de verbo que pertenecen a este grupo
                        const matched = allBtns().filter(b => {
                          const inf = b.dataset.value;
                          const normalizedInf = removeAccents(inf);

                          if (grp === 'all') return true;
                          if (grp === 'reflexive') {
                            if (!inf.endsWith('se')) return false;
                            if (!reflexiveCache.has(inf)) {
                              reflexiveCache.set(
                                inf,
                                shouldIncludeReflexiveVerb(inf, irregularFilterState)
                              );
                            }
                            return reflexiveCache.get(inf);
                          }
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

  // Verbos seleccionados manualmente por el usuario en la lista desplegable
  const manuallySelectedVerbInfinitives = Array.from(
    document.querySelectorAll('#verb-buttons .verb-button.selected')
  ).map(b => b.dataset.value);

  if (selectedTypes.length === 0) {
    alert('Please select at least one verb type.');
    allVerbData = [];
    return false;
  }

  const originalSelectedTypesByTense = currentOptions?.selectedTypesByTense || {};
  const originalManualDeselectionsByTense =
    currentOptions?.manuallyDeselectedIrregularities || {};

  const effectiveTenses = currentOptions.tenses.filter(tenseKey => {
    const selectedForTense = originalSelectedTypesByTense[tenseKey] || [];
    return selectedForTense.length > 0;
  });

  if (effectiveTenses.length === 0) {
    alert('Please select at least one irregularity type for the chosen tenses.');
    allVerbData = [];
    return false;
  }

  const selectedTypesByTense = {};
  const manuallyDeselectedByTense = {};

  effectiveTenses.forEach(tenseKey => {
    selectedTypesByTense[tenseKey] = Array.from(
      originalSelectedTypesByTense[tenseKey] || []
    );
    manuallyDeselectedByTense[tenseKey] = Array.from(
      originalManualDeselectionsByTense[tenseKey] || []
    );
  });

  currentOptions.tenses = effectiveTenses;
  currentOptions.selectedTypesByTense = selectedTypesByTense;
  currentOptions.manuallyDeselectedIrregularities = manuallyDeselectedByTense;

  const reflexiveExcludedByTense = {};

  currentOptions.tenses.forEach(tenseKey => {
    const selectedForTense = selectedTypesByTense[tenseKey] || [];
    const manualDeselections = new Set(manuallyDeselectedByTense[tenseKey] || []);

    const reflexiveSelected = selectedForTense.includes('reflexive');
    const reflexiveManuallyDeselected = manualDeselections.has('reflexive');

    reflexiveExcludedByTense[tenseKey] =
      reflexiveManuallyDeselected || !reflexiveSelected;
  });

  const shouldSkipVerbForReflexive = verb => {
    if (!verb || !currentOptions?.tenses?.length) return false;

    const reflexiveAllowedSomewhere = currentOptions.tenses.some(tenseKey => {
      if (reflexiveExcludedByTense[tenseKey]) return false;
      const verbTypesForTense = verb.types?.[tenseKey] || [];
      return verbTypesForTense.includes('reflexive');
    });

    if (reflexiveAllowedSomewhere) {
      return false;
    }

    return currentOptions.tenses.some(tenseKey => {
      if (!reflexiveExcludedByTense[tenseKey]) return false;
      const verbTypesForTense = verb.types?.[tenseKey] || [];
      return verbTypesForTense.includes('reflexive');
    });
  };

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

    verbsToConsiderForGame = verbsToConsiderForGame.filter(v => !shouldSkipVerbForReflexive(v));

    if (verbsToConsiderForGame.length === 0) {
      alert('None of the verbs you manually selected are available for the chosen tenses. Please adjust the tenses or your verb selection.');
      allVerbData = [];
      return false;
    }

  } else {
    verbsToConsiderForGame = initialRawVerbData.filter(v =>
      doesVerbMatchIrregularityFiltersForTenses(
        v,
        currentOptions.tenses,
        selectedTypesByTense,
        manuallyDeselectedByTense
      )
    );

    verbsToConsiderForGame = verbsToConsiderForGame.filter(v => !shouldSkipVerbForReflexive(v));
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

function buildActiveIrregularityFilterState() {
  const selectedTenses = getSelectedTenses();
  const activeTypesByTense = {};
  const manualDeselectionsByTense = {};
  let hasAnyIrregularSelections = false;

  selectedTenses.forEach(tense => {
    const activeButtons = document.querySelectorAll(
      `.verb-type-button.selected:not(:disabled)[data-tense="${tense}"]`
    );
    const activeTypes = Array.from(activeButtons).map(btn => btn.dataset.value);

    if (
      activeTypes.some(
        type =>
          type !== 'reflexive' &&
          type !== REGULAR_TYPE_VALUE
      )
    ) {
      hasAnyIrregularSelections = true;
    }

    activeTypesByTense[tense] = activeTypes;

    const stateEntry = ensureIrregularityStateEntry(tense);
    manualDeselectionsByTense[tense] = new Set(
      stateEntry?.manuallyDeselected || []
    );
  });

  return {
    selectedTenses,
    activeTypesByTense,
    manualDeselectionsByTense,
    hasAnyIrregularSelections
  };
}

function isVerbStrictRegularForTense(types = [], tenseKey = '') {
  if (!Array.isArray(types)) return false;
  return types.every(type => {
    if (type === 'reflexive') return true;
    if (type === REGULAR_TYPE_VALUE) return true;
    return false;
  });
}

function isVerbStrictRegularAcrossAllTenses(verbObj) {
  if (!verbObj || !verbObj.types) return false;
  return Object.entries(verbObj.types).every(([tenseKey, types]) =>
    isVerbStrictRegularForTense(types, tenseKey)
  );
}

function evaluateVerbAgainstTenseFilters(
  verbObj,
  tense,
  selectedTypes = [],
  manualDeselectionsRaw
) {
  const manualDeselections =
    manualDeselectionsRaw instanceof Set
      ? manualDeselectionsRaw
      : new Set(
          Array.isArray(manualDeselectionsRaw)
            ? manualDeselectionsRaw
            : []
        );

  const hasActiveTypes = selectedTypes.length > 0;
  const hasManualDeselections = manualDeselections.size > 0;

  if (!hasActiveTypes && !hasManualDeselections) {
    return { evaluated: false, matches: false };
  }

  const verbTypesForTense = verbObj.types?.[tense] || [];
  const reflexiveSelected =
    selectedTypes.includes('reflexive') &&
    !manualDeselections.has('reflexive');

  if (!reflexiveSelected && verbTypesForTense.includes('reflexive')) {
    return { evaluated: true, matches: false };
  }

  const nonReflexiveSelections = selectedTypes.filter(
    type => type !== 'reflexive'
  );
  const hasNonReflexiveFilters = nonReflexiveSelections.length > 0;
  const requiresRegular = nonReflexiveSelections.includes(REGULAR_TYPE_VALUE);
  const onlyRegularSelected =
    requiresRegular && nonReflexiveSelections.length === 1;
  const remainingTypes = onlyRegularSelected ? [] : nonReflexiveSelections;

  let matchesNonReflexive = false;

  if (hasNonReflexiveFilters) {
    if (requiresRegular && onlyRegularSelected) {
      matchesNonReflexive =
        verbTypesForTense.includes(REGULAR_TYPE_VALUE) &&
        isVerbStrictRegularForTense(verbTypesForTense, tense);
    } else {
      matchesNonReflexive = remainingTypes.some(requiredType => {
        if (requiredType === REGULAR_TYPE_VALUE) {
          return (
            verbTypesForTense.includes(REGULAR_TYPE_VALUE) &&
            isVerbStrictRegularForTense(verbTypesForTense, tense)
          );
        }

        return verbTypesForTense.includes(requiredType);
      });
    }
  }

  const matchesReflexive =
    reflexiveSelected && verbTypesForTense.includes('reflexive');

  let matches = false;

  if (hasNonReflexiveFilters && reflexiveSelected) {
    // When both reflexive and other types are selected, treat the selection
    // as a union so that reflexive verbs are *added* to the pool instead of
    // intersecting with the other filters. This matches the expectation that
    // enabling the reflexive toggle should increase (or at least not decrease)
    // the number of available verbs.
    matches = matchesNonReflexive || matchesReflexive;
  } else if (hasNonReflexiveFilters) {
    matches = matchesNonReflexive;
  } else if (reflexiveSelected) {
    matches = matchesReflexive;
  }

  return {
    evaluated: true,
    matches
  };
}

function shouldIncludeReflexiveVerb(infinitiveEs, filterState) {
  if (!infinitiveEs) return false;
  const verbObj = getVerbObjectByInfinitive(infinitiveEs);
  if (!verbObj) return false;

  const {
    selectedTenses,
    activeTypesByTense,
    manualDeselectionsByTense
  } = filterState;

  if (!selectedTenses || selectedTenses.length === 0) {
    return isVerbStrictRegularAcrossAllTenses(verbObj);
  }

  let evaluatedAtLeastOneTense = false;

  for (const tense of selectedTenses) {
    const manualDeselections = manualDeselectionsByTense[tense] || new Set();
    const activeTypes = activeTypesByTense[tense] || [];
    const verbTypesForTense = verbObj.types?.[tense] || [];

    const reflexiveSelected =
      activeTypes.includes('reflexive') &&
      !manualDeselections.has('reflexive');

    if (!reflexiveSelected) {
      if (manualDeselections.has('reflexive') || verbTypesForTense.includes('reflexive')) {
        evaluatedAtLeastOneTense = true;
      }
      continue;
    }

    const { evaluated, matches } = evaluateVerbAgainstTenseFilters(
      verbObj,
      tense,
      activeTypes,
      manualDeselections
    );

    if (evaluated) {
      evaluatedAtLeastOneTense = true;
      if (matches) {
        return true;
      }
    }
  }

  if (!evaluatedAtLeastOneTense) {
    return isVerbStrictRegularAcrossAllTenses(verbObj);
  }

  return false;
}

function doesVerbMatchIrregularityFiltersForTenses(
  verbObj,
  tenses,
  selectedTypesByTense = {},
  manuallyDeselectedByTense = {}
) {
  if (!verbObj) return false;
  if (!Array.isArray(tenses) || tenses.length === 0) {
    return isVerbStrictRegularAcrossAllTenses(verbObj);
  }

  let evaluatedAnyTense = false;

  for (const tense of tenses) {
    const selectedTypes = Array.isArray(selectedTypesByTense?.[tense])
      ? selectedTypesByTense[tense]
      : [];
    const manualDeselections = manuallyDeselectedByTense?.[tense];

    const { evaluated, matches } = evaluateVerbAgainstTenseFilters(
      verbObj,
      tense,
      selectedTypes,
      manualDeselections
    );

    if (!evaluated) {
      continue;
    }

    evaluatedAnyTense = true;

    if (matches) {
      return true;

    }
  }

  if (!evaluatedAnyTense) {
    return isVerbStrictRegularAcrossAllTenses(verbObj);
  }

  return false;
}

function buildIrregularitySelectionSnapshot(selectedTenses) {
  const selectedTypesByTense = {};
  const manuallyDeselectedByTense = {};

  selectedTenses.forEach(tenseKey => {
    const buttons = document.querySelectorAll(`.verb-type-button.selected[data-tense="${tenseKey}"]`);
    selectedTypesByTense[tenseKey] = Array.from(buttons).map(btn => btn.dataset.value);

    const stateEntry = ensureIrregularityStateEntry(tenseKey);
    manuallyDeselectedByTense[tenseKey] = Array.from(stateEntry?.manuallyDeselected || []);
  });

  return {
    selectedTypesByTense,
    manuallyDeselectedByTense
  };
}

function isReflexiveActiveForTense(tenseKey) {
  if (!tenseKey) return false;

  const selectedTypes = currentOptions?.selectedTypesByTense?.[tenseKey] || [];
  return selectedTypes.includes('reflexive');
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

function ensureIrregularityStateEntry(tenseKey) {
    if (!tenseKey) return { selected: new Set(), manuallyDeselected: new Set() };

    if (!irregularitySelectionState[tenseKey]) {
        irregularitySelectionState[tenseKey] = {
            selected: new Set(),
            manuallyDeselected: new Set()
        };

        if (regularTypeAvailableForTense(tenseKey)) {
            irregularitySelectionState[tenseKey].selected.add(REGULAR_TYPE_VALUE);
        }
    }

    return irregularitySelectionState[tenseKey];
}

function updateVerbTypeButtonLabel(button) {
    if (!button) return;

    const nameSpan = button.querySelector('.verb-type-name');
    if (!nameSpan) return;

    const labelToUse = button.dataset.positiveLabel || nameSpan.textContent;

    if (nameSpan.textContent !== labelToUse) {
        nameSpan.textContent = labelToUse;
    }
}

function updateVerbTypeButtonsVisualState() {
    const selectedVerbElements = Array.from(document.querySelectorAll('#verb-buttons .verb-button.selected'));
    const selectedVerbInfinitives = selectedVerbElements.map(btn => btn.dataset.value);
    const currentSelectedTenses = getSelectedTenses();
    
    // Mapa para trackear qué tipos están activos por tiempo verbal
    const activeTypesByTense = {};
    
    // Inicializar el mapa
    currentSelectedTenses.forEach(tense => {
        activeTypesByTense[tense] = new Set();
    });

    selectedVerbInfinitives.forEach(infinitiveEs => {
        const verbObj = getVerbObjectByInfinitive(infinitiveEs);
        if (verbObj && verbObj.types) {
            currentSelectedTenses.forEach(tense => {
                const typesForTense = verbObj.types[tense] || [];
                const normalizedTypes = new Set(typesForTense);

                normalizedTypes.forEach(type => activeTypesByTense[tense].add(type));
            });
        }
    });

    // Actualizar botones según su tiempo específico
    document.querySelectorAll('.verb-type-button').forEach(typeButton => {
        const typeValue = typeButton.dataset.value;
        const buttonTense = typeButton.dataset.tense; // Nuevo atributo

        if (!buttonTense) return;

        const stateEntry = ensureIrregularityStateEntry(buttonTense);
        const { selected, manuallyDeselected } = stateEntry;

        if (typeButton.disabled) {
            typeButton.classList.remove('selected');
            selected.delete(typeValue);
            manuallyDeselected.delete(typeValue);
            updateVerbTypeButtonLabel(typeButton);
            return;
        }

        const isSelectedInState = selected.has(typeValue);

        if (isSelectedInState) {
            typeButton.classList.add('selected');
            selected.add(typeValue);
            manuallyDeselected.delete(typeValue);
        } else {
            typeButton.classList.remove('selected');
            selected.delete(typeValue);
        }

        updateVerbTypeButtonLabel(typeButton);
    });
}
		
function applyIrregularityAndTenseFiltersToVerbList() {
    const currentSelectedTenses = getSelectedTenses();
    const activeTypesByTense = {};
    const manualDeselectionsByTense = {};

    currentSelectedTenses.forEach(tense => {
        const activeButtons = document.querySelectorAll(`.verb-type-button.selected:not(:disabled)[data-tense="${tense}"]`);
        const activeTypes = Array.from(activeButtons).map(btn => btn.dataset.value);
        activeTypesByTense[tense] = activeTypes;

        const stateEntry = ensureIrregularityStateEntry(tense);
        manualDeselectionsByTense[tense] = new Set(stateEntry.manuallyDeselected);
    });

    const hasAnyFilters = currentSelectedTenses.some(
        tense => (activeTypesByTense[tense] || []).length > 0
    );

    document.querySelectorAll('#verb-buttons .verb-button').forEach(verbButton => {
        if (!hasAnyFilters) return;

        const infinitiveEs = verbButton.dataset.value;
        const verbObj = getVerbObjectByInfinitive(infinitiveEs);
        if (!verbObj) return;

        const shouldSelectVerb = doesVerbMatchIrregularityFiltersForTenses(
            verbObj,
            currentSelectedTenses,
            activeTypesByTense,
            manualDeselectionsByTense
        );

        verbButton.classList.toggle('selected', shouldSelectVerb);
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
    updateProgressUI(game, selectedGameMode, progressContainer, score);
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
  const endButton = document.getElementById('end-button');
  if (endButton) {
    endButton.disabled = false;
    endButton.removeAttribute('disabled');
  }
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

  const selectedTypesByTense = currentOptions.selectedTypesByTense || {};
  const manualDeselectionsByTense =
    currentOptions.manuallyDeselectedIrregularities || {};

  const availableTenses = currentOptions.tenses.filter(tenseKey => {
    if (!v.conjugations?.[tenseKey]) return false;

    const selectedTypes = selectedTypesByTense[tenseKey] || [];
    const manualDeselections = manualDeselectionsByTense[tenseKey];

    const { evaluated, matches } = evaluateVerbAgainstTenseFilters(
      v,
      tenseKey,
      selectedTypes,
      manualDeselections
    );

    // Si no se evaluó (por ejemplo, sin filtros activos), permitimos el tiempo
    // para mantener compatibilidad con configuraciones más antiguas.
    if (!evaluated) return true;

    return matches;
  });
  if (availableTenses.length === 0) {
    console.warn(
      `No available tenses for ${v.infinitive_es} with current selection. Skipping.`
    );
    setTimeout(prepareNextQuestion, 50);
    return;
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
 
  if (!usedVerbs.includes(v.infinitive_es)) {
    usedVerbs.push(v.infinitive_es);
  }

  const tKey = availableTenses[Math.floor(Math.random() * availableTenses.length)];
  const tenseObj = tenses.find(t => t.value === tKey);
  const tenseLabel = tenseObj ? tenseObj.name : tKey;

  const forms = v.conjugations[tKey];
  if (!forms) {
    console.error(`Missing conjugations for ${v.infinitive_es} in ${tKey}`);
    setTimeout(prepareNextQuestion, 50);
    return;
  }

  const availablePronounOptions = pronList
    .map(groupKey => {
      const resolvedPronoun = resolvePronounKeyForForms(groupKey, forms);
      if (!resolvedPronoun) return null;
      return { group: groupKey, actual: resolvedPronoun };
    })
    .filter(Boolean);

  if (availablePronounOptions.length === 0) {
    console.warn(`No available pronouns for ${v.infinitive_es} in ${tKey} with current pronoun selection.`);
    setTimeout(prepareNextQuestion, 50);
    return;
  }

  const { group: pronounGroup, actual: resolvedPronoun } =
    availablePronounOptions[Math.floor(Math.random() * availablePronounOptions.length)];
  const displayPronoun = getDisplayPronounForGroup(resolvedPronoun, pronounGroup);
  const correctES = forms[resolvedPronoun];
  if (!correctES) {
    console.error(`Missing ${resolvedPronoun} form for ${v.infinitive_es} in ${tKey}`);
    setTimeout(prepareNextQuestion, 50);
    return;
  }

  const rawEN = v.infinitive_en.toLowerCase();                   // p.ej. "to remember / to recall"
  const expectedEN = rawEN
    .split(/\s*\/\s*/)                                           // ["to remember", "to recall"]
    .map(s => s.replace(/^to\s+/, '').trim());                  // ["remember","recall"]

  currentQuestion = {
    verb: v,
    pronoun: resolvedPronoun,
    pronounGroup,
    displayPronoun,
    answer: correctES,
    expectedEN,                                                  // ahora es array
    tenseKey: tKey,
    hintLevel: 0
  };
  if (selectedGameMode === 'verbatro') {
    verbatroState.backspaceUsed = false;
  }
  startTime = Date.now();
  questionStartTime = Date.now();
  totalQuestions++;
  ansES.value = '';
  ansEN.value = '';
  if (clueButton) clueButton.disabled = false;
  updateClueButtonUI(clueButton, selectedGameMode);
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

  const checkAnswerButton = document.getElementById('check-answer-button');
  if (ansES) ansES.disabled = false;
  if (ansEN) ansEN.disabled = false;
  if (checkAnswerButton) checkAnswerButton.disabled = false;

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

  isCheckingAnswer = false;
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
  // Ensure no residual Chuache reaction when a boss appears
  if (typeof chuacheSound !== 'undefined') {
    chuacheSound.pause();
    chuacheSound.currentTime = 0;
  }
  const bubble = document.getElementById('speech-bubble');
  if (bubble) {
    bubble.classList.add('hidden');
    bubble.classList.remove('error');
  }
  const image = document.getElementById('chuache-image');
  if (image) image.src = ASSET_URLS.conjuchuache;
  if (selectedGameMode === 'study') return;
levelState.bossesEncounteredTotal++;
levelState.currentBossNumber++;
  document.body.classList.add('boss-battle-bg');
  if (gameContainer) gameContainer.classList.add('boss-battle-bg');

  let bossKeys = Object.keys(bosses);
  // Reset the cycle if all bosses have been encountered
  if (game.usedBosses.length === bossKeys.length) {
    game.usedBosses = [];
  }
  // Exclude bosses already encountered in this cycle
  bossKeys = bossKeys.filter(key => !game.usedBosses.includes(key));

  const selectedBossKey = bossKeys[Math.floor(Math.random() * bossKeys.length)];
  const currentBoss = bosses[selectedBossKey];
  game.lastBossUsed = selectedBossKey;
  game.usedBosses.push(selectedBossKey);

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
  const cycleIndex = Math.floor((levelState.currentBossNumber - 1) / 4);
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
      bossImage.src = ASSET_URLS.bossHack;
    } else if (selectedBossKey === 'skynetGlitch') {
      // Configurar como video para Boss 2
      bossImage = configureBossVideo(bossImage, ASSET_URLS.bossSkynetVideo);
      bossImage.src = ASSET_URLS.bossSkynetVideo;
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
      bossImage.src = ASSET_URLS.bossT1000;
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
      `Level Boss #${levelState.currentBossNumber} - ${bossTypeNumber}/4 (0/${game.boss.totalVerbsNeeded}) | Total Score: ${score}`;
    progressContainer.style.color = '#FF0000';
  }

  if (checkAnswerButton) checkAnswerButton.disabled = false;
  if (skipButton) skipButton.disabled = true;
  if (clueButton) {
    if (selectedBossKey === 'skynetGlitch' || selectedBossKey === 'nuclearBomb' || selectedBossKey === 'mirrorT1000') {
      clueButton.disabled = false;
      updateClueButtonUI(clueButton, selectedGameMode);
    } else {
      clueButton.disabled = true;
      clueButton.textContent = 'No Hints.';
    }
  }
}

// Verbatro helpers
function getVerbatroRoundConfig(roundNumber) {
  const matched = verbatroRoundConfigs.find(cfg => cfg.round === roundNumber);
  if (matched) return matched;
  const lastConfig = verbatroRoundConfigs[verbatroRoundConfigs.length - 1];
  const scale = Math.pow(1.6, Math.max(0, roundNumber - lastConfig.round));
  return {
    round: roundNumber,
    targetScore: Math.round(lastConfig.targetScore * scale),
    maxHands: lastConfig.maxHands
  };
}

function applyVerbatroRoundConfig(roundNumber) {
  const cfg = getVerbatroRoundConfig(roundNumber);
  verbatroState.round = roundNumber;
  verbatroState.targetScore = cfg.targetScore;
  verbatroState.maxHands = cfg.maxHands;
  verbatroState.handsRemaining = cfg.maxHands;
  verbatroState.roundMistakes = 0;
  verbatroState.backspaceUsed = false;
  updateVerbatroUI();
}

async function loadVerbatroData() {
  if (verbatroState.jokerData.length > 0) return true;
  const data = await jokersJsonPromise;
  if (Array.isArray(data)) {
    verbatroState.jokerData = data;
    return true;
  }
  return false;
}

function rollJokerRarity() {
  const roll = Math.random();
  if (roll < 0.7) return 'common';
  if (roll < 0.95) return 'uncommon';
  return 'rare';
}

function pickJokersForShop() {
  const available = verbatroState.jokerData.filter(j => !verbatroState.inventory.some(inv => inv.id === j.id));
  const byRarity = available.reduce((acc, joker) => {
    acc[joker.rarity] = acc[joker.rarity] || [];
    acc[joker.rarity].push(joker);
    return acc;
  }, {});

  const result = [];
  for (let i = 0; i < 3; i++) {
    let rarity = rollJokerRarity();
    let pool = byRarity[rarity] || [];
    if (pool.length === 0) {
      const fallbackOrder = ['common', 'uncommon', 'rare'];
      rarity = fallbackOrder.find(r => (byRarity[r] || []).length > 0) || rarity;
      pool = byRarity[rarity] || [];
    }
    if (!pool.length) break;
    const choice = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    result.push(choice);
  }
  return result;
}

function renderVerbatroJokers(jokers = verbatroState.inventory) {
  if (!verbatroJokerArea) return;
  verbatroJokerArea.innerHTML = '';
  if (!jokers.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'verbatro-joker-card';
    placeholder.textContent = 'No Jokers equipped yet';
    verbatroJokerArea.appendChild(placeholder);
    return;
  }

  jokers.forEach(joker => {
    const card = document.createElement('div');
    card.className = 'verbatro-joker-card';
    card.dataset.jokerId = joker.id;
    card.innerHTML = `
      <span class="joker-name">${joker.name}</span>
      <span class="joker-desc">${joker.description}</span>
      <span class="joker-cost">$${joker.cost}</span>
    `;
    verbatroJokerArea.appendChild(card);
  });
}

function triggerJokerAnimation(jokerId) {
  if (!verbatroJokerArea) return;
  const card = verbatroJokerArea.querySelector(`[data-joker-id="${jokerId}"]`);
  if (!card) return;
  card.classList.add('triggered');
  setTimeout(() => card.classList.remove('triggered'), 700);
}

function updateVerbatroUI(latestHand = { chips: verbatroState.baseChips, mult: verbatroState.baseMult }) {
  if (!verbatroHud) return;
  verbatroHud.style.display = selectedGameMode === 'verbatro' ? 'block' : 'none';
  if (!verbatroState.active) return;

  if (verbatroRoundEl) verbatroRoundEl.textContent = verbatroState.round;
  if (verbatroScoreEl) verbatroScoreEl.textContent = verbatroState.currentScore;
  if (verbatroTargetEl) verbatroTargetEl.textContent = verbatroState.targetScore;
  if (verbatroHandsEl) verbatroHandsEl.textContent = verbatroState.handsRemaining;
  if (verbatroMoneyEl) verbatroMoneyEl.textContent = `$${verbatroState.money}`;
  if (verbatroChipsEl) verbatroChipsEl.textContent = latestHand.chips;
  if (verbatroMultEl) verbatroMultEl.textContent = `x${latestHand.mult}`;
  const levelTextEl = document.getElementById('level-text');
  if (levelTextEl) {
    levelTextEl.textContent = `Verbatro Round ${verbatroState.round} | Target: ${verbatroState.targetScore}`;
  }
  renderVerbatroJokers();

  score = verbatroState.currentScore;
  updateScore();
}

function stripAccents(str = '') {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function countDoubleLetterPairs(str = '') {
  let pairs = 0;
  for (let i = 0; i < str.length - 1; i++) {
    if (str[i] === str[i + 1]) pairs++;
  }
  return pairs;
}

function isCognate(verbObj = {}) {
  const es = stripAccents((verbObj.infinitive_es || '').replace(/se$/i, '')).toLowerCase();
  const en = ((verbObj.infinitive_en || '').split('/')[0] || '').replace(/^to\s+/, '').trim().toLowerCase();
  return es && en && es.slice(0, 3) === en.slice(0, 3);
}

function evaluateJokerCondition(joker, context) {
  const { question, verbObj, userInput, responseTime } = context;
  if (!joker.condition || !joker.condition.target) return true;

  const infinitive = (verbObj?.infinitive_es || '').toLowerCase();
  const pronoun = question?.pronoun || '';
  const normalizedInput = userInput.toLowerCase();
  const tenseKey = question?.tenseKey || '';
  const typesForTense = verbObj?.types?.[tenseKey] || [];
  const length = normalizedInput.length;

  switch (joker.condition.target) {
    case 'verb_ending':
      return infinitive.endsWith(String(joker.condition.value).toLowerCase());
    case 'input_length_lte':
      return length <= Number(joker.condition.value);
    case 'input_length_gte':
      return length >= Number(joker.condition.value);
    case 'starts_with_vowel':
      return /^[aeiouáéíóúü]/i.test(normalizedInput);
    case 'ends_with_consonant':
      return /[bcdfghjklmnñpqrstvwxyz]$/i.test(normalizedInput);
    case 'ends_with_any':
      return Array.isArray(joker.condition.value)
        ? joker.condition.value.some(letter => normalizedInput.endsWith(letter))
        : false;
    case 'contains_letter':
      return normalizedInput.includes(String(joker.condition.value || '').toLowerCase());
    case 'contains_substring':
      return normalizedInput.includes(String(joker.condition.value || '').toLowerCase());
    case 'contains_any_letter':
      return (joker.condition.value || []).some(letter => normalizedInput.includes(String(letter).toLowerCase()));
    case 'has_accent':
      return /[áéíóúü]/i.test(userInput);
    case 'response_time_lt':
      return responseTime > 0 && responseTime < Number(joker.condition.value);
    case 'pronoun':
      return pronoun === joker.condition.value;
    case 'pronoun_in':
      return (joker.condition.value || []).includes(pronoun);
    case 'pronoun_plural':
      return ['nosotros', 'vosotros', 'ellos', 'ustedes'].includes(pronoun);
    case 'even_length':
      return length % 2 === 0;
    case 'odd_length':
      return length % 2 === 1;
    case 'double_letter_pairs':
      return countDoubleLetterPairs(normalizedInput) > 0;
    case 'is_reflexive':
      return infinitive.endsWith('se');
    case 'is_irregular':
      return (typesForTense || []).some(t => t !== 'regular');
    case 'is_regular':
      return (typesForTense || []).every(t => t === 'regular') && typesForTense.length > 0;
    case 'stem_changing':
      return (typesForTense || []).includes('stem_changing');
    case 'no_letter':
      return !infinitive.includes(String(joker.condition.value || '').toLowerCase());
    case 'early_accent': {
      const accentIndex = userInput.search(/[áéíóúü]/i);
      return accentIndex >= 0 && accentIndex < Math.max(0, userInput.length - 2);
    }
    case 'no_backspace':
      return !verbatroState.backspaceUsed;
    case 'no_clue_used':
      return (question?.hintLevel || 0) === 0;
    case 'no_errors_in_round':
      return verbatroState.roundMistakes === 0;
    case 'cognate':
      return isCognate(verbObj);
    case 'tense_in':
      return (joker.condition.value || []).includes(tenseKey);
    case 'double_letter_pairs_count':
      return countDoubleLetterPairs(normalizedInput) >= Number(joker.condition.value || 1);
    case 'auto_complete_chance':
      return Math.random() < Number(joker.condition.value || 0);
    default:
      return false;
  }
}

function calculateVerbatroScore(question, userInput, responseTime = 0) {
  const verbObj = question?.verb || {};
  const normalizedInput = (userInput || '').trim();

  verbatroState.streak += 1;

  let chips = verbatroState.baseChips;
  let mult = verbatroState.baseMult;
  let bonusMoney = 0;
  let coinflipFailed = false;
  const triggeredEffects = [];

  const context = { question, verbObj, userInput: normalizedInput, responseTime };

  const applyEffect = effect => {
    if (!effect || !effect.type) return;
    switch (effect.type) {
      case 'mult_add':
        mult += Number(effect.value) || 0;
        break;
      case 'chips_add':
        chips += Number(effect.value) || 0;
        break;
      case 'mult_multiplier':
        mult *= Number(effect.value) || 1;
        break;
      case 'chips_multiplier':
        chips *= Number(effect.value) || 1;
        break;
      case 'chips_add_per_pair': {
        const pairs = countDoubleLetterPairs(normalizedInput.toLowerCase());
        chips += pairs * (Number(effect.value) || 0);
        break;
      }
      case 'mult_add_per_letter':
        mult += normalizedInput.length * (Number(effect.value) || 0);
        break;
      case 'chips_add_per_common': {
        const commons = verbatroState.inventory.filter(j => j.rarity === 'common').length;
        chips += commons * (Number(effect.value) || 0);
        break;
      }
      case 'money_add':
        bonusMoney += Number(effect.value) || 0;
        break;
      case 'money_interest': {
        const interest = Math.min(Number(effect.max) || 0, Math.floor(verbatroState.money / 5)) * (Number(effect.value) || 0);
        bonusMoney += interest;
        break;
      }
      case 'mult_add_streak':
        mult += verbatroState.streak * (Number(effect.value) || 0);
        break;
      case 'mult_add_per_boss':
        mult += verbatroState.bossesDefeated * (Number(effect.value) || 0);
        break;
      case 'coinflip_reward': {
        if (Math.random() < 0.5) {
          bonusMoney += Number(effect.success_money) || 0;
        } else {
          coinflipFailed = true;
        }
        break;
      }
      case 'chips_from_infinitive': {
        const rawInf = (verbObj.infinitive_es || '').replace(/se$/i, '');
        chips = rawInf.length * (Number(effect.value) || 0);
        break;
      }
      case 'double_apply':
        triggeredEffects.push(effect);
        break;
      default:
        break;
    }
  };

  verbatroState.inventory.forEach(joker => {
    const triggered = evaluateJokerCondition(joker, context);
    if (triggered) {
      applyEffect(joker.effect);
      if (joker.effect?.type !== 'double_apply') {
        triggeredEffects.push(joker.effect);
      }
      triggerJokerAnimation(joker.id);
    }
  });

  if (triggeredEffects.some(e => e?.type === 'double_apply')) {
    triggeredEffects
      .filter(e => e && e.type !== 'double_apply')
      .forEach(applyEffect);
  }

  if (coinflipFailed) {
    verbatroState.streak = 0;
    return { chips: 0, mult: 0, score: 0 };
  }

  const finalScore = chips * mult;
  verbatroState.currentScore += finalScore;

  let moneyGain = 2;
  if (verbatroState.streak >= 6) moneyGain = 4;
  else if (verbatroState.streak >= 3) moneyGain = 3;
  moneyGain += bonusMoney;
  verbatroState.money += Math.max(0, Math.floor(moneyGain));

  return { chips, mult, score: finalScore };
}

function checkRoundWinCondition() {
  if (verbatroState.currentScore >= verbatroState.targetScore) {
    const unusedBonus = verbatroState.handsRemaining * 5;
    if (unusedBonus > 0) {
      verbatroState.money += unusedBonus;
    }
    feedback.textContent = '🎯 Blind cleared! Shop refreshed.';
    verbatroState.round += 1;
    verbatroState.currentScore = 0;
    applyVerbatroRoundConfig(verbatroState.round);
    renderShop();
    updateVerbatroUI();
  }
}

function checkRoundLossCondition() {
  if (verbatroState.handsRemaining <= 0 && verbatroState.currentScore < verbatroState.targetScore) {
    feedback.textContent = '❌ Out of hands! Blind failed.';
    verbatroState.active = false;
    triggerGameOver();
  }
}

function renderShop() {
  if (!verbatroShop) return;
  verbatroState.shopInventory = pickJokersForShop();

  verbatroShop.innerHTML = '';
  verbatroState.shopInventory.forEach(joker => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="joker-name">${joker.name}</div>
      <div class="joker-desc">${joker.description}</div>
      <div class="joker-cost">Cost: $${joker.cost} • ${joker.rarity}</div>
    `;

    const buyBtn = document.createElement('button');
    buyBtn.textContent = 'Buy';
    buyBtn.disabled = verbatroState.money < joker.cost || verbatroState.inventory.length >= 5;
    buyBtn.addEventListener('click', () => buyJoker(joker));
    card.appendChild(buyBtn);
    verbatroShop.appendChild(card);
  });
}

function buyJoker(joker) {
  if (verbatroState.money < joker.cost) return;
  if (verbatroState.inventory.some(j => j.id === joker.id)) return;
  if (verbatroState.inventory.length >= 5) return;
  verbatroState.money -= joker.cost;
  verbatroState.inventory.push(joker);
  renderShop();
  updateVerbatroUI();
}

function startVerbatroMode() {
  verbatroState.active = true;
  verbatroState.money = 4;
  verbatroState.currentScore = 0;
  verbatroState.streak = 0;
  verbatroState.roundMistakes = 0;
  verbatroState.bossesDefeated = 0;
  verbatroState.inventory = [];
  verbatroState.shopInventory = [];
  verbatroState.baseChips = 10;
  verbatroState.baseMult = 1;
  verbatroState.backspaceUsed = false;
  applyVerbatroRoundConfig(1);
  renderShop();
  updateVerbatroUI();
  game.verbsInPhaseCount = 0;
  game.gameState = 'PLAYING';
  levelState.bossesEncounteredTotal = 0;
  levelState.currentBossNumber = 0;
  levelState.freeClues = 0;
  updateClueButtonUI(clueButton, selectedGameMode);
  if (verbatroHud) verbatroHud.style.display = 'block';
  if (verbatroShop) verbatroShop.style.display = 'none';
  if (document.getElementById('timer-container')) {
    document.getElementById('timer-container').style.display = 'none';
  }
  const livesMechanicsDisplay = document.getElementById('lives-mechanics-display');
  if (livesMechanicsDisplay) livesMechanicsDisplay.style.display = 'none';
  if (feedback) feedback.innerHTML = '';
  score = verbatroState.currentScore;
  renderShop();
  updateVerbatroUI();
}

function deactivateVerbatroMode() {
  verbatroState.active = false;
  if (verbatroHud) verbatroHud.style.display = 'none';
  if (verbatroShop) verbatroShop.style.display = 'none';
}

function checkAnswer() {
  try {
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
          progressContainer.textContent = `Level Boss #${levelState.currentBossNumber} - T-1000 (${game.boss.verbsCompleted}/${game.boss.totalVerbsNeeded}) | Total Score: ${score}`;
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
          const penalty = calculateTimePenalty(levelState.currentLevel);
          timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
          checkTickingSound();
          showTimeChange(-penalty);
        } else if (selectedGameMode === 'lives') {
          const penalty = 1 + levelState.currentLevel;
          remainingLives = Math.max(remainingLives - penalty, 0);
          currentStreakForLife = 0;
          updateTotalCorrectForLifeDisplay();
          updateStreakForLifeDisplay();
          updateGameTitle();
          if (remainingLives <= 0) {
            triggerGameOver();
            console.log(`Stats: ${totalCorrect}/${totalQuestions} correct, ${totalIncorrect} incorrect`);
            return;
          }
        }

        streak = 0;
        multiplier = 1.0;

        if (feedback) feedback.textContent = '❌ ¡Incorrecto!';
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

        const currentBossNumber = levelState.currentLevel + 1;
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
        const penalty = calculateTimePenalty(levelState.currentLevel);
        timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
        checkTickingSound();
        showTimeChange(-penalty);
      } else if (selectedGameMode === 'lives') {
        const penalty = 1 + levelState.currentLevel;
        remainingLives = Math.max(remainingLives - penalty, 0);
        currentStreakForLife = 0;
        isPrizeVerbActive = false;
        updateTotalCorrectForLifeDisplay();
        updateStreakForLifeDisplay();
        updateGameTitle();
        if (remainingLives <= 0) {
          triggerGameOver();
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
  if (isReflexive && isReflexiveActiveForTense(currentQuestion.tenseKey)) {
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
    const activePronounGroups = (Array.isArray(window.pronouns) && window.pronouns.length > 0)
      ? window.pronouns
      : pronouns;

    const spPronouns = Object
      .entries(allForms)
      .filter(([p, form]) => {
        const groupKey = getPronounGroupForActual(p);
        return activePronounGroups.includes(groupKey) && form === spanishForm;
      })
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

    // Determine if answering this question will trigger a boss battle next
    const willStartBoss =
      selectedGameMode !== 'study' &&
      !settings.bossesDisabled &&
      game.verbsInPhaseCount + 1 === VERBS_PER_PHASE_BEFORE_BOSS;

    const responseTime = (Date.now() - questionStartTime) / 1000;
    totalResponseTime += responseTime;
    if (responseTime < fastestAnswer) fastestAnswer = responseTime;

    // Manejo del sonido
    if (soundCorrect) {
      soundCorrect.pause();
      soundCorrect.currentTime = 0;
      soundCorrect.play().catch(()=>{/* ignora errores por autoplay */});
    }
    // Avoid Chuache reactions on the last pre-boss question
    if (!willStartBoss) {
      chuacheSpeaks('correct');
    }

    if (selectedGameMode === 'timer' || selectedGameMode === 'lives') {
      levelState.correctAnswersTotal++;
      updateLevelAndVisuals({
        game,
        selectedGameMode,
        score,
        clueButton,
        playFromStart,
        soundLevelUp,
        progressContainer
      });
      updateProgressUI(game, selectedGameMode, progressContainer, score);
    }

    if (isStudyMode) {
      feedback.textContent = 'Correct!';
      setTimeout(prepareNextQuestion, 200);
      return;
    }

    if (selectedGameMode === 'verbatro') {
      const rawInput = (currentOptions.mode === 'productive' || currentOptions.mode === 'productive_easy')
        ? ansES.value.trim()
        : ansEN.value.trim();
      const handResult = calculateVerbatroScore(currentQuestion, rawInput, responseTime);
      feedback.textContent = `✅ (${handResult.chips} chips) x${handResult.mult} = ${handResult.score}`;
      updateVerbatroUI(handResult);
      prepareNextQuestion();
      checkRoundWinCondition();
      if (ansES) ansES.value = '';
      if (ansEN) ansEN.value = '';
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
    if (
      game.verbsInPhaseCount === VERBS_PER_PHASE_BEFORE_BOSS &&
      selectedGameMode !== 'study' &&
      !settings.bossesDisabled
    ) {
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
      "reflexive": "🪞",
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
      "reflexive": "Reflexive",
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

    if (selectedGameMode === 'verbatro') {
      verbatroState.handsRemaining = Math.max(0, verbatroState.handsRemaining - 1);
      verbatroState.streak = 0;
      verbatroState.roundMistakes += 1;
      feedback.textContent = '❌ Mano perdida. -1 hand';
      updateVerbatroUI();
      prepareNextQuestion();
      checkRoundLossCondition();
      if (ansES) ansES.value = '';
      if (ansEN) ansEN.value = '';
      return;
    }

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
      const penalty = calculateTimePenalty(levelState.currentLevel);
      timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
      checkTickingSound();
      showTimeChange(-penalty);
    } else {
      timerTimeLeft = Math.max(0, timerTimeLeft - 3);
      checkTickingSound();
      showTimeChange(-3);
    }

    if (selectedGameMode === 'lives') {
        const penalty = 1 + levelState.currentLevel;
        remainingLives = Math.max(remainingLives - penalty, 0);
        currentStreakForLife = 0;
        isPrizeVerbActive = false;
        updateTotalCorrectForLifeDisplay();
        updateStreakForLifeDisplay();
        currentStreakForLife = 0;
        updateStreakForLifeDisplay();
        updateGameTitle();
        if (remainingLives <= 0) {
            triggerGameOver();
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
  } finally {
    // CORRECCIÓN: Resetear el flag para permitir nuevas respuestas
    setTimeout(() => {
      isCheckingAnswer = false;
    }, 100);
  }
  console.log(`Stats: ${totalCorrect}/${totalQuestions} correct, ${totalIncorrect} incorrect`);
}
	
function startTimerMode() {
  deactivateVerbatroMode();
  if (game.boss && game.boss.countdownInterval) {
    clearInterval(game.boss.countdownInterval);
    game.boss.countdownInterval = null;
  }
  game.verbsInPhaseCount = 0;
  game.gameState = 'PLAYING';
  totalQuestions = 0;
  totalCorrect = 0;
  totalIncorrect = 0;
  totalResponseTime = 0;
  verbsMissed = [];
  fastestAnswer = Infinity;
  bestStreak = 0;
levelState.bossesEncounteredTotal = 0;
  levelState.currentBossNumber = 0;
  document.getElementById('timer-container').style.display = 'flex';
  levelState.freeClues = 3;
  updateClueButtonUI(clueButton, selectedGameMode);
  resetLevelState(game, selectedGameMode, score);
  updateProgressUI(game, selectedGameMode, progressContainer, score);
  updateBackgroundForLevel(levelState.currentLevel + 1);
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
  deactivateVerbatroMode();
  if (game.boss && game.boss.countdownInterval) {
    clearInterval(game.boss.countdownInterval);
    game.boss.countdownInterval = null;
  }
  game.verbsInPhaseCount = 0;
  game.gameState = 'PLAYING';
  totalQuestions = 0;
  totalCorrect = 0;
  totalIncorrect = 0;
  totalResponseTime = 0;
  verbsMissed = [];
  fastestAnswer = Infinity;
  bestStreak = 0;
levelState.bossesEncounteredTotal = 0;
  levelState.currentBossNumber = 0;
  levelState.freeClues = 3;
  updateClueButtonUI(clueButton, selectedGameMode);
  resetLevelState(game, selectedGameMode, score);
  updateProgressUI(game, selectedGameMode, progressContainer, score);
  updateBackgroundForLevel(levelState.currentLevel + 1);
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
    const penalty = calculateTimePenalty(levelState.currentLevel);  // ← CAMBIO: usar penalty escalado
    timerTimeLeft = Math.max(0, timerTimeLeft - penalty);
    checkTickingSound();
    showTimeChange(-penalty);
  } else if (selectedGameMode === 'lives') {
    const penalty = 1 + levelState.currentLevel;  // ← CAMBIO: usar penalty escalado
    remainingLives = Math.max(remainingLives - penalty, 0);
    currentStreakForLife = 0;
    updateStreakForLifeDisplay();
    updateGameTitle();
    updateTotalCorrectForLifeDisplay();

    // Verificar game over
    if (remainingLives <= 0) {
      triggerGameOver();
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

                        const englishOptions = spPronounsMatchingForm.flatMap(sp => pronounToEnglishOptions[sp] || []);
                        const uniqueEnglishOptions = [];
                        const seenEnglishOptions = new Set();

                        englishOptions.forEach(option => {
                                const key = `${option.display}|${option.key}`;
                                if (!seenEnglishOptions.has(key)) {
                                        seenEnglishOptions.add(key);
                                        uniqueEnglishOptions.push(option);
                                }
                        });

                        if (uniqueEnglishOptions.length > 0) {
                                const formsForCurrentTenseEN_Skip = verbData.conjugations_en[tense];

                                if (!formsForCurrentTenseEN_Skip) {
                                        feedbackMessage = `⏭ Skipped. Error: Missing ENGLISH conjugations for '${verbData.infinitive_en}' in tense '${tense}'. English Infinitive: <strong>${verbData.infinitive_en}</strong>`;
                                } else {
                                        const expectedAnswersArray = uniqueEnglishOptions.flatMap(({ display, key }) => {
                                                const conjugatedVerbEN = formsForCurrentTenseEN_Skip[key];
                                                if (!conjugatedVerbEN) return [];
                                                const displayText = display === 'I' ? 'I' : display.toLowerCase();
                                                return [`<strong>${displayText} ${conjugatedVerbEN.toLowerCase()}</strong>`];
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
                remainingLives = Math.max(remainingLives - 1, 0);
                updateGameTitle();
                updateTotalCorrectForLifeDisplay();

                // 3) Comprobar GAME OVER
                if (remainingLives <= 0) {
                  triggerGameOver();
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
levelState.bossesEncounteredTotal = 0;
  levelState.currentBossNumber = 0;
  levelState.correctAnswersTotal = 0;
  levelState.currentLevel = 0;
  game.scanlineRemoved = false;
  
  // Ocultar elementos específicos del juego
  const timerContainer = document.getElementById('timer-container');
  const gameScreen = document.getElementById('game-screen');
  const configFlowScreen = document.getElementById('config-flow-screen');
  
  if (timerContainer) timerContainer.style.display = 'none';
  if (gameScreen) gameScreen.classList.remove('study-mode-active', 't1000-active', 'no-scanline');
  
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
    musicIcon.src = musicPlaying ? ASSET_URLS.musicOn : ASSET_URLS.musicOff;
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
    resetBossVisuals();
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

    if (settings.defaultVosEnabled) {
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
    const irregularitySnapshot = buildIrregularitySelectionSnapshot(selTenses);
    currentOptions.selectedTypesByTense = irregularitySnapshot.selectedTypesByTense;
    currentOptions.manuallyDeselectedIrregularities = irregularitySnapshot.manuallyDeselectedByTense;
    resetBackgroundColor();
    updateBackgroundForLevel(1);
    // selectedGameMode ya debería estar seteado por el `selectedMode` de este nuevo flujo
    // Asegúrate de que `selectedGameMode` (variable global) se actualice con `selectedMode`
    // cuando se confirma el modo. Ej: selectedGameMode = selectedMode;

    if (!await loadVerbs()) return; // loadVerbs necesita usar los filtros correctos
    if (window.selectedGameMode === 'verbatro') {
        const jokersLoaded = await loadVerbatroData();
        if (!jokersLoaded) {
            alert('No se pudieron cargar los Jokers.');
            return;
        }
    }

    // Ocultar pantalla de configuración de flujo y mostrar pantalla de juego
    configFlowScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    gameScreen.classList.remove('study-mode-active');
    if (selectedGameMode === 'study') {
        gameScreen.classList.add('study-mode-active');
    }
    if (settings.chuacheReactionsEnabled) {
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
    } else if (window.selectedGameMode === 'verbatro') {
        startVerbatroMode();
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
                    musicIcon.src = ASSET_URLS.musicOff;
                    musicIcon.alt = 'Music off';
                }
            }
            musicToggle.style.display = 'block';
            volumeSlider.style.display = 'block';
            volumeSlider.value = targetVolume;
            volumeSlider.disabled = gameMusic.paused;
        }, 1000);
        prepareNextQuestion();
    } else {
        deactivateVerbatroMode();
        game.verbsInPhaseCount = 0;
        game.gameState = 'PLAYING';
        levelState.bossesEncounteredTotal = 0;
        levelState.currentBossNumber = 0;
        levelState.freeClues = 0;
        updateClueButtonUI(clueButton, selectedGameMode);
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
                    musicIcon.src = ASSET_URLS.musicOff;
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

    const trackBackspace = e => {
      if (selectedGameMode === 'verbatro' && e.key === 'Backspace') {
        verbatroState.backspaceUsed = true;
      }
    };
    if (ansES) ansES.addEventListener('keydown', trackBackspace);
    if (ansEN) ansEN.addEventListener('keydown', trackBackspace);

    if (endButton) {
      endButton.disabled = false;
      endButton.removeAttribute('disabled');
      endButton.classList.remove('electric-effect');
    }
    // (Estas ya las tienes definidas más arriba, así que no necesitas redeclararlas, solo asegúrate de que su ámbito sea accesible aquí)

    function focusAnswerInput() {
      if (game.boss && game.boss.id === 'mirrorT1000') {
        if (ansES) ansES.focus();
      } else if (currentOptions.mode === 'receptive') {
        if (ansEN) ansEN.focus();
      } else if (ansES) {
        ansES.focus();
      }
    }

    if (checkAnswerButton) checkAnswerButton.addEventListener('click', e => {
      if (!isCheckingAnswer) {
        isCheckingAnswer = true;
        checkAnswerButton.disabled = true;
        if (ansES) ansES.disabled = true;
        if (ansEN) ansEN.disabled = true;
        checkAnswer();
        if (ansES) ansES.disabled = false;
        if (ansEN) ansEN.disabled = false;
        checkAnswerButton.disabled = false;
        focusAnswerInput();
      }
    });
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

    function handleAnswerKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isCheckingAnswer) {
          isCheckingAnswer = true;
          if (ansES) ansES.disabled = true;
          if (ansEN) ansEN.disabled = true;
          if (checkAnswerButton) checkAnswerButton.disabled = true;
          checkAnswer();
          if (ansES) ansES.disabled = false;
          if (ansEN) ansEN.disabled = false;
          if (checkAnswerButton) checkAnswerButton.disabled = false;
          focusAnswerInput();
        }
      }
    }
    if (ansES) ansES.addEventListener('keydown', handleAnswerKeydown);
    if (ansEN) ansEN.addEventListener('keydown', handleAnswerKeydown);

    const statsModal = document.getElementById('stats-modal');
    const statsBackdrop = document.getElementById('stats-modal-backdrop');
    const statsContinueButton = document.getElementById('stats-continue-button');
    const closeStatsModalBtn = document.getElementById('close-stats-modal-btn');
    function closeStatsModal() {
      if (statsModal && statsBackdrop) {
        statsModal.style.display = 'none';
        statsBackdrop.style.display = 'none';
        document.body.classList.remove('tooltip-open-no-scroll');
        resetBossVisuals();
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
                level: (selectedGameMode === 'timer' || selectedGameMode === 'lives') ? levelState.currentLevel + 1 : null
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
  const selectedTenses = getSelectedTenses();
  
  container.innerHTML = '';

  if (selectedTenses.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; font-style: italic;">Select tenses to see irregularity options</p>';
    return;
  }

  // Agrupar irregularidades por tiempo verbal
  const tenseGroups = {};
  
  selectedTenses.forEach(tenseKey => {
    const tenseObj = tenses.find(t => t.value === tenseKey);
    const tenseLabel = tenseObj ? tenseObj.name : tenseKey;
    
    tenseGroups[tenseKey] = {
      label: tenseLabel,
      irregularities: irregularityTypes.filter(type => type.times.includes(tenseKey))
    };
  });

  const shortDescriptionsSource =
    typeof globalThis !== 'undefined' && globalThis.tenseShortDescriptions
      ? globalThis.tenseShortDescriptions
      : {};

  // Crear secciones para cada tiempo verbal
  Object.entries(tenseGroups).forEach(([tenseKey, group]) => {
    if (group.irregularities.length === 0) return;

    const tenseObj = tenses.find(t => t.value === tenseKey);
    const tenseInfoKey = tenseObj?.infoKey || '';
    const tenseColor = tenseObj?.color;

    // Contenedor para los botones de esta sección
    const sectionContainer = document.createElement('div');
    sectionContainer.className = 'tense-irregularity-section';
    sectionContainer.dataset.tense = tenseKey;

    if (tenseColor) {
      sectionContainer.style.backgroundColor = tenseColor;
    } else if (tenseKey === 'present') {
      sectionContainer.style.backgroundColor = 'transparent';
    }

    // Cabecera (título + icono de ayuda)
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'tense-section-header-content';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tense-section-title';
    titleSpan.textContent = group.label;
    headerWrapper.appendChild(titleSpan);

    if (tenseInfoKey && typeof specificInfoData !== 'undefined' && specificInfoData[tenseInfoKey]) {
      const helpIcon = document.createElement('img');
      helpIcon.src = ASSET_URLS.helpIcon;
      helpIcon.alt = 'Help';
      helpIcon.className = 'section-help-icon';
      helpIcon.dataset.infoKey = tenseInfoKey;
      helpIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof soundClick !== 'undefined') safePlay(soundClick);
        openSpecificModal(tenseInfoKey);
      });
      headerWrapper.appendChild(helpIcon);
    }

    const sectionHeader = document.createElement('h4');
    sectionHeader.className = 'tense-section-header';
    sectionHeader.appendChild(headerWrapper);

    const descriptionText = shortDescriptionsSource[tenseKey] || '';
    if (descriptionText) {
      const descriptionElement = document.createElement('em');
      descriptionElement.className = 'tense-section-description';
      descriptionElement.textContent = descriptionText;
      sectionHeader.appendChild(descriptionElement);
    }

    container.appendChild(sectionHeader);

    const stateEntry = ensureIrregularityStateEntry(tenseKey);
    const validTypeValues = new Set(group.irregularities.map(type => type.value));

    Array.from(stateEntry.selected).forEach(value => {
      if (!validTypeValues.has(value)) {
        stateEntry.selected.delete(value);
      }
    });

    Array.from(stateEntry.manuallyDeselected).forEach(value => {
      if (!validTypeValues.has(value)) {
        stateEntry.manuallyDeselected.delete(value);
      }
    });

    if (
      stateEntry.selected.size === 0 &&
      regularTypeAvailableForTense(tenseKey)
    ) {
      stateEntry.selected.add(REGULAR_TYPE_VALUE);
      stateEntry.manuallyDeselected.delete(REGULAR_TYPE_VALUE);
    }

    group.irregularities.forEach(type => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('verb-type-button');
      button.dataset.value = type.value;
      button.dataset.tense = tenseKey; // Añadir referencia al tiempo
      button.dataset.times = type.times.join(',');
      button.dataset.infokey = type.infoKey;
      button.dataset.positiveLabel = type.name;

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

      if (stateEntry.selected.has(type.value)) {
        button.classList.add('selected');
      }

      button.addEventListener('click', () => {
        if (soundClick) safePlay(soundClick);

        const wasSelected = button.classList.contains('selected');

        if (wasSelected) {
          const siblingsSelected = Array.from(
            sectionContainer.querySelectorAll('.verb-type-button.selected')
          ).filter(btn => btn !== button);

          if (siblingsSelected.length === 0) {
            updateVerbTypeButtonLabel(button);
            return;
          }
        }

        button.classList.toggle('selected');
        const isNowSelected = button.classList.contains('selected');

        if (isNowSelected) {
          stateEntry.selected.add(type.value);
          stateEntry.manuallyDeselected.delete(type.value);
        } else {
          stateEntry.selected.delete(type.value);
          stateEntry.manuallyDeselected.add(type.value);
        }

        // Lógica de dependencia mejorada por tiempo verbal
        if (tenseKey === 'present') {
          const multipleIrrBtn = sectionContainer.querySelector('.verb-type-button[data-value="multiple_irregularities"]');
          if (multipleIrrBtn && multipleIrrBtn.classList.contains('selected')) {
            const irregularRootDef = irregularityTypes.find(it => it.value === 'irregular_root');
            const irregularRootAppliesToPresent = irregularRootDef ? irregularRootDef.times.includes('present') : false;

            if ((button.dataset.value === 'first_person_irregular' ||
                (button.dataset.value === 'irregular_root' && irregularRootAppliesToPresent)) &&
                !isNowSelected) {
              multipleIrrBtn.classList.remove('selected');
              stateEntry.selected.delete(multipleIrrBtn.dataset.value);
              stateEntry.manuallyDeselected.add(multipleIrrBtn.dataset.value);
              updateVerbTypeButtonLabel(multipleIrrBtn);
            }
          }
        }

        applyIrregularityAndTenseFiltersToVerbList();
        updateVerbTypeButtonsVisualState();
        updateVerbTypeButtonLabel(button);
      });

      updateVerbTypeButtonLabel(button);
      sectionContainer.appendChild(button);
    });

    container.appendChild(sectionContainer);
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
    'productive_easy': 'ConjugAte',
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
      livesWrapper.innerHTML = `<span id="lives-count">${remainingLives}</span><img src="${ASSET_URLS.heart}" alt="life" style="width:40px; height:40px; vertical-align: middle; margin-left: 6px;">`;
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
  if (!settings.animationsEnabled) return;
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

  function calculateGameStats() {
    const totalAnswered = totalCorrect + totalIncorrect;
    const accuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const avgTime = totalAnswered ? (totalResponseTime / totalAnswered).toFixed(1) : 0;
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
      totalQuestions: totalAnswered,
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
