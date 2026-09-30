// Pantalla «Historial»: rondas guardadas en LoteriaRegistry y, por ronda, cada
// jugador con su tabla, lo que marcó, lo que le salió y si su firma es válida.
// Todo se verifica en este dispositivo con los bytes de la cadena.
import { h, icon, patternGlyph } from './dom.js';
import { PATTERNS } from '../game/rules.js';
import { KIND } from '../chain/record.js';
import { listRounds, loadRound } from '../chain/history.js';
import { registryDeployed } from '../chain/registry.js';
import { REGISTRY_ADDRESS } from '../chain/network.js';

const fmtDate = (d) => d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const fmtBlock = (n) => `#${Number(n).toLocaleString('es-MX')}`;
const short = (hex) => `${hex.slice(0, 6)}…${hex.slice(-4)}`;

function shell(app, title, ...body) {
  app.clear();
  app.useHomeScene();
  const panel = h('div', { class: 'panel ticket history' }, h('div', { class: 'eyebrow', style: { color: 'var(--rosa)' } }, icon('chain', 16), ' Historial en la cadena'), h('h2', {}, title), ...body);
  app.ui.append(h('div', { class: 'screen' }, panel));
  return panel;
}

const spinner = (text) => h('p', { class: 'note' }, h('span', { class: 'spin' }), text);

export async function showHistory(app) {
  const list = h('div', { class: 'h-list', 'aria-live': 'polite' }, spinner('Leyendo las rondas guardadas en Asset Hub…'));
  shell(
    app,
    'Rondas guardadas',
    h('p', { class: 'note' }, 'Cada ronda guarda quién jugó, con qué tabla, cuántas casillas marcó y su firma. Este teléfono lo verifica todo con la semilla revelada.'),
    list,
    h('div', { class: 'row-end' }, h('button', { class: 'btn btn-ghost', onclick: () => app.showHome() }, '‹ Volver')),
  );
  if (!registryDeployed()) {
    list.replaceChildren(h('p', {}, 'El contrato del historial todavía no está desplegado.'));
    return;
  }
  try {
    const { total, rounds } = await listRounds();
    if (!list.isConnected) return;
    if (!total) {
      list.replaceChildren(h('p', {}, 'Todavía no hay rondas guardadas. Al terminar una ronda, el cantor pulsa «Guardar en la cadena».'));
      return;
    }
    const rows = [
      ...rounds.map((r) => {
        const hd = r.header;
        const title = hd ? `Sala ${hd.room} · ronda ${hd.g}` : 'Ronda con formato desconocido';
        const sub = [fmtDate(r.date), `${r.players} ${r.players === 1 ? 'jugador' : 'jugadores'}`, hd ? PATTERNS[hd.pattern]?.name : null].filter(Boolean).join(' · ');
        return h('button', { class: 'h-round', onclick: () => showRound(app, r.id) },
          hd ? patternGlyph(hd.pattern, 30) : h('span'),
          h('span', { class: 'meta' }, h('b', {}, title), h('span', {}, hd?.roomName ? `${hd.roomName} · ${sub}` : sub)),
          h('span', { class: 'go' }, '›'),
        );
      }),
    ];
    if (total > rounds.length) rows.push(h('p', { class: 'note' }, `Mostrando las ${rounds.length} más recientes de ${total}.`));
    list.replaceChildren(...rows);
  } catch (e) {
    if (list.isConnected) list.replaceChildren(h('p', {}, `No se pudo leer el historial: ${e?.message || e}`), h('button', { class: 'btn btn-ghost', onclick: () => showHistory(app) }, icon('refresh', 18), 'Reintentar'));
  }
}

function playerRow(p) {
  const status =
    p.kind === KIND.HIDDEN
      ? h('span', { class: 'h-tag' }, 'no mandó su resultado')
      : p.kind === KIND.SIGNED
        ? p.sigOk
          ? h('span', { class: 'h-tag ok' }, icon('check', 14), 'firmó')
          : h('span', { class: 'h-tag bad' }, '✗ firma inválida')
        : h('span', { class: 'h-tag' }, 'sin firma');
  const facts = [];
  if (p.code) facts.push(`tabla ${p.code}`);
  if (p.late) facts.push('llegó tarde');
  if (p.kind === KIND.SIGNED) facts.push(`cuenta ${short(p.pubkey)}`);
  if (p.marksOk === false) facts.push('⚠ marcó cartas que no salieron');
  const score =
    p.kind === KIND.HIDDEN
      ? h('span', { class: 'h-score' }, '—')
      : h('span', { class: 'h-score' }, h('b', { class: 'num' }, p.marked == null ? '?' : String(p.marked)), h('small', {}, `/16 · salieron ${p.came}`));
  return h('li', { class: `h-player${p.winner ? ' winner' : ''}` },
    h('span', { class: 'who' }, h('b', {}, p.winner ? '🏆 ' : '', p.name || 'Jugador'), h('span', { class: 'facts' }, facts.join(' · ')), status),
    score,
  );
}

export async function showRound(app, id) {
  const body = h('div', { class: 'h-detail' }, spinner('Leyendo la ronda y verificando firmas…'));
  const panel = shell(app, 'Ronda', body, h('div', { class: 'row-end' }, h('button', { class: 'btn btn-ghost', onclick: () => showHistory(app) }, '‹ Todas las rondas')));
  try {
    const r = await loadRound(id);
    if (!body.isConnected) return;
    if (!r) {
      body.replaceChildren(h('p', {}, 'Esa ronda no está en la cadena.'));
      return;
    }
    const hd = r.header;
    panel.querySelector('h2').textContent = `Sala ${hd.room} · ronda ${hd.g}`;
    const signed = r.players.filter((p) => p.kind === KIND.SIGNED && p.sigOk).length;
    const check = (ok, yes, no) => h('span', { class: ok ? 'ok-badge' : 'h-bad' }, ok ? icon('check', 16) : '✗ ', ok ? yes : no);
    body.replaceChildren(
      h('p', { class: 'h-sub' }, [hd.roomName, fmtDate(r.date), `bloque ${fmtBlock(r.block)}`].filter(Boolean).join(' · ')),
      h('p', { class: 'h-sub' }, patternGlyph(hd.pattern, 20), ` ${PATTERNS[hd.pattern]?.name || hd.pattern} · ${hd.called.length} cartas cantadas · ${r.players.length} jugadores · ${signed} firmaron`),
      h('div', { class: 'h-checks' },
        check(r.deck.commitOk, `La semilla revelada coincide con el compromiso ${hd.commit.slice(0, 8)}…`, 'La semilla NO coincide con el compromiso'),
        check(r.deck.orderOk, 'Las cartas salieron en el orden de la baraja sellada', 'Las cartas NO siguen el orden de la baraja'),
      ),
      h('ul', { class: 'h-players' }, ...r.players.map(playerRow)),
      h('p', { class: 'note' }, `Guardada por ${short(r.cantor)} en LoteriaRegistry ${short(REGISTRY_ADDRESS)} (Asset Hub).`),
    );
  } catch (e) {
    if (body.isConnected) body.replaceChildren(h('p', {}, `No se pudo leer la ronda: ${e?.message || e}`), h('button', { class: 'btn btn-ghost', onclick: () => showRound(app, id) }, icon('refresh', 18), 'Reintentar'));
  }
}
