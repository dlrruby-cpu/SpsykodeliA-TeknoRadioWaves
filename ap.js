// ============================================================
// MANEJO DEL MODAL LEGAL
// ============================================================
(function setupLegalModal() {
  const modal = document.getElementById('legalModal');
  const acceptBtn = document.getElementById('acceptLegalBtn');
  const statusMsg = document.getElementById('statusMessage');

  if (localStorage.getItem('legalAccepted') === 'true') {
    modal.style.display = 'none';
    if (statusMsg.textContent === 'ACEPTA LOS TÉRMINOS PRIMERO') {
      statusMsg.textContent = 'TOCA PARA EMPEZAR';
    }
    return;
  }

  modal.style.display = 'flex';

  acceptBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem('legalAccepted', 'true');
    modal.style.display = 'none';
    statusMsg.textContent = 'TOCA PARA EMPEZAR';
    if (typeof startRadio === 'function' && tracks && tracks.length > 0) {
      startRadio();
    }
  });
})();

// ============================================================
// LISTA DE PISTAS
// ============================================================
const LOCAL_TRACKS = [
  "track1_liveonthebeat_dalørex.mp3",
  "track2_raveep1_psykodelialabtekno.mp3",
  "track3_fuckwarsep_zair.mp3",
  "track4_accionv1_psykodeliatkno.mp3",
  "track5_velocity_pskodeliateknowaves.mp3",
  "track6_healingfrequencys_psykodeliateknowaves.mp3",
  "track7_Cuoredirave_Valmad.mp3",
  "track8_expaciux_xailor.mp3",
  "track9_raveep1_psykodelialabtekno.mp3",
  "track10_Raveep1_psykodelialabtekno.mp3"
];

const DEMO_TRACK = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
const LOGO_TOP_PATH = 'logo_top.png';

// ============================================================
// REPRODUCTOR DE AUDIO
// ============================================================
let audioCtx, tracks = [], currentIdx = -1, isPlaying = false, hasStarted = false;
let gainA, gainB, sourceA, sourceB, activeGain = 'A', masterGain, mixTimer, analyser;
let currentMode = 'mix';
const MIX_SEGMENT = 144;
const MIX_CROSSFADE = 15;
const PLAYLIST_CROSSFADE = 8;
const vizCanvas = document.getElementById('vizCanvas');
const ctxViz = vizCanvas.getContext('2d');
const statusMsg = document.getElementById('statusMessage');
const btnMix = document.getElementById('btnMix');
const btnPlaylist = document.getElementById('btnPlaylist');
let deckA = { source: null, gain: null, startTime: 0, offset: 0 };
let deckB = { source: null, gain: null, startTime: 0, offset: 0 };

function resizeVizCanvas() {
  const rect = vizCanvas.parentElement.getBoundingClientRect();
  vizCanvas.width = rect.width;
  vizCanvas.height = rect.height;
}
resizeVizCanvas();
window.addEventListener('resize', resizeVizCanvas);

function getAC() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function setupMaster() {
  const ac = getAC();
  if (!masterGain) {
    masterGain = ac.createGain();
    masterGain.gain.value = 0.9;
    analyser = ac.createAnalyser();
    analyser.fftSize = 256;
    masterGain.connect(analyser);
    analyser.connect(ac.destination);
  }
  if (!gainA) { gainA = ac.createGain(); gainA.gain.value = 0; gainA.connect(masterGain); }
  if (!gainB) { gainB = ac.createGain(); gainB.gain.value = 0; gainB.connect(masterGain); }
}

async function loadBufferFromUrl(url) {
  const ac = getAC();
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const buf = await resp.arrayBuffer();
  return await ac.decodeAudioData(buf);
}

async function loadTracks(urlList) {
  for (const url of urlList) {
    try {
      const buffer = await loadBufferFromUrl(url);
      const name = url.split('/').pop().replace(/\.[^/.]+$/, "").toUpperCase();
      tracks.push({ name, url, duration: buffer.duration, buffer });
      console.log('✅ Cargada: ' + name);
    } catch (e) {
      console.warn('❌ Falló: ' + url, e.message);
    }
  }
}

async function initTracks() {
  try {
    statusMsg.textContent = 'CARGANDO PISTAS...';
    await loadTracks(LOCAL_TRACKS);
    if (tracks.length === 0) {
      statusMsg.textContent = 'USANDO DEMO...';
      await loadTracks([DEMO_TRACK]);
    }
    if (tracks.length === 0) {
      statusMsg.textContent = 'ERROR: SIN PISTAS';
    } else {
      if (localStorage.getItem('legalAccepted') === 'true') {
        statusMsg.textContent = 'TOCA PARA EMPEZAR';
      } else {
        statusMsg.textContent = 'ACEPTA LOS TÉRMINOS PRIMERO';
      }
      if (hasStarted && tracks.length > 0) {
        startRadio();
      }
    }
  } catch (e) {
    console.error('Error en initTracks:', e);
    statusMsg.textContent = 'ERROR AL CARGAR';
  }
}

function stopSource(src) {
  if (src) {
    try { src.stop(); } catch (e) {}
    src.disconnect();
  }
}

function stopAll() {
  stopSource(sourceA);
  sourceA = null;
  stopSource(sourceB);
  sourceB = null;
  if (mixTimer) clearTimeout(mixTimer);
}

function transitionToNext() {
  if (!isPlaying || tracks.length === 0) return;
  const nextIdx = (currentIdx + 1) % tracks.length;
  const otherGain = activeGain === 'A' ? gainB : gainA;
  const currentGain = activeGain === 'A' ? gainA : gainB;

  stopSource(activeGain === 'A' ? sourceB : sourceA);

  const source = playSegment(otherGain, nextIdx, 0, 0.001);
  if (source) {
    if (activeGain === 'A') {
      sourceB = source;
      activeGain = 'B';
      deckB = { source, gain: gainB, startTime: audioCtx.currentTime, offset: 0 };
    } else {
      sourceA = source;
      activeGain = 'A';
      deckA = { source, gain: gainA, startTime: audioCtx.currentTime, offset: 0 };
    }
    currentIdx = nextIdx;
    const duration = currentMode === 'mix' ? MIX_CROSSFADE : PLAYLIST_CROSSFADE;
    crossfadeVolumes(currentGain, otherGain, duration);
    scheduleNext();
    statusMsg.textContent = tracks[currentIdx].name;
  }
}

function playSegment(gainNode, trackIndex, startOffset, initialVol) {
  const ac = getAC();
  setupMaster();
  if (trackIndex < 0 || trackIndex >= tracks.length) return null;
  const track = tracks[trackIndex];
  const source = ac.createBufferSource();
  source.buffer = track.buffer;
  source.connect(gainNode);
  const now = ac.currentTime;
  source.start(0, startOffset);
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(initialVol, now);

  source.onended = function() {
    if (isPlaying && currentIdx === trackIndex) {
      if (mixTimer) clearTimeout(mixTimer);
      transitionToNext();
    }
  };

  if (currentMode === 'mix') {
    const playDuration = Math.min(MIX_SEGMENT, track.duration - startOffset);
    source.stop(now + playDuration);
    if (mixTimer) clearTimeout(mixTimer);
    const wait = Math.max(0, playDuration - MIX_CROSSFADE);
    mixTimer = setTimeout(() => {
      if (isPlaying && currentMode === 'mix') {
        transitionToNext();
      }
    }, wait * 1000);
  }

  return source;
}

function crossfadeVolumes(fromGain, toGain, duration) {
  const ac = getAC();
  const now = ac.currentTime;
  fromGain.gain.cancelScheduledValues(now);
  fromGain.gain.setValueAtTime(fromGain.gain.value || 0.9, now);
  fromGain.gain.linearRampToValueAtTime(0.001, now + duration);
  toGain.gain.cancelScheduledValues(now);
  toGain.gain.setValueAtTime(0.001, now);
  toGain.gain.linearRampToValueAtTime(0.9, now + duration);
}

function scheduleNext() {
  if (!isPlaying || tracks.length === 0) return;
  if (mixTimer) clearTimeout(mixTimer);

  const currentDeck = activeGain === 'A' ? deckA : deckB;
  const currentTrack = tracks[currentIdx];
  if (!currentTrack || !currentDeck.source) {
    setTimeout(() => { if (isPlaying) transitionToNext(); }, 500);
    return;
  }

  const elapsed = audioCtx.currentTime - currentDeck.startTime + currentDeck.offset;
  let remaining;
  if (currentMode === 'mix') {
    remaining = MIX_SEGMENT - elapsed;
  } else {
    remaining = currentTrack.duration - elapsed;
  }

  const crossfadeTime = currentMode === 'mix' ? MIX_CROSSFADE : PLAYLIST_CROSSFADE;
  if (remaining <= crossfadeTime + 0.5) {
    setTimeout(() => { if (isPlaying) transitionToNext(); }, 100);
    return;
  }

  const wait = remaining - crossfadeTime;
  mixTimer = setTimeout(() => {
    if (isPlaying) transitionToNext();
  }, wait * 1000);
}

function startRadio() {
  if (tracks.length === 0) return;
  getAC();
  setupMaster();
  stopAll();

  if (currentIdx < 0 || currentIdx >= tracks.length) currentIdx = 0;

  const source = playSegment(gainA, currentIdx, 0, 0.9);
  if (source) {
    sourceA = source;
    activeGain = 'A';
    deckA = { source, gain: gainA, startTime: audioCtx.currentTime, offset: 0 };
    isPlaying = true;
    statusMsg.textContent = tracks[currentIdx].name;
    scheduleNext();
  }
}

function switchMode(mode) {
  if (currentMode === mode || tracks.length === 0) return;
  currentMode = mode;
  btnMix.classList.toggle('active', mode === 'mix');
  btnPlaylist.classList.toggle('active', mode === 'playlist');
  if (isPlaying) {
    stopAll();
    startRadio();
  }
}

btnMix.addEventListener('click', function(e) {
  e.stopPropagation();
  switchMode('mix');
});
btnPlaylist.addEventListener('click', function(e) {
  e.stopPropagation();
  switchMode('playlist');
});

function handleFirstTouch(e) {
  if (document.getElementById('legalModal').style.display !== 'none') return;
  if (e.target === btnMix || e.target === btnPlaylist || e.target.closest('.paypal-btn')) return;

  if (hasStarted) {
    if (e.target.closest('.display-screen') || e.target.id === 'vizCanvas') {
      if (isPlaying) {
        stopAll();
        isPlaying = false;
        statusMsg.textContent = 'PAUSA';
      } else {
        startRadio();
      }
    }
    return;
  }

  getAC();
  hasStarted = true;
  if (tracks.length === 0) {
    initTracks().then(() => {
      if (tracks.length > 0) startRadio();
    });
  } else {
    startRadio();
  }
}

document.body.addEventListener('click', handleFirstTouch);
document.body.addEventListener('touchstart', handleFirstTouch);

// ============================================================
// VISUALIZADOR SIMPLE
// ============================================================
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  const w = vizCanvas.width, h = vizCanvas.height;
  const cx = w / 2, cy = h / 2;
  const baseRadius = Math.min(w, h) * 0.25;
  const time = Date.now() * 0.008;

  ctxViz.clearRect(0, 0, w, h);

  if (!analyser || !isPlaying) {
    const pulse = Math.sin(time * 0.8) * 4;
    ctxViz.beginPath();
    ctxViz.arc(cx, cy, baseRadius + pulse, 0, Math.PI * 2);
    ctxViz.strokeStyle = 'rgba(0,255,255,0.6)';
    ctxViz.lineWidth = 2;
    ctxViz.stroke();
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  let avg = 0;
  for (let i = 0; i < bufferLength; i++) avg += dataArray[i];
  avg = avg / bufferLength / 255;

  // Círculo central reactivo
  const mainRadius = baseRadius * (0.85 + avg * 0.7);
  ctxViz.beginPath();
  ctxViz.arc(cx, cy, mainRadius, 0, Math.PI * 2);
  ctxViz.fillStyle = 'rgba(0,255,255,0.2)';
  ctxViz.fill();
  ctxViz.strokeStyle = 'rgba(0,255,255,0.8)';
  ctxViz.lineWidth = 2;
  ctxViz.stroke();

  // Barras de frecuencia
  const barCount = 48;
  const barWidth = w / barCount;
  for (let i = 0; i < barCount; i++) {
    const value = dataArray[Math.floor(i * bufferLength / barCount)] / 255;
    const barHeight = value * h * 0.3;
    ctxViz.fillStyle = `rgba(0,255,255,0.6)`;
    ctxViz.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
  }
}
drawVisualizer();

// ============================================================
// LOGO PRINCIPAL
// ============================================================
async function loadLogo(path, containerId) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) return;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Logo';
    const target = document.getElementById(containerId);
    if (target) {
      target.innerHTML = '';
      target.appendChild(img);
    }
  } catch (e) { console.warn('Logo no encontrado:', path); }
}
loadLogo(LOGO_TOP_PATH, 'logoTopContainer');

// ============================================================
// INICIO DE CARGA DE PISTAS
// ============================================================
initTracks();