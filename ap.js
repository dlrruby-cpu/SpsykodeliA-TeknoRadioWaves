<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
  <title>PsikodeliA TeknoRadio™</title>
  <meta name="description" content="Radio Techno psicodélica con mezcla automática." />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔮</text></svg>" />
  <style>
    /* ===== RESET Y FULLSCREEN ===== */
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      width:100%; height:100%; overflow:hidden;
      background:#0a0a0a;
      font-family:'Courier New', monospace;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
      user-select:none;
    }
    #psyCanvas {
      position:fixed; top:0; left:0; width:100%; height:100%; z-index:0;
      pointer-events:none;
    }

    /* ===== RADIO BODY – FULLSCREEN, SIN MOVIMIENTO ===== */
    .radio-body {
      position:absolute; top:0; left:0;
      width:100%; height:100%;
      z-index:10;
      background:linear-gradient(145deg, #1a0a1a, #0d0d0d);
      border-radius:0;
      box-shadow:none;
      border:none;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:1.5vh;
      padding:2vh 0 2vh;
      overflow:hidden;
      background-image:
        linear-gradient(145deg, #1a0a1a, #0d0d0d),
        repeating-linear-gradient(45deg, rgba(255,0,255,0.03) 0px, rgba(255,0,255,0.03) 2px, transparent 2px, transparent 6px),
        radial-gradient(circle at 20% 30%, rgba(139,0,139,0.15) 2%, transparent 10%),
        radial-gradient(circle at 80% 70%, rgba(255,0,255,0.1) 3%, transparent 15%);
      background-blend-mode: overlay;
    }
    .rust-effect {
      position:absolute; pointer-events:none; z-index:2;
      width:100%; height:100%;
      background:radial-gradient(circle at 30% 40%, rgba(200,0,200,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,0,255,0.15) 0%, transparent 40%);
      mix-blend-mode:multiply;
    }

    /* ===== TEXTOS DECORATIVOS ===== */
    .deco-text {
      position:absolute;
      font-family:'Courier New', monospace;
      font-weight:bold;
      color:rgba(255,0,255,0.15);
      text-shadow:0 0 10px rgba(255,0,255,0.1);
      pointer-events:none;
      z-index:1;
      letter-spacing:2px;
      transform:rotate(-5deg);
    }
    .deco-text.tekno { top:6%; left:6%; font-size:clamp(0.7rem,2vw,1.2rem); color:rgba(0,255,255,0.12); }
    .deco-text.inkrott { bottom:12%; right:6%; font-size:clamp(0.6rem,1.8vw,1rem); color:rgba(255,0,255,0.12); }
    .deco-text.dtac { top:16%; right:6%; font-size:clamp(0.5rem,1.5vw,0.9rem); color:rgba(0,255,200,0.1); }
    .deco-text.antieffet { bottom:20%; left:6%; font-size:clamp(0.5rem,1.5vw,0.9rem); color:rgba(255,200,0,0.1); }

    /* ===== MARCA Y LOGOS ===== */
    .brand-text {
      font-size: clamp(1rem, 3.5vw, 1.8rem);
      letter-spacing:4px;
      text-align:center;
      font-weight:bold;
      color:#8a6a8a;
      text-shadow:-1px -1px 2px rgba(0,0,0,0.8), 1px 1px 2px rgba(255,255,255,0.1), 0 0 15px rgba(255,0,255,0.3);
      transform:perspective(500px) rotateX(3deg);
      margin-bottom:-0.5vh;
      font-family:'Courier New', monospace;
    }
    .logo-top-container {
      display:flex; align-items:center; justify-content:center;
      min-height:40px;
    }
    .logo-bottom-container {
      position:absolute; bottom:10px; right:10px; z-index:25;
      display:flex; align-items:center; justify-content:center;
    }

    /* ===== PANTALLA DEL VISUALIZADOR (ANCHO COMPLETO) ===== */
    .display-screen {
      width:100%;
      height:45%;
      max-height:50vh;
      background:linear-gradient(180deg, #0d0a0d 0%, #030103 100%);
      border-radius:0;
      border-top:2px solid #5a3a5a;
      border-bottom:2px solid #5a3a5a;
      box-shadow:inset 0 0 30px #000000, 0 0 20px #ff00ff44;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      position:relative;
      overflow:hidden;
      cursor:pointer;
    }
    .visualizer-canvas {
      width:100%; height:100%;
      border-radius:0;
      position:absolute; top:0; left:0;
    }
    .status-message {
      position:absolute; bottom:10%; left:0; width:100%; text-align:center;
      font-size:clamp(0.6rem, 2.2vw, 0.9rem);
      color:#ff66ff; text-shadow:0 0 15px #ff00ff, 0 0 30px #ff00ff88;
      letter-spacing:2px; font-weight:bold; pointer-events:none; z-index:10;
      white-space:nowrap; overflow:hidden;
    }

    /* ===== BOTONES DE MODO ===== */
    .mode-selectors {
      display:flex; gap:1.5rem; margin:0.5vh 0; z-index:20;
    }
    .mode-btn {
      background:linear-gradient(180deg, #2a1a2a 0%, #1a0f1a 100%);
      border:2px solid #5a4a5a;
      border-radius:12px;
      padding:0.5rem 1.2rem;
      font-family:'Courier New', monospace;
      font-weight:bold;
      font-size:clamp(0.7rem, 2vw, 0.9rem);
      letter-spacing:2px;
      color:#886688;
      text-shadow:0 1px 0 #00000088, 0 -1px 0 #ffffff22;
      box-shadow:inset 0 2px 5px rgba(0,0,0,0.8), 0 3px 6px rgba(0,0,0,0.6);
      cursor:pointer;
      transition:all 0.2s ease;
      text-transform:lowercase;
      outline:none;
      user-select:none;
      -webkit-tap-highlight-color:transparent;
    }
    .mode-btn.active {
      color:#00ffff;
      text-shadow:0 0 12px #00ffff, 0 0 25px #00ffff;
      border-color:#00ffff;
      box-shadow:0 0 15px #00ffff88, inset 0 0 8px #00ffff44;
      background:linear-gradient(180deg, #1a2a2a 0%, #0a1a1a 100%);
    }

    /* ===== BOTÓN PAYPAL SUTIL ===== */
    .paypal-btn {
      position:absolute;
      bottom:12px; left:12px;
      background:rgba(255,255,255,0.08);
      color:#888;
      font-weight:normal;
      padding:4px 10px;
      border-radius:12px;
      text-decoration:none;
      font-size:0.6rem;
      border:1px solid rgba(255,255,255,0.15);
      box-shadow:0 0 8px rgba(255,255,255,0.05);
      z-index:25;
      letter-spacing:0.5px;
      cursor:pointer;
      display:block !important;
      transition:0.2s;
      backdrop-filter:blur(4px);
    }
    .paypal-btn:hover {
      background:rgba(255,255,255,0.15);
      color:#ccc;
    }

    /* ===== CONTADOR OCULTO ===== */
    .hidden-track-count {
      position:absolute; bottom:3%; right:5%;
      color:rgba(255,255,255,0.06);
      font-size:clamp(0.5rem,1.5vw,0.8rem);
      font-weight:bold; pointer-events:none; z-index:15;
    }

    /* ===== MODAL LEGAL ===== */
    .legal-modal {
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.95);
      z-index:1000;
      display:flex;
      align-items:center;
      justify-content:center;
      color:#fff;
    }
    .legal-content {
      background:#1a0a1a;
      border:2px solid #ff00ff;
      border-radius:20px;
      padding:2rem;
      max-width:350px;
      text-align:center;
      font-family:'Courier New', monospace;
    }
    .legal-content h2 { color:#ff00ff; margin-bottom:1rem; }
    .legal-content p { font-size:0.8rem; margin:0.5rem 0; line-height:1.4; }
    .legal-content a { color:#00ffff; }
    .legal-btn {
      background:#ff00ff;
      border:none;
      color:#000;
      font-weight:bold;
      padding:0.7rem 2rem;
      border-radius:30px;
      cursor:pointer;
      margin-top:1rem;
      font-family:'Courier New', monospace;
      box-shadow:0 0 15px #ff00ff88;
      font-size:1rem;
    }

    @media (max-width:400px) {
      .radio-body { padding:1vh 0; }
      .brand-text { font-size: clamp(0.9rem, 5vw, 1.4rem); }
      .mode-btn { padding:0.3rem 0.7rem; font-size:0.65rem; }
      .display-screen { height:40%; }
    }
  </style>
</head>
<body>
  <canvas id="psyCanvas" aria-hidden="true"></canvas>

  <div class="radio-body" role="application" aria-label="PsikodeliA TeknoRadio">
    <div class="rust-effect"></div>

    <!-- Textos decorativos -->
    <div class="deco-text tekno">Psyukodkka Takno</div>
    <div class="deco-text inkrott">Inkrott</div>
    <div class="deco-text dtac">dtac</div>
    <div class="deco-text antieffet">antieffet cv</div>

    <div class="brand-text" id="brandText">PsikodeliA TeknoRadio™</div>
    <div id="logoTopContainer" class="logo-top-container"></div>

    <!-- Pantalla visualizador (ancho completo) -->
    <div class="display-screen" id="screenBtn">
      <canvas class="visualizer-canvas" id="vizCanvas"></canvas>
      <div class="status-message" id="statusMessage">ACEPTA LOS TÉRMINOS PRIMERO</div>
    </div>

    <div class="mode-selectors">
      <button class="mode-btn active" id="btnMix">mix</button>
      <button class="mode-btn" id="btnPlaylist">playlist</button>
    </div>

    <!-- Botón PayPal sutil -->
    <a class="paypal-btn" href="https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=dlrx75@gmail.com&item_name=Donaci%C3%B3n+PsikodeliA+TeknoRadio&currency_code=EUR" target="_blank" rel="noopener" aria-label="Donar con PayPal">💛 donar</a>

    <div id="logoBottomContainer" class="logo-bottom-container"></div>
    <div class="hidden-track-count" id="hiddenCount">0</div>
  </div>

  <!-- Modal legal -->
  <div class="legal-modal" id="legalModal">
    <div class="legal-content">
      <h2>PsikodeliA TeknoRadio™</h2>
      <p>Usamos cookies técnicas para el reproductor.</p>
      <p>Al continuar aceptas nuestra <a href="#">Política de Privacidad</a> y <a href="#">Términos de Uso</a>.</p>
      <p>Puedes donar con PayPal para apoyar el proyecto.</p>
      <button class="legal-btn" id="acceptLegal">Aceptar</button>
    </div>
  </div>

  <script src="ap.js"></script>
</body>
</html>
