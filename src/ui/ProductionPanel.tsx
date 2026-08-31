/**
 * Painel de produção — gasta comida para enfileirar formigas na Rainha.
 * Na Fase 3 esta coluna muda para a Sala da Rainha no interior;
 * o contrato com o motor (engine.queueAnt) permanece.
 */
import type { GameEngine } from '../engine/GameEngine';
import type { AntClass, HudState } from '../core/types';
import styles from './production.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

const ORDER: AntClass[] = ['worker', 'collector', 'scout', 'soldier'];

const CLASS_DOT: Record<AntClass, string> = {
  worker: 'var(--c-laranja)',
  collector: 'var(--c-verde)',
  scout: '#5fae52',
  soldier: '#c0392b',
  defender: '#7c3b52',
  toxic: '#7ec850',
  giant: '#5a3a28',
};

const STAGE_LABEL: Record<string, string> = {
  egg: 'OVO',
  larva: 'LARVA',
  pupa: 'PUPA',
  none: '—',
};

export default function ProductionPanel({ engine, hud }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>PRODUÇÃO</div>
      <div className={styles.buttons}>
        {ORDER.map((cls) => {
          const info = engine.classInfo[cls];
          const food = Math.floor(hud.food);
          const disabled =
            hud.gameOver ||
            food < info.costFood ||
            hud.queue.length >= 5 ||
            hud.popTotal >= hud.popCap;
          return (
            <button
              key={cls}
              className={styles.btn}
              disabled={disabled}
              onClick={() => engine.queueAnt(cls)}
              title={info.desc}
            >
              <span className={styles.dot} style={{ background: CLASS_DOT[cls] }} />
              <span className={styles.name}>{info.name.toUpperCase()}</span>
              <span className={styles.cost}>{info.costFood}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.queue}>
        {hud.queue.length === 0 && <span className={styles.queueEmpty}>fila vazia</span>}
        {hud.queue.map((q, i) => (
          <div key={i} className={styles.queueItem} title={q.cls}>
            <span className={styles.dot} style={{ background: CLASS_DOT[q.cls] }} />
            <span className={styles.stage}>{STAGE_LABEL[q.stage] ?? '—'}</span>
            <div className={styles.queueBar}>
              <div className={styles.queueFill} style={{ width: `${q.pct * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
