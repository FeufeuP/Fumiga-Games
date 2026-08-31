/**
 * Tela inicial — posições normalizadas da Parte 3.1.
 * CONTINUAR aparece só quando existe save válido.
 */
import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import { APP, MAIN_MENU } from '../core/constants';
import { drawQueenPlaceholder } from '../render/placeholderShapes';
import styles from './mainMenu.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

export default function MainMenu({ engine, hud }: Props) {
  const queenRef = useRef<HTMLCanvasElement | null>(null);
  const [modal, setModal] = useState<'none' | 'inventory' | 'missions'>('none');

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
    ctx.clearRect(0, 0, 96, 96);
    drawQueenPlaceholder(ctx, { x: 44, y: 44, size: 84 });
  }, []);

  const pos = (p: { x: number; y: number; w?: number; h?: number }) => ({
    left: `${(p.x - (p.w ?? 0) / 2) * 100}%`,
    top: `${(p.y - (p.h ?? 0) / 2) * 100}%`,
    width: p.w ? `${p.w * 100}%` : undefined,
    height: p.h ? `${p.h * 100}%` : undefined,
  });

  return (
    <div className={styles.menu}>
      <div className={styles.grass} />

      <div className={styles.logo} style={pos(MAIN_MENU.logo)}>
        {APP.NAME}
      </div>
      <div className={styles.subtitle} style={pos(MAIN_MENU.subtitle)}>
        {APP.SUBTITLE}
      </div>

      <div className={styles.queenBox} style={pos(MAIN_MENU.queen)}>
        <canvas ref={queenRef} className="pixel-art" style={{ width: '100%', height: 'auto' }} />
      </div>

      <button className={styles.btnPrimary} style={pos(MAIN_MENU.playBtn)} onClick={() => engine.newGame('campo')}>
        JOGAR
      </button>

      {hud.hasSave && (
        <button
          className={styles.btn}
          style={{ ...pos(MAIN_MENU.playBtn), top: `${(MAIN_MENU.playBtn.y + 0.045) * 100}%` }}
          onClick={() => {
            if (!engine.continueGame()) engine.newGame('campo');
          }}
        >
          CONTINUAR
        </button>
      )}

      <button
        className={styles.btn}
        style={pos(MAIN_MENU.invBtn)}
        onClick={() => setModal('inventory')}
      >
        INVENTÁRIO
      </button>
      <button
        className={styles.btn}
        style={pos(MAIN_MENU.missionBtn)}
        onClick={() => setModal('missions')}
      >
        MISSÕES
      </button>

      <div className={styles.version}>v{__APP_VERSION__}</div>

      {modal !== 'none' && (
        <div className={styles.modalBackdrop} onClick={() => setModal('none')}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'inventory' ? 'INVENTÁRIO' : 'MISSÕES'}</h2>
            <p className={styles.modalNote}>
              {modal === 'inventory'
                ? 'A coleção das 68 cartas roguelike chega na Fase 5 — Baralho Roguelike.'
                : 'Missões e conquistas chegam na Fase 6 — Meta e conteúdo.'}
            </p>
            <button className={styles.btn} onClick={() => setModal('none')}>
              VOLTAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
