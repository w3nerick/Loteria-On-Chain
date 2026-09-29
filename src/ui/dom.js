// Utilidades pequeñas de interfaz.
import { renderCard } from '../cards/deck.js';
import { patternPreviewCells } from '../game/rules.js';

// Íconos de línea (rejilla de 24). Se dibujan con el color del texto.
const ICONS = {
  play: '<path d="M7 4.6v14.8L19 12z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.6" width="4" height="14.8" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4.6" width="4" height="14.8" rx="1.2" fill="currentColor" stroke="none"/>',
  next: '<path d="M5 5.2v13.6L15 12z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  volume: '<path d="M4 9.5v5h3.6L13 19V5L7.6 9.5z" fill="currentColor" stroke="none"/><path d="M16.4 8.6a4.6 4.6 0 010 6.8M19 6a8.2 8.2 0 010 12"/>',
  mute: '<path d="M4 9.5v5h3.6L13 19V5L7.6 9.5z" fill="currentColor" stroke="none"/><path d="M16.5 9.5l4.5 5M21 9.5l-4.5 5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  exit: '<path d="M14 4h4.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H14M10 8l-4 4 4 4M6 12h10"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  refresh: '<path d="M20 12a8 8 0 11-2.4-5.7"/><path d="M20 4v5h-5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/>',
  shield: '<path d="M12 3l7 3v5.5c0 4.4-2.9 8-7 9.5-4.1-1.5-7-5.1-7-9.5V6z"/><path d="M8.7 12l2.5 2.5 4.3-5"/>',
  swap: '<path d="M7 4L3.5 7.5 7 11M3.5 7.5H16M17 13l3.5 3.5L17 20M20.5 16.5H8"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.3 2.9-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16.5 14.2c2.4.1 4 1.5 4.5 4.3"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  cards: '<rect x="3.5" y="6" width="10" height="14" rx="2" transform="rotate(-8 8.5 13)"/><rect x="10.5" y="4" width="10" height="14" rx="2" transform="rotate(8 15.5 11)"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" fill="currentColor" stroke="none"/>',
};

export function icon(name, size = 20) {
  return h('span', {
    class: 'ico',
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`,
  });
}

// Anillo de progreso (0..1) con texto al centro
export function ring(frac, label, size = 44) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const el = h('div', { class: 'p-ring', style: { width: `${size}px`, height: `${size}px` }, role: 'img', 'aria-label': label });
  el.innerHTML = `<svg viewBox="0 0 ${size} ${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, frac)))}"/></svg><span class="num">${label}</span>`;
  return el;
}

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

let toastBox = null;
export function toast(msg, kind = 'info', ms = 2600) {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastBox);
  }
  const t = h('div', { class: `toast toast-${kind}` }, msg);
  toastBox.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 400);
  }, ms);
}

export function modal({ title, body, actions = [], onClose = null, wide = false }) {
  const close = () => {
    wrap.classList.remove('in');
    setTimeout(() => wrap.remove(), 250);
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  const box = h(
    'div',
    { class: `modal ticket${wide ? ' wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('h2', { class: 'modal-title' }, title),
    h('div', { class: 'modal-body' }, body),
    h(
      'div',
      { class: 'modal-actions' },
      actions.map((a) =>
        h('button', {
          class: `btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost'}`,
          onclick: () => {
            const keep = a.onClick?.();
            if (keep !== true) close();
          },
        }, a.label),
      ),
    ),
  );
  const wrap = h('div', { class: 'modal-wrap', onclick: (e) => e.target === wrap && close() }, box);
  document.body.append(wrap);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => wrap.classList.add('in'));
  setTimeout(() => box.querySelector('input, button.btn-primary, button')?.focus(), 60);
  return { close, box };
}

// Mini diagrama 4×4 de la figura
export function patternGlyph(pt, size = 30) {
  const cells = new Set(patternPreviewCells(pt));
  const g = h('span', { class: 'glyph', style: { width: `${size}px`, height: `${size}px` }, 'aria-hidden': 'true' });
  for (let i = 0; i < 16; i++) g.append(h('i', { class: cells.has(i) ? 'on' : '' }));
  if (pt === 'c') g.classList.add('glyph-chorro');
  return g;
}

// Tabla dibujada en 2D (para mostrar la tabla de otra persona)
export function tablaCanvas(tabla, { line = [], called = null, cardW = 64 } = {}) {
  const gap = Math.round(cardW * 0.08);
  const cw = cardW;
  const ch = Math.round(cardW * 1.5);
  const pad = Math.round(cardW * 0.14);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = pad * 2 + cw * 4 + gap * 3;
  const H = pad * 2 + ch * 4 + gap * 3;
  const c = document.createElement('canvas');
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.fillStyle = '#e4007c';
  g.beginPath();
  if (g.roundRect) g.roundRect(0, 0, W, H, 12);
  else g.rect(0, 0, W, H);
  g.fill();
  const lineSet = new Set(line);
  const calledSet = called ? new Set(called) : null;
  tabla.forEach((id, cell) => {
    const x = pad + (cell % 4) * (cw + gap);
    const y = pad + Math.floor(cell / 4) * (ch + gap);
    g.drawImage(renderCard(id, 200), x, y, cw, ch);
    if (calledSet && !calledSet.has(id)) {
      g.fillStyle = 'rgba(20,11,46,0.55)';
      g.fillRect(x, y, cw, ch);
    }
    if (lineSet.has(cell)) {
      g.strokeStyle = '#ffd23f';
      g.lineWidth = Math.max(3, cardW * 0.07);
      g.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
    }
  });
  return c;
}

export function copyText(text) {
  try {
    navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function fmtCount(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
