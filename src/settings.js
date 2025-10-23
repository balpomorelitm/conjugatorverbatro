/**
 * Gestiona las preferencias persistidas del usuario.
 * Claves almacenadas en localStorage:
 *  - musicVolume: volumen de la música de fondo.
 *  - sfxVolume: volumen de los efectos de sonido.
 *  - chuacheReactionsEnabled: muestra u oculta las reacciones de Chuache.
 *  - defaultVosEnabled: habilita el voseo por defecto.
 */
import { menuMusic, gameMusic, audioElements } from './audio.js';

export const settings = {
  animationsEnabled: false,
  chuacheReactionsEnabled: (() => {
    const stored = localStorage.getItem('chuacheReactionsEnabled');
    return stored !== null ? stored === 'true' : true;
  })(),
  defaultVosEnabled: false,
  bossesDisabled: (() => {
    const stored = localStorage.getItem('bossesDisabled');
    return stored !== null ? stored === 'true' : true;
  })()
};

if (typeof window !== 'undefined') {
  window.animationsEnabled = settings.animationsEnabled;
  window.chuacheReactionsEnabled = settings.chuacheReactionsEnabled;
  window.defaultVosEnabled = settings.defaultVosEnabled;
  window.bossesDisabled = settings.bossesDisabled;
}

// Lista de efectos de sonido, excluyendo las pistas de música.
const sfxAudio = audioElements.filter(a => a !== menuMusic && a !== gameMusic);

export function saveSetting(key, value) {
  localStorage.setItem(key, value);
}

export function applyChuacheVisibility() {
  const box = document.getElementById('chuache-box');
  const headerChar = document.querySelector('.header-char');
  if (settings.chuacheReactionsEnabled) {
    if (box) box.style.display = '';
    if (headerChar) headerChar.style.display = '';
  } else {
    if (box) box.style.display = 'none';
    if (headerChar) headerChar.style.display = 'none';
  }
}

// Aplica la visibilidad inicial según la configuración almacenada.
applyChuacheVisibility();

export function loadSettings() {
  const musicVol = localStorage.getItem('musicVolume');
  const sfxVol = localStorage.getItem('sfxVolume');
  const chuache = localStorage.getItem('chuacheReactionsEnabled');
  const vos = localStorage.getItem('defaultVosEnabled');
  const bosses = localStorage.getItem('bossesDisabled');

  if (localStorage.getItem('animationsEnabled') !== null) {
    localStorage.removeItem('animationsEnabled');
  }
  settings.animationsEnabled = false;
  settings.chuacheReactionsEnabled = chuache !== null ? chuache === 'true' : true;
  settings.defaultVosEnabled = vos === 'true';
  settings.bossesDisabled = bosses !== null ? bosses === 'true' : true;

  if (typeof window !== 'undefined') {
    window.animationsEnabled = settings.animationsEnabled;
    window.chuacheReactionsEnabled = settings.chuacheReactionsEnabled;
    window.defaultVosEnabled = settings.defaultVosEnabled;
    window.bossesDisabled = settings.bossesDisabled;
  }

  if (musicVol !== null) {
    const vol = parseFloat(musicVol);
    menuMusic.volume = vol;
    gameMusic.volume = vol;
    const slider = document.getElementById('music-volume-slider');
    if (slider) slider.value = vol;
  } else {
    const slider = document.getElementById('music-volume-slider');
    if (slider) slider.value = 0.2;
    menuMusic.volume = 0.2;
    gameMusic.volume = 0.2;
  }

  if (sfxVol !== null) {
    const vol = parseFloat(sfxVol);
    sfxAudio.forEach(a => { a.volume = vol; });
    const sfxSlider = document.getElementById('sfx-volume-slider');
    if (sfxSlider) sfxSlider.value = vol;
  } else {
    const sfxSlider = document.getElementById('sfx-volume-slider');
    if (sfxSlider) sfxSlider.value = 1.0;
    sfxAudio.forEach(a => { a.volume = 1.0; });
  }

  const chuacheChk = document.getElementById('toggle-chuache-reactions-setting');
  if (chuacheChk) chuacheChk.checked = settings.chuacheReactionsEnabled;
  const vosChk = document.getElementById('default-enable-vos-setting');
  if (vosChk) vosChk.checked = settings.defaultVosEnabled;
  const bossesChk = document.getElementById('disable-bosses-setting');
  if (bossesChk) bossesChk.checked = settings.bossesDisabled;

  applyChuacheVisibility();

  return menuMusic.volume;
}
