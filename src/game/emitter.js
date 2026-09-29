export class Emitter {
  constructor() {
    this._handlers = new Map();
  }
  on(ev, fn) {
    if (!this._handlers.has(ev)) this._handlers.set(ev, new Set());
    this._handlers.get(ev).add(fn);
    return () => this._handlers.get(ev)?.delete(fn);
  }
  emit(ev, data) {
    const set = this._handlers.get(ev);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(data);
      } catch (e) {
        console.error(`[${ev}]`, e);
      }
    }
  }
}
