// Pantalla grande del cantor: HUD sobre la escena 3D.
import { h, toast, modal, patternGlyph, tablaCanvas, icon } from './dom.js';
import { sound, keepAwake } from './audio.js';
import { CantorScene } from '../three/cantorScene.js';
import { DECK } from '../cards/deck.js';
import { PATTERNS } from '../game/rules.js';
import { normalizeCode, isValidCode, commitOf } from '../game/crypto.js';
import { spawnBots } from '../game/bots.js';
import { CONFIG } from '../config.js';
import { reducedMotion } from './app.js';
import { whyLocal } from './diagnostico.js';
import { sealRound, pendingPlayers } from '../chain/seal.js';
import { registryDeployed } from '../chain/registry.js';

const ORDER = ['c', 'e', 'm', 'f'];
const BEAN_COLORS = ['#e4007c', '#10b5ae', '#ffb000', '#7b3fe4', '#2fbf5b', '#2d7ff9', '#ff4d5e'];
const RECENT_MAX = 8;

export class CantorView {
  constructor({ app, engine, demo, onExit }) {
    this.app = app;
    this.e = engine;
    this.demo = demo;
    this.onExit = onExit;
    this.offs = [];
    this.bots = [];
    this.idleTimer = null;
    this.lastCall = null;
    this._lastPop = 0;
    this._codeShown = null;
    this._lastCount = 0;
  }

  mount() {
    const stage = this.app.stage;
    this.scene = new CantorScene({ reducedMotion });
    stage.setScene(this.scene);
    this.scene.onLand = (id) => this.showCall(id);
    this.buildHud();
    const s = this.e.s;
    if (s.phase !== 'L' && s.called.length) {
      this.scene.restore(s.called);
      this.showCall(s.called[s.called.length - 1], true);
    }
    const on = (ev, fn) => this.offs.push(this.e.on(ev, fn));
    on('join', (j) => this.onJoin(j));
    on('start', () => this.onStart());
    on('call', (c) => this.onCall(c));
    on('paused', () => this.renderBar());
    on('win', (w) => this.onWin(w));
    on('falseClaim', (f) => {
      sound.buzz();
      toast(`Falsa alarma de ${f.n}: su tabla todavía no gana`, 'warn', 3500);
    });
    on('pending', (p) => this.onPending(p));
    on('gate', (g) => this.onGate(g));
    on('lobby', () => this.onLobby());
    on('config', () => this.renderSide());
    on('net', (n) => this.renderNet(n));
    const offStatus = this.e.t.onStatus?.(() => this.renderNet({ ok: this.e.netOk }));
    if (offStatus) this.offs.push(offStatus);
    on('deckEmpty', () => toast('Ya salieron las 54 cartas. Empieza una ronda nueva.', 'warn', 5000));
    on('result', () => this.renderChainPanel());
    on('sealed', () => this.renderChainPanel());
    this._key = (ev) => this.onKey(ev);
    window.addEventListener('keydown', this._key);
    this._move = () => this.wake();
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerdown', this._move);
    keepAwake.wanted = true;
    keepAwake();
    this.renderAll();
    this.renderChainPanel();
  }

  unmount() {
    this.offs.forEach((f) => f());
    window.removeEventListener('keydown', this._key);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerdown', this._move);
    clearTimeout(this.idleTimer);
    clearTimeout(this._freshT);
    this.bots.forEach((b) => b.destroy());
    sound.hush();
    keepAwake.wanted = false;
  }

  // --- construcción del HUD -----------------------------------------------------
  buildHud() {
    this.el = {};
    const E = this.el;
    E.code = h('div', { class: 'c-code', role: 'text' });
    E.join = h('p', { class: 'c-join' });
    E.name = h('div', { class: 'c-name' });
    E.count = h('span', { class: 'c-count num' }, '0');
    E.plLabel = h('span', { class: 'c-pl-label' }, 'jugadores');
    E.late = h('span', { class: 'c-pl-late', hidden: true, title: 'Se registraron con la ronda empezada: si ganan, tú apruebas su tabla' });
    E.beans = h('div', { class: 'c-beans', 'aria-hidden': 'true' });
    E.recent = h('div', { class: 'c-recent', 'aria-live': 'polite' });
    E.more = h('span', { class: 'pchip', hidden: true });
    E.patternBtn = h('button', { class: 'c-pattern glass interactive', onclick: () => this.cyclePattern(), title: 'Cambiar figura (solo antes de empezar)' });
    E.side = h('aside', { class: 'c-side' },
      h('section', { class: 'c-room glass' }, h('div', { class: 'c-room-head' }, h('div', { class: 'eyebrow' }, 'Sala'), E.name), E.code, E.join),
      h('section', { class: 'c-players glass' }, h('div', { class: 'c-pl-head' }, E.count, E.plLabel, E.late), E.beans, E.recent),
      E.patternBtn,
    );
    E.net = h('span', {});
    E.commit = h('span', { class: 'chip c-commit', hidden: true });
    E.progress = h('span', { class: 'chip c-progress', hidden: true });
    E.top = h('div', { class: 'c-top' }, E.progress, E.commit, E.net);
    E.num = h('div', { class: 'num' });
    E.callName = h('div', { class: 'name' });
    E.verse = h('p', { class: 'verse' });
    E.call = h('div', { class: 'c-call', 'aria-live': 'assertive' }, E.num, E.callName, E.verse);
    E.bar = h('div', { class: 'c-bar glass interactive', role: 'toolbar', 'aria-label': 'Controles del cantor' });
    E.banner = h('div', { class: 'c-banner', hidden: true });
    E.root = h('div', { class: 'cantor' }, E.side, E.top, E.call, E.bar, E.banner);
    this.app.ui.append(E.root);
    this.renderNet({ ok: this.e.netOk });
  }

  renderAll() {
    this.renderSide();
    this.renderPlayers();
    this.renderBar();
    this.renderCallArea();
  }

  renderSide() {
    const s = this.e.s;
    const E = this.el;
    if (this._codeShown !== s.room) {
      this._codeShown = s.room;
      E.code.replaceChildren(...[...s.room].map((ch) => h('span', { class: 'tile' }, ch)));
      E.code.setAttribute('aria-label', `Código de sala: ${[...s.room].join(' ')}`);
    }
    const where = CONFIG.dotName ? h('b', {}, CONFIG.dotName) : h('b', {}, 'Lotería en Cadena');
    E.join.replaceChildren('Abre ', where, ' en tu Polkadot App y entra con este código.');
    E.name.textContent = s.roomName;
    const pt = PATTERNS[s.pattern];
    E.patternBtn.replaceChildren(
      patternGlyph(s.pattern, 46),
      h('div', {}, h('h3', {}, 'Figura: ', pt.name), h('div', { class: 'desc' }, pt.desc)),
      ...(s.phase === 'L' ? [h('span', { class: 'swap', title: 'Toca para cambiar' }, icon('swap', 20))] : []),
    );
    E.patternBtn.disabled = s.phase !== 'L';
    E.root.classList.toggle('won', s.phase === 'W');
    if (s.commit && s.phase !== 'L') {
      E.commit.hidden = false;
      E.commit.replaceChildren(icon('lock', 15), s.phase === 'W' ? `Semilla revelada ✓ ${s.commit.slice(0, 8)}…` : `Baraja sellada · ${s.commit.slice(0, 10)}…`);
      E.commit.title = 'Compromiso SHA-256 de la semilla de la baraja';
    } else E.commit.hidden = true;
    if (s.phase !== 'L') {
      E.progress.hidden = false;
      E.progress.replaceChildren('Carta ', h('b', { class: 'num' }, String(s.called.length)), ' de 54');
    } else E.progress.hidden = true;
  }

  renderPlayers() {
    const players = this.e.players();
    const E = this.el;
    const n = players.length;
    E.count.textContent = String(n);
    if (n > this._lastCount) {
      E.count.classList.remove('bump');
      void E.count.offsetWidth;
      E.count.classList.add('bump');
    }
    this._lastCount = n;
    E.plLabel.textContent = n === 1 ? 'jugador' : 'jugadores';
    const lateN = players.filter((p) => p.late).length;
    E.late.hidden = lateN === 0;
    E.late.textContent = `${lateN} tarde`;

    // Un frijolito por jugador; solo se agregan los nuevos para no reiniciar su animación
    if (!this.beans) {
      this.beans = new Map();
      this.chips = new Map();
    }
    const seen = new Set();
    players.forEach((p, i) => {
      seen.add(p.id);
      let bean = this.beans.get(p.id);
      if (!bean) {
        bean = h('i', { class: 'bean', style: { '--c': BEAN_COLORS[this.beans.size % BEAN_COLORS.length] } });
        this.beans.set(p.id, bean);
        E.beans.append(bean);
      }
      bean.classList.toggle('late', p.late);
      bean.title = p.n;
    });
    for (const [key, bean] of this.beans) {
      if (!seen.has(key)) {
        bean.remove();
        this.beans.delete(key);
      }
    }

    // Las últimas llegadas, con nombre (la más nueva resaltada)
    const newest = [...players].sort((a, b) => b.t - a.t).slice(0, RECENT_MAX);
    const keep = new Set(newest.map((p) => p.id));
    for (const [key, chip] of this.chips) {
      if (!keep.has(key)) {
        chip.remove();
        this.chips.delete(key);
      }
    }
    for (const p of [...newest].reverse()) {
      let chip = this.chips.get(p.id);
      if (!chip) {
        chip = h('span', { class: 'pchip' });
        this.chips.set(p.id, chip);
        E.recent.prepend(chip);
      }
      chip.textContent = p.n;
      chip.classList.toggle('late', p.late);
      chip.title = p.late ? 'Llegó con la ronda empezada' : '';
    }
    newest.forEach((p, i) => this.chips.get(p.id)?.classList.toggle('fresh', i === 0 && n > 0 && Date.now() - p.t < 2500));
    clearTimeout(this._freshT);
    this._freshT = setTimeout(() => this.chips?.forEach((c) => c.classList.remove('fresh')), 2600);
    E.more.hidden = n <= RECENT_MAX;
    E.more.textContent = `+${Math.max(0, n - RECENT_MAX)} más`;
    if (!E.more.isConnected) E.recent.append(E.more);
  }

  renderNet(n) {
    const ok = n?.ok !== false;
    if (this.app.mode === 'host') {
      const st = this.e.t.status;
      let cls = 'chip';
      let text = 'Statement Store';
      if (!ok) {
        cls = 'chip bad';
        text = `Sin conexión: ${n?.error || 'reintentando'}`;
      } else if (st === 'warming') {
        cls = 'chip warn';
        text = 'Statement Store · activando permiso…';
      } else if (st === 'problem') {
        cls = 'chip bad';
        text = 'Sin permiso de publicación (ver Diagnóstico)';
      }
      this.el.net.replaceChildren(h('span', { class: cls }, h('span', { class: 'dot' }), text));
    } else {
      this.el.net.replaceChildren(h('span', { class: 'chip warn', title: whyLocal(this.app.t) }, h('span', { class: 'dot' }), 'Modo demostración'));
    }
  }

  renderCallArea() {
    const s = this.e.s;
    const E = this.el;
    if (s.phase === 'L') {
      E.call.classList.remove('pop');
      E.num.textContent = '';
      E.callName.textContent = '';
      E.verse.replaceChildren(h('span', { class: 'c-hint' }, 'Esperando jugadores… cuando estén listos: ¡Corre y se va!'));
    }
  }

  btn(label, onclick, kind = 'ghost', extra = {}) {
    return h('button', { class: `btn ${kind === 'primary' ? 'btn-primary' : kind === 'gold' ? 'btn-gold' : 'btn-ghost'}`, onclick, ...extra }, label);
  }

  // Botón de la barra: ícono + etiqueta (la etiqueta se oculta en pantallas chicas)
  dock(iconName, label, onclick, { title = label, pressed = null, kind = null } = {}) {
    const cls = kind === 'primary' ? 'btn btn-primary' : kind === 'gold' ? 'btn btn-gold' : 'btn btn-dock';
    return h('button', { class: cls, onclick, title, 'aria-label': label, 'aria-pressed': pressed === null ? null : String(pressed) }, icon(iconName, 20), h('span', { class: 'lbl' }, label));
  }

  renderBar() {
    const s = this.e.s;
    const E = this.el;
    const items = [];
    const sep = () => h('span', { class: 'sep', 'aria-hidden': 'true' });
    if (s.phase === 'L') {
      items.push(this.dock('play', '¡Corre y se va!', () => this.start(), { kind: 'primary', title: 'Empezar (Enter)' }));
      if (this.demo) {
        items.push(this.dock('users', `+${CONFIG.demoPlayers} de prueba`, () => this.addBots(CONFIG.demoPlayers), { kind: 'gold', title: 'Jugadores simulados' }));
        items.push(this.dock('bolt', `+${CONFIG.demoBig} (carga)`, () => this.addBots(CONFIG.demoBig), { title: 'Prueba de carga con una sala grande' }));
      }
    } else if (s.phase === 'P') {
      if (s.pending) items.push(this.dock('search', `Revisar a ${s.pending.n}`, () => this.onPending(s.pending), { kind: 'gold' }));
      items.push(this.dock(s.paused ? 'play' : 'pause', s.paused ? 'Continuar' : 'Pausa', () => (s.paused ? this.e.resume() : this.e.pause()), { kind: s.paused ? 'primary' : null, title: 'Espacio' }));
      items.push(this.dock('next', 'Siguiente', () => this.e.next(), { title: 'Siguiente carta (→)' }));
      items.push(this.dock('search', 'Verificar', () => this.openVerify(), { title: 'Verificar tabla (V)' }));
    } else {
      items.push(this.dock('refresh', 'Nueva ronda', () => this.newRound(), { kind: 'primary' }));
      items.push(this.dock('search', 'Verificar', () => this.openVerify(), { title: 'Verificar tabla (V)' }));
    }
    items.push(sep());
    const speedOut = h('b', { class: 'num' }, `${s.speed}s`);
    const speedIn = h('input', { type: 'range', min: '4', max: '20', step: '1', value: String(s.speed), 'aria-label': 'Segundos entre cartas' });
    speedIn.addEventListener('input', () => (speedOut.textContent = `${speedIn.value}s`));
    speedIn.addEventListener('change', () => this.e.setSpeed(+speedIn.value));
    items.push(h('label', { class: 'c-speed interactive', title: 'Tiempo entre cartas' }, 'Ritmo', speedIn, speedOut));
    items.push(sep());
    if (sound.voiceAvailable()) items.push(this.dock('mic', 'Voz', () => { sound.voiceOn = !sound.voiceOn; if (!sound.voiceOn) sound.hush(); this.renderBar(); }, { pressed: sound.voiceOn, title: sound.voiceOn ? 'Voz del cantor: activada' : 'Voz del cantor: apagada' }));
    items.push(this.dock(sound.muted ? 'mute' : 'volume', 'Sonido', () => { sound.muted = !sound.muted; this.renderBar(); }, { pressed: !sound.muted, title: 'Sonido (M)' }));
    if (document.fullscreenEnabled) items.push(this.dock('expand', 'Pantalla completa', () => this.toggleFullscreen(), { title: 'Pantalla completa (F)' }));
    items.push(this.dock('exit', 'Salir', () => this.confirmExit()));
    E.bar.replaceChildren(...items);
    this.renderSide();
  }

  // --- acciones -------------------------------------------------------------------
  start() {
    sound.unlock();
    if (!this.e.players().length && !this.demo) {
      modal({
        title: '¿Empezar sin jugadores?',
        body: h('p', {}, 'Todavía no se registra ninguna tabla. Quien entre ya empezada la ronda podrá jugar, pero si gana tendrás que aprobar su tabla.'),
        actions: [{ label: 'Esperar' }, { label: 'Empezar', kind: 'primary', onClick: () => this.e.startGame() }],
      });
      return;
    }
    this.e.startGame();
  }

  onStart() {
    this.hideBanner();
    this.scene.playShuffle();
    sound.whoosh(1.2);
    sound.speak('¡Corre y se va!', { rate: 1.05 });
    this.el.call.classList.remove('pop');
    this.el.num.textContent = '';
    this.el.callName.textContent = '¡Corre y se va!';
    this.el.verse.textContent = `Figura: ${PATTERNS[this.e.s.pattern].name} · última llamada para registrar tu tabla`;
    void this.el.call.offsetWidth;
    this.el.call.classList.add('pop');
    this.renderBar();
  }

  onCall({ card, total }) {
    this.scene.setRemaining(54 - total);
    this.scene.dealCard(card);
    sound.whoosh();
    this.renderSide();
  }

  showCall(id, silent = false) {
    const c = DECK[id];
    const E = this.el;
    E.call.classList.remove('pop');
    E.num.textContent = `No. ${c.n}`;
    E.callName.textContent = c.name;
    E.verse.textContent = c.verse;
    void E.call.offsetWidth;
    E.call.classList.add('pop');
    if (!silent) {
      sound.ding();
      sound.speak(`${c.verse} ¡${c.name}!`);
    }
    this.lastCall = id;
  }

  // Compuerta de registro: la primera carta espera a que vuelva la sala
  onGate({ have, need }) {
    if (this.e.s.called.length) return;
    this.el.verse.textContent = `Registrando tablas… ${have} de ${need}`;
  }

  onJoin(j) {
    this.renderPlayers();
    // Con salas grandes llegan muchos a la vez: un solo «pop» cada tanto, no una ráfaga
    const now = performance.now();
    if (!j.rename && !j.swap && now - this._lastPop > 160) {
      this._lastPop = now;
      sound.pop();
    }
  }

  async addBots(n = CONFIG.demoPlayers) {
    sound.unlock();
    toast(`Llegando ${n} jugadores de prueba…`, 'info');
    const more = await spawnBots(this.e.s.room, n, { stagger: n > 40 ? 80 : 250 });
    this.bots.push(...more);
    this.renderBar();
  }

  onWin(w) {
    const s = this.e.s;
    if (w.first) {
      const res = w.res || this.e.verify(w.winner.k);
      this.scene.showWinner({ tabla: res.tabla, line: res.line, name: w.winner.n });
      sound.fanfare();
      setTimeout(() => sound.speak(`¡Lotería! Ganó ${w.winner.n}.`), 900);
    } else {
      sound.pop();
      toast(`¡También ganó ${w.winner.n}!`, 'good', 4000);
    }
    const list = s.winners.map((x) => x.n);
    const names = list.length > 1 ? `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}` : list[0];
    const first = s.winners[0];
    const res0 = this.e.verify(first.k);
    const seedOk = s.deckSeed && commitOf(s.deckSeed) === s.commit;
    const E = this.el;
    E.banner.hidden = false;
    E.banner.replaceChildren(h('div', { class: 'logo' }, '¡Lotería!'), h('div', { class: 'who' }, names));
    E.proof?.remove();
    E.proof = h('section', { class: 'c-proof glass' },
      h('h3', {}, icon('shield', 18), 'Juego limpio'),
      first.late
        ? h('span', { class: 'warn' }, '⚠ Tabla aprobada por el cantor (se registró tarde)')
        : h('span', { class: 'ok' }, '✓ Tabla registrada antes de la primera carta'),
      h('span', { class: 'ok' }, `✓ Las ${res0.line?.length || 0} cartas de la figura ya habían salido`),
      seedOk ? h('span', { class: 'ok' }, `✓ Semilla revelada: coincide con el compromiso ${s.commit.slice(0, 8)}…`) : null,
      h('span', { class: 'meta' }, `Tabla ${first.k} · ${s.called.length} cartas cantadas`),
    );
    if (E.chain) E.side.insertBefore(E.proof, E.chain);
    else E.side.append(E.proof);
    this.renderChainPanel();
    E.call.classList.remove('pop');
    E.num.textContent = '';
    E.callName.textContent = '';
    E.verse.textContent = '';
    this.renderBar();
  }

  hideBanner() {
    this.el.banner.hidden = true;
    this.el.proof?.remove();
    this.el.proof = null;
    this.el.chain?.remove();
    this.el.chain = null;
  }

  // --- historial en la cadena -------------------------------------------------------
  // Cuántos resultados llegaron y cuántos vienen firmados; el botón guarda la ronda
  // en LoteriaRegistry (o agrega lo que llegó después de guardarla).
  pendingToSeal() {
    const s = this.e.s;
    const rec = this.e.roundRecord();
    if (!rec) return { rec: null, pending: 0, sealed: false };
    const sealed = s.sealed?.id === rec.id;
    return { rec, pending: pendingPlayers(rec, sealed ? s.sealed.keys : []).length, sealed };
  }

  renderChainPanel() {
    const s = this.e.s;
    const E = this.el;
    if (s.phase !== 'W') {
      E.chain?.remove();
      E.chain = null;
      return;
    }
    if (!E.chain) {
      E.chain = h('section', { class: 'c-chain glass' });
      E.side.append(E.chain);
    }
    const c = this.e.resultCounts();
    const { pending, sealed } = this.pendingToSeal();
    const parts = [
      h('h3', {}, icon('chain', 18), 'Historial en la cadena'),
      h('span', {}, 'Resultados: ', h('b', { class: 'num' }, String(c.results)), ` de ${c.players} · firmados: `, h('b', { class: 'num' }, String(c.signed))),
    ];
    if (this._sealing) parts.push(h('span', { class: 'meta' }, h('span', { class: 'spin' }), this._sealStep || 'Guardando…'));
    else if (this.demo) parts.push(h('span', { class: 'meta' }, 'Para guardarla, abre la sala desde Polkadot Desktop.'));
    else if (!registryDeployed()) parts.push(h('span', { class: 'meta' }, 'El contrato del historial todavía no está desplegado.'));
    else if (sealed && !pending) parts.push(h('span', { class: 'ok' }, `✓ Guardada en el bloque #${s.sealed.block.toLocaleString('es-MX')}`));
    else {
      if (!sealed) parts.push(h('span', { class: 'meta' }, 'Espera unos segundos a que firmen; lo que llegue después se puede agregar.'));
      parts.push(this.btn([icon('chain', 18), sealed ? `Agregar ${pending} más` : 'Guardar en la cadena'], () => this.seal(), 'gold'));
    }
    if (this._sealError && !this._sealing) parts.push(h('span', { class: 'warn' }, this._sealError));
    E.chain.replaceChildren(...parts);
  }

  async seal() {
    if (this._sealing) return;
    this._sealing = true;
    this._sealError = null;
    this._sealStep = 'Preparando…';
    this.renderChainPanel();
    try {
      const r = await sealRound(this.e, (text) => {
        this._sealStep = text;
        this.renderChainPanel();
      });
      sound.ding();
      toast(r.already ? 'Esta ronda ya estaba guardada en la cadena' : `Ronda guardada en el bloque #${r.block.toLocaleString('es-MX')}`, 'good', 5000);
    } catch (e) {
      this._sealError = String(e?.message || e);
      toast('No se pudo guardar en la cadena', 'bad', 4000);
    } finally {
      this._sealing = false;
      this.renderChainPanel();
    }
  }

  onPending(p) {
    sound.pop();
    const res = p.res;
    modal({
      title: `¿Aprobar a ${p.n}?`,
      wide: true,
      body: h('div', { class: 'verify-out' },
        h('p', {}, `Su tabla ${p.k} completa la figura, pero ${res.registered ? 'se registró con la ronda ya empezada' : 'no se registró antes de empezar'}. Si estuvo jugando desde el principio, apruébala.`),
        tablaCanvas(res.tabla, { line: res.line, called: this.e.s.called, cardW: 58 }),
      ),
      actions: [
        { label: 'Rechazar', onClick: () => this.e.rejectPending() },
        { label: 'Aprobar ganador', kind: 'primary', onClick: () => this.e.approvePending() },
      ],
      onClose: () => this.renderBar(),
    });
  }

  openVerify() {
    const input = h('input', { class: 'input input-code', maxlength: '8', placeholder: 'K7P2QX', autocomplete: 'off', 'aria-label': 'Código de la tabla' });
    const nameIn = h('input', { class: 'input', maxlength: '14', placeholder: 'Nombre de quien ganó', 'aria-label': 'Nombre' });
    const out = h('div', { class: 'verify-out' }, h('p', { class: 'note' }, 'El código aparece abajo de cada tabla, en el teléfono del jugador.'));
    let last = null;
    const check = () => {
      const code = normalizeCode(input.value);
      input.value = code;
      out.replaceChildren();
      if (!isValidCode(code)) {
        out.append(h('p', { class: 'note' }, 'Escribe los 6 caracteres del código.'));
        last = null;
        return;
      }
      const res = this.e.verify(code);
      last = res;
      if (res.name && !nameIn.value) nameIn.value = res.name;
      out.append(
        tablaCanvas(res.tabla, { line: res.line || [], called: this.e.s.called, cardW: 56 }),
        res.win
          ? h('p', { class: 'ok-badge' }, `✓ ¡Tabla ganadora! ${res.registered && !res.late ? 'Registrada a tiempo.' : 'Se registró tarde o no se registró.'}`)
          : h('p', {}, '✗ Todavía no completa la figura.'),
      );
    };
    input.addEventListener('input', check);
    modal({
      title: 'Verificar tabla',
      wide: true,
      body: h('div', {}, h('div', { class: 'row' }, input, nameIn), out),
      actions: [
        { label: 'Cerrar' },
        {
          label: 'Declarar ganador',
          kind: 'primary',
          onClick: () => {
            if (!last?.win) {
              toast('Esa tabla todavía no gana', 'warn');
              return true;
            }
            this.e.declareManual(last.code, nameIn.value);
            return false;
          },
        },
      ],
    });
  }

  newRound() {
    if (this._sealing) {
      toast('Espera a que termine de guardarse en la cadena', 'warn', 3000);
      return;
    }
    const { pending } = this.pendingToSeal();
    if (pending && !this.demo && registryDeployed()) {
      modal({
        title: '¿Nueva ronda sin guardar?',
        body: h('p', {}, `Hay ${pending} ${pending === 1 ? 'jugador' : 'jugadores'} de esta ronda que todavía no se ${pending === 1 ? 'guarda' : 'guardan'} en la cadena. Si empiezas otra ronda, sus resultados se pierden.`),
        actions: [
          { label: 'Nueva ronda', onClick: () => this.startNewRound() },
          { label: 'Guardar primero', kind: 'primary', onClick: () => this.seal() },
        ],
      });
      return;
    }
    this.startNewRound();
  }

  startNewRound() {
    this.hideBanner();
    this.e.newRound();
  }

  onLobby() {
    this.scene.resetRound();
    this.renderAll();
  }

  cyclePattern() {
    const s = this.e.s;
    if (s.phase !== 'L') return;
    const i = ORDER.indexOf(s.pattern);
    this.e.setPattern(ORDER[(i + 1) % ORDER.length]);
    sound.pop();
  }

  toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => toast('Usa F11 para pantalla completa', 'info'));
    } catch {
      toast('Usa F11 para pantalla completa', 'info');
    }
  }

  confirmExit() {
    modal({
      title: '¿Salir de la sala?',
      body: h('p', {}, 'La sala queda guardada en este dispositivo: puedes retomarla desde «Ser el cantor».'),
      actions: [{ label: 'Quedarme' }, { label: 'Salir', kind: 'primary', onClick: () => this.onExit() }],
    });
  }

  onKey(ev) {
    if (ev.target instanceof HTMLInputElement || document.querySelector('.modal-wrap')) return;
    const s = this.e.s;
    if (ev.code === 'Space') {
      ev.preventDefault();
      if (s.phase === 'P') s.paused ? this.e.resume() : this.e.pause();
    } else if (ev.code === 'ArrowRight') {
      if (s.phase === 'P') this.e.next();
    } else if (ev.code === 'Enter') {
      if (s.phase === 'L') this.start();
    } else if (ev.key === 'v' || ev.key === 'V') {
      if (s.phase !== 'L') this.openVerify();
    } else if (ev.key === 'f' || ev.key === 'F') {
      this.toggleFullscreen();
    } else if (ev.key === 'm' || ev.key === 'M') {
      sound.muted = !sound.muted;
      this.renderBar();
    }
    this.wake();
  }

  // Oculta los controles cuando el ratón no se mueve durante la partida
  wake() {
    this.el.bar.classList.remove('hide');
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.e.s.phase === 'P' && !this.el.bar.matches(':hover')) this.el.bar.classList.add('hide');
    }, 4500);
  }
}
