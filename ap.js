// ============================================================
// CONFIGURACIÓN DE DONACIONES
// ============================================================
const DONATION_EMAIL = 'dlr.ruby@gmail.com';
const DONATION_CURRENCY = 'EUR';
const DONATION_ITEM = 'PsykodeliA TeknoRadio';

// ============================================================
// 1. MANEJO DEL MODAL LEGAL (INDEPENDIENTE Y ROBUSTO)
// ============================================================
(function setupLegalModal() {
  const modal = document.getElementById('legalModal');
  const acceptBtn = document.getElementById('acceptLegal');
  const statusMsg = document.getElementById('statusMessage');

  // Si ya aceptó, ocultar modal y cambiar mensaje
  if (localStorage.getItem('legalAccepted') === 'true') {
    modal.style.display = 'none';
    if (statusMsg.textContent === 'ACEPTA LOS TÉRMINOS PRIMERO') {
      statusMsg.textContent = 'TOCA PARA EMPEZAR';
    }
    return;
  }

  // Mostrar modal
  modal.style.display = 'flex';

  // Evento del botón Aceptar
  acceptBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem('legalAccepted', 'true');
    modal.style.display = 'none';
    statusMsg.textContent = 'TOCA PARA EMPEZAR';
    console.log('✅ Términos aceptados');
    // Si la radio ya estaba cargada, iniciar
    if (typeof startRadio === 'function' && tracks && tracks.length > 0) {
      startRadio();
    }
  });
})();

// ============================================================
// 2. LISTA DE PISTAS (ACTUALIZADA CON NUEVOS NOMBRES)
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
  "track10_livemix_dalørex.mp3"


];




const DEMO_TRACK = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
const LOGO_TOP_PATH = 'logo_top.png';
const LOGO_BOTTOM_PATH = 'logo_bottom.png';

// ============================================================
// 3. CANVAS DE FONDO (EFECTOS VISUALES REACTIVOS)
// ============================================================
const canvasBg = document.getElementById('psyCanvas');
const ctxBg = canvasBg.getContext('2d');
let bgParticles = [], bgStars = [], bgFreqData = null, bgAudioReactive = false;
let bgBass = 0, bgMid = 0, bgTreble = 0, bgOverall = 0;

function resizeBg() {
  canvasBg.width = window.innerWidth;
  canvasBg.height = window.innerHeight;
  const area = canvasBg.width * canvasBg.height;
  const particleCount = Math.min(22, Math.max(8, Math.floor(area / 50000)));
  bgParticles = [];
  for (let i = 0; i < particleCount; i++) {
    bgParticles.push({
      x: Math.random() * canvasBg.width,
      y: Math.random() * canvasBg.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      hue: Math.random() * 360,
      phase: Math.random() * Math.PI * 2
    });
  }
  const starCount = Math.min(40, Math.max(15, Math.floor(area / 35000)));
  bgStars = [];
  for (let i = 0; i < starCount; i++) {
    bgStars.push({
      x: Math.random() * canvasBg.width,
      y: Math.random() * canvasBg.height,
      size: Math.random() * 1.4 + 0.3,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      phase: Math.random() * Math.PI * 2
    });
  }
}
resizeBg();
window.addEventListener('resize', resizeBg);

let tBg = 0;
function drawBg() {
  try {
    tBg += 0.008;
    const w = canvasBg.width, h = canvasBg.height;
    const bass = bgBass, mid = bgMid, treble = bgTreble, overall = bgOverall;
    const baseHue = (tBg * 25) % 360;
    const g = ctxBg.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
    g.addColorStop(0, `hsl(${baseHue}, 60%, ${4 + overall * 14}%)`);
    g.addColorStop(0.5, `hsl(${(baseHue + 60) % 360}, 50%, ${2 + overall * 7}%)`);
    g.addColorStop(1, '#000');
    ctxBg.fillStyle = g;
    ctxBg.fillRect(0, 0, w, h);

    for (let si = 0; si < bgStars.length; si++) {
      const star = bgStars[si];
      const twinkle = Math.sin(tBg * 30 * star.twinkleSpeed + star.phase) * 0.5 + 0.5;
      const size = star.size * (0.5 + twinkle * 0.8) * (1 + overall * 1.5);
      const alpha = twinkle * (0.35 + overall * 0.5);
      ctxBg.fillStyle = `hsla(${(tBg * 40 + star.x * 0.5) % 360}, 85%, 75%, ${alpha})`;
      ctxBg.beginPath();
      ctxBg.arc(star.x, star.y, size, 0, Math.PI * 2);
      ctxBg.fill();
    }

    for (let i = 0; i < 8; i++) {
      ctxBg.beginPath();
      const hue = (tBg * 50 + i * 45) % 360;
      const amp = (80 + i * 12) * (1 + bass * 1.5);
      ctxBg.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.1 + bass * 0.25 + mid * 0.1})`;
      ctxBg.lineWidth = 2 + bass * 2.5;
      for (let x = 0; x <= w; x += 4) {
        const y = h/2 + Math.sin(x * 0.015 + tBg * 2.5 + i * 0.8) * amp + Math.cos(x * 0.008 + tBg * 1.8 + i * 1.2) * amp * 0.5 + Math.sin(x * 0.003 + tBg * 3.5) * amp * 1.3;
        x === 0 ? ctxBg.moveTo(x, y) : ctxBg.lineTo(x, y);
      }
      ctxBg.stroke();
    }

    const cx = w/2, cy = h/2;
    for (let r = 30; r < Math.max(w, h) * 0.8; r += 50) {
      ctxBg.beginPath();
      const alpha = 0.05 + Math.abs(Math.sin(tBg * 1.5 + r * 0.01)) * 0.08 + overall * 0.15;
      ctxBg.strokeStyle = `hsla(${(tBg * 30 + r * 0.5) % 360}, 90%, 55%, ${alpha})`;
      ctxBg.lineWidth = 1.5 + overall * 3;
      ctxBg.arc(cx, cy, r + Math.sin(tBg * 2.5 + r * 0.02) * 25 * (1 + bass), 0, Math.PI * 2);
      ctxBg.stroke();
    }

    for (let pi = 0; pi < bgParticles.length; pi++) {
      const p = bgParticles[pi];
      p.x += p.vx * (1 + overall * 3);
      p.y += p.vy * (1 + overall * 3);
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
      const size = p.size * (1 + bass * 2.5);
      const hue = (p.hue + tBg * 60) % 360;
      const grad = ctxBg.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
      grad.addColorStop(0, `hsla(${hue}, 100%, 65%, 0.5)`);
      grad.addColorStop(0.5, `hsla(${hue}, 100%, 60%, 0.1)`);
      grad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      ctxBg.fillStyle = grad;
      ctxBg.beginPath();
      ctxBg.arc(p.x, p.y, size * 4, 0, Math.PI * 2);
      ctxBg.fill();
      ctxBg.fillStyle = `hsla(${hue}, 100%, 80%, 0.85)`;
      ctxBg.beginPath();
      ctxBg.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctxBg.fill();
    }
  } catch(e) { /* ignorar errores de fondo */ }
  requestAnimationFrame(drawBg);
}
drawBg();

// ============================================================
// 4. REPRODUCTOR DE AUDIO (CORREGIDO Y FUNCIONAL)
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
    bgAudioReactive = true;
    bgFreqData = new Uint8Array(analyser.frequencyBinCount);
    masterGain.connect(analyser);
    analyser.connect(ac.destination);
  }
  if (!gainA) { gainA = ac.createGain(); gainA.gain.value = 0; gainA.connect(masterGain); }
  if (!gainB) { gainB = ac.createGain(); gainB.gain.value = 0; gainB.connect(masterGain); }
}

function updateBgAudio() {
  if (bgAudioReactive && bgFreqData && analyser) {
    try {
      analyser.getByteFrequencyData(bgFreqData);
      const bins = bgFreqData.length;
      let bSum = 0, mSum = 0, tSum = 0;
      for (let i = 0; i < 8; i++) bSum += bgFreqData[i];
      for (let i = 8; i < 40; i++) mSum += bgFreqData[i];
      for (let i = 40; i < bins; i++) tSum += bgFreqData[i];
      bgBass = bSum / (8 * 255);
      bgMid = mSum / (32 * 255);
      bgTreble = tSum / ((bins - 40) * 255);
      bgOverall = (bgBass * 2 + bgMid + bgTreble) / 4;
    } catch (e) {}
  }
  requestAnimationFrame(updateBgAudio);
}
updateBgAudio();

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
    document.getElementById('hiddenCount').textContent = tracks.length;
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

// ===== FUNCIONES PRINCIPALES DEL REPRODUCTOR (CORREGIDAS) =====
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

  // Evento onended: garantiza el cambio de pista incluso si falla el temporizador
  source.onended = function() {
    if (isPlaying && currentIdx === trackIndex) {
      if (mixTimer) clearTimeout(mixTimer);
      transitionToNext();
    }
  };

  // Para modo mix, programar el crossfade con setTimeout (respaldo)
  if (currentMode === 'mix') {
    const playDuration = Math.min(MIX_SEGMENT, track.duration - startOffset);
    source.stop(now + playDuration); // Forzar parada (el onended también se activará)
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
    // Si algo falla, reintentar en 500ms
    setTimeout(() => { if (isPlaying) transitionToNext(); }, 500);
    return;
  }

  // Calcular tiempo restante
  const elapsed = audioCtx.currentTime - currentDeck.startTime + currentDeck.offset;
  let remaining;
  if (currentMode === 'mix') {
    remaining = MIX_SEGMENT - elapsed;
  } else {
    remaining = currentTrack.duration - elapsed;
  }

  const crossfadeTime = currentMode === 'mix' ? MIX_CROSSFADE : PLAYLIST_CROSSFADE;
  // Si el tiempo restante es menor que el crossfade, forzar cambio inmediato
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

// Eventos de los botones
btnMix.addEventListener('click', function(e) {
  e.stopPropagation();
  switchMode('mix');
});
btnPlaylist.addEventListener('click', function(e) {
  e.stopPropagation();
  switchMode('playlist');
});

// ===== MANEJADOR DE TOUCH/CLICK PARA INICIAR/PAUSAR =====
function handleFirstTouch(e) {
  // Si el modal está visible, no hacemos nada (el botón Aceptar lo cierra)
  if (document.getElementById('legalModal').style.display !== 'none') return;

  // Si el clic es en los botones de modo o en PayPal, no hacer nada
  if (e.target === btnMix || e.target === btnPlaylist || e.target.closest('.paypal-btn')) return;

  // Si ya se inició, toggle play/pausa
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

  // Primer toque: activar audio y cargar pistas si es necesario
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
// 5. VISUALIZADOR (EFECTOS VISUALES)
// ============================================================
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  const w = vizCanvas.width,
    h = vizCanvas.height;
  const cx = w / 2,
    cy = h / 2;
  const baseRadius = Math.min(w, h) * 0.28;
  const time = Date.now() * 0.008;

  ctxViz.clearRect(0, 0, w, h);

  if (!analyser || !isPlaying) {
    const pulse = Math.sin(time * 0.8) * 4;
    ctxViz.beginPath();
    ctxViz.arc(cx, cy, baseRadius + pulse, 0, Math.PI * 2);
    ctxViz.strokeStyle = 'hsla(180, 100%, 60%, 0.6)';
    ctxViz.lineWidth = 2.5;
    ctxViz.stroke();
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  let avg = 0;
  for (let i = 0; i < bufferLength; i++) avg += dataArray[i];
  avg = avg / bufferLength / 255;

  const glow = ctxViz.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, baseRadius * 1.5);
  glow.addColorStop(0, 'hsla(180, 100%, 60%, 0.18)');
  glow.addColorStop(1, 'hsla(180, 100%, 60%, 0)');
  ctxViz.fillStyle = glow;
  ctxViz.beginPath();
  ctxViz.arc(cx, cy, baseRadius * 1.5, 0, Math.PI * 2);
  ctxViz.fill();

  const mainRadius = baseRadius * (0.85 + avg * 0.7);
  const mainGrad = ctxViz.createRadialGradient(cx, cy, 0, cx, cy, mainRadius);
  mainGrad.addColorStop(0, 'hsla(300, 100%, 60%, 0.4)');
  mainGrad.addColorStop(0.6, 'hsla(180, 100%, 70%, 0.55)');
  mainGrad.addColorStop(1, 'hsla(180, 100%, 60%, 0.9)');
  ctxViz.fillStyle = mainGrad;
  ctxViz.beginPath();
  ctxViz.arc(cx, cy, mainRadius, 0, Math.PI * 2);
  ctxViz.fill();

  ctxViz.beginPath();
  ctxViz.arc(cx, cy, mainRadius, 0, Math.PI * 2);
  ctxViz.strokeStyle = 'hsla(180, 100%, 85%, 0.95)';
  ctxViz.lineWidth = 2.5;
  ctxViz.stroke();

  const spikeCount = 80;
  for (let i = 0; i < spikeCount; i++) {
    const value = dataArray[Math.floor(i * bufferLength / spikeCount)] / 255;
    const angle = (i / spikeCount) * Math.PI * 2 - Math.PI / 2 + time * 1.8;
    const spikeLen = value * baseRadius * 1.3;
    const x1 = cx + Math.cos(angle) * mainRadius;
    const y1 = cy + Math.sin(angle) * mainRadius;
    const x2 = cx + Math.cos(angle) * (mainRadius + spikeLen);
    const y2 = cy + Math.sin(angle) * (mainRadius + spikeLen);
    ctxViz.beginPath();
    ctxViz.moveTo(x1, y1);
    ctxViz.lineTo(x2, y2);
    const hue = (i * 5 + time * 80) % 360;
    ctxViz.strokeStyle = `hsla(${hue}, 100%, 65%, ${0.6 + value * 0.4})`;
    ctxViz.lineWidth = 1.5 + value * 2.5;
    ctxViz.stroke();
  }

  ctxViz.beginPath();
  for (let i = 0; i < bufferLength; i++) {
    const value = dataArray[i] / 255;
    const angle = (i / bufferLength) * Math.PI * 2 - Math.PI / 2 - time * 1.2;
    const r = baseRadius * 0.7 + value * baseRadius * 0.4;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    i === 0 ? ctxViz.moveTo(x, y) : ctxViz.lineTo(x, y);
  }
  ctxViz.closePath();
  const waveGrad = ctxViz.createLinearGradient(0, 0, w, h);
  waveGrad.addColorStop(0, 'hsla(60, 100%, 70%, 0.85)');
  waveGrad.addColorStop(0.5, 'hsla(180, 100%, 70%, 0.85)');
  waveGrad.addColorStop(1, 'hsla(300, 100%, 70%, 0.85)');
  ctxViz.strokeStyle = waveGrad;
  ctxViz.lineWidth = 1.8;
  ctxViz.stroke();

  const coreSize = baseRadius * 0.18 * (0.6 + avg * 2);
  const coreGrad = ctxViz.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
  coreGrad.addColorStop(0, 'hsla(60, 100%, 95%, 1)');
  coreGrad.addColorStop(0.5, 'hsla(60, 100%, 75%, 0.85)');
  coreGrad.addColorStop(1, 'hsla(60, 100%, 50%, 0)');
  ctxViz.fillStyle = coreGrad;
  ctxViz.beginPath();
  ctxViz.arc(cx, cy, coreSize, 0, Math.PI * 2);
  ctxViz.fill();

  const barCount = 48;
  const barWidth = w / barCount;
  for (let i = 0; i < barCount; i++) {
    const value = dataArray[Math.floor(i * bufferLength / barCount)] / 255;
    const barHeight = value * h * 0.5;
    const hue = (i * 8 + time * 50) % 360;
    ctxViz.fillStyle = `hsla(${hue}, 100%, 60%, 0.7)`;
    ctxViz.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
  }
}
drawVisualizer();

// ============================================================
// 6. LOGOS
// ============================================================
async function loadLogo(path, containerId, hideBrand) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) return;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Logo';
    img.style.maxHeight = "70px"; // se ajusta al contenedor
    const target = document.getElementById(containerId);
    if (target) {
      target.innerHTML = '';
      target.appendChild(img);
      if (hideBrand && document.getElementById('brandText')) document.getElementById('brandText').style.display = 'none';
    }
  } catch (e) { console.warn('Logo no encontrado:', path); }
}
loadLogo(LOGO_TOP_PATH, 'logoTopContainer', true);
loadLogo(LOGO_BOTTOM_PATH, 'logoBottomContainer', false);

// ============================================================
// 7. INICIO DE CARGA DE PISTAS
// ============================================================
initTracks();

// ============================================================
// 8. CONFIGURACIÓN DE DONACIONES - EMAIL: dlrx75@gmail.com
// ============================================================
console.log(' Configuración de donaciones: ☕');
console.log('   Email PayPal: dlr.ruby@gmail.com');
console.log('   Moneda:EUR');
console.log('   Concepto: PsykodeliA TeknoRadio');
