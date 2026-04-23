<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
  <title>Faiz ul Mawaid | Chattogram - Tiffin Menu</title>
 
  <!-- Open Graph / Social Media Meta Tags (for link preview image) -->
  <meta property="og:title" content="Faiz ul Mawaid | Chattogram - Daily Tiffin Menu" />
  <meta property="og:description" content="Authentic Tiffin Service in Chattogram. View today's special menu and tiffin rules." />
  <meta property="og:image" content="https://i.ibb.co.com/VKYXZLM/Colorful-and-vibrant-tiffin-lunch-spread-1.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://faiz-ul-mawaid-chattogram.vercel.app/" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Faiz ul Mawaid | Chattogram - Tiffin Menu" />
  <meta name="twitter:description" content="Authentic Tiffin Service in Chattogram. Daily specials, tiffin rules & more." />
  <meta name="twitter:image" content="https://i.ibb.co.com/VKYXZLM/Colorful-and-vibrant-tiffin-lunch-spread-1.png" />
  <meta name="twitter:image" content="https://i.ibb.co.com/VKYXZLM/Colorful-and-vibrant-tiffin-lunch-spread-1.png" />
<link rel="preconnect" href="https://script.google.com">
<link rel="preconnect" href="https://cdnjs.cloudflare.com">
<link rel="dns-prefetch" href="https://script.google.com">
<title>Faiz ul Mawaid | Chattogram - Tiffin Menu</title>
 
  <!-- Favicon (optional but clean) -->
  <link rel="icon" type="image/png" href="https://i.ibb.co.com/VKYXZLM/Colorful-and-vibrant-tiffin-lunch-spread-1.png" />
 
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
  <!-- html2canvas for high-res capture -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

  <!-- PWA Manifest & Meta -->
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#fef3e4">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Faiz ul Mawaid">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: #fef3e4;
      font-family: 'Inter', sans-serif;
      padding: 12px;
      color: #2c2418;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    /* main container */
    .app-wrapper {
      max-width: 540px;
      width: 100%;
      margin: 0 auto;
      background: transparent;
      border-radius: 2rem;
      overflow: visible;
      position: relative;
    }
    /* capture area — will be rendered at high resolution, but layout stays responsive */
    #captureArea {
      background: linear-gradient(145deg, #fef9ef 0%, #f9efdf 100%);
      border-radius: 1.5rem;
      padding: 0.8rem;
      box-shadow: 0 8px 20px rgba(0,0,0,0.05);
      transition: all 0.2s;
    }
    /* Hero compact */
    .hero {
      position: relative;
      border-radius: 1.2rem;
      padding: 0.35rem 0.8rem 0.45rem 0.8rem;
      margin-bottom: 0.9rem;
      text-align: center;
      overflow: hidden;
      background: rgba(0,0,0,0.2);
      min-height: 70px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .hero::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: url('https://i.ibb.co.com/4ZDsZXtk/68iIh.jpg');
      background-size: cover;
      background-position: center;
      opacity: 0.85;
      z-index: 0;
    }
    .hero::after {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(135deg, rgba(0,0,0,0.35), rgba(0,0,0,0.2));
      z-index: 0;
    }
    .hero .arabic, .hero h3, .hero .brand {
      position: relative;
      z-index: 2;
    }
    .hero .arabic img {
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
      max-width: 150px;
      height: auto;
    }
    .hero h3 {
      color: #FFE6C7;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      font-size: 0.65rem;
      font-weight: 600;
      margin-top: 0.1rem;
      letter-spacing: 0.3px;
    }
    .hero .brand {
      color: #FFF2DF;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
      font-size: 0.6rem;
      font-weight: 500;
    }
    /* 2x2 GRID */
    .menu-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.8rem;
      margin-bottom: 1rem;
      max-height: none;
      overflow: visible;
    }
    .menu-card {
      background: white;
      border-radius: 1rem;
      overflow: hidden;
      border: 1px solid #f0e0cb;
      box-shadow: 0 2px 6px rgba(0,0,0,0.02);
      transition: opacity 0.3s ease;
    }
    .card-header {
      padding: 0.5rem 0.7rem;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      background: #fefaf5;
      border-bottom: 1px solid #f3e5d4;
      flex-wrap: wrap;
      gap: 0.3rem;
    }
    .day-name {
      font-weight: 700;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: #2c2418;
    }
    .day-name i {
      font-size: 0.7rem;
      color: #d49442;
    }
    .month-text {
      font-size: 0.95rem;
      font-weight: 800;
      color: #2c2418;
      letter-spacing: -0.3px;
    }
    .date-text {
      font-size: 1.35rem;
      font-weight: 900;
      color: #1f180f;
      line-height: 1;
    }
    .card-body {
      padding: 0.7rem;
    }
    .menu-item {
      font-weight: 600;
      font-size: 0.85rem;
      color: #1a160f;
      line-height: 1.4;
      word-break: break-word;
      padding: 0;
    }
    .notice-board {
      position: relative;
      border-radius: 1rem;
      padding: 0.8rem 1rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
      overflow: hidden;
      margin: 0.5rem 0 0.2rem 0;
    }
    .notice-board::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: url('https://i.ibb.co.com/ynH52MLX/k-H2n-R.jpg');
      background-size: cover;
      background-position: center;
      opacity: 0.92;
      z-index: 0;
    }
    .notice-board::after {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.55);
      z-index: 0;
    }
    .notice-board > * {
      position: relative;
      z-index: 2;
    }
    .rules-header {
      background: rgba(212, 148, 66, 0.95);
      padding: 0.25rem 0.9rem;
      border-radius: 2rem;
      font-weight: 700;
      font-size: 0.7rem;
      color: white;
      backdrop-filter: blur(2px);
    }
    .rules-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      list-style: none;
    }
    .rules-list li {
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.7rem;
      border-radius: 2rem;
      font-weight: 600;
      color: #fff2e0;
      backdrop-filter: blur(2px);
    }
    .rules-list li i {
      color: #ffcd94;
      font-size: 0.6rem;
    }
    .footer {
      text-align: right;
      margin-top: 0.6rem;
      padding: 0.3rem 0.2rem;
      font-size: 0.55rem;
      color: #b4916a;
    }
    /* ----- TOP RIGHT ACTION BUTTONS (ONLY SHARE REMAINING) ----- */
    .action-buttons {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2000;
      display: flex;
      gap: 10px;
      background: transparent;
    }
    .action-btn {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      transition: all 0.2s ease;
      border: none;
      backdrop-filter: blur(2px);
      background: linear-gradient(145deg, #e0a04b, #c9852e);
      color: white;
    }
    .action-btn:active {
      transform: scale(0.92);
      background: #bc7e34;
    }
    .action-btn i {
      font-size: 1.25rem;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
    }
    @media (max-width: 480px) {
      .action-btn {
        width: 38px;
        height: 38px;
      }
      .action-btn i {
        font-size: 1rem;
      }
      .action-buttons {
        top: 12px;
        right: 12px;
        gap: 8px;
      }
    }
    .no-data {
      grid-column: span 2;
      text-align: center;
      padding: 1.5rem;
      background: white;
      border-radius: 1.2rem;
      color: #b6926e;
    }
    @media (max-width: 560px) {
      body { padding: 8px; }
      .app-wrapper { max-width: 100%; }
      #captureArea { padding: 0.6rem; }
      .menu-grid { gap: 0.7rem; }
      .card-header { padding: 0.4rem 0.6rem; }
      .day-name { font-size: 0.8rem; }
      .month-text { font-size: 0.85rem; }
      .date-text { font-size: 1.25rem; }
      .menu-item { font-size: 0.8rem; }
      .rules-list li { font-size: 0.68rem; padding: 0.15rem 0.6rem; }
      .notice-board { padding: 0.6rem 0.8rem; }
      .hero .arabic img { max-width: 130px; }
    }
    @media (max-width: 420px) {
      .menu-grid { gap: 0.6rem; }
      .menu-item { font-size: 0.75rem; }
      .card-body { padding: 0.5rem; }
    }
    /* ========== ORIGINAL LOADING SCREEN ========== */
    #loader {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at center, #fff8f0 0%, #f2e6d9 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      transition: opacity 0.4s ease;
      color: #3e3b36;
      flex-direction: column;
      font-family: 'Inter', sans-serif;
      overflow: hidden;
    }
    #loader.hidden { opacity: 0; pointer-events: none; }
    .tiffin-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .floating-items {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
    }
    .float-item {
      position: absolute;
      opacity: 0;
      animation: floatUp 2.5s ease-out forwards;
      font-size: 12px;
      color: #7a6b46;
      pointer-events: none;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
    }
    .float-item.chili::before { content: "🌶️"; }
    .float-item.spoon::before { content: "🥄"; }
    .float-item.chapati::before { content: "🥙"; }
    .float-item.curry::before { content: "🍛"; }
    .float-item.spice::before { content: "🌿"; }
    .float-item.rice::before { content: "🍚"; }
    .float-item.veg::before { content: "🥦"; }
    .float-item.ladle::before { content: "🥣"; }
    .float-item.pickle::before { content: "🥒"; }
    .float-item.bread::before { content: "🍞"; }
    .float-item.onion::before { content: "🧅"; }
    .float-item.tomato::before { content: "🍅"; }
    .float-item.fork::before { content: "🍴"; }
    .float-item.pot::before { content: "🍲"; }
    .float-item.plate::before { content: "🍽️"; }
    @keyframes floatUp {
      0% { opacity: 0; transform: translateY(100px) rotate(0deg) scale(0.5); }
      20% { opacity: 1; transform: translateY(-20px) rotate(10deg) scale(1); }
      80% { opacity: 1; transform: translateY(-50px) rotate(-10deg) scale(1); }
      100% { opacity: 0; transform: translateY(-100px) rotate(0deg) scale(0.5); }
    }
    .tiffin {
      position: relative;
      width: 100px;
      height: 200px;
      z-index: 5;
    }
    .dabba {
      position: absolute;
      width: 90px;
      height: 38px;
      left: 5px;
      background: linear-gradient(145deg, #fdf5e6 0%, #f8e9ce 30%, #e7cfa8 70%, #d9c4a2 100%);
      border: 2px solid #b8a97a;
      border-top: 1px solid #c8b88a;
      border-bottom: 3px solid #a8996a;
      border-radius: 50% / 20%;
      box-shadow: inset 0 2px 6px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.05) inset;
      transform: translateY(60px) scale(0.95);
      opacity: 0;
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .dabba.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    .dabba.filled::before {
      content: "";
      position: absolute;
      top: 40%;
      left: 10px;
      width: 70px;
      height: 12px;
      border-radius: 6px;
      opacity: 0.95;
      animation: liquidFill 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }
    @keyframes liquidFill {
      0% { height: 0; opacity: 0; transform: scaleX(0.8) translateY(10px); }
      50% { transform: scaleX(1.05) translateY(-2px); }
      100% { height: 12px; opacity: 1; transform: scaleX(1); }
    }
    .dabba:nth-child(5).filled::before {
      background: linear-gradient(180deg, #fdd875 0%, #f9c462 100%);
      box-shadow: inset 0 2px 4px rgba(255, 215, 0, 0.3), 0 0 10px rgba(255, 215, 0, 0.2);
    }
    .dabba:nth-child(6).filled::before {
      background: #fff5b7;
      background-image: repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(255,255,255,0.6) 3px, rgba(255,255,255,0.6) 6px), radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 1px, transparent 1px);
      animation: grainShift 1s ease-in-out infinite alternate;
    }
    @keyframes grainShift {
      0% { background-position: 0 0, 20% 50%; }
      100% { background-position: 6px 0, 25% 50%; }
    }
    .dabba:nth-child(7).filled::before {
      background: linear-gradient(135deg, #d2f5a3, #a8d98b);
      border-radius: 50% 20% 50% 20%;
      box-shadow: inset 0 1px 2px rgba(255,255,255,0.5);
    }
    .dabba:nth-child(8).filled::before {
      background: linear-gradient(180deg, #f7c89f 0%, #e6b38a 100%);
      clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }
    .smoke-container {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 80px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .dabba.filled ~ .smoke-container { opacity: 1; }
    .smoke-particle {
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 2px;
      height: 2px;
      background: radial-gradient(ellipse, rgba(255,255,255,0.95) 0%, rgba(220,220,220,0.7) 40%, rgba(200,200,200,0.4) 70%, transparent 100%);
      border-radius: 50%;
      opacity: 0;
      animation: smokeRiseEnhanced 2.5s ease-out infinite;
      filter: blur(0.3px);
      box-shadow: 0 0 3px rgba(255,255,255,0.3);
    }
    .smoke-particle:nth-child(1) { left: 35%; width: 5px; height: 5px; animation-delay: 0s; animation-duration: 2.3s; }
    .smoke-particle:nth-child(2) { left: 65%; width: 4px; height: 4px; animation-delay: 0.2s; animation-duration: 2.0s; }
    .smoke-particle:nth-child(3) { left: 25%; width: 3px; height: 6px; animation-delay: 0.4s; animation-duration: 2.6s; }
    .smoke-particle:nth-child(4) { left: 75%; width: 2px; height: 4px; animation-delay: 0.6s; animation-duration: 2.1s; }
    .smoke-particle:nth-child(5) { left: 45%; width: 3px; height: 3px; animation-delay: 0.8s; animation-duration: 2.4s; }
    .smoke-particle:nth-child(6) { left: 55%; width: 1.5px; height: 5px; animation-delay: 1.0s; animation-duration: 1.9s; }
    .smoke-particle:nth-child(7) { left: 40%; width: 2.5px; height: 2.5px; animation-delay: 1.2s; animation-duration: 2.2s; }
    .smoke-particle:nth-child(8) { left: 60%; width: 4px; height: 4px; animation-delay: 1.4s; animation-duration: 2.5s; }
    @keyframes smokeRiseEnhanced {
      0% { opacity: 0; transform: translate(-50%, 0) scale(0.3) rotate(0deg); }
      5% { opacity: 1; }
      20% { transform: translate(calc(-50% + 10px), -15px) scale(0.8) rotate(45deg); }
      50% { opacity: 0.9; transform: translate(calc(-50% - 20px), -40px) scale(1.5) rotate(180deg); }
      80% { opacity: 0.6; transform: translate(calc(-50% + 30px), -70px) scale(2.2) rotate(270deg); }
      100% { opacity: 0; transform: translate(calc(-50% - 40px), -100px) scale(3) rotate(360deg); }
    }
    .rod {
      position: absolute;
      top: 0;
      width: 5px;
      height: 180px;
      background: linear-gradient(180deg, #d8c99b 0%, #c0b07a 50%, #a8996a 100%);
      border-radius: 3px;
      opacity: 0;
      transition: opacity 0.6s ease;
      box-shadow: 0 0 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.3);
      background-image: repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px), radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.2) 0%, transparent 50%);
    }
    .rod.left { left: -2px; }
    .rod.right { right: -2px; }
    .rod.visible { opacity: 0.7; }
    .top-lock {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 25px;
      opacity: 0;
      transition: opacity 0.4s ease;
      z-index: 10;
    }
    .top-lock.visible { opacity: 1; }
    .lock-body {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 30px;
      height: 25px;
      background: linear-gradient(145deg, #d4c183 0%, #b8a97a 50%, #a8996a 100%);
      border: 2px solid #a89b6a;
      border-radius: 15px;
      box-shadow: inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.2), 0 3px 6px rgba(0,0,0,0.3);
    }
    .lock-body::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 8px;
      background: linear-gradient(180deg, #555 0%, #333 100%);
      border-radius: 1px;
      box-shadow: inset 0 1px 1px rgba(0,0,0,0.3);
    }
    .key {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(0deg);
      width: 4px;
      height: 20px;
      background: linear-gradient(180deg, #ffd700 0%, #ffed4e 100%);
      border-radius: 2px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.5);
      transition: transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .top-lock.locking .key { transform: translate(-50%, -50%) rotate(540deg); }
    .key::before {
      content: "";
      position: absolute;
      top: -8px;
      left: -2px;
      right: -2px;
      height: 8px;
      background: linear-gradient(145deg, #ffd700 0%, #e6c200 100%);
      border-radius: 50% 50% 0 0;
      box-shadow: inset 0 1px 2px rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.2);
    }
    .key::after {
      content: "";
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      width: 8px;
      height: 6px;
      background: linear-gradient(90deg, #c9a75e 0%, #b89a5a 100%);
      clip-path: polygon(0 0, 100% 0, 70% 100%);
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .lock-arm {
      position: absolute;
      top: 10px;
      width: 25px;
      height: 5px;
      background: linear-gradient(90deg, #c0b07a 0%, #d4c183 100%);
      border-radius: 2px;
      opacity: 0;
      transform: scaleX(0);
      transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .top-lock.locking .lock-arm { opacity: 1; transform: scaleX(1); }
    .lock-arm.left { left: -35px; transform-origin: right center; }
    .lock-arm.right { right: -35px; transform-origin: left center; }
    .lock-arm::after {
      content: "";
      position: absolute;
      bottom: -3px;
      width: 10px;
      height: 7px;
      background: linear-gradient(180deg, #b8a97a 0%, #a8996a 100%);
      clip-path: polygon(0 0, 100% 0, 80% 100%);
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .handle {
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%) rotate(-90deg) scaleY(0);
      width: 50px;
      height: 30px;
      border: 2px solid #c6b37a;
      border-top-left-radius: 50%;
      border-top-right-radius: 50%;
      background: linear-gradient(145deg, #f5e3a7 0%, #d2be7a 100%);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.8), inset -2px 0 4px rgba(0,0,0,0.1);
      opacity: 0;
      transition: all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    .handle.visible { opacity: 1; transform: translateX(-50%) rotate(0deg) scaleY(1); }
    .handle.locked { transform: translateX(-50%) rotate(0deg) scaleY(1) translateY(3px); border-color: #a89b6a; box-shadow: 0 3px 6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.3); }
    .dabba::after {
      content: "";
      position: absolute;
      bottom: -2px;
      left: 6px;
      width: 78px;
      height: 2px;
      background: linear-gradient(90deg, #c9b98a 0%, #d8c999 100%);
      border-radius: 1px;
      background-image: repeating-linear-gradient(90deg, transparent, transparent 10px, #b8a97a 10px, #b8a97a 11px);
      box-shadow: inset 0 1px 1px rgba(255,255,255,0.3);
    }
    .shadow {
      position: absolute;
      bottom: -6px;
      left: 15px;
      width: 70px;
      height: 12px;
      background: radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 50%, transparent 100%);
      border-radius: 50%;
      transition: all 0.4s ease;
      filter: blur(2px);
    }
    .top-lock.locking ~ .shadow { transform: scale(1.05); animation: pulse 0.4s ease-in-out; }
    @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
    .sparkle {
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      width: 6px;
      height: 6px;
      background: radial-gradient(circle, #ffd700 0%, #ff6b35 100%);
      border-radius: 50%;
      opacity: 0;
      animation: sparkleAnim 0.5s ease-out forwards;
      pointer-events: none;
      box-shadow: 0 0 4px rgba(255,215,0,0.6);
    }
    @keyframes sparkleAnim {
      0% { opacity: 0; transform: translateX(-50%) scale(0) rotate(0deg) translateY(0); }
      50% { opacity: 1; transform: translateX(-50%) scale(1.2) rotate(180deg) translateY(-10px); }
      100% { opacity: 0; transform: translateX(-50%) scale(0) rotate(360deg) translateY(-20px); }
    }
    /* iOS Install Guide Modal */
    .install-guide-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10001;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .install-guide-content {
      background: white;
      border-radius: 20px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .install-guide-content h3 {
      margin-bottom: 16px;
      color: #2c2418;
    }
    .install-guide-content p {
      margin-bottom: 20px;
      line-height: 1.6;
      color: #5a4a3a;
    }
    .install-guide-content .share-icon {
      background: #007AFF;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      display: inline-block;
      margin: 10px 0;
    }
    .install-guide-content button {
      background: linear-gradient(145deg, #e0a04b, #c9852e);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 25px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      width: 100%;
    }
    /* fast loading indicator for data */
    .loading-placeholder {
      grid-column: span 2;
      text-align: center;
      padding: 2rem;
      color: #b6926e;
    }
  </style>
</head>
<body>
<!-- ORIGINAL LOADING ANIMATION (preserved) -->
<div id="loader">
  <div class="tiffin-container">
    <div class="floating-items" id="floatingItems"></div>
    <div class="tiffin">
      <div class="top-lock"><div class="lock-body"></div><div class="key"></div><div class="lock-arm left"></div><div class="lock-arm right"></div></div>
      <div class="handle"></div>
      <div class="rod left"></div><div class="rod right"></div>
      <div class="dabba" style="bottom: 0;"><div class="smoke-container"><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div></div></div>
      <div class="dabba" style="bottom: 40px;"><div class="smoke-container"><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div></div></div>
      <div class="dabba" style="bottom: 80px;"><div class="smoke-container"><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div></div></div>
      <div class="dabba" style="bottom: 120px;"><div class="smoke-container"><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div><div class="smoke-particle"></div></div></div>
      <div class="shadow"></div>
    </div>
  </div>
  <div class="footer"><i class="fas fa-database"></i> Faiz ul Mawaid Chattogram | Developed By Mohammed Paghdiwala</div>
</div>

<!-- iOS Install Guide Modal -->
<div class="install-guide-modal" id="installGuideModal">
  <div class="install-guide-content">
    <h3>Install Faiz ul Mawaid</h3>
    <p>To install this app on your iPhone/iPad:</p>
    <p>1. Tap the <strong>Share</strong> button <i class="fas fa-share-alt" style="color: #007AFF;"></i> at the bottom</p>
    <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong> <i class="fas fa-plus-square"></i></p>
    <p>3. Tap <strong>"Add"</strong> in the top right</p>
    <button onclick="document.getElementById('installGuideModal').style.display='none'">Got it</button>
  </div>
</div>

<div class="app-wrapper">
  <div id="captureArea">
    <div class="hero">
      <div class="arabic"><a href="https://ibb.co.com/9HbGkjyK"><img src="https://i.ibb.co.com/Df9LHnwc/Lz-QEn-removebg-preview.png" alt="Lz-QEn-removebg-preview" border="0" height="55" width="180" style="max-width: 100%; height: auto;"></a></div>
      <h3>Chattogram</h3>
      <div class="brand">الحمد لله والشكر لوليه</div>
    </div>
    <div class="menu-grid" id="menuGrid" role="feed">
      <div class="loading-placeholder"><i class="fas fa-spinner fa-pulse fa-2x"></i><br><br>Loading menu...</div>
    </div>
    <div class="notice-board">
      <div class="rules-header"><i class="fas fa-clipboard-list"></i> Tiffin Rules</div>
      <ul class="rules-list">
        <li><i class="fas fa-hand-sparkles"></i> Wash & dry Tiffin</li>
        <li><i class="fas fa-temperature-high"></i> Do NOT heat in Tiffin</li>
        <li><i class="fas fa-id-card"></i> Must bring FMB Card</li>
        <li><i class="fas fa-clock"></i> Please put your FMB Tiffin before 10:00 AM</li>
      </ul>
    </div>
    <div class="footer"></div>
  </div>
</div>
<!-- TOP RIGHT BUTTONS -->
<div class="action-buttons">
  <button class="action-btn" id="installBtn" title="Install App"><i class="fas fa-download"></i></button>
  <button class="action-btn" id="shareBtn" title="Share"><i class="fas fa-share-alt"></i></button>
</div>
<script>
  // ========== LOADING ANIMATION (exactly 2 seconds then hide) ==========
  (function() {
    const dabbas = document.querySelectorAll('#loader .dabba');
    const rods = document.querySelectorAll('#loader .rod');
    const topLock = document.querySelector('#loader .top-lock');
    const handle = document.querySelector('#loader .handle');
    const floatingContainer = document.getElementById('floatingItems');
    let sparkleCount = 0;
    const items = ['chili', 'spoon', 'chapati', 'curry', 'spice', 'rice', 'veg', 'ladle', 'pickle', 'bread', 'onion', 'tomato', 'fork', 'pot', 'plate'];
   
    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
   
    const shuffledItems = shuffleArray([...items]);
    let itemIndex = 0;
   
    function createFloatItem() {
      if (itemIndex >= shuffledItems.length) itemIndex = 0;
      const itemType = shuffledItems[itemIndex];
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('float-item', itemType);
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const x = side === 'left' ? Math.random() * -50 - 20 : Math.random() * 50 + 120;
      const y = Math.random() * 200 + 100;
      itemDiv.style.left = `${x}px`;
      itemDiv.style.top = `${y}px`;
      const delay = itemIndex * 0.08;
      const duration = 1.5 + Math.random() * 0.8;
      itemDiv.style.animationDelay = `${delay}s`;
      itemDiv.style.animationDuration = `${duration}s`;
      floatingContainer.appendChild(itemDiv);
      setTimeout(() => itemDiv.remove(), (duration + delay) * 1000 + 300);
      itemIndex++;
    }
   
    for (let i = 0; i < shuffledItems.length; i++) setTimeout(createFloatItem, i * 80);
   
    dabbas.forEach((dabba, i) => {
      setTimeout(() => {
        dabba.classList.add('visible');
        setTimeout(() => {
          dabba.classList.add('filled');
          const smokeContainer = dabba.querySelector('.smoke-container');
          if (smokeContainer) smokeContainer.style.opacity = '1';
        }, 100);
      }, i * 200);
    });
   
    setTimeout(() => { rods.forEach(rod => rod.classList.add('visible')); }, dabbas.length * 200 + 100);
    setTimeout(() => {
      topLock.classList.add('visible');
      setTimeout(() => {
        topLock.classList.add('locking');
        const sparkleInterval = setInterval(() => {
          if (sparkleCount < 6) createSparkle();
          else clearInterval(sparkleInterval);
        }, 100);
        setTimeout(() => clearInterval(sparkleInterval), 600);
      }, 100);
    }, 700);
    
    function createSparkle() {
      const sparkle = document.createElement('div');
      sparkle.classList.add('sparkle');
      sparkle.style.left = (50 + (Math.random() - 0.5) * 20) + '%';
      topLock.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 500);
      sparkleCount++;
    }
   
    setTimeout(() => {
      handle.classList.add('visible');
      setTimeout(() => { handle.classList.add('locked'); }, 200);
    }, 900);
    
    // Force hide loader after exactly 2000ms (2 seconds)
    setTimeout(() => {
      const loaderElement = document.getElementById('loader');
      if (loaderElement) {
        loaderElement.classList.add('hidden');
      }
    }, 2000);
  })();
  
  // ========== OPTIMIZED GOOGLE SHEETS INTEGRATION (FAST LOADING WITH CACHE) ==========
  const API_URL = "https://script.google.com/macros/s/AKfycbwxTQXh6hMiCUjdkmEaUeuMTnCZ6wQW_tGZ71eyrLGSmAwlWHtblVTsrnXozvJt_tgR/exec";
  let allMenuData = [];
  const menuGrid = document.getElementById('menuGrid');
  
  // Cache key for localStorage
  const CACHE_KEY = 'faiz_menu_cache';
  const CACHE_TIMESTAMP_KEY = 'faiz_menu_cache_time';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours cache
  
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  }
  
  function getMenuItemStyle(entry) {
    let style = "";
    if (entry.color) style += `color: ${entry.color}; `;
    if (entry.bgColor) style += `background-color: ${entry.bgColor}; `;
    if (entry.fontWeight) style += `font-weight: ${entry.fontWeight}; `;
    if (entry.fontStyle) style += `font-style: ${entry.fontStyle}; `;
    if (entry.fontSize) style += `font-size: ${entry.fontSize}; `;
    style += `padding: 4px; border-radius: 6px; display: block;`;
    return style;
  }
  
  const monthOrder = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  
  function renderLast6DaysWithMenu() {
    if (allMenuData.length === 0) {
      menuGrid.innerHTML = `<div class="no-data"><i class="fas fa-calendar-day fa-2x"></i><br><br>No menu data received from sheet.</div>`;
      return;
    }
    
    const validEntries = allMenuData.filter(item => {
      const menu = (item.menuItem || "").toString().trim();
      return menu !== "" && menu.toLowerCase() !== "null" && menu.toLowerCase() !== "undefined";
    });
    
    if (validEntries.length === 0) {
      menuGrid.innerHTML = `<div class="no-data"><i class="fas fa-calendar-day fa-2x"></i><br><br>No menu items found in the sheet.</div>`;
      return;
    }
    
    const sortedData = [...validEntries].sort((a, b) => {
      const monthA = monthOrder.indexOf((a.month || "").trim());
      const monthB = monthOrder.indexOf((b.month || "").trim());
      if (monthA !== monthB) return monthA - monthB;
      return (parseInt(a.day) || 0) - (parseInt(b.day) || 0);
    });
    
    const last6 = sortedData.slice(-6);
    let html = '';
    for (const entry of last6) {
      const dayNumber = entry.day || '';
      const weekdayName = entry.weekday ? escapeHtml(entry.weekday) : '—';
      const monthDisplay = entry.month ? escapeHtml(entry.month) : '—';
      const menuText = entry.menuItem ? escapeHtml(entry.menuItem) : "Traditional Tiffin Special";
      const inlineStyle = getMenuItemStyle(entry);
      html += `<div class="menu-card">
        <div class="card-header">
          <div class="day-name"><i class="fas fa-calendar-alt"></i><span>${weekdayName}</span></div>
          <div style="display: flex; gap: 0.5rem; align-items: baseline;">
            <span class="month-text">${monthDisplay}</span>
            <span class="date-text">${dayNumber}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="menu-item" style="${inlineStyle}">${menuText}</div>
        </div>
      </div>`;
    }
    menuGrid.innerHTML = html;
  }
  
  // Load from cache first (instant display)
  function loadFromCache() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cacheTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (cachedData && cacheTime) {
      const now = Date.now();
      if (now - parseInt(cacheTime) < CACHE_DURATION) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            allMenuData = parsed;
            renderLast6DaysWithMenu();
            console.log("Loaded from cache");
            return true;
          }
        } catch(e) {}
      }
    }
    return false;
  }
  
  // Save to cache
  function saveToCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch(e) {}
  }
  
  // Fetch fresh data from Google Sheets (async, non-blocking)
  async function fetchFreshData() {
    try {
      console.log("Fetching fresh data from Google Sheet...");
      // Use fetch with AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (data.success && data.menuData && Array.isArray(data.menuData)) {
        const newData = data.menuData;
        newData.forEach(item => {
          if (!item.weekday) item.weekday = `Day ${item.day || ''}`;
          item.menuItem = (item.menuItem || "").toString().trim();
          item.day = parseInt(item.day, 10) || 0;
          item.month = (item.month || "").toString().trim();
        });
        
        // Only update if data changed (compare length or first item)
        const shouldUpdate = JSON.stringify(allMenuData) !== JSON.stringify(newData);
        if (shouldUpdate || allMenuData.length === 0) {
          allMenuData = newData;
          saveToCache(allMenuData);
          renderLast6DaysWithMenu();
          console.log("Updated with fresh data");
        } else {
          console.log("Fresh data identical to cache");
        }
      } else {
        throw new Error(data.error || "Invalid response");
      }
    } catch (error) {
      console.warn("Background fetch failed:", error);
      // If no cache was loaded and fetch fails, show error
      if (allMenuData.length === 0) {
        menuGrid.innerHTML = `<div class="no-data">
          <i class="fas fa-cloud-download-alt fa-3x"></i><br>
          <strong>⚠️ Connection Error</strong><br>
          Please check your internet connection.<br><br>
          <small>Will retry automatically...</small>
        </div>`;
      }
    }
  }
  
  // Initialize - load cache instantly, then fetch fresh in background
  const cacheLoaded = loadFromCache();
  if (!cacheLoaded) {
    // Show loading state while fetching
    menuGrid.innerHTML = `<div class="loading-placeholder"><i class="fas fa-spinner fa-pulse fa-2x"></i><br><br>Loading menu...</div>`;
  }
  
  // Fetch fresh data in background (doesn't block UI)
  fetchFreshData();
  
  // ========== SHARE BUTTON ==========
  async function getHighResImageBlob() {
    const captureElement = document.getElementById('captureArea');
    if (!captureElement) throw new Error("Capture area missing");
   
    const originalWidth = captureElement.style.width;
    const originalMaxWidth = captureElement.style.maxWidth;
   
    try {
      captureElement.style.width = '540px';
      captureElement.style.maxWidth = '540px';
     
      const canvas = await html2canvas(captureElement, {
        scale: 3.8,
        backgroundColor: '#fef9ef',
        useCORS: true,
        allowTaint: false,
        logging: false
      });
     
      return await new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92));
    } finally {
      captureElement.style.width = originalWidth || '';
      captureElement.style.maxWidth = originalMaxWidth || '';
    }
  }
  
  const shareBtn = document.getElementById('shareBtn');
  shareBtn.addEventListener('click', async () => {
    try {
      shareBtn.style.pointerEvents = 'none';
      const originalIcon = shareBtn.innerHTML;
      shareBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
      const blob = await getHighResImageBlob();
      const file = new File([blob], `Faiz_Tiffin_Last6Days.jpg`, { type: 'image/jpeg' });
      if (navigator.share) {
        await navigator.share({
          title: 'Faiz ul Mawaid Tiffin Menu - Last 6 Days',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `Faiz_Tiffin_Last6Days.jpg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        alert("Image downloaded successfully!");
      }
      shareBtn.innerHTML = originalIcon;
    } catch (err) {
      if (err.name !== 'AbortError') alert("Sharing failed: " + (err.message || "Unknown error"));
    } finally {
      shareBtn.style.pointerEvents = 'auto';
    }
  });

  // ========== PWA INSTALL BUTTON + SERVICE WORKER ==========
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed', err));
    });
  }

  let deferredPrompt;
  const installBtn = document.getElementById('installBtn');

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function isInStandaloneMode() {
    return (window.matchMedia('(display-mode: standalone)').matches) || 
           ('standalone' in window.navigator && window.navigator.standalone) || 
           document.referrer.includes('android-app://');
  }

  function handleInstallButton() {
    if (isInStandaloneMode()) {
      installBtn.style.display = 'none';
      return;
    }
    if (isIOS()) {
      installBtn.style.display = 'flex';
      return;
    }
    installBtn.style.display = 'none';
  }

  handleInstallButton();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isIOS()) {
      installBtn.style.display = 'flex';
    }
  });

  installBtn.addEventListener('click', async () => {
    if (isIOS()) {
      document.getElementById('installGuideModal').style.display = 'flex';
      return;
    }
    if (!deferredPrompt) return;
    
    installBtn.style.pointerEvents = 'none';
    const originalIcon = installBtn.innerHTML;
    installBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    deferredPrompt = null;
    installBtn.style.display = 'none';
    installBtn.innerHTML = originalIcon;
    installBtn.style.pointerEvents = 'auto';
  });

  window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    deferredPrompt = null;
  });

  window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
    if (evt.matches) installBtn.style.display = 'none';
  });
</script>
</body>
</html>
