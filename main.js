// Dr. Julián Sánchez — interacción y movimiento.
// Todo el contenido está en el HTML; este archivo solo agrega movimiento y el selector de agenda.
(() => {
  const WA = '573507083018';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wideQ = matchMedia('(min-width: 60em)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- desplazamiento suave (solo con mouse y movimiento permitido) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis && matchMedia('(pointer: fine)').matches) {
    lenis = new window.Lenis({ lerp: 0.12 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const goTo = (y) => { if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const el = id.length > 1 ? document.querySelector(id) : null;
    if (!el) return;
    e.preventDefault();
    goTo(el.getBoundingClientRect().top + window.scrollY - (id === '#inicio' ? 0 : 0));
    history.replaceState(null, '', id);
  });

  /* ---------- entradas por sección ---------- */
  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }, { rootMargin: '0px 0px 6% 0px', threshold: 0.01 });
    reveals.forEach((el) => io.observe(el));
    // al llegar al final de la página, nada queda oculto
    addEventListener('scroll', () => {
      if (scrollY + innerHeight > document.documentElement.scrollHeight - innerHeight * 0.6) reveals.forEach((el) => el.classList.add('is-in'));
    }, { passive: true });
    addEventListener('load', () => setTimeout(() => reveals.forEach((el) => {
      const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
    }), 2500));
  } else reveals.forEach((el) => el.classList.add('is-in'));

  /* ---------- barra: aparece al salir del inicio y toma el color del capítulo ---------- */
  const bar = document.getElementById('barra');
  const hero = document.getElementById('inicio');
  const chapters = document.querySelectorAll('[data-bg]');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => bar.classList.toggle('is-on', !en.isIntersecting), { threshold: 0, rootMargin: '-40% 0px 0px 0px' }).observe(hero);
    const cio = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) {
        bar.style.setProperty('--bar-bg', en.target.dataset.bg);
        bar.style.setProperty('--bar-ink', en.target.dataset.ink);
        const onAqua = en.target.dataset.bg === '#2ED3D9';
        bar.style.setProperty('--bar-btn', onAqua ? '#04232D' : '#2ED3D9');
        bar.style.setProperty('--bar-btn-ink', onAqua ? '#FFFFFF' : '#04232D');
      }
    }, { rootMargin: '0px 0px -94% 0px', threshold: 0 });
    chapters.forEach((c) => cio.observe(c));
  }

  /* ---------- tratamientos: tarjetas que se pliegan en lomos ---------- */
  const deck = document.querySelector('.deck');
  const deckCards = [...document.querySelectorAll('.deck__card')];
  const deckBand = document.querySelector('.deck__band');
  let deckOn = false;
  const deckProgress = () => {
    const total = deck.offsetHeight - innerHeight;
    return clamp(-deck.getBoundingClientRect().top / total, 0, 1);
  };
  function layoutDeck() {
    if (!deckOn) return;
    const n = deckCards.length;
    const f = deckProgress() * (n - 1) * 1.08; // un pequeño reposo al final
    const W = deckBand.clientWidth;
    const cw = deckCards[0].offsetWidth;
    const S = Math.min(120, (W - cw) / (n - 1));
    deck.style.setProperty('--spine', `${S.toFixed(1)}px`);
    const active = Math.min(n - 1, Math.floor(f + 0.0001));
    // la ficha que entra: en cuanto empieza a cubrir la activa, la activa se vuelve lomo
    const xs = deckCards.map((c, i) => {
      if (i <= active) return i * S;
      if (i === active + 1) { const t = clamp((f - active) / 0.8, 0, 1); return (W - 56) + (i * S - (W - 56)) * t; }
      return W;
    });
    const incoming = active + 1 < n ? xs[active + 1] : Infinity;
    deckCards.forEach((c, i) => {
      c.style.transform = `translate3d(${xs[i].toFixed(1)}px,0,0)`;
      c.style.zIndex = String(i + 1);
      // la activa se funde hacia su lomo mientras la siguiente la cubre
      let fade = i < active ? 0 : 1;
      if (i === active && incoming !== Infinity) fade = clamp(1 - clamp((i * S + cw - incoming) / cw, 0, 1) * 2.6, 0, 1);
      c.style.setProperty('--fade', fade.toFixed(3));
      c.classList.toggle('is-spine', fade === 0);
    });
  }
  function setDeck() {
    deckOn = wideQ.matches && !reduce;
    deck.classList.toggle('is-pinned', deckOn);
    deckCards.forEach((c) => { if (!deckOn) { c.style.transform = ''; c.style.zIndex = ''; c.style.removeProperty('--fade'); c.classList.remove('is-spine'); } });
    layoutDeck();
  }
  const deckTarget = (i) => deck.offsetTop + (i / ((deckCards.length - 1) * 1.08)) * (deck.offsetHeight - innerHeight) + 2;
  deckCards.forEach((c, i) => {
    c.addEventListener('click', (e) => {
      if (!deckOn || !c.classList.contains('is-spine') || e.target.closest('a')) return;
      goTo(deckTarget(i));
    });
    c.addEventListener('focusin', () => { if (deckOn) goTo(deckTarget(i)); });
  });

  /* ---------- resultados: tarjetas que cruzan la foto quieta ---------- */
  const cross = document.querySelector('.cross');
  const track = document.getElementById('cruce');
  const crossTitle = document.querySelector('.cross__title');
  const crossCards = [...track.children];
  let crossOn = false;
  function layoutCross() {
    if (!crossOn) return;
    const total = cross.offsetHeight - innerHeight;
    const p = clamp(-cross.getBoundingClientRect().top / total, 0, 1);
    const last = crossCards[crossCards.length - 1];
    const startX = innerWidth * 0.5;
    const endX = innerWidth / 2 - last.offsetWidth / 2 - last.offsetLeft;
    const e = p < 0.9 ? p / 0.9 : 1; // reposo al final para leer la última
    const x = startX + (endX - startX) * e;
    track.style.transform = `translate3d(${x.toFixed(1)}px,-50%,0)`;
    crossTitle.style.transform = `translate3d(${(-e * innerWidth * 0.22).toFixed(1)}px,0,0)`;
    crossTitle.style.opacity = String(clamp(1 - (e - 0.25) * 2.2, 0, 1));
  }
  function setCross() {
    crossOn = wideQ.matches && !reduce;
    cross.classList.toggle('is-pinned', crossOn);
    if (!crossOn) { track.style.transform = ''; crossTitle.style.transform = ''; crossTitle.style.opacity = ''; }
    layoutCross();
  }
  crossCards.forEach((c, i) => c.setAttribute('tabindex', '0'));
  crossCards.forEach((c, i) => c.addEventListener('focus', () => {
    if (!crossOn) return;
    const total = cross.offsetHeight - innerHeight;
    goTo(cross.offsetTop + (i / (crossCards.length - 1)) * 0.9 * total);
  }));

  /* ---------- la foto del inicio se acerca con el scroll ---------- */
  const heroImg = document.querySelector('.hero__picture img');
  function heroDrift() {
    if (reduce) return;
    const y = window.scrollY;
    if (y > innerHeight * 1.2) return;
    heroImg.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0) scale(${(1 + y / innerHeight * 0.08).toFixed(4)})`;
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { layoutDeck(); layoutCross(); heroDrift(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { setDeck(); setCross(); });
  wideQ.addEventListener('change', () => { setDeck(); setCross(); });
  setDeck(); setCross();

  /* ---------- video: se reproduce solo cuando se ve ---------- */
  document.querySelectorAll('video[data-autoplay]').forEach((v) => {
    if (reduce) { v.removeAttribute('loop'); return; }
    if (!('IntersectionObserver' in window)) { v.preload = 'auto'; v.play().catch(() => {}); return; }
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    }, { threshold: 0.25 }).observe(v);
  });

  /* ---------- lo vivo: ¿qué quieres mejorar? ---------- */
  const DATA = {
    diente: { t: 'Implante o prótesis', d: 'Revisamos tu caso y te proponemos un implante con corona o una prótesis fija o removible, con su costo.', w: 'Dr. Julián Sánchez, con cirujano maxilofacial si hace falta', m: 'me falta un diente y quiero saber si me sirve un implante' },
    blancos: { t: 'Blanqueamiento', d: 'Limpieza previa, protección de encías y aclaramiento dental en el consultorio.', w: 'Dr. Julián Sánchez', m: 'quiero mis dientes más blancos y me interesa un blanqueamiento' },
    dolor: { t: 'Valoración y endodoncia', d: 'Revisamos con radiografía; si el nervio está comprometido, hacemos tratamiento de conducto para salvar el diente.', w: 'Dr. Julián Sánchez', m: 'me duele una muela y necesito que me revisen' },
    cordales: { t: 'Cirugía de cordales', d: 'Valoramos tus cordales con radiografía y, si hay que sacarlas, lo hace el cirujano maxilofacial en el consultorio.', w: 'Dr. Durán, cirujano maxilofacial', m: 'me molestan las cordales y quiero saber si hay que sacarlas' },
    sonrisa: { t: 'Diseño de sonrisa', d: 'Carillas y coronas planeadas sobre tu cara y tu forma de sonreír, con el costo claro desde la valoración.', w: 'Dr. Julián Sánchez', m: 'quiero cambiar mi sonrisa con un diseño de sonrisa' },
    encias: { t: 'Periodoncia', d: 'Diagnóstico y tratamiento de encías con la Dra. Katherine Méndez, periodoncista.', w: 'Dra. Katherine Méndez, periodoncista', m: 'me sangran las encías' },
    limpieza: { t: 'Limpieza y profilaxis', d: 'Detartraje, pulido y revisión general para mantener dientes y encías sanos.', w: 'Dr. Julián Sánchez', m: 'quiero agendar una limpieza' },
  };
  const $ = (id) => document.getElementById(id);
  const state = { k: 'diente', cuando: 'entre semana en la mañana' };
  const message = () => `Hola Dr. Julián, ${DATA[state.k].m}. Me gustaría una valoración en el C.C. Laguna, ${state.cuando}.`;
  function render(swap) {
    const d = DATA[state.k];
    $('p-treat').textContent = d.t;
    $('p-desc').textContent = d.d;
    $('p-who').textContent = d.w;
    const msg = message();
    $('p-msg').textContent = msg;
    $('p-send').href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
    if (swap && !reduce) ['p-treat', 'p-desc'].forEach((id, i) => {
      const el = $(id); el.classList.remove('is-swap'); void el.offsetWidth; el.style.animationDelay = `${i * 60}ms`; el.classList.add('is-swap');
    });
  }
  function radioGroup(groupId, onPick) {
    const group = $(groupId);
    const items = [...group.querySelectorAll('[role="radio"]')];
    const pick = (btn, focus) => {
      items.forEach((b) => { const on = b === btn; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      if (focus) btn.focus();
      onPick(btn);
    };
    items.forEach((b) => { b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1; });
    group.addEventListener('click', (e) => { const b = e.target.closest('[role="radio"]'); if (b) pick(b, false); });
    group.addEventListener('keydown', (e) => {
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      pick(items[(i + dir + items.length) % items.length], true);
    });
  }
  radioGroup('choices', (b) => { state.k = b.dataset.k; render(true); });
  radioGroup('momento', (b) => { state.cuando = b.dataset.v; render(false); });
  render(false);

  /* ---------- pie: hora de Bogotá y si está abierto ahora ---------- */
  function clock() {
    const now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now).map((p) => [p.type, p.value]));
    const h = Number(parts.hour) % 24 + Number(parts.minute) / 60;
    const day = parts.weekday; // Mon..Sun
    const hora = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).format(now);
    $('hora').textContent = hora;
    // horario de Google: lunes a sábado 9 a. m.–7 p. m., domingo 9 a. m.–5 p. m.
    const close = day === 'Sun' ? 17 : 19;
    const open = h >= 9 && h < close;
    let txt;
    if (open) txt = `Abierto ahora, hasta las ${close - 12} p. m.`;
    else if (h < 9) txt = 'Abre hoy a las 9 a. m.';
    else txt = 'Abre mañana a las 9 a. m.';
    $('abierto').textContent = txt;
  }
  clock();
  setInterval(clock, 30000);
})();
