// Lectura del historial: rondas guardadas en LoteriaRegistry, decodificadas y
// verificadas en este dispositivo (no se confía en quien las guardó).
import { decodeHeader, decodePlayers, verifyRound, KIND } from './record.js';
import { tablaHash } from '../game/crypto.js';
import * as reg from './registry.js';
import { withReadClient } from './client.js';

// Un mismo jugador puede aparecer dos veces si el cantor agregó su firma
// después de guardar la ronda: se queda el mejor registro de cada tabla.
const rank = (p) => (p.kind === KIND.SIGNED ? 3 : p.kind === KIND.UNSIGNED ? (p.mask == null ? 1 : 2) : 0);
export function mergePlayers(list) {
  const best = new Map();
  for (const p of list) {
    const key = p.kind === KIND.HIDDEN ? p.h : tablaHash(p.code);
    const prev = best.get(key);
    if (!prev || rank(p) >= rank(prev)) best.set(key, p);
  }
  return [...best.values()];
}

function safeHeader(bytes) {
  try {
    return decodeHeader(bytes);
  } catch {
    return null;
  }
}

// Las rondas más recientes primero
export async function listRounds(limit = 40) {
  return withReadClient(async (client) => {
    const total = await reg.totalRounds(client);
    const from = Math.max(0, total - limit);
    const page = total ? await reg.roundsPage(client, from, total - from) : [];
    return {
      total,
      rounds: page
        .map((r) => ({ id: r.id, cantor: r.cantor, block: Number(r.bloque), date: new Date(Number(r.fecha) * 1000), players: Number(r.jugadores), header: safeHeader(r.cabecera) }))
        .reverse(),
    };
  });
}

// Ronda completa con cada jugador verificado
export async function loadRound(id) {
  return withReadClient(async (client) => {
    const r = await reg.readRound(client, id);
    if (!r) return null;
    const header = decodeHeader(r.cabecera);
    const players = mergePlayers(r.parts.flatMap((part) => decodePlayers(part)));
    const v = verifyRound(header, players);
    const order = (p) => (p.winner ? 0 : 1) * 1000 - (p.marked ?? p.came ?? -1);
    return {
      id,
      cantor: r.cantor,
      block: Number(r.bloque),
      date: new Date(Number(r.fecha) * 1000),
      header,
      deck: v.deck,
      players: v.players.sort((a, b) => order(a) - order(b)),
    };
  });
}
