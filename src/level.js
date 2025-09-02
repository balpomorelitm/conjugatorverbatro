export const levelState = {
  bossesEncounteredTotal: 0,
  currentBossNumber: 0,
  correctAnswersTotal: 0,
  currentLevel: 0,
  freeClues: 0
};

export const LEVEL_GOAL_TIMER = 10;
export const LEVEL_GOAL_LIVES = 10;

export function triggerLevelUpShake() {
  const gameContainer = document.body;
  gameContainer.classList.remove('level-up-shake');
  setTimeout(() => {
    gameContainer.classList.add('level-up-shake');
  }, 10);
}

export function updateLevelText(newText) {
  const levelElement = document.getElementById('level-text');
  if (!levelElement) return;
  levelElement.classList.add('is-fading');
  setTimeout(() => {
    levelElement.innerText = newText;
    levelElement.classList.remove('is-fading');
  }, 300);
}

export function darkenColor(hex, percent) {
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

export function updateBackgroundForLevel(level) {
  const body = document.body;
  if (level >= 8) {
    body.classList.add('iridescent-level');
  } else {
    body.classList.remove('iridescent-level');
  }
}

export function calculateTimePenalty(level) {
  if (level === 0) return 3;
  if (level === 1) return 6;
  if (level === 2) return 13;
  if (level === 3) return 25;
  return 25 * Math.pow(2, level - 3);
}

export function updateClueButtonUI(clueButton, selectedGameMode) {
  if (!clueButton) return;

  if (selectedGameMode === 'timer') {
    if (levelState.freeClues > 0) {
      clueButton.textContent = `Use Clue (${levelState.freeClues})`;
    } else {
      const penalty = calculateTimePenalty(levelState.currentLevel);
      clueButton.textContent = `Get Clue (Cost: ${penalty}s)`;
    }
  } else if (selectedGameMode === 'lives') {
    if (levelState.freeClues > 0) {
      clueButton.textContent = `Use Clue (${levelState.freeClues})`;
    } else {
      const penalty = 1 + levelState.currentLevel;
      const lifeText = penalty === 1 ? 'life' : 'lives';
      clueButton.textContent = `Get Clue (Cost: ${penalty} ${lifeText})`;
    }
  } else {
    clueButton.textContent = 'Get Clue';
  }
}

export function resetLevelState(game, selectedGameMode, score) {
  if (game.boss && game.boss.countdownInterval) {
    clearInterval(game.boss.countdownInterval);
    game.boss.countdownInterval = null;
  }
  levelState.correctAnswersTotal = 0;
  levelState.currentLevel = 0;

  const levelText = document.getElementById('level-text');
  if (levelText) {
    const goal = selectedGameMode === 'lives' ? LEVEL_GOAL_LIVES : LEVEL_GOAL_TIMER;
    levelText.textContent = `Level 1 (0/${goal}) | Total Score: ${score}`;
  }
}

export function updateProgressUI(game, selectedGameMode, progressContainer, score) {
  if (game.gameState !== 'PLAYING') return;
  if (!progressContainer) return;

  const goal = selectedGameMode === 'lives' ? LEVEL_GOAL_LIVES : LEVEL_GOAL_TIMER;
  const progress = levelState.correctAnswersTotal % goal;

  const newText = `Level ${levelState.currentLevel + 1} (${progress}/${goal}) | Total Score: ${score}`;
  updateLevelText(newText);
}

export function updateLevelAndVisuals({
  game,
  selectedGameMode,
  score,
  clueButton,
  playFromStart,
  soundLevelUp,
  progressContainer
}) {
  let newLevel = 0;
  const timeMode = selectedGameMode === 'timer';
  const livesMode = selectedGameMode === 'lives';

  if (timeMode) {
    newLevel = Math.floor(levelState.correctAnswersTotal / LEVEL_GOAL_TIMER);
  } else if (livesMode) {
    newLevel = Math.floor(levelState.correctAnswersTotal / LEVEL_GOAL_LIVES);
  }

  if (newLevel > levelState.currentLevel) {
    levelState.currentLevel = newLevel;
    levelState.freeClues++;
    updateClueButtonUI(clueButton, selectedGameMode);

    const levelColors = [
      '#2913CE', // Level 2
      '#54067C', // Level 3
      '#5B3704', // Level 4
      '#7C1717', // Level 5
      '#254747', // Level 6
      '#000000', // Level 7
      '#000000'  // Level 8+
    ];

    const colorIndex = Math.min(levelState.currentLevel - 1, levelColors.length - 1);
    const newBodyColor = levelColors[colorIndex];
    const newPanelColor = darkenColor(newBodyColor, 15);

    const gameMainPanel = document.getElementById('game-main-panel');
    const gameHeaderPanel = document.getElementById('game-header-panel');
    const bottomPanel = document.getElementById('bottom-panel');
    const chuacheBox = document.getElementById('chuache-box');

    triggerLevelUpShake();
    if (playFromStart && soundLevelUp) playFromStart(soundLevelUp);
    const goal = livesMode ? LEVEL_GOAL_LIVES : LEVEL_GOAL_TIMER;
    updateLevelText(`Level ${levelState.currentLevel + 1} (0/${goal}) | Total Score: ${score}`);
    document.body.style.backgroundColor = newBodyColor;
    if (gameMainPanel) gameMainPanel.style.backgroundColor = newPanelColor;
    if (gameHeaderPanel) gameHeaderPanel.style.backgroundColor = newPanelColor;
    if (bottomPanel) bottomPanel.style.backgroundColor = newPanelColor;
    if (chuacheBox) chuacheBox.style.backgroundColor = darkenColor(newBodyColor, 25);

    updateProgressUI(game, selectedGameMode, progressContainer, score);
    updateBackgroundForLevel(levelState.currentLevel + 1);
  }
}
