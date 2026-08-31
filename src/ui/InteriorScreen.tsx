/**
 * Interior do formigueiro — esqueleto da Fase 3:
 * as 11 salas nas coordenadas normalizadas EXATAS da Parte 3.3,
 * corredor central, FOME/COMIDA sobre a Sala da Rainha (y 0.81).
 * A Sala da Rainha já é funcional (fila + barras); as demais mostram
 * em qual fase ganham função. O mundo PAUSA aqui (decisão do plano).
 */
import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import { INTERIOR_BARS, INTERIOR_ROOMS } from '../core/constants';
import { drawQueenPlaceholder } from '../render/placeholderShapes';
import styles from './interior.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

const ROOM_LABELS: Record<string, { label: string; phase: string }> = {
  exit: { label: 'SAÍDA', phase: '' },
  cemetery: { label: 'CEMITÉRIO', phase: 'Fase 6' },
  achievements: { label: 'CONQUISTAS', phase: 'Fase 6' },
  missions: { label: 'MISSÕES', phase: 'Fase 6' },
  ants: { label: 'FORMIGAS', phase: 'Fase 3' },
  map: { label: 'MAPA', phase: 'Fase 6' },
  upgrades: { label: 'MELHORIAS', phase: 'Fase 3' },
  shop: { label: 'LOJA', phase: 'Fase 6' },
  inventory: { label: 'INVENTÁRIO', phase: 'Fase 5' },
  rebirth: { label: 'RENASCER', phase: 'Fase 6' },
  queen: { label: 'RAINHA', phase: '' },
};

export default function InteriorScreen({ engine, hud }: Props) {
  const queenRef = useRef<HTMLCanvasElement | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const canvas = queenRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 96 * dpr;
    canvas.height = 96 * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    drawQueenPlaceholder(ctx, { x: 44, y: 40, size: 80 });
  }, []);

  const roomStyle = (key: string) => {
    const r = INTERIOR_ROOMS[key as keyof typeof INTERIOR_ROOMS];
    return {
      left: `${(r.x - r.w / 2) * 100}%`,
      top: `${(r.y - r.h / 2) * 100}%`,
      width: `${r.w * 100}%`,
      height: `${r.h * 100}%`,
    };
  };

  const onRoomClick = (key: string) => {
    if (key === 'exit') {
      engine.exitInterior();
      return;
    }
    const info = ROOM_LABELS[key];
    if (info && info.phase) {
      setNote(`${info.label} ganha função na ${info.phase}.`);
    }
  };

  const hungerPct = Math.max(0, Math.min(1, hud.hunger / hud.hungerMax));
  const foodPct = Math.max(0, Math.min(1, hud.food / hud.foodCap));

  return (
    <div className={styles.interior}>
      <div className={styles.dirt} />
      <div className={styles.corridor} />

      <button className={styles.exitGlobal} onClick={() => engine.exitInterior()}>
        SAIR
      </button>

      {Object.entries(INTERIOR_ROOMS).map(([key]) => {
        const info = ROOM_LABELS[key] ?? { label: key.toUpperCase(), phase: '' };
        const isQueen = key === 'queen';
        return (
          <div
            key={key}
            className={`${styles.room} ${isQueen ? styles.queenRoom : ''}`}
            style={roomStyle(key)}
            onClick={() => onRoomClick(key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onRoomClick(key)}
          >
            {isQueen ? (
              <div className={styles.queenContent}>
                <canvas ref={queenRef} className="pixel-art" />
                <div className={styles.queenName}>RAINHA</div>
              </div>
            ) : (
              <>
                <div className={styles.roomLabel}>{info.label}</div>
                {info.phase && <div className={styles.roomPhase}>{info.phase}</div>}
              </>
            )}
          </div>
        );
      })}

      {/* FOME e COMIDA sobre a Sala da Rainha (Parte 3.3) */}
      <div className={styles.bars} style={{ top: `${INTERIOR_BARS.y * 100}%` }}>
        <div className={styles.barGroup}>
          <span className={styles.barLabel}>FOME</span>
          <div className={styles.bar}>
            <div
              className={styles.fill}
              style={{
                width: `${hungerPct * 100}%`,
                background: hungerPct < 0.3 ? 'var(--c-vermelho)' : 'var(--c-verde)',
              }}
            />
          </div>
        </div>
        <div className={styles.barGroup}>
          <span className={styles.barLabel}>COMIDA</span>
          <div className={styles.bar}>
            <div className={styles.fill} style={{ width: `${foodPct * 100}%`, background: 'var(--c-verde)' }} />
          </div>
        </div>
      </div>

      {note && (
        <div className={styles.note} onClick={() => setNote(null)}>
          {note}
        </div>
      )}
    </div>
  );
}
