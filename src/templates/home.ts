import { WeddingConfig } from "../db";

export function renderHomeHtml(config: WeddingConfig): string {
  const weddingDateStr = config.eventDate || "2027-02-13T11:30";
  const eventDateObj = new Date(weddingDateStr);
  const formattedDate = !isNaN(eventDateObj.getTime())
    ? eventDateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : config.eventDate;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chá de panela - ${config.coupleNames}</title>
  <meta name="description" content="Convite para o chá de panela de ${config.coupleNames}">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Great+Vibes&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg-dark: ${config.pageColor};
      --gold: ${config.primaryColor};
      --gold-light: ${config.primaryColor};
      --rose: ${config.secondaryColor};
      --card-bg: ${config.cardColor};
      --border: ${config.secondaryColor}55;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      overflow-x: hidden;
      width: 100%;
    }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg-dark);
      color: ${config.primaryColor};
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      text-align: center;
    }
    .hero-card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 44px 32px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .sub {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(0.95rem, 3.5vw, 1.2rem);
      letter-spacing: clamp(2px, 1vw, 4px);
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 12px;
    }
    .couple-names {
      font-family: 'Great Vibes', cursive;
      font-size: clamp(2.6rem, 9vw, 4.2rem);
      color: var(--gold-light);
      line-height: 1.15;
      margin-bottom: 16px;
      word-break: break-word;
    }
    .quote {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(1.05rem, 4vw, 1.25rem);
      font-style: italic;
      color: #cbd5e1;
      margin-bottom: 28px;
    }
    .event-info {
      margin-bottom: 24px;
      color: var(--gold);
      font-weight: 600;
      font-size: clamp(0.95rem, 3.8vw, 1.1rem);
      word-break: break-word;
    }
    .search-box {
      background: rgba(15, 18, 25, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 20px 16px;
      margin-bottom: 24px;
    }
    .search-title {
      font-size: clamp(0.85rem, 3.2vw, 0.95rem);
      font-weight: 600;
      color: var(--gold-light);
      margin-bottom: 14px;
      line-height: 1.4;
    }
    .input-row {
      display: flex;
      gap: 10px;
      width: 100%;
    }
    input {
      flex: 1;
      width: 100%;
      padding: 14px 16px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      color: #fff;
      font-size: 1rem; /* 16px prevents iOS tap zoom */
    }
    input:focus { outline: none; border-color: var(--gold); }
    button {
      padding: 14px 20px;
      background: linear-gradient(135deg, var(--gold) 0%, var(--rose) 100%);
      color: #0b0e14;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      min-height: 48px;
      transition: transform 0.2s, opacity 0.2s;
    }
    button:active { transform: scale(0.98); }
    .footer-admin {
      margin-top: 24px;
      font-size: 0.85rem;
    }
    .footer-admin a {
      color: var(--gold-light);
      text-decoration: none;
      opacity: 0.75;
      padding: 8px 12px;
      display: inline-block;
    }
    .footer-admin a:hover { opacity: 1; text-decoration: underline; }

    @media (max-width: 480px) {
      body {
        padding: 20px 12px;
      }
      .hero-card {
        padding: 28px 16px;
        border-radius: 20px;
      }
      .input-row {
        flex-direction: column;
      }
      button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="hero-card">
    <div class="sub">Você está convidado para</div><div class="sub">Chá de panela</div>
    <h1 class="couple-names">${config.coupleNames}</h1>
    <p class="quote">${config.welcomeMessage}</p>
    <p class="event-info">📅 ${formattedDate} - ${config.eventTime}</p>

    <div class="search-box">
      <div class="search-title">Código de convite</div>
      <form onsubmit="openInvite(event)" class="input-row">
        <input type="text" id="invite-code-input" placeholder="Ex: familia-silva" required autocomplete="off">
        <button type="submit">Abrir meu convite</button>
      </form>
    </div>
  </div>

  <script>
    function openInvite(e) {
      e.preventDefault();
      const code = document.getElementById('invite-code-input').value.trim();
      if (code) {
        window.location.href = '/convite/' + encodeURIComponent(code.toLowerCase());
      }
    }
  </script>
</body>
</html>`;
}
