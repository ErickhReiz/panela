import { Invitation, WeddingConfig } from "../db";

export function renderInviteHtml(invite: Invitation, config: WeddingConfig, baseUrl: string): string {
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
  <title>Convite para Chá de Panela - ${config.coupleNames} | ${invite.title}</title>
  <meta name="description" content="Convite de chá de panela para ${invite.title}">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Great+Vibes&display=swap" rel="stylesheet">
  
  <!-- Canvas Confetti -->
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>

  <style>
    :root {
      --bg-primary: ${config.pageColor};
      --bg-card: ${config.cardColor};
      --bg-card-border: ${config.secondaryColor}55;
      --accent-gold: ${config.primaryColor};
      --accent-gold-light: ${config.primaryColor};
      --accent-rose: ${config.secondaryColor};
      --text-main: ${config.primaryColor};
      --text-muted: #667487;
      --success-green: #10b981;
      --danger-red: #ef4444;
      --radius-lg: ${config.cornerRadius}px;
      --radius-md: ${Math.round(config.cornerRadius * 0.65)}px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      overflow-x: hidden;
      width: 100%;
    }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: ${config.pageColor};
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 12px 60px;
      line-height: 1.6;
    }

    .container {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
    }

    /* Header Banner */
    .header-card {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--bg-card-border);
      border-radius: var(--radius-lg);
      padding: 36px 20px;
      text-align: center;
      box-shadow: 0 12px ${config.shadowStrength * 2}px #142b4a24;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
    }

    .header-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, transparent, var(--accent-gold), var(--accent-rose), transparent);
    }

    .subtitle-top {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(0.95rem, 3.5vw, 1.1rem);
      letter-spacing: clamp(1.5px, 0.8vw, 3px);
      text-transform: uppercase;
      color: var(--accent-gold);
      margin-bottom: 8px;
    }

    .couple-title {
      font-family: 'Great Vibes', cursive;
      font-size: clamp(2.3rem, 8.5vw, 3.6rem);
      color: var(--accent-gold-light);
      text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
      line-height: 1.25;
      margin-bottom: 12px;
      word-break: break-word;
    }

    .welcome-msg {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(1rem, 3.8vw, 1.25rem);
      font-style: italic;
      color: #cbd5e1;
      max-width: 500px;
      margin: 0 auto 20px;
    }

    /* Group Tag */
    .guest-group-badge {
      display: inline-block;
      background: rgba(212, 175, 55, 0.12);
      border: 1px solid rgba(212, 175, 55, 0.4);
      color: var(--accent-gold-light);
      padding: 8px 18px;
      border-radius: 50px;
      font-size: clamp(0.85rem, 3.2vw, 0.95rem);
      font-weight: 600;
      letter-spacing: 0.5px;
      max-width: 100%;
      word-break: break-word;
    }

    /* Countdown */
    .countdown-container {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin: 20px 0 8px;
      width: 100%;
    }

    .count-box {
      background: ${config.primaryColor}08;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-md);
      padding: 10px 6px;
      flex: 1;
      min-width: 0;
      text-align: center;
    }

    .count-num {
      font-size: clamp(1.1rem, 4.5vw, 1.5rem);
      font-weight: 700;
      color: var(--accent-gold);
      display: block;
      line-height: 1;
    }

    .count-label {
      font-size: clamp(0.6rem, 2vw, 0.7rem);
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.5px;
      margin-top: 4px;
      display: block;
    }

    /* Main Content Card */
    .section-card {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--bg-card-border);
      border-radius: var(--radius-lg);
      padding: 28px 20px;
      margin-bottom: 20px;
      box-shadow: 0 8px ${config.shadowStrength}px #142b4a1c;
    }

    .section-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(1.4rem, 5vw, 1.8rem);
      color: var(--accent-gold);
      text-align: center;
      margin-bottom: 8px;
    }

    .section-sub {
      text-align: center;
      font-size: clamp(0.8rem, 3.2vw, 0.9rem);
      color: var(--text-muted);
      margin-bottom: 20px;
    }

    /* Guest RSVP List */
    .guest-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .guest-card {
      background: ${config.primaryColor}07;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-md);
      padding: 16px;
      transition: border-color 0.2s, transform 0.2s;
    }

    .guest-card:hover {
      border-color: rgba(212, 175, 55, 0.4);
    }

    .guest-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .guest-name {
      font-size: clamp(1rem, 3.8vw, 1.15rem);
      font-weight: 600;
      color: ${config.cardColor};
      word-break: break-word;
    }

    .status-badge {
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .status-badge.confirmed { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .status-badge.declined { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .status-badge.pending { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }

    .rsvp-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }

    .rsvp-btn {
      padding: 12px 10px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-main);
      font-size: clamp(0.85rem, 3.2vw, 0.9rem);
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 48px;
      transition: all 0.2s ease;
    }

    .rsvp-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .rsvp-btn.selected-yes {
      background: rgba(16, 185, 129, 0.25);
      border-color: var(--success-green);
      color: #6ee7b7;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
    }

    .rsvp-btn.selected-no {
      background: rgba(239, 68, 68, 0.25);
      border-color: var(--danger-red);
      color: #fca5a5;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
    }

    .diet-input {
      width: 100%;
      background: ${config.pageColor};
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 12px;
      color: ${config.cardColor};
      font-size: 1rem; /* 16px prevents iOS zoom */
      margin-top: 8px;
    }

    .diet-input:focus {
      outline: none;
      border-color: var(--accent-gold);
    }

    .submit-btn {
      width: 100%;
      background: linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-rose) 100%);
      color: #0f1219;
      border: none;
      border-radius: var(--radius-md);
      padding: 16px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      margin-top: 20px;
      min-height: 50px;
      box-shadow: 0 8px 24px rgba(212, 175, 55, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(212, 175, 55, 0.4);
    }

    /* Details Grid */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }

    .detail-item {
      background: ${config.primaryColor}08;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-md);
      padding: 14px 10px;
      text-align: center;
    }

    .detail-icon {
      font-size: 1.4rem;
      margin-bottom: 6px;
    }

    .detail-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--accent-gold);
      margin-bottom: 4px;
    }

    .detail-val {
      font-size: 0.9rem;
      color: var(--text-main);
      font-weight: 500;
      word-break: break-word;
    }

    .action-link {
      display: inline-block;
      margin-top: 8px;
      color: var(--accent-gold-light);
      text-decoration: underline;
      font-size: 0.85rem;
      padding: 4px;
    }

    /* Alert / FeedbackToast */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1e293b;
      color: ${config.cardColor};
      padding: 12px 24px;
      border-radius: 50px;
      border: 1px solid var(--accent-gold);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      font-size: 0.9rem;
      font-weight: 600;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      z-index: 100;
      max-width: 90vw;
      width: max-content;
      text-align: center;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    .footer {
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 24px;
    }

    @media (max-width: 480px) {
      .header-card {
        padding: 24px 14px;
        border-radius: 16px;
      }
      .section-card {
        padding: 20px 14px;
        border-radius: 16px;
      }
      .details-grid {
        grid-template-columns: 1fr;
      }
      .rsvp-options {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>

  <div class="container">
    <!-- Header -->
    <div class="header-card">
      <div class="subtitle-top">Chá de panela</div>
      <h1 class="couple-title">${config.coupleNames}</h1>
      <p class="welcome-msg">"${config.welcomeMessage}"</p>
      
      <div class="guest-group-badge">
        ♡ Convite para: <strong>${invite.title}</strong>
      </div>

      <!-- Countdown -->
      <div class="countdown-container" id="countdown">
        <div class="count-box"><span class="count-num" id="dias">00</span><span class="count-label">Dias</span></div>
        <div class="count-box"><span class="count-num" id="horas">00</span><span class="count-label">Horas</span></div>
        <div class="count-box"><span class="count-num" id="minutos">00</span><span class="count-label">Min</span></div>
        <div class="count-box"><span class="count-num" id="segundos">00</span><span class="count-label">Seg</span></div>
      </div>
    </div>

    <!-- RSVP Section -->
    <div class="section-card">
      <h2 class="section-title">Confirme sua presença</h2>
      <p class="section-sub">Por favor, confirme a presença de cada um dos convidados abaixo até o dia limite.</p>
      <p style="font-size: 0.8rem; text-align: center; color: var(--accent-rose); margin-bottom: 20px;">
        🔒 *Este convite é nominal e restrito exclusivamente às pessoas listadas abaixo.*
      </p>

      <form id="rsvp-form">
        <div class="guest-list">
          ${invite.guests.map((g, idx) => {
            const statusClass = g.confirmed === true ? 'confirmed' : g.confirmed === false ? 'declined' : 'pending';
            const statusLabel = g.confirmed === true ? 'Confirmado' : g.confirmed === false ? 'Não irá' : 'Pendente';
            
            return `
            <div class="guest-card" data-guest-id="${g.id}">
              <div class="guest-header">
                <span class="guest-name">${idx + 1}. ${g.name}</span>
                <span class="status-badge ${statusClass}" id="badge-${g.id}">${statusLabel}</span>
              </div>

              <div class="rsvp-options">
                <button type="button" 
                        class="rsvp-btn ${g.confirmed === true ? 'selected-yes' : ''}" 
                        onclick="setRsvp('${g.id}', true)">
                  <span style="font-size:1.1rem">✓</span> Vou
                </button>
                <button type="button" 
                        class="rsvp-btn ${g.confirmed === false ? 'selected-no' : ''}" 
                        onclick="setRsvp('${g.id}', false)">
                  <span style="font-size:1.1rem">✕</span> Não vou
                </button>
              </div>

              <input type="text" 
                     class="diet-input" 
                     id="diet-${g.id}" 
                     placeholder="Alguma restrição alimentar ou observação? (Opcional)" 
                     value="${g.dietRestrictions || ''}">
            </div>
            `;
          }).join('')}
        </div>

        <button type="submit" class="submit-btn" id="save-btn">
          ✨ Salvar Confirme sua presença
        </button>
      </form>
    </div>

    <!-- Event Details -->
    <div class="section-card">
      <h2 class="section-title">Detalhes do evento</h2>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-icon">📅</div>
          <div class="detail-title">Data</div>
          <div class="detail-val">${formattedDate}</div>
        </div>

        <div class="detail-item">
          <div class="detail-icon">⏰</div>
          <div class="detail-title">Horário</div>
          <div class="detail-val">${config.eventTime}</div>
        </div>

        <div class="detail-item" style="grid-column: 1 / -1;">
          <div class="detail-icon">📍</div>
          <div class="detail-title">Localização</div>
          <div class="detail-val" style="margin-bottom: 4px;">${config.venueName}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${config.venueAddress}</div>
          ${config.googleMapsUrl ? `
            <a href="${config.googleMapsUrl}" target="_blank" rel="noopener" class="action-link">
              🗺️ Abrir no Google Maps
            </a>
          ` : ''}
        </div>

        ${config.giftRegistryUrl && config.giftRegistryUrl !== '#' ? `
        <div class="detail-item" style="grid-column: 1 / -1;">
          <div class="detail-icon">🎁</div>
          <div class="detail-title">Lista de Presentes</div>
          <div class="detail-val">Acesse nossa lista virtual de presentes</div>
          <a href="${config.giftRegistryUrl}" target="_blank" rel="noopener" class="action-link">
            🛍️ Ver Lista de Presentes
          </a>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="footer">
      Com carinho, ${config.coupleNames} ♡
    </div>
  </div>

  <div id="toast" class="toast">Mensagem aqui</div>

  <script>
    // Guest state tracker
    const inviteCode = ${JSON.stringify(invite.code)};
    const guestState = {};

    // Populate initial status from server render
    ${JSON.stringify(invite.guests)}.forEach(g => {
      guestState[g.id] = g.confirmed;
    });

    function setRsvp(guestId, status) {
      guestState[guestId] = status;
      
      const card = document.querySelector(\`[data-guest-id="\${guestId}"]\`);
      const buttons = card.querySelectorAll('.rsvp-btn');
      const badge = document.getElementById(\`badge-\${guestId}\`);

      buttons[0].classList.remove('selected-yes');
      buttons[1].classList.remove('selected-no');

      if (status === true) {
        buttons[0].classList.add('selected-yes');
        badge.className = 'status-badge confirmed';
        badge.innerText = 'Confirmado';
      } else if (status === false) {
        buttons[1].classList.add('selected-no');
        badge.className = 'status-badge declined';
        badge.innerText = 'Não irá';
      }
    }

    function showToast(msg, duration = 3500) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, duration);
    }

    document.getElementById('rsvp-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('save-btn');
      saveBtn.disabled = true;
      saveBtn.innerText = '⏳ Salvando...';

      const responses = Object.keys(guestState).map(guestId => ({
        guestId: guestId,
        confirmed: guestState[guestId],
        dietRestrictions: document.getElementById(\`diet-\${guestId}\`).value.trim()
      }));

      try {
        const res = await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inviteCode, responses })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('✨ Presença atualizada com sucesso!');
          // Trigger confetti if at least one guest confirmed!
          if (Object.values(guestState).includes(true) && typeof confetti === 'function') {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        } else {
          showToast('❌ Erro ao salvar: ' + (data.error || 'Tente novamente.'));
        }
      } catch (err) {
        showToast('❌ Ocorreu um erro de conexão.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = '✨ Salvar Confirme sua presença';
      }
    });

    // Countdown Timer logic
    const eventDate = new Date("${weddingDateStr}").getTime();
    function updateCountdown() {
      const now = new Date().getTime();
      const distance = eventDate - now;

      if (distance < 0) {
        document.getElementById('dias').innerText = '00';
        document.getElementById('horas').innerText = '00';
        document.getElementById('minutos').innerText = '00';
        document.getElementById('segundos').innerText = '00';
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      document.getElementById('dias').innerText = String(days).padStart(2, '0');
      document.getElementById('horas').innerText = String(hours).padStart(2, '0');
      document.getElementById('minutos').innerText = String(minutes).padStart(2, '0');
      document.getElementById('segundos').innerText = String(seconds).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  </script>
</body>
</html>`;
}
