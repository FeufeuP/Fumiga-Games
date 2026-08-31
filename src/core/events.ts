/**
 * Barramento de eventos tipado. O motor emite; meta/save/UI apenas escutam.
 * (Regra de fronteira: o motor não conhece quem está do outro lado.)
 */
export interface EventMap {
  run_start: { seed: number; mapId: string };
  run_end: { reason: string };
  food_deposited: { units: number; food: number; by: string };
  queen_fed: { food: number };
  production_queued: { cls: string };
  ant_produced: { cls: string; id: number };
  nest_repaired: { amount: number };
  queen_hungry: undefined;
  queen_critical: undefined;
  queen_starving: undefined;
  queen_dead: undefined;
  nest_destroyed: undefined;
  interior_enter: undefined;
  interior_exit: undefined;
  toast: { text: string; kind: 'info' | 'warn' | 'danger' };
  save_written: { trigger: string };
}

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

export class EventBus {
  private handlers = new Map<keyof EventMap, Set<Handler<never>>>();

  on<K extends keyof EventMap>(key: K, fn: Handler<K>): () => void {
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(fn as Handler<never>);
    return () => this.off(key, fn);
  }

  off<K extends keyof EventMap>(key: K, fn: Handler<K>): void {
    this.handlers.get(key)?.delete(fn as Handler<never>);
  }

  emit<K extends keyof EventMap>(key: K, payload: EventMap[K]): void {
    const set = this.handlers.get(key);
    if (!set) return;
    for (const fn of set) {
      (fn as Handler<K>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
