// Tabla en 2D para teléfonos sin WebGL: misma interfaz que PlayerScene.
import { h } from './dom.js';
import { renderCard } from '../cards/deck.js';

export class PlayerScene2D {
  constructor({ onTap }) {
    this.onTap = onTap;
    this.cells = [];
    this.marks = new Set();
    this.kind = 'frijol';
    this.grid = h('div', {
      style: {
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', padding: '14px 12px 30px',
        background: '#e4007c', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.5)', position: 'relative',
        width: 'min(96vw, 460px)', boxSizing: 'border-box', pointerEvents: 'auto',
      },
    });
    this.code = h('div', { style: { position: 'absolute', bottom: '6px', left: 0, right: 0, textAlign: 'center', font: "700 13px Oswald, sans-serif", color: '#fff3d6', letterSpacing: '.1em' } });
    this.grid.append(this.code);
    this.el = h('div', {
      style: { position: 'absolute', left: 0, right: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', overflow: 'auto' },
    }, this.grid);
    this.setInsets(160, 110);
  }

  setInsets(top, bottom, left = 0, right = 0) {
    this.el.style.top = `${top}px`;
    this.el.style.bottom = `${bottom}px`;
    this.el.style.left = `${left}px`;
    this.el.style.right = `${right}px`;
    const availH = window.innerHeight - top - bottom - 20;
    const w = Math.min((window.innerWidth - left - right) * 0.96, 460, (availH - 44) * (4 / 6) + 30);
    this.grid.style.width = `${Math.max(220, w)}px`;
  }

  setTabla(tabla, code) {
    this.grid.querySelectorAll('.cell2d').forEach((c) => c.remove());
    this.cells = tabla.map((id, cell) => {
      const cv = document.createElement('canvas');
      const src = renderCard(id, 200);
      cv.width = src.width;
      cv.height = src.height;
      cv.getContext('2d').drawImage(src, 0, 0);
      Object.assign(cv.style, { width: '100%', height: 'auto', display: 'block', borderRadius: '6px' });
      const mark = h('div', { style: { position: 'absolute', left: '50%', top: '52%', width: '38%', aspectRatio: '1.4', transform: 'translate(-50%,-50%) scale(0)', transition: 'transform .35s cubic-bezier(.2,1.6,.4,1)', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #f3dfb9, #a4553a 70%)', boxShadow: '0 3px 4px rgba(0,0,0,.45)' } });
      const wrap = h('button', { class: 'cell2d', style: { position: 'relative', padding: 0, border: 0, background: 'none', cursor: 'pointer', transition: 'transform .2s' }, onclick: () => this.onTap?.(cell), 'aria-label': `Carta ${id + 1}` }, cv, mark);
      this.grid.insertBefore(wrap, this.code);
      return { wrap, mark };
    });
    this.code.textContent = `TABLA ${code}`;
    this.marks.clear();
  }

  setMarkerKind(kind) {
    this.kind = kind;
    this.cells.forEach(({ mark }) => (mark.style.background = this._bg()));
  }

  _bg() {
    return this.kind === 'corcholata' ? 'radial-gradient(circle, #fff3d6 0 22%, #d7263d 24% 62%, #c7cad6 64%)' : 'radial-gradient(circle at 35% 35%, #f3dfb9, #a4553a 70%)';
  }

  dropMarker(cell) {
    const c = this.cells[cell];
    if (!c) return;
    this.marks.add(cell);
    c.mark.style.background = this._bg();
    c.mark.style.transform = 'translate(-50%,-50%) scale(1)';
  }

  setMarks(cells) {
    for (const c of cells) this.dropMarker(c);
  }

  clearMarkers() {
    this.cells.forEach(({ mark }) => (mark.style.transform = 'translate(-50%,-50%) scale(0)'));
    this.marks.clear();
  }

  bumpMarker() {}

  shake(cell) {
    const w = this.cells[cell]?.wrap;
    if (!w) return;
    w.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }], { duration: 350 });
  }

  flash(cell, color = '#ffd23f') {
    const w = this.cells[cell]?.wrap;
    if (!w) return;
    w.animate([{ boxShadow: `0 0 0 0 ${color}` }, { boxShadow: `0 0 0 5px ${color}` }, { boxShadow: `0 0 0 0 ${color}` }], { duration: 900 });
  }

  hint(cell) {
    this.flash(cell);
  }

  showPattern(cells) {
    this.clearHighlights();
    for (const c of cells) if (this.cells[c]) this.cells[c].wrap.style.boxShadow = '0 0 0 4px #ffd23f';
  }

  clearHighlights() {
    this.cells.forEach(({ wrap }) => (wrap.style.boxShadow = ''));
  }

  celebrate(cells) {
    this.showPattern(cells);
  }

  stopCelebrate() {
    this.clearHighlights();
  }

  dispose() {}
}
