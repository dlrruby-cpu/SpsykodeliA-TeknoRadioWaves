// ============ LISTA DE PISTAS LOCALES ============
const LOCAL_TRACKS = [
  "track1.mp3",
  "track2.mp3",
  "track3.mp3",
  "track4.mp3"
];

// ============ CONFIGURACIÓN (NO TOCAR) ============
const DEMO_TRACK = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
const LOGO_TOP_PATH = 'logo_top.png';
const LOGO_BOTTOM_PATH = 'logo_bottom.png';
const PAYPAL_URL = 'https://www.paypal.com/donate/?hosted_button_id=TU_ID_DE_BOTON';

// ============ CANVAS DE FONDO ============
const canvasBg = document.getElementById('psyCanvas'), ctxBg = canvasBg.getContext('2d');
function resizeBg() { canvasBg.width = innerWidth; canvasBg.height = innerHeight; }
resizeBg(); window.addEventListener('resize', resizeBg);
let tBg = 0;
(function drawBg() {
  tBg += 0.005;
  const g = ctxBg.createRadialGradient(canvasBg.width/2, canvasBg.height/2, 0, canvasBg.width/2, canvasBg.height/2, canvasBg.width);
  g.addColorStop(0, '#0a0015'); g.addColorStop(1, '#000');
  ctxBg.fillStyle = g; ctxBg.fillRect(0, 0, canvasBg.width, canvasBg.height);
  for (let i = 0; i < 8; i++) {
    ctxBg.beginPath(); ctxBg.strokeStyle = `hsla(${(tBg*60+i*45)%360},100%,55%,0.12)`; ctxBg.lineWidth = 2.5;
    for (let x = 0; x < canvasBg.width; x += 4) {
      const y = canvasBg.height/2 + Math.sin(x*0.015+tBg*2.5+i*0.8)*90 + Math.cos(x*0.008+tBg*1.8+i*1.2)*50 + Math.sin(x*0.003+tBg*3.5)*130;
      x === 0 ? ctxBg.moveTo(x, y) : ctxBg.lineTo(x, y);
    }
    ctxBg.stroke();
  }
  for (let r = 30; r < Math.max(canvasBg.width, canvasBg.height)*0.8; r += 50) {
    ctxBg.beginPath(); ctxBg.strokeStyle = `hsla(${(tBg*30+r*0.5)%360},90%,55%,${0.05+Math.abs(Math.sin(tBg*1.5+r*0.01))*0.08})`;
    ctxBg.lineWidth = 1.5; ctxBg.arc(canvasBg.width/2, canvasBg.height/2, r+Math.sin(tBg*2.5+r*0.02)*25, 0, Math.PI*2); ctxBg.stroke();
  }
  requestAnimationFrame(drawBg);
})();

// ============ REPRODUCTOR ============
let audioCtx, tracks=[], currentIdx=-1, isPlaying=false, hasStarted=false;
let gainA, gainB, sourceA, sourceB, activeGain='A', masterGain, mixTimer, analyser;
let currentMode='mix';
const MIX_SEGMENT=120, MIX_CROSSFADE=15, PLAYLIST_CROSSFADE=8;
const vizCanvas=document.getElementById('vizCanvas'), ctxViz=vizCanvas.getContext('2d');
const statusMsg=document.getElementById('statusMessage');
const btnMix=document.getElementById('btnMix'), btnPlaylist=document.getElementById('btnPlaylist');
let deckA={source:null,gain:null,startTime:0,offset:0}, deckB={source:null,gain:null,startTime:0,offset:0};

function resizeVizCanvas() {
  const rect=vizCanvas.parentElement.getBoundingClientRect();
  vizCanvas.width=rect.width; vizCanvas.height=rect.height;
}
resizeVizCanvas(); window.addEventListener('resize', resizeVizCanvas);

function getAC() {
  if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if (audioCtx.state==='suspended') audioCtx.resume();
  return audioCtx;
}

function setupMaster() {
  const ac=getAC();
  if (!masterGain) {
    masterGain=ac.createGain(); masterGain.gain.value=0.9;
    analyser=ac.createAnalyser(); analyser.fftSize=256;
    masterGain.connect(analyser); analyser.connect(ac.destination);
  }
  if (!gainA) { gainA=ac.createGain(); gainA.gain.value=0; gainA.connect(masterGain); }
  if (!gainB) { gainB=ac.createGain(); gainB.gain.value=0; gainB.connect(masterGain); }
}

async function loadBufferFromUrl(url) {
  const ac=getAC(); const resp=await fetch(url);
  if (!resp.ok) throw new Error('HTTP '+resp.status);
  const buf=await resp.arrayBuffer(); return await ac.decodeAudioData(buf);
}

async function loadTracks(urlList) {
  for (const url of urlList) {
    try {
      const buffer=await loadBufferFromUrl(url);
      const name = url.split('/').pop().replace(/\.[^/.]+$/, "").toUpperCase();
      tracks.push({name,url,duration:buffer.duration,buffer});
      console.log('✅ Cargada: '+name);
    } catch(e) { console.warn('❌ Falló: '+url, e.message); }
  }
}

async function initTracks() {
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
    if (hasStarted) startRadio();
  }
}

function stopSource(src) { if (src) { try { src.stop(); } catch(e){} src.disconnect(); } }
function stopAll() { stopSource(sourceA); sourceA=null; stopSource(sourceB); sourceB=null; if (mixTimer) clearTimeout(mixTimer); }

function transitionToNext() {
  if (!isPlaying||tracks.length===0) return;
  const nextIdx=(currentIdx+1)%tracks.length;
  const otherGain=activeGain==='A'?gainB:gainA;
  const currentGain=activeGain==='A'?gainA:gainB;
  stopSource(activeGain==='A'?sourceB:sourceA);
  const source=playSegment(otherGain, nextIdx, 0, 0.001);
  if (source) {
    if (activeGain==='A') { sourceB=source; activeGain='B'; deckB={source,gain:gainB,startTime:audioCtx.currentTime,offset:0}; }
    else { sourceA=source; activeGain='A'; deckA={source,gain:gainA,startTime:audioCtx.currentTime,offset:0}; }
    currentIdx=nextIdx;
    const duration=currentMode==='mix'?MIX_CROSSFADE:PLAYLIST_CROSSFADE;
    crossfadeVolumes(currentGain, otherGain, duration);
    scheduleNext();
    statusMsg.textContent = tracks[currentIdx].name;
  }
}

function playSegment(gainNode, trackIndex, startOffset, initialVol) {
  const ac=getAC(); setupMaster();
  if (trackIndex<0||trackIndex>=tracks.length) return null;
  const track=tracks[trackIndex];
  const source=ac.createBufferSource(); source.buffer=track.buffer; source.connect(gainNode);
  const now=ac.currentTime; source.start(0, startOffset);
  gainNode.gain.cancelScheduledValues(now); gainNode.gain.setValueAtTime(initialVol, now);
  if (currentMode==='playlist') {
    source.onended=()=>{ if (isPlaying&&currentIdx===trackIndex) { if (mixTimer) clearTimeout(mixTimer); transitionToNext(); } };
  } else {
    const playDuration=Math.min(MIX_SEGMENT, track.duration-startOffset);
    source.stop(now+playDuration);
    if (mixTimer) clearTimeout(mixTimer);
    const wait = Math.max(0, playDuration - MIX_CROSSFADE);
    mixTimer = setTimeout(() => { if (isPlaying && currentMode === 'mix') transitionToNext(); }, wait * 1000);
  }
  return source;
}

function crossfadeVolumes(fromGain, toGain, duration) {
  const ac=getAC(); const now=ac.currentTime;
  fromGain.gain.cancelScheduledValues(now); fromGain.gain.setValueAtTime(fromGain.gain.value||0.9, now);
  fromGain.gain.linearRampToValueAtTime(0.001, now+duration);
  toGain.gain.cancelScheduledValues(now); toGain.gain.setValueAtTime(0.001, now);
  toGain.gain.linearRampToValueAtTime(0.9, now+duration);
}

function scheduleNext() {
  if (!isPlaying||tracks.length===0) return;
  if (mixTimer) clearTimeout(mixTimer);
  const currentDeck=activeGain==='A'?deckA:deckB;
  const currentTrack=tracks[currentIdx];
  if (!currentTrack||!currentDeck.source) return;
  const elapsed=audioCtx.currentTime-currentDeck.startTime+currentDeck.offset;
  if (currentMode==='mix') {
    const remaining=MIX_SEGMENT-elapsed;
    const wait=Math.max(0, remaining-MIX_CROSSFADE);
    mixTimer=setTimeout(()=>{ if (isPlaying&&currentMode==='mix') transitionToNext(); }, wait*1000);
  } else {
    const remaining=currentTrack.duration-elapsed;
    const wait=Math.max(0.1, remaining-PLAYLIST_CROSSFADE);
    mixTimer=setTimeout(()=>{ if (isPlaying&&currentMode==='playlist') transitionToNext(); }, wait*1000);
  }
}

function startRadio() {
  if (tracks.length===0) return;
  getAC(); setupMaster(); stopAll();
  if (currentIdx<0||currentIdx>=tracks.length) currentIdx=0;
  const source=playSegment(gainA, currentIdx, 0, 0.9);
  if (source) {
    sourceA=source; activeGain='A'; deckA={source,gain:gainA,startTime:audioCtx.currentTime,offset:0};
    isPlaying=true;
    statusMsg.textContent = tracks[currentIdx].name;
  }
}

function switchMode(mode) {
  if (currentMode===mode||tracks.length===0) return;
  currentMode=mode;
  btnMix.classList.toggle('active', mode==='mix');
  btnPlaylist.classList.toggle('active', mode==='playlist');
  if (isPlaying) { stopAll(); startRadio(); }
}

btnMix.addEventListener('click',(e)=>{ e.stopPropagation(); switchMode('mix'); });
btnPlaylist.addEventListener('click',(e)=>{ e.stopPropagation(); switchMode('playlist'); });

const payBtn = document.querySelector('.paypal-btn');
if(payBtn) payBtn.href = PAYPAL_URL;

function handleFirstTouch(e) {
  if (document.getElementById('legalModal').style.display !== 'none') return;
  if (e && (e.target === btnMix || e.target === btnPlaylist || e.target.closest('.paypal-btn'))) return;

  if (hasStarted) {
    if(e.target.closest('.display-screen') || e.target.id === 'vizCanvas') {
      if(isPlaying) {
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

// ============ VISUALIZADOR ============
(function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  const w=vizCanvas.width, h=vizCanvas.height;
  if (!analyser||!isPlaying) {
    ctxViz.clearRect(0,0,w,h); const bars=32, barWidth=w/bars;
    for (let i=0;i<bars;i++) {
      const value=Math.sin(Date.now()*0.005+i*0.5)*0.5+0.5;
      const barHeight=value*h*0.3;
      const hue=(Date.now()*0.1+i*10)%360;
      ctxViz.fillStyle=`hsla(${hue},100%,60%,0.4)`;
      ctxViz.fillRect(i*barWidth, h-barHeight, barWidth-1, barHeight);
    }
    return;
  }
  const bufferLength=analyser.frequencyBinCount;
  const dataArray=new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  ctxViz.clearRect(0,0,w,h);
  const centerX=w/2, centerY=h/2, radius=Math.min(w,h)*0.25;
  const angleStep=(Math.PI*2)/bufferLength;
  ctxViz.beginPath();
  for (let i=0;i<bufferLength;i++) {
    const value=dataArray[i]/255;
    const angle=i*angleStep;
    const x=centerX+Math.cos(angle)*radius*(1+value*0.6);
    const y=centerY+Math.sin(angle)*radius*(1+value*0.6);
    i===0?ctxViz.moveTo(x,y):ctxViz.lineTo(x,y);
  }
  ctxViz.closePath();
  const gradient=ctxViz.createLinearGradient(0,0,w,h);
  gradient.addColorStop(0,'#ff00ff'); gradient.addColorStop(0.5,'#00ffff'); gradient.addColorStop(1,'#ff00ff');
  ctxViz.strokeStyle=gradient; ctxViz.lineWidth=2; ctxViz.stroke();
  const barCount=32, barWidth=w/barCount;
  for (let i=0;i<barCount;i++) {
    const value=dataArray[Math.floor(i*bufferLength/barCount)]/255;
    const barHeight=value*h*0.7;
    const hue=(i*10+Date.now()*0.05)%360;
    ctxViz.fillStyle=`hsla(${hue},80%,60%,0.5)`;
    ctxViz.fillRect(i*barWidth, h-barHeight, barWidth-1, barHeight);
  }
})();

// ============ LOGOS ============
async function loadLogo(path, containerId, hideBrand) {
  try {
    const resp=await fetch(path);
    if (!resp.ok) return;
    const blob=await resp.blob();
    const url=URL.createObjectURL(blob);
    const img=document.createElement('img'); img.src=url; img.alt='Logo';
    img.style.maxHeight = "40px";
    const target = document.getElementById(containerId);
    if(target) {
      target.innerHTML='';
      target.appendChild(img);
      if (hideBrand && document.getElementById('brandText')) document.getElementById('brandText').style.display='none';
    }
  } catch(e) {}
}
loadLogo(LOGO_TOP_PATH, 'logoTopContainer', true);
loadLogo(LOGO_BOTTOM_PATH, 'logoBottomContainer', false);

// ============ MODAL LEGAL ============
const legalModal = document.getElementById('legalModal');
const acceptBtn = document.getElementById('acceptLegal');
if (localStorage.getItem('legalAccepted') === 'true') {
  legalModal.style.display = 'none';
} else {
  legalModal.style.display = 'flex';
}
acceptBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  localStorage.setItem('legalAccepted', 'true');
  legalModal.style.display = 'none';
  if(statusMsg.textContent === 'ACEPTA LOS TÉRMINOS PRIMERO') {
    statusMsg.textContent = 'TOCA PARA EMPEZAR';
  }
});

// ============ INICIAR CARGA DE PISTAS ============
initTracks();
