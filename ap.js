(function() {
  // ==================== CONFIGURACIÓN (¡AJUSTA ESTO!) ====================
  const TRACK_LIST = [
    'tracks/tema1.mp3',
    'tracks/tema2.mp3',
    'tracks/tema3.mp3'
  ];

  const LOGO_TOP_PATH = 'logo_top.png';
  const LOGO_BOTTOM_PATH = 'logo_bottom.png';

  const ROTATING_MESSAGE = "SpsykødeliA TeknøRadiø™ by TeknøBiblikGrupe™    DaløreXSLab™    DaløreXDjTools™  Ruby's La Beats™    DLRX ToolsInstrument's™     LópezDjTools ™";

  // ==================== CANVAS DE FONDO ====================
  const canvasBg = document.getElementById('psyCanvas');
  const ctxBg = canvasBg.getContext('2d');
  function resizeBg() {
    canvasBg.width = innerWidth;
    canvasBg.height = innerHeight;
  }
  resizeBg();
  window.addEventListener('resize', resizeBg);
  let tBg = 0;
  function drawBg() {
    tBg += 0.005;
    const g = ctxBg.createRadialGradient(canvasBg.width/2, canvasBg.height/2, 0, canvasBg.width/2, canvasBg.height/2, canvasBg.width);
    g.addColorStop(0, '#0a0015');
    g.addColorStop(1, '#000');
    ctxBg.fillStyle = g;
    ctxBg.fillRect(0, 0, canvasBg.width, canvasBg.height);
    for (let i = 0; i < 8; i++) {
      ctxBg.beginPath();
      ctxBg.strokeStyle = `hsla(${(tBg*60+i*45)%360},100%,55%,0.12)`;
      ctxBg.lineWidth = 2.5;
      for (let x = 0; x < canvasBg.width; x += 4) {
        const y = canvasBg.height/2 + Math.sin(x*0.015+tBg*2.5+i*0.8)*90 + Math.cos(x*0.008+tBg*1.8+i*1.2)*50 + Math.sin(x*0.003+tBg*3.5)*130;
        x === 0 ? ctxBg.moveTo(x, y) : ctxBg.lineTo(x, y);
      }
      ctxBg.stroke();
    }
    for (let r = 30; r < Math.max(canvasBg.width, canvasBg.height)*0.8; r += 50) {
      ctxBg.beginPath();
      ctxBg.strokeStyle = `hsla(${(tBg*30+r*0.5)%360},90%,55%,${0.05+Math.abs(Math.sin(tBg*1.5+r*0.01))*0.08})`;
      ctxBg.lineWidth = 1.5;
      ctxBg.arc(canvasBg.width/2, canvasBg.height/2, r+Math.sin(tBg*2.5+r*0.02)*25, 0, Math.PI*2);
      ctxBg.stroke();
    }
    requestAnimationFrame(drawBg);
  }
  drawBg();

  // ==================== AUDIO ENGINE ====================
  let audioCtx = null;
  let tracks = [];
  let currentIdx = -1;
  let isPlaying = false;
  let hasStarted = false;
  let gainA, gainB, sourceA, sourceB, activeGain = 'A', masterGain, mixTimer;
  let analyser = null;
  let currentMode = 'mix'; // 'mix' o 'playlist'
  const MIX_SEGMENT = 120;
  const MIX_CROSSFADE = 15;
  const PLAYLIST_CROSSFADE = 8;

  const vizCanvas = document.getElementById('vizCanvas');
  const ctxViz = vizCanvas.getContext('2d');
  const scrollingMsgEl = document.getElementById('scrollingMessage');
  const btnMix = document.getElementById('btnMix');
  const btnPlaylist = document.getElementById('btnPlaylist');

  function resizeVizCanvas() {
    const rect = vizCanvas.parentElement.getBoundingClientRect();
    vizCanvas.width = rect.width;
    vizCanvas.height = rect.height;
  }
  window.addEventListener('resize', resizeVizCanvas);
  resizeVizCanvas();

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
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const arrayBuffer = await response.arrayBuffer();
    return await ac.decodeAudioData(arrayBuffer);
  }

  async function loadAllTracks() {
    const proms = TRACK_LIST.map(async url => {
      try {
        const buffer = await loadBufferFromUrl(url);
        const name = url.split('/').pop().replace(/\.[^/.]+$/, "");
        tracks.push({ name, url, duration: buffer.duration, buffer });
        return true;
      } catch(e) {
        console.warn('Error al cargar', url, e);
        return false;
      }
    });
    await Promise.all(proms);
    updateHiddenCount();
  }

  function updateHiddenCount() {
    document.getElementById('hiddenCount').textContent = tracks.length;
  }

  function stopSource(src) {
    if (src) {
      try { src.stop(); } catch(e) {}
      src.disconnect();
    }
  }

  function stopAll() {
    stopSource(sourceA); sourceA = null;
    stopSource(sourceB); sourceB = null;
    if (mixTimer) clearTimeout(mixTimer);
  }

  let deckA = { source: null, gain: null, startTime: 0, offset: 0, trackIdx: -1 };
  let deckB = { source: null, gain: null, startTime: 0, offset: 0, trackIdx: -1 };

  function getCurrentDeckObj() {
    return activeGain === 'A' ? deckA : deckB;
  }

  function transitionToNext() {
    if (!isPlaying || tracks.length === 0) return;
    const nextIdx = (currentIdx + 1) % tracks.length;
    const otherGain = activeGain === 'A' ? gainB : gainA;
    const currentGain = activeGain === 'A' ? gainA : gainB;

    stopSource(activeGain === 'A' ? sourceB : sourceA);

    const result = playSegment(otherGain, nextIdx, 0, 0.001);
    if (result) {
      if (activeGain === 'A') {
        sourceB = result.source;
        activeGain = 'B';
        deckB = { source: sourceB, gain: gainB, startTime: audioCtx.currentTime, offset: 0, trackIdx: nextIdx };
      } else {
        sourceA = result.source;
        activeGain = 'A';
        deckA = { source: sourceA, gain: gainA, startTime: audioCtx.currentTime, offset: 0, trackIdx: nextIdx };
      }
      currentIdx = nextIdx;

      const crossfadeDuration = currentMode === 'mix' ? MIX_CROSSFADE : PLAYLIST_CROSSFADE;
      crossfadeVolumes(currentGain, otherGain, crossfadeDuration);
      scheduleNext();
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

    if (currentMode === 'playlist') {
      source.onended = () => {
        if (isPlaying && currentIdx === trackIndex && (activeGain === 'A' ? sourceA : sourceB) === source) {
          // Transición forzada si termina antes del crossfade programado
          if (mixTimer) clearTimeout(mixTimer);
          transitionToNext();
        }
      };
    } else {
      const playDuration = Math.min(MIX_SEGMENT, track.duration - startOffset);
      source.stop(now + playDuration);
    }

    if (gainNode === gainA) {
      deckA = { source, gain: gainA, startTime: now, offset: startOffset, trackIdx: trackIndex };
    } else {
      deckB = { source, gain: gainB, startTime: now, offset: startOffset, trackIdx: trackIndex };
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

    const currentDeck = getCurrentDeckObj();
    const currentTrack = tracks[currentIdx];
    if (!currentTrack || !currentDeck.source) return;

    const elapsed = audioCtx.currentTime - currentDeck.startTime + currentDeck.offset;

    if (currentMode === 'mix') {
      const remaining = MIX_SEGMENT - elapsed;
      const wait = Math.max(0, remaining - MIX_CROSSFADE);
      mixTimer = setTimeout(() => {
        if (!isPlaying || currentMode !== 'mix') return;
        transitionToNext();
      }, wait * 1000);
    } else {
      const remainingFull = currentTrack.duration - elapsed;
      const wait = Math.max(0.1, remainingFull - PLAYLIST_CROSSFADE);
      mixTimer = setTimeout(() => {
        if (!isPlaying || currentMode !== 'playlist') return;
        transitionToNext();
      }, wait * 1000);
    }
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
      deckA = { source: sourceA, gain: gainA, startTime: audioCtx.currentTime, offset: 0, trackIdx: currentIdx };
      isPlaying = true;
      scheduleNext();
      startMessageRotation();
    }
  }

  // ==================== CAMBIO DE MODO ====================
  function switchMode(mode) {
    if (currentMode === mode) return;
    currentMode = mode;
    btnMix.classList.toggle('active', mode === 'mix');
    btnPlaylist.classList.toggle('active', mode === 'playlist');

    if (isPlaying) {
      // Reiniciar la reproducción actual en el nuevo modo desde el principio del track
      stopAll();
      const savedIdx = currentIdx;
      currentIdx = savedIdx >= 0 ? savedIdx : 0;
      startRadio();
    }
  }

  btnMix.addEventListener('click', (e) => {
    e.stopPropagation();
    switchMode('mix');
  });
  btnPlaylist.addEventListener('click', (e) => {
    e.stopPropagation();
    switchMode('playlist');
  });

  // ==================== MENSAJE ROTATIVO ====================
  let messageInterval = null;
  let messageTimeout = null;

  function showMessage() {
    if (!isPlaying) return;
    scrollingMsgEl.textContent = ROTATING_MESSAGE;
    scrollingMsgEl.classList.add('visible');
    if (messageTimeout) clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
      scrollingMsgEl.classList.remove('visible');
    }, 4000);
  }

  function startMessageRotation() {
    if (messageInterval) clearInterval(messageInterval);
    setTimeout(() => {
      if (isPlaying) showMessage();
    }, 2000);
    messageInterval = setInterval(() => {
      if (isPlaying) showMessage();
    }, 15000);
  }

  // ==================== MODAL LEGAL Y COOKIES ====================
  const legalModal = document.getElementById('legalModal');
  const cookieBanner = document.getElementById('cookieBanner');
  const acceptCookiesBtn = document.getElementById('acceptCookiesBtn');
  const moreInfoBtn = document.getElementById('moreInfoBtn');
  const acceptLegalBtn = document.getElementById('acceptLegalBtn');

  function hideCookieBanner() {
    cookieBanner.style.display = 'none';
  }

  function showLegalModal() {
    legalModal.classList.add('show');
  }

  function hideLegalModal() {
    legalModal.classList.remove('show');
  }

  // Si ya aceptó cookies antes, ocultamos el banner
  if (localStorage.getItem('cookiesAccepted')) {
    hideCookieBanner();
  }

  acceptCookiesBtn.addEventListener('click', () => {
    localStorage.setItem('cookiesAccepted', 'true');
    hideCookieBanner();
    // Al aceptar cookies, mostramos el modal legal una sola vez
    if (!localStorage.getItem('legalAccepted')) {
      showLegalModal();
    }
  });

  moreInfoBtn.addEventListener('click', showLegalModal);

  acceptLegalBtn.addEventListener('click', () => {
    localStorage.setItem('legalAccepted', 'true');
    hideLegalModal();
    // Iniciar la radio después de aceptar (si no se había iniciado)
    if (!hasStarted && tracks.length > 0) {
      handleFirstTouch();
    }
  });

  // Si ya aceptó legal, no mostrar modal
  if (localStorage.getItem('legalAccepted')) {
    hideLegalModal();
  }

  // ==================== INICIO CON PRIMER TOQUE ====================
  function handleFirstTouch() {
    if (hasStarted) return;
    getAC();
    if (tracks.length === 0) {
      loadAllTracks().then(() => {
        if (tracks.length > 0) {
          hasStarted = true;
          startRadio();
        }
      });
    } else {
      hasStarted = true;
      startRadio();
    }
  }

  // Solo permitir inicio si se han aceptado cookies y legal
  function conditionalStart(e) {
    // Evitar que los botones de modo disparen el inicio
    if (e && (e.target === btnMix || e.target === btnPlaylist)) return;
    if (!localStorage.getItem('cookiesAccepted')) {
      // Mostrar banner si no se ha aceptado
      cookieBanner.style.display = 'flex';
      return;
    }
    if (!localStorage.getItem('legalAccepted')) {
      showLegalModal();
      return;
    }
    handleFirstTouch();
  }

  document.body.addEventListener('click', conditionalStart, { once: true });
  document.body.addEventListener('touchstart', conditionalStart, { once: true });

  // ==================== VISUALIZADOR ====================
  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!analyser || !isPlaying) {
      const w = vizCanvas.width, h = vizCanvas.height;
      ctxViz.clearRect(0, 0, w, h);
      const bars = 32;
      const barWidth = w / bars;
      for (let i = 0; i < bars; i++) {
        const value = Math.sin(Date.now() * 0.005 + i * 0.5) * 0.5 + 0.5;
        const barHeight = value * h * 0.8;
        const hue = (Date.now() * 0.1 + i * 10) % 360;
        ctxViz.fillStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
        ctxViz.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
      }
      return;
    }
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const w = vizCanvas.width, h = vizCanvas.height;
    ctxViz.clearRect(0, 0, w, h);
    const centerX = w / 2, centerY = h / 2;
    const radius = Math.min(w, h) * 0.4;
    const angleStep = (Math.PI * 2) / bufferLength;
    ctxViz.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] / 255;
      const angle = i * angleStep;
      const x = centerX + Math.cos(angle) * radius * (0.5 + value * 0.5);
      const y = centerY + Math.sin(angle) * radius * (0.5 + value * 0.5);
      if (i === 0) ctxViz.moveTo(x, y);
      else ctxViz.lineTo(x, y);
    }
    ctxViz.closePath();
    const gradient = ctxViz.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#ff00ff');
    gradient.addColorStop(0.5, '#00ffff');
    gradient.addColorStop(1, '#ff00ff');
    ctxViz.strokeStyle = gradient;
    ctxViz.lineWidth = 2;
    ctxViz.stroke();
    const barCount = 32;
    const barWidth = w / barCount;
    for (let i = 0; i < barCount; i++) {
      const value = dataArray[Math.floor(i * bufferLength / barCount)] / 255;
      const barHeight = value * h * 0.7;
      const hue = (i * 10 + Date.now() * 0.05) % 360;
      ctxViz.fillStyle = `hsla(${hue}, 80%, 60%, 0.5)`;
      ctxViz.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
    }
  }
  drawVisualizer();

  // ==================== LOGOS ====================
  async function loadLogo(path, containerId, hideBrand = false) {
    try {
      const response = await fetch(path);
      if (!response.ok) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Logo';
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      container.appendChild(img);
      if (hideBrand) {
        document.getElementById('brandText').style.display = 'none';
      }
    } catch (e) {}
  }

  loadLogo(LOGO_TOP_PATH, 'logoTopContainer', true);
  loadLogo(LOGO_BOTTOM_PATH, 'logoBottomContainer', false);

  loadAllTracks();
  updateHiddenCount();
})();
