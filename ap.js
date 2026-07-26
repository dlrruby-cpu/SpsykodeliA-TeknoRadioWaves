// ============================================================
// MODAL LEGAL (CORREGIDO)
// ============================================================
(function() {
  const modal = document.getElementById('legalModal');
  const acceptBtn = document.getElementById('acceptLegalBtn');
  const statusMsg = document.getElementById('statusMessage');

  // Si ya aceptó, oculta modal
  if (localStorage.getItem('legalAccepted') === 'true') {
    modal.style.display = 'none';
    if (statusMsg.textContent === 'ACEPTA LOS TÉRMINOS PRIMERO') {
      statusMsg.textContent = 'TOCA PARA EMPEZAR';
    }
    return;
  }

  // Mostrar modal (asegurarse)
  modal.style.display = 'flex';

  // Evento aceptar
  acceptBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem('legalAccepted', 'true');
    modal.style.display = 'none';
    statusMsg.textContent = 'TOCA PARA EMPEZAR';
    console.log('✅ Términos aceptados');
    // Si la radio ya está cargada, iniciar reproducción
    if (typeof startRadio === 'function' && tracks && tracks.length > 0) {
      startRadio();
    }
  });

  // Enlaces de "leer términos" (evitan recarga y muestran aviso)
  document.getElementById('linkPrivacy').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Política de privacidad: próximamente.');
  });
  document.getElementById('linkTerms').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Términos de uso: próximamente.');
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
// REPRODUCTOR (SIN CAMBIOS)
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
      statusMsg.textContent = (localStorage.getItem('legalAccepted') === 'true') 
        ? 'TOCA PARA EMPEZAR' 
        : 'ACEPTA LOS TÉRMINOS PRIMERO';
      if (hasStarted && tracks.length > 0) startRadio();
    }
  } catch (e) {
    console.error('Error initTracks:', e);
    statusMsg.textContent = 'ERROR AL CARGAR';
  }
}

function stopSource(src) {
  if (src) { try { src.stop(); } catch(e){} src.disconnect(); }
}

function stopAll() {
  stopSource(sourceA); sourceA = null;
  stopSource(sourceB); sourceB = null;
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
    if (activeGain === 'A') { sourceB = source; activeGain = 'B'; deckB = { source, gain: gainB, startTime: audioCtx.currentTime, offset: 0 }; }
    else { sourceA = source; activeGain = 'A'; deckA = { source, gain: gainA, startTime: audioCtx.currentTime, offset: 0 }; }
    currentIdx = nextIdx;
    const dur = (currentMode === 'mix') ? MIX_CROSSFADE : PLAYLIST_CROSSFADE;
    crossfadeVolumes(currentGain, otherGain, dur);
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
  source.onended = () => {
    if (isPlaying && currentIdx === trackIndex) {
      if (mixTimer) clearTimeout(mixTimer);
      transitionToNext();
    }
  };
  if (currentMode === 'mix') {
    const playDur = Math.min(MIX_SEGMENT, track.duration - startOffset);
    source.stop(now + playDur);
    const wait = Math.max(0, playDur - MIX_CROSSFADE);
    mixTimer = setTimeout(() => { if (isPlaying && currentMode === 'mix') transitionToNext(); }, wait * 1000);
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
  clearTimeout(mixTimer);
  const deck = (activeGain === 'A') ? deckA : deckB;
  const track = tracks[currentIdx];
  if (!track || !deck.source) { setTimeout(() => { if(isPlaying) transitionToNext(); }, 500); return; }
  const elapsed = audioCtx.currentTime - deck.startTime + deck.offset;
  let remaining = (currentMode === 'mix') ? MIX_SEGMENT - elapsed : track.duration - elapsed;
  const fade = (currentMode === 'mix') ? MIX_CROSSFADE : PLAYLIST_CROSSFADE;
  if (remaining <= fade + 0.5) {
    setTimeout(() => { if(isPlaying) transitionToNext(); }, 100);
    return;
  }
  mixTimer = setTimeout(() => { if(isPlaying) transitionToNext(); }, (remaining - fade) * 1000);
}

function startRadio() {
  if (tracks.length === 0) return;
  getAC(); setupMaster(); stopAll();
  if (currentIdx < 0 || currentIdx >= tracks.length) currentIdx = 0;
  const source = playSegment(gainA, currentIdx, 0, 0.9);
  if (source) {
    sourceA = source; activeGain = 'A'; deckA = { source, gain: gainA, startTime: audioCtx.currentTime, offset: 0 };
    isPlaying = true; statusMsg.textContent = tracks[currentIdx].name; scheduleNext();
  }
}

function switchMode(mode) {
  if (currentMode === mode || tracks.length === 0) return;
  currentMode = mode;
  btnMix.classList.toggle('active', mode === 'mix');
  btnPlaylist.classList.toggle('active', mode === 'playlist');
  if (isPlaying) { stopAll(); startRadio(); }
}

btnMix.addEventListener('click', e => { e.stopPropagation(); switchMode('mix'); });
btnPlaylist.addEventListener('click', e => { e.stopPropagation(); switchMode('playlist'); });

function handleFirstTouch(e) {
  if (document.getElementById('legalModal').style.display !== 'none') return;
  if (e.target === btnMix || e.target === btnPlaylist || e.target.closest('.paypal-btn')) return;
  if (hasStarted) {
    if (e.target.closest('.display-screen') || e.target.id === 'vizCanvas') {
      if (isPlaying) { stopAll(); isPlaying = false; statusMsg.textContent = 'PAUSA'; }
      else startRadio();
    }
    return;
  }
  getAC(); hasStarted = true;
  if (tracks.length === 0) { initTracks().then(() => { if(tracks.length>0) startRadio(); }); }
  else startRadio();
}

document.body.addEventListener('click', handleFirstTouch);
document.body.addEventListener('touchstart', handleFirstTouch);

// ============================================================
// VISUALIZADOR ORIGINAL COMPLETO (NO TOCADO)
// ============================================================
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  const w = vizCanvas.width, h = vizCanvas.height;
  const cx = w/2, cy = h/2, baseRadius = Math.min(w,h)*0.28, time = Date.now()*0.008;
  ctxViz.clearRect(0,0,w,h);
  if (!analyser || !isPlaying) {
    ctxViz.beginPath(); ctxViz.arc(cx,cy,baseRadius+Math.sin(time*0.8)*4,0,Math.PI*2);
    ctxViz.strokeStyle='hsla(180,100%,60%,0.6)'; ctxViz.lineWidth=2.5; ctxViz.stroke();
    return;
  }
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  let avg = 0; for(let i=0;i<bufferLength;i++) avg+=dataArray[i]; avg=avg/bufferLength/255;

  const glow = ctxViz.createRadialGradient(cx,cy,baseRadius*0.5,cx,cy,baseRadius*1.5);
  glow.addColorStop(0,'hsla(180,100%,60%,0.18)'); glow.addColorStop(1,'hsla(180,100%,60%,0)');
  ctxViz.fillStyle=glow; ctxViz.beginPath(); ctxViz.arc(cx,cy,baseRadius*1.5,0,Math.PI*2); ctxViz.fill();

  const mainRadius = baseRadius*(0.85+avg*0.7);
  const mainGrad = ctxViz.createRadialGradient(cx,cy,0,cx,cy,mainRadius);
  mainGrad.addColorStop(0,'hsla(300,100%,60%,0.4)');
  mainGrad.addColorStop(0.6,'hsla(180,100%,70%,0.55)');
  mainGrad.addColorStop(1,'hsla(180,100%,60%,0.9)');
  ctxViz.fillStyle=mainGrad; ctxViz.beginPath(); ctxViz.arc(cx,cy,mainRadius,0,Math.PI*2); ctxViz.fill();

  ctxViz.beginPath(); ctxViz.arc(cx,cy,mainRadius,0,Math.PI*2);
  ctxViz.strokeStyle='hsla(180,100%,85%,0.95)'; ctxViz.lineWidth=2.5; ctxViz.stroke();

  for(let i=0;i<80;i++) {
    const val = dataArray[Math.floor(i*bufferLength/80)]/255;
    const angle = (i/80)*Math.PI*2-Math.PI/2+time*1.8;
    const spikeLen = val*baseRadius*1.3;
    ctxViz.beginPath();
    ctxViz.moveTo(cx+Math.cos(angle)*mainRadius, cy+Math.sin(angle)*mainRadius);
    ctxViz.lineTo(cx+Math.cos(angle)*(mainRadius+spikeLen), cy+Math.sin(angle)*(mainRadius+spikeLen));
    ctxViz.strokeStyle=`hsla(${(i*5+time*80)%360},100%,65%,${0.6+val*0.4})`;
    ctxViz.lineWidth=1.5+val*2.5; ctxViz.stroke();
  }

  ctxViz.beginPath();
  for(let i=0;i<bufferLength;i++) {
    const val = dataArray[i]/255;
    const angle = (i/bufferLength)*Math.PI*2-Math.PI/2-time*1.2;
    const r = baseRadius*0.7+val*baseRadius*0.4;
    const x = cx+Math.cos(angle)*r, y = cy+Math.sin(angle)*r;
    i===0 ? ctxViz.moveTo(x,y) : ctxViz.lineTo(x,y);
  }
  ctxViz.closePath();
  const waveGrad = ctxViz.createLinearGradient(0,0,w,h);
  waveGrad.addColorStop(0,'hsla(60,100%,70%,0.85)');
  waveGrad.addColorStop(0.5,'hsla(180,100%,70%,0.85)');
  waveGrad.addColorStop(1,'hsla(300,100%,70%,0.85)');
  ctxViz.strokeStyle=waveGrad; ctxViz.lineWidth=1.8; ctxViz.stroke();

  const coreSize = baseRadius*0.18*(0.6+avg*2);
  const coreGrad = ctxViz.createRadialGradient(cx,cy,0,cx,cy,coreSize);
  coreGrad.addColorStop(0,'hsla(60,100%,95%,1)');
  coreGrad.addColorStop(0.5,'hsla(60,100%,75%,0.85)');
  coreGrad.addColorStop(1,'hsla(60,100%,50%,0)');
  ctxViz.fillStyle=coreGrad; ctxViz.beginPath(); ctxViz.arc(cx,cy,coreSize,0,Math.PI*2); ctxViz.fill();

  for(let i=0;i<48;i++) {
    const val = dataArray[Math.floor(i*bufferLength/48)]/255;
    const barHeight = val*h*0.5;
    const hue = (i*8+time*50)%360;
    ctxViz.fillStyle=`hsla(${hue},100%,60%,0.7)`;
    ctxViz.fillRect(i*w/48, h-barHeight, w/48-1, barHeight);
  }
}
drawVisualizer();

// ============================================================
// LOGO PRINCIPAL
// ============================================================
(async function(){
  try {
    const resp = await fetch(LOGO_TOP_PATH);
    if(!resp.ok) return;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const img = document.createElement('img'); img.src=url; img.alt='Logo';
    document.getElementById('logoTopContainer').innerHTML='';
    document.getElementById('logoTopContainer').appendChild(img);
  } catch(e){ console.warn('Logo no encontrado'); }
})();

// ============================================================
// INICIAR CARGA DE PISTAS
// ============================================================
initTracks();
