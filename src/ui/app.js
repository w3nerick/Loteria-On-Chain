// Pantallas y flujo general de la aplicación.
import { h, toast, modal, patternGlyph, icon } from './dom.js';
import { sound } from './audio.js';
import { HomeScene } from '../three/homeScene.js';
import { CantorView } from './cantorView.js';
import { PlayerView } from './playerView.js';
import { PlayerEngine } from '../game/player.js';
import { CantorEngine } from '../game/cantor.js';
import { PracticeSession } from '../game/bots.js';
import { LocalTransport } from '../net/transport.js';
import { PATTERNS } from '../game/rules.js';
import { isValidRoom } from '../game/crypto.js';
import { CONFIG } from '../config.js';
import { showDiagnostics, whyLocal } from './diagnostico.js';
import { showHistory } from './historyView.js';

export const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class App {
  constructor({ stage, transport, storage, ui }) {
    this.stage = stage;
    this.t = transport;
    this.storage = storage;
    this.ui = ui;
    this.mode = transport.kind;
    this.view = null;
    this.homeScene = null;
  }

  async start() {
    this.player = new PlayerEngine({ transport: this.t, storage: this.storage });
    await this.player.init();
    const hash = location.hash.replace('#', '');
    if (hash === 'cantor') this.showCantorSetup();
    else if (hash === 'jugar') this.showPlayerSetup();
    else if (hash === 'diagnostico') this.showDiagnostics();
    else if (hash === 'historial') showHistory(this);
    else this.showHome();
  }

  clear() {
    this.view?.unmount?.();
    this.view = null;
    this._homeRO?.disconnect();
    this._homeRO = null;
    this._offChip?.();
    this._offChip = null;
    this._offDiag?.();
    this._offDiag = null;
    this._offRooms?.();
    this._offRooms = null;
    this.ui.replaceChildren();
  }

  showDiagnostics() {
    showDiagnostics(this);
  }

  useHomeScene() {
    if (!this.stage) return;
    if (!this.homeScene) this.homeScene = new HomeScene();
    if (this.stage.active !== this.homeScene) this.stage.setScene(this.homeScene);
  }

  // Chip de conexión: en modo Host refleja si ya está lista la cuenta de publicación
  netChip() {
    if (this.mode !== 'host') {
      return h('span', { class: 'chip warn' }, h('span', { class: 'dot' }), `Modo demostración · ${whyLocal(this.t)}`);
    }
    const chip = h('span', { class: 'chip' });
    const paint = () => {
      const st = this.t.status;
      chip.className = `chip${st === 'warming' ? ' warn' : st === 'problem' ? ' bad' : ''}`;
      chip.replaceChildren(
        h('span', { class: 'dot' }),
        st === 'warming' ? 'Conectado · activando tu permiso de publicación…' : st === 'problem' ? 'Conectado, pero sin permiso de publicación (ver Diagnóstico)' : 'Conectado al Statement Store de Polkadot',
      );
    };
    paint();
    this._offChip?.();
    this._offChip = this.t.onStatus?.(paint);
    return chip;
  }

  // --- portada ----------------------------------------------------------------
  showHome() {
    this.clear();
    this.useHomeScene();
    const s = h(
      'div',
      { class: 'screen home' },
      h('header', { class: 'home-title' },
        h('div', { class: 'eyebrow' }, 'Juego de mesa mexicano · para toda la sala'),
        h('h1', { class: 'logo' }, '¡Lotería!'),
        h('p', { class: 'tag' }, 'en cadena, desde tu Polkadot App'),
      ),
      h('div', { class: 'home-actions' },
        h('button', { class: 'btn btn-primary btn-big', onclick: () => { sound.unlock(); this.showPlayerSetup(); } }, icon('cards', 24), 'Jugar con mi tabla'),
        h('button', { class: 'btn btn-ghost', onclick: () => { sound.unlock(); this.showCantorSetup(); } }, icon('expand', 20), 'Ser el cantor', h('small', {}, '· pantalla grande')),
        h('div', { class: 'home-foot' },
          h('button', { class: 'link', onclick: () => this.showHelp() }, '¿Cómo se juega?'),
          h('button', { class: 'link', onclick: () => showHistory(this) }, 'Historial'),
          h('button', { class: 'link', onclick: () => this.showDiagnostics() }, 'Diagnóstico'),
        ),
        h('div', { class: 'home-foot' }, this.netChip()),
      ),
    );
    this.ui.append(s);
    const title = s.querySelector('.home-title');
    const actions = s.querySelector('.home-actions');
    const frame = () => {
      if (!this.homeScene) return;
      const t = title.getBoundingClientRect();
      const b = actions.getBoundingClientRect();
      this.homeScene.setFrame(t.bottom + 8, b.top - 8);
    };
    this._homeRO = new ResizeObserver(frame);
    this._homeRO.observe(s);
    frame();
  }

  showHelp() {
    modal({
      title: '¿Cómo se juega?',
      wide: true,
      body: h('div', {},
        h('ol', { class: 'howto' },
          ...[
            ['Una persona abre la app como ', h('b', {}, 'cantor'), ' en la pantalla grande (Polkadot Desktop o dot.li en un proyector) y abre una sala.'],
            ['Cada jugador abre la app en su ', h('b', {}, 'Polkadot App'), ', entra a la sala con el código de 4 letras y recibe una tabla de 16 cartas.'],
            ['El cantor reparte y canta las cartas. Si la tienes, tócala y cae un frijolito.'],
            ['Cuando completes la figura de la ronda (chorro, esquinas, centrito o tabla llena), ¡grita y aprieta ', h('b', {}, '¡Lotería!'), '!'],
          ].map((parts, i) => h('li', {}, h('b', { class: 'n' }, String(i + 1)), h('span', {}, ...parts))),
        ),
        h('p', { class: 'note' },
          'Juego limpio: cada tabla se registra con un hash antes de empezar y la baraja queda sellada con un compromiso criptográfico. Al terminar, el cantor revela la semilla y todos los teléfonos comprueban que nadie hizo trampa. ',
          'Los mensajes viajan por el Statement Store de Polkadot, sin servidores.',
        ),
      ),
      actions: [{ label: 'Entendido', kind: 'primary' }],
    });
  }

  // --- jugador ----------------------------------------------------------------
  showPlayerSetup() {
    this.clear();
    this.useHomeScene();
    const p = this.player;
    const nameIn = h('input', { class: 'input', id: 'nombre', maxlength: '16', value: p.name, autocomplete: 'nickname', 'aria-label': 'Tu nombre' });
    nameIn.addEventListener('change', () => p.setName(nameIn.value));
    const codeIn = h('input', { class: 'input input-code', id: 'sala', maxlength: '4', placeholder: 'ABCD', autocomplete: 'off', inputmode: 'text', 'aria-label': 'Código de sala', value: '' });
    codeIn.addEventListener('input', () => (codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z]/g, '')));
    const roomsBox = h('div', { class: 'rooms', 'aria-live': 'polite' });
    const roomEls = new Map();
    const emptyEl = h('div', { class: 'empty' });
    // Actualiza la lista en su lugar (sin reemplazar botones bajo el dedo)
    const renderRooms = () => {
      const list = p.listRooms().filter((r) => r.roomName !== 'Práctica');
      const keep = new Set(list.map((r) => r.room));
      for (const [code, el] of roomEls) {
        if (!keep.has(code)) {
          el.remove();
          roomEls.delete(code);
        }
      }
      for (const r of list) {
        let el = roomEls.get(r.room);
        if (!el) {
          el = h('button', { class: 'room', onclick: () => go(r.room) },
            h('span', { class: 'code' }, r.room),
            h('span', { class: 'meta' }, h('b', {}), h('span', {})),
            h('span', { class: 'go' }, 'Entrar ›'),
          );
          roomEls.set(r.room, el);
          roomsBox.append(el);
        }
        const phase = r.phase === 'L' ? 'esperando jugadores' : r.phase === 'P' ? 'ronda en juego' : 'ronda terminada';
        el.dataset.phase = r.phase;
        el.querySelector('.meta b').textContent = r.roomName;
        el.querySelector('.meta span').textContent = `${r.playerCount} ${r.playerCount === 1 ? 'jugador' : 'jugadores'} · ${phase}`;
      }
      if (!list.length) {
        emptyEl.textContent = this.mode === 'host' ? 'Buscando salas abiertas…' : 'No hay salas abiertas en este navegador. Abre otra pestaña como cantor o practica aquí.';
        if (!emptyEl.isConnected) roomsBox.append(emptyEl);
      } else emptyEl.remove();
    };
    renderRooms();
    this._offRooms = p.on('rooms', renderRooms);
    const tick = setInterval(renderRooms, 4000);
    const prevOff = this._offRooms;
    this._offRooms = () => {
      prevOff();
      clearInterval(tick);
    };
    const go = (room) => {
      sound.unlock();
      p.setName(nameIn.value || p.name);
      if (!isValidRoom(room)) {
        toast('El código de sala tiene 4 letras', 'warn');
        return;
      }
      this.startPlaying(room);
    };
    const panel = h(
      'div',
      { class: 'panel ticket' },
      h('div', { class: 'eyebrow', style: { color: 'var(--rosa)' } }, 'Jugador'),
      h('h2', {}, 'Tu tabla te espera'),
      h('div', { class: 'field' }, h('label', { for: 'nombre' }, '¿Cómo te llaman?'), nameIn),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Salas abiertas'), roomsBox),
      h('div', { class: 'field' },
        h('label', { for: 'sala' }, 'O escribe el código que ves en la pantalla grande'),
        h('div', { class: 'row' }, codeIn, h('button', { class: 'btn btn-primary', style: { flex: '0 0 auto' }, onclick: () => go(codeIn.value) }, 'Entrar')),
      ),
      h('div', { class: 'row-end' },
        h('button', { class: 'btn btn-ghost', onclick: () => this.showHome() }, '‹ Volver'),
        h('button', { class: 'btn btn-gold', onclick: () => { sound.unlock(); p.setName(nameIn.value || p.name); this.startPractice(); } }, 'Practicar contra la compu'),
      ),
    );
    this.ui.append(h('div', { class: 'screen' }, panel));
    if (p.lastRoom && p.rooms.has(p.lastRoom)) codeIn.value = p.lastRoom;
  }

  startPlaying(room) {
    this.clear();
    this.player.joinRoom(room);
    this.view = new PlayerView({ app: this, engine: this.player, onExit: () => { this.player.leaveRoom(); this.showHome(); } });
    this.view.mount();
  }

  async startPractice() {
    this.clear();
    const practice = new PracticeSession({ speed: 5, rivals: 7 });
    const room = await practice.start();
    const t = new LocalTransport({ name: 'practica' });
    await t.connect();
    const eng = new PlayerEngine({ transport: t });
    await eng.init();
    eng.setName(this.player.name);
    eng.setPref('marker', this.player.prefs.marker);
    eng.joinRoom(room);
    this.view = new PlayerView({
      app: this,
      engine: eng,
      practice: true,
      onExit: () => {
        practice.stop();
        eng.destroy();
        t.destroy();
        this.showHome();
      },
    });
    this.view.mount();
  }

  // --- cantor -----------------------------------------------------------------
  async showCantorSetup() {
    this.clear();
    this.useHomeScene();
    const engine = new CantorEngine({ transport: this.t, storage: this.storage });
    const saved = await engine.loadSaved();
    let pattern = saved?.pattern || CONFIG.defaultPattern;
    let speed = saved?.speed || CONFIG.defaultSpeed;
    const nameIn = h('input', { class: 'input', id: 'nombre-sala', maxlength: '24', value: saved?.roomName || CONFIG.defaultRoomName, 'aria-label': 'Nombre de la sala' });
    const patBox = h('div', { class: 'patterns', role: 'group', 'aria-label': 'Figura para ganar' });
    // Carta mediana en la que cae el primer ganador con 60–100 jugadores (simulación de 200 rondas)
    const TYPICAL_CARD = { c: 12, e: 20, m: 19, f: 43 };
    const drawPatterns = () => {
      patBox.replaceChildren(
        ...Object.values(PATTERNS).map((pt) => {
          const mins = Math.max(1, Math.round((TYPICAL_CARD[pt.key] * speed) / 60));
          return h('button', { class: 'pattern-opt', 'aria-pressed': String(pt.key === pattern), onclick: () => { pattern = pt.key; drawPatterns(); } },
            patternGlyph(pt.key, 34),
            h('span', {}, h('b', {}, pt.name), h('span', {}, pt.desc), h('span', { style: { display: 'block', marginTop: '2px', color: 'var(--rosa)', opacity: 1, fontWeight: 500 } }, `Ronda de ~${mins} min`)),
          );
        }),
      );
    };
    drawPatterns();
    const speedOut = h('b', {}, `${speed} s`);
    const speedIn = h('input', { type: 'range', min: '4', max: '20', step: '1', value: String(speed), id: 'velocidad', 'aria-label': 'Segundos entre cartas' });
    speedIn.addEventListener('input', () => {
      speed = +speedIn.value;
      speedOut.textContent = `${speed} s`;
      drawPatterns();
    });
    const open = () => {
      sound.unlock();
      engine.createRoom(nameIn.value, { pattern, speed });
      this.startCantor(engine);
    };
    const resume = () => {
      sound.unlock();
      engine.restore(saved);
      this.startCantor(engine);
    };
    const panel = h(
      'div',
      { class: 'panel ticket' },
      h('div', { class: 'eyebrow', style: { color: 'var(--rosa)' } }, 'Cantor'),
      h('h2', {}, 'Abre la sala'),
      h('p', {}, 'Pon esta pantalla en el proyector. Los jugadores entran desde su Polkadot App con el código que aparecerá aquí.'),
      // Una ronda terminada también se retoma si falta guardarla en la cadena
      saved && (saved.phase !== 'W' || (saved.results?.length && !saved.sealed))
        ? h('div', { class: 'field' },
            h('button', { class: 'btn btn-gold', onclick: resume }, `Retomar sala ${saved.room}`, h('small', {}, `· ronda ${saved.g}, ${saved.called?.length || 0} cartas, ${saved.registered?.length || 0} tablas`)),
          )
        : null,
      h('div', { class: 'field' }, h('label', { for: 'nombre-sala' }, 'Nombre de la sala'), nameIn),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Figura para ganar'), patBox),
      h('div', { class: 'field' }, h('label', { for: 'velocidad' }, 'Tiempo entre cartas: ', speedOut), speedIn),
      h('div', { class: 'hint' }, icon('users', 20), h('span', {}, 'Por defecto gana quien llena toda su tabla: con 60–100 jugadores suele caer hacia la carta 43 (~6 min a 8 s) y en 1 de cada 5 rondas hay empate de dos. El «chorro» cae hacia la carta 12. Los empates se reparten solos, hasta 3 ganadores.')),
      h('div', { class: 'row-end' },
        h('button', { class: 'btn btn-ghost', onclick: () => { engine.destroy(); this.showHome(); } }, '‹ Volver'),
        h('button', { class: 'btn btn-primary btn-big', onclick: open }, 'Abrir sala nueva'),
      ),
    );
    this.ui.append(h('div', { class: 'screen' }, panel));
  }

  startCantor(engine) {
    this.clear();
    this.view = new CantorView({
      app: this,
      engine,
      demo: this.mode !== 'host',
      onExit: () => {
        engine.destroy();
        this.showHome();
      },
    });
    this.view.mount();
  }
}
