/**
 * SaveSystem — quando salvar (Parte 8 + lacuna L11):
 *  imediato: run_start, interior_enter/exit, fim de run
 *  debounce 5s: coleta, produção, reparo
 *  periódico 30s: rede de segurança
 * Também salva ao trocar de aba / fechar a página.
 */
import { SAVE } from '../core/constants';
import type { GameEngine } from '../engine/GameEngine';
import { serialize } from './serializer';
import { writeSave, saveExists } from './storage';

export class SaveSystem {
  private debounceTimer: number | null = null;
  private periodicTimer: number | null = null;
  private unbinds: Array<() => void> = [];
  private bound = false;

  constructor(private engine: GameEngine) {}

  bind(): void {
    if (this.bound) return;
    this.bound = true;
    const bus = this.engine.events;

    const immediate = SAVE.IMMEDIATE_EVENTS.filter((e) =>
      ['run_start', 'interior_enter', 'interior_exit', 'defeat', 'rebirth'].includes(e),
    );
    for (const name of immediate) {
      this.unbinds.push(
        bus.on(name as 'run_start', () => this.save(`event:${name}`)),
      );
    }
    // derrota da run = 'defeat' no dossiê; nosso evento é run_end
    this.unbinds.push(bus.on('run_end', () => this.save('event:defeat')));

    const debounced = ['food_deposited', 'queen_fed', 'ant_produced', 'production_queued', 'nest_repaired'] as const;
    for (const name of debounced) {
      this.unbinds.push(bus.on(name, () => this.scheduleDebounced()));
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') this.save('visibility');
    };
    const onUnload = () => this.save('unload');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onUnload);
    this.unbinds.push(() => document.removeEventListener('visibilitychange', onVisibility));
    this.unbinds.push(() => window.removeEventListener('beforeunload', onUnload));

    this.startPeriodic();
  }

  unbind(): void {
    for (const u of this.unbinds) u();
    this.unbinds = [];
    this.bound = false;
    this.stopTimers();
  }

  startPeriodic(): void {
    this.stopTimers();
    this.periodicTimer = window.setInterval(
      () => this.save('periodic'),
      SAVE.PERIODIC_MS,
    );
  }

  stopTimers(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.periodicTimer !== null) {
      window.clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  scheduleDebounced(): void {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.save('debounce');
    }, SAVE.DEBOUNCE_MS);
  }

  save(trigger: string): void {
    if (!this.engine.runActive) return;
    const ok = writeSave(serialize(this.engine));
    if (ok) this.engine.events.emit('save_written', { trigger });
  }

  static exists(): boolean {
    return saveExists();
  }
}
