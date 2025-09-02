export let recorderEnabled = true;
window.recorderEnabled = recorderEnabled;

async function queryRecorderState() {
  if (!navigator.mediaDevices || typeof window.MediaRecorder === 'undefined') {
    console.warn('Recorder API not supported; disabling recorder.');
    recorderEnabled = false;
    window.recorderEnabled = recorderEnabled;
    return { supported: false };
  }
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    console.warn('Service worker controller missing; recorder disabled.');
    recorderEnabled = false;
    window.recorderEnabled = recorderEnabled;
    return { supported: false };
  }

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
    recorderEnabled = !!(result && result.supported);
    window.recorderEnabled = recorderEnabled;
    if (!recorderEnabled) {
      console.warn('Recorder disabled by service worker response.');
    }
    return result;
  } catch (err) {
    console.error('Could not obtain recorder state:', err);
    recorderEnabled = false;
    window.recorderEnabled = recorderEnabled;
    return { supported: false };
  }
}

export async function requestRecorderState() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported; recorder disabled.');
    recorderEnabled = false;
    window.recorderEnabled = recorderEnabled;
    return { supported: false };
  }
  try {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) {
      return await queryRecorderState();
    } else {
      const result = await queryRecorderState();
      navigator.serviceWorker.addEventListener('controllerchange', () => requestRecorderState(), { once: true });
      return result;
    }
  } catch (err) {
    console.error('Recorder state check failed:', err);
    recorderEnabled = false;
    window.recorderEnabled = recorderEnabled;
    return { supported: false };
  }
}
