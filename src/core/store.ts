/**
 * Estado central — a ponte entre o motor (escreve) e o React (lê).
 * publish/subscribe com snapshot imutável por versão; a interface
 * re-renderiza via useSyncExternalStore.
 */
export class Store<T> {
  private listeners = new Set<() => void>();
  private snap: T;

  constructor(initial: T) {
    this.snap = initial;
  }

  getSnapshot = (): T => this.snap;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  /** Só o motor chama. Substitui o snapshot inteiro (barato: objeto raso). */
  publish = (next: T): void => {
    this.snap = next;
    for (const l of this.listeners) l();
  };
}
