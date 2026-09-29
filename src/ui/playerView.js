// Pantalla del jugador (teléfono): tabla 3D + carta actual + botón ¡Lotería!.
import { h, toast, modal, patternGlyph, tablaCanvas, icon, ring } from './dom.js';
import { sound, vibrate, keepAwake } from './audio.js';
import { PlayerScene } from '../three/playerScene.js';
import { PlayerScene2D } from './playerScene2d.js';
import { DECK, renderCard, renderBack } from '../cards/deck.js';
import { PATTERNS } from '../game/rules.js';
import { tablaFromCode } from '../game/crypto.js';
import { checkWin } from '../game/rules.js';
import { reducedMotion } from './app.js';

export class PlayerView {
  constructor({ app, engine, practice = false, onExit }) {
    this.app = app;
    this.e = engine;
    this.practice = practice;
    this.onExit = onExit;
    this.offs = [];
    this.lastToast = 0;
    this.overlay = null;
    this.overlayKind = null;
  }

  mount() {
    const stage = this.app.stage;
    if (stage) {
      this.scene = new PlayerScene({ onTap: (c) => this.onTap(c), reducedMotion });
      stage.setScene(this.scene);
      this.scene.bindPointer(stage.canvas);
    } else {
      this.scene = new PlayerScene2D({ onTap: (c) => this.onTap(c) });
      this.app.ui.append(this.scene.el);
    }
    document.body.classList.add('in-player');
    this.buildHud();
    this.scene.setMarkerKind(this.e.prefs.marker);
    this.scene.setTabla(this.e.tabla, this.e.code, true);
    if (this.e.state) this.scene.setMarks(this.e.marks);

    const on = (ev, fn) => this.offs.push(this.e.on(ev, fn));
    on('state', () => this.renderMeta());
    on('newGame', () => this.onNewGame());
    on('phase', (st) => this.onPhase(st));
    on('calls', (c) => this.onCalls(c));
    on('acked', () => this.renderStatus());
    on('win', (w) => this.onWin(w));
    on('pendingMine', () => this.showOverlay('pending'));
    on('rejectedMine', () => {
      sound.buzz();
      this.scene.clearHighlights();
      this.hideOverlay();
      toast('El cantor revisó tu tabla: todavía no gana', 'bad', 3500);
      this.renderReady();
    });
    on('net', () => this.renderStatus());
    on('tabla', () => {
      this.scene.setTabla(this.e.tabla, this.e.code, true);
      this.renderStatus();
    });
    keepAwake.wanted = true;
    keepAwake();
    this.renderMeta();
    this.renderStatus();
    this.renderCurrent(null);
    this.renderReady();
    if (this.e.state) this.onPhase(this.e.state);
    else this.showOverlay('connecting');
  }

  unmount() {
    this.offs.forEach((f) => f());
    this.hideOverlay();
    this.ro?.disconnect();
    this.mq?.removeEventListener?.('change', this._onMq);
    window.removeEventListener('resize', this._onMq);
    document.body.classList.remove('in-player');
    document.documentElement.style.removeProperty('--bottom-h');
    keepAwake.wanted = false;
    this.scene.dispose?.();
    this.scene.el?.remove();
  }

  // --- HUD ------------------------------------------------------------------------
  buildHud() {
    const E = (this.el = {});
    E.back = h('button', { class: 'chip p-back', onclick: () => this.confirmExit(), 'aria-label': 'Salir de la mesa', title: 'Salir' }, icon('back', 20));
    E.room = h('span', { class: 'chip' });
    E.pat = h('span', { class: 'chip' });
    E.paused = h('span', { class: 'chip warn', hidden: true }, h('span', { class: 'dot' }), 'Pausa');
    E.ring = h('div', { class: 'p-ringbox' });
    E.meta = h('div', { class: 'p-meta' }, E.back, E.room, E.pat, E.paused, h('span', { class: 'p-spacer' }), E.ring);
    E.cardBox = h('div', { class: 'p-card' });
    E.callName = h('div', { class: 'p-callname' });
    E.verse = h('div', { class: 'p-verse' });
    E.recent = h('div', { class: 'p-recent', 'aria-hidden': 'true' });
    E.current = h('div', { class: 'p-current glass', 'aria-live': 'polite' }, E.cardBox, h('div', {}, E.callName, E.verse, E.recent));
    E.top = h('div', { class: 'p-top' }, E.meta, E.current);
    E.status = h('div', { class: 'p-status' });
    E.need = h('div', { class: 'p-need', hidden: true });
    E.info = h('div', { class: 'p-info' }, E.status, E.need);
    E.btn = h('button', { class: 'btn btn-primary btn-loteria', onclick: () => this.onLoteria() }, '¡Lotería!');
    E.bottom = h('div', { class: 'p-bottom' }, E.info, E.btn);
    E.root = h('div', { class: 'player' }, E.top, E.bottom);
    this.app.ui.append(E.root);
    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(E.top);
    this.ro.observe(E.bottom);
    // Horizontal o pantalla ancha: la cabecera pasa a una columna lateral
    this.mq = window.matchMedia?.('(min-aspect-ratio: 6/5) and (min-width: 640px)');
    this._onMq = () => {
      this.wide = !!this.mq?.matches;
      E.root.classList.toggle('wide', this.wide);
      this.measure();
    };
    this.mq?.addEventListener?.('change', this._onMq);
    window.addEventListener('resize', this._onMq);
    this._onMq();
  }

  // Reserva espacio para la cabecera, el botón y la hoja emergente; la tabla se ajusta al resto
  measure() {
    const E = this.el;
    if (!E?.root) return;
    const t = E.top.getBoundingClientRect();
    const b = E.bottom.getBoundingClientRect();
    const sheetH = this.sheetEl?.isConnected ? this.sheetEl.getBoundingClientRect().height : 0;
    const root = document.documentElement.style;
    root.setProperty('--bottom-h', `${Math.round(b.height)}px`);
    E.root.style.setProperty('--top-h', `${Math.round(t.height)}px`);
    if (this.wide) {
      this.scene.setInsets(0, sheetH ? sheetH + 20 : 0, Math.round(t.width), 0);
    } else if (this.e.state?.phase === 'L' && sheetH) {
      this.scene.setInsets(t.height + 4, sheetH + 20, 0, 0);
    } else {
      this.scene.setInsets(t.height + 4, b.height + 4 + (sheetH ? sheetH + 8 : 0), 0, 0);
    }
  }

  renderMeta() {
    const st = this.e.state;
    const E = this.el;
    E.root.classList.toggle('lobby', !st || st.phase === 'L');
    if (st) {
      E.room.textContent = this.practice ? 'Práctica' : `Sala ${st.room} · R${st.g}`;
      E.pat.replaceChildren(patternGlyph(st.pattern, 16), PATTERNS[st.pattern].name);
      E.pat.hidden = false;
      E.paused.hidden = !(st.paused && st.phase === 'P');
      if (st.phase !== 'L') {
        const n = st.called.length;
        E.ring.replaceChildren(ring(n / 54, String(n)));
        E.ring.title = `${n} de 54 cartas`;
      } else E.ring.replaceChildren();
    } else {
      E.room.textContent = 'Conectando…';
      E.pat.hidden = true;
      E.paused.hidden = true;
      E.ring.replaceChildren();
    }
  }

  renderStatus() {
    const e = this.e;
    const st = e.state;
    let msg = `Tabla ${e.code}`;
    let cls = '';
    if (!st) msg += ' · buscando la sala…';
    else if (st.phase === 'W') msg += '';
    else if (e.acked) {
      msg += ' · registrada con el cantor';
      cls = 'ok';
    } else if (!e.netOk) {
      msg += ' · sin conexión: si ganas, enséñale este código al cantor';
      cls = 'bad';
    } else if (st.phase === 'P' && st.called.length > 0) msg += ' · llegaste con la ronda empezada';
    else msg += ' · registrando…';
    this.el.status.className = `p-status ${cls}`;
    this.el.status.replaceChildren(h('span', { class: 'dot' }), msg);
    const lobbyStatus = this.overlayKind === 'lobby' ? this.overlay?.querySelector('.lobby-status') : null;
    if (lobbyStatus) this.fillLobbyStatus(lobbyStatus);
  }

  fillLobbyStatus(el) {
    const e = this.e;
    if (e.acked) el.replaceChildren(icon('check', 16), ' Tu tabla ', h('b', {}, e.code), ' quedó registrada con el cantor.');
    else if (!e.netOk) el.replaceChildren('Sin conexión. Si ganas, enséñale al cantor el código ', h('b', {}, e.code));
    else el.replaceChildren(h('span', { class: 'spin' }), 'Registrando tu tabla con el cantor…');
  }

  renderCurrent(id, animate = false) {
    const E = this.el;
    const cv = id === null || id === undefined ? renderBack(200) : renderCard(id, 200);
    const clone = document.createElement('canvas');
    clone.width = cv.width;
    clone.height = cv.height;
    clone.getContext('2d').drawImage(cv, 0, 0);
    E.cardBox.replaceChildren(clone);
    E.cardBox.classList.remove('flip');
    if (animate) {
      void E.cardBox.offsetWidth;
      E.cardBox.classList.add('flip');
    }
    if (id === null || id === undefined) {
      const st = this.e.state;
      E.callName.textContent = st?.phase === 'P' ? '¡Corre y se va!' : 'Lotería';
      E.verse.textContent = st?.phase === 'P' ? 'Ya viene la primera carta…' : 'Espera a que el cantor empiece la ronda.';
    } else {
      E.callName.textContent = DECK[id].name;
      E.verse.textContent = DECK[id].verse;
    }
    const called = this.e.state?.called || [];
    const recent = called.slice(-4, -1).reverse();
    E.recent.replaceChildren(
      ...(recent.length ? [h('span', { class: 'lbl' }, 'Antes')] : []),
      ...recent.map((rid) => {
        const c = document.createElement('canvas');
        const src = renderCard(rid, 200);
        c.width = src.width / 4;
        c.height = src.height / 4;
        c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        c.title = DECK[rid].name;
        return c;
      }),
    );
  }

  renderReady() {
    const st = this.e.state;
    const playing = st?.phase === 'P';
    const line = playing ? this.e.winningLine() : null;
    this.el.btn.classList.toggle('ready', !!line && this.e.prefs.hints !== false && !this.e.claimed);
    this.el.btn.disabled = !st || st.phase === 'L';
    // Avance hacia la figura: puntitos (o número si la figura es grande)
    const pr = playing ? this.e.progress() : null;
    const N = this.el.need;
    if (!pr) {
      N.hidden = true;
      return;
    }
    N.hidden = false;
    const left = pr.need - pr.have;
    const label = left === 0 ? '¡Completa!' : left === 1 ? 'Te falta 1' : `Te faltan ${left}`;
    if (pr.need <= 6) {
      N.replaceChildren(h('span', { class: 'pips' }, ...Array.from({ length: pr.need }, (_, i) => h('i', { class: i < pr.have ? 'on' : '' }))), label);
    } else {
      N.replaceChildren(h('b', { class: 'num' }, `${pr.have}/${pr.need}`), label);
    }
  }

  // --- eventos del juego ------------------------------------------------------------
  onNewGame() {
    this.scene.stopCelebrate?.();
    this.scene.clearMarkers();
    this.scene.clearHighlights();
    if (this.e.marks.size) this.scene.setMarks(this.e.marks);
    const called = this.e.state?.called || [];
    this.renderCurrent(called.length ? called[called.length - 1] : null);
    this.renderReady();
    this.renderStatus();
  }

  onPhase(st) {
    this.renderMeta();
    this.renderStatus();
    this.renderReady();
    if (st.phase === 'L') {
      this.scene.stopCelebrate?.();
      this.showOverlay('lobby');
      this.renderCurrent(null);
    } else if (st.phase === 'P') {
      if (this.overlayKind === 'lobby' || this.overlayKind === 'connecting' || this.overlayKind === 'result') this.hideOverlay();
      if (!st.called.length) this.renderCurrent(null);
    } else if (st.phase === 'W') {
      // onWin se encarga
    }
  }

  onCalls({ fresh, catchUp }) {
    const last = fresh[fresh.length - 1];
    this.renderCurrent(last, true);
    this.renderMeta();
    this.renderStatus();
    const mine = fresh.map((id) => this.e.tabla.indexOf(id)).filter((i) => i >= 0);
    if (!catchUp) {
      sound.tone(880, 0.25, 'sine', 0.12);
      if (mine.length) {
        vibrate([25, 40, 25]);
        if (this.e.prefs.hints !== false) mine.forEach((cell) => this.scene.hint(cell));
      }
    }
    this.renderReady();
  }

  onTap(cell) {
    sound.unlock();
    const r = this.e.mark(cell);
    if (r === 'ok') {
      this.scene.dropMarker(cell);
      setTimeout(() => sound.bean(), reducedMotion ? 0 : 180);
      vibrate(12);
      this.renderReady();
    } else if (r === 'notCalled') {
      this.scene.shake(cell);
      sound.buzz();
      this.throttledToast('Esa carta todavía no sale', 'warn');
    } else if (r === 'already') {
      this.scene.bumpMarker(cell);
    } else {
      this.throttledToast('Espera a que el cantor empiece', 'info');
    }
  }

  throttledToast(msg, kind) {
    const now = Date.now();
    if (now - this.lastToast < 1800) return;
    this.lastToast = now;
    toast(msg, kind, 1600);
  }

  onLoteria() {
    sound.unlock();
    const st = this.e.state;
    if (this.e.claimed && st?.phase === 'P') {
      this.showOverlay('claimed');
      return;
    }
    const r = this.e.claim();
    if (!r.ok) {
      sound.buzz();
      vibrate(60);
      if (r.reason === 'notYet') {
        const pr = r.progress;
        const left = pr ? pr.need - pr.have : 0;
        this.throttledToast(left === 1 ? '¡Te falta una!' : `Todavía no: te faltan ${left}`, 'warn');
      } else if (r.reason === 'over') this.throttledToast('La ronda ya terminó', 'info');
      else this.throttledToast('La ronda no ha empezado', 'info');
      return;
    }
    vibrate([40, 30, 80]);
    sound.pop();
    this.scene.showPattern(r.line);
    this.el.btn.classList.remove('ready');
    this.showOverlay('claimed');
  }

  onWin({ winners, mine, verified, update }) {
    const st = this.e.state;
    if (mine) {
      if (!update) {
        sound.fanfare();
        vibrate([80, 60, 80, 60, 200]);
      }
      const line = this.e.winningLine() || [];
      this.scene.celebrate(line);
      this.showOverlay('win', { winners, verified });
    } else {
      if (!update) sound.tone(392, 0.4, 'triangle', 0.15);
      this.scene.clearHighlights();
      this.showOverlay('lost', { winners, verified, st });
    }
    this.renderStatus();
    this.el.btn.classList.remove('ready');
  }

  // --- capas encima de la tabla -------------------------------------------------------
  hideOverlay() {
    if (this.sheetEl) this.ro?.unobserve(this.sheetEl);
    this.overlay?.remove();
    this.overlay = null;
    this.sheetEl = null;
    this.overlayKind = null;
    this.measure();
  }

  showOverlay(kind, data = {}) {
    this.hideOverlay();
    const e = this.e;
    const st = e.state;
    const btnGhost = (label, onclick, extra = {}) => h('button', { class: 'btn btn-ghost', onclick, ...extra }, label);
    let node = null;
    let sheet = true; // hoja pegada abajo (deja ver la tabla) o tarjeta centrada
    if (kind === 'connecting') {
      sheet = false;
      node = h('div', { class: 'sheet ticket center' },
        h('h2', {}, 'Buscando la sala…'),
        h('p', {}, h('span', { class: 'spin' }), this.app.mode === 'host' || this.practice ? 'En cuanto el cantor publique su estado entras a la mesa.' : 'Abre otra pestaña como cantor con esta sala, o regresa y practica contra la compu.'),
        btnGhost('‹ Volver', () => this.onExit()),
      );
    } else if (kind === 'lobby') {
      const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Marcador' },
        ...[['frijol', 'Frijol'], ['corcholata', 'Corcholata']].map(([k, label]) =>
          h('button', { 'aria-pressed': String(e.prefs.marker === k), 'data-k': k, onclick: (ev) => {
            e.setPref('marker', k);
            this.scene.setMarkerKind(k);
            ev.currentTarget.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
          } }, label)),
      );
      const status = h('p', { class: 'note lobby-status' });
      this.fillLobbyStatus(status);
      node = h('div', { class: 'sheet ticket' },
        h('div', { class: 'eyebrow', style: { color: 'var(--rosa)' } }, st ? `${st.roomName}` : ''),
        h('h2', {}, '¡Ya casi!'),
        h('p', { style: { margin: '0.2rem 0 0.4rem' } }, 'Esperando el «¡Corre y se va!»', st ? h('span', { style: { whiteSpace: 'nowrap' } }, '  ·  ', patternGlyph(st.pattern, 20), ' ', h('b', {}, PATTERNS[st.pattern].name)) : null),
        status,
        h('div', { class: 'row', style: { marginTop: '0.3rem' } },
          btnGhost([icon('refresh', 18), 'Otra tabla'], () => {
            if (e.newTabla()) {
              sound.whoosh();
              const st2 = this.overlay?.querySelector('.lobby-status');
              if (st2) this.fillLobbyStatus(st2);
            }
          }, { style: { flex: '0 0 auto' } }),
          seg,
        ),
      );
    } else if (kind === 'claimed') {
      node = h('div', { class: 'sheet ticket' },
        h('h2', {}, '¡Lotería!'),
        h('p', {}, 'Le avisamos al cantor. ¡Grita fuerte para que te escuchen!'),
        h('p', { class: 'note', style: { margin: 0 } }, 'Si no llega el aviso, enséñale tu código:'),
        h('div', { class: 'code-big' }, e.code),
        btnGhost('Ver mi tabla', () => this.hideOverlay()),
      );
    } else if (kind === 'pending') {
      node = h('div', { class: 'sheet ticket' },
        h('h2', {}, 'El cantor está revisando'),
        h('p', {}, 'Tu tabla se registró con la ronda empezada, así que el cantor la aprueba a mano.'),
        h('div', { class: 'code-big' }, e.code),
      );
    } else if (kind === 'win') {
      node = h('div', { class: 'sheet ticket win' },
        h('h2', {}, '¡Ganaste!'),
        h('p', { style: { margin: '0.2rem 0 0.5rem' } }, `Tabla ${e.code} · ${st?.called.length || 0} cartas cantadas`),
        data.verified === true ? h('p', { class: 'ok-badge' }, icon('shield', 18), 'Baraja verificada: el cantor no hizo trampa') : null,
        h('div', {}, h('button', { class: 'btn', onclick: () => this.hideOverlay() }, 'Ver mi tabla')),
      );
    } else if (kind === 'lost') {
      sheet = false;
      const w = data.winners[0];
      const tabla = tablaFromCode(w.k);
      const line = checkWin(tabla, new Set(st.called), st.pattern) || [];
      node = h('div', { class: 'sheet ticket center' },
        h('div', { class: 'eyebrow', style: { color: 'var(--rosa)' } }, 'Se acabó la ronda'),
        h('h2', {}, `¡Lotería de ${data.winners.length > 1 ? `${data.winners.slice(0, -1).map((x) => x.n).join(', ')} y ${data.winners[data.winners.length - 1].n}` : w.n}!`),
        tablaCanvas(tabla, { line, cardW: 44 }),
        data.verified === true ? h('p', { class: 'ok-badge' }, icon('shield', 18), 'Baraja verificada con el compromiso del cantor') : data.verified === false ? h('p', {}, '⚠ La baraja revelada no coincide con el compromiso') : null,
        h('p', { class: 'note' }, this.practice ? 'La siguiente ronda empieza solita en unos segundos.' : 'Espera a que el cantor abra la siguiente ronda.'),
        btnGhost('Ver mi tabla', () => this.hideOverlay()),
      );
    }
    if (node) {
      this.overlay = node;
      this.overlayKind = kind === 'win' || kind === 'lost' ? 'result' : kind;
      this.el.root.append(node);
      if (sheet) {
        this.sheetEl = node;
        this.ro?.observe(node);
      }
      this.measure();
    }
  }

  confirmExit() {
    modal({
      title: '¿Salir de la mesa?',
      body: h('p', {}, 'Tu tabla y tus frijolitos se guardan en este teléfono.'),
      actions: [{ label: 'Quedarme' }, { label: 'Salir', kind: 'primary', onClick: () => this.onExit() }],
    });
  }
}
