const SCRIPT_SRC = 'https://meet.jit.si/external_api.js';
let scriptPromise = null;

export function loadJitsiScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Jitsi 스크립트 로드 실패'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function extractRoomName(roomUrl) {
  if (!roomUrl) return null;
  try {
    const u = new URL(roomUrl);
    return u.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

export function extractDomain(roomUrl) {
  if (!roomUrl) return 'meet.jit.si';
  try {
    return new URL(roomUrl).host;
  } catch {
    return 'meet.jit.si';
  }
}
