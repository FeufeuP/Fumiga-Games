/**
 * HUD — fiel ao original [O] com melhorias de layout:
 * Card no topo-esquerda com NIVEL(⭐), barra de XP, RENASC(👑), FORMIGAS(🐜), FOLHAS(🍃),
 * e painel expandível VER MAIS para recursos adicionais + exploração.
 * Canto topo-direita livre para os controles de câmera (CameraControls).
 * Botão de velocidade do jogo (1x, 2x, 3x, 5x) na barra de ações.
 */
import { useState } from 'react';
import { RESOURCES, type ResourceKind } from '../core/constants';
import type { HudState } from '../core/types';
import styles from './hud.module.css';

interface Props {
  hud: HudState;
  onOpenShop: () => void;
  onOpenMaps: () => void;
  onRallyAttack: () => void;
  onRallyCollect: () => void;
  onAdvanceWave: () => void;
  onCycleSpeed?: () => void;
}

const EXTRA_RES_ORDER: ResourceKind[] = ['mushroom', 'cactus', 'banana', 'flower', 'crystal'];

export default function Hud({
  hud,
  onOpenShop,
  onOpenMaps,
  onRallyAttack,
  onRallyCollect,
  onAdvanceWave,
  onCycleSpeed,
}: Props) {
  const [showMore, setShowMore] = useState(false);

  const hungerPct = (hud.queenHunger / hud.queenHungerMax) * 100;
  const nestPct = (hud.nestHp / hud.nestHpMax) * 100;
  const waveSec = Math.max(0, Math.ceil(hud.wave.tSec));
  const antsTotal = hud.ants.worker + hud.ants.soldier + hud.ants.scout;
  const barColor = (pct: number) => (pct > 50 ? '#5fce55' : pct > 25 ? '#e8c23c' : '#e2574c');

  const speedLabel = hud.speed === 1 ? '▶ 1x' : hud.speed === 2 ? '⏩ 2x' : hud.speed === 3 ? '⏩ 3x' : '⚡ 5x';

  // XP progress calculation
  const xpPct = Math.min(100, Math.max(0, (hud.xp / (hud.xpToNext || 1)) * 100));
  const xpRemaining = Math.max(0, hud.xpToNext - hud.xp);

  return (
    <div className={styles.hud}>
      {/* topo-esquerda: status card com XP e botão VER MAIS */}
      <div className={styles.statusCard}>
        <div className={styles.statusRow}>
          <span>⭐ NIVEL</span>
          <strong>{hud.level}</strong>
        </div>

        {/* Barra de XP */}
        <div className={styles.xpBarWrap} title={`XP: ${hud.xp} / ${hud.xpToNext} (faltam ${xpRemaining} XP)`}>
          <div className={styles.xpLabel}>
            <span>XP</span>
            <span>{hud.xp}/{hud.xpToNext}</span>
          </div>
          <div className={styles.bar}>
            <div className={styles.xpBarFill} style={{ width: `${xpPct}%` }} />
          </div>
        </div>

        <div className={styles.statusRow}>
          <span>👑 RENASC</span>
          <strong>{hud.rebirths}</strong>
        </div>
        <div className={styles.statusRow}>
          <span>🐜 FORMIGAS</span>
          <strong>{antsTotal}</strong>
        </div>
        <div className={styles.statusRow}>
          <span>🍃 FOLHAS</span>
          <strong>{hud.resources.leaf ?? 0}</strong>
        </div>

        <div className={styles.statusBars}>
          <div className={styles.statusBarRow}>
            <span>NINHO</span>
            <div className={styles.bar}>
              <div className={styles.barFill} style={{ width: `${nestPct}%`, background: barColor(nestPct) }} />
            </div>
          </div>
          <div className={styles.statusBarRow}>
            <span>RAINHA</span>
            <div className={styles.bar}>
              <div className={styles.barFill} style={{ width: `${hungerPct}%`, background: barColor(hungerPct) }} />
            </div>
          </div>
        </div>

        {/* Botão VER MAIS para expandir outros recursos */}
        <button
          className={styles.verMaisBtn}
          onClick={() => setShowMore((prev) => !prev)}
        >
          {showMore ? '▲ VER MENOS' : '▼ VER MAIS'}
        </button>

        {showMore && (
          <div className={styles.expandedResources}>
            {EXTRA_RES_ORDER.map((k) => (
              <div key={k} className={styles.statusRow}>
                <span>{RESOURCES[k].icon} {RESOURCES[k].name}</span>
                <strong>{hud.resources[k] ?? 0}</strong>
              </div>
            ))}
            {hud.chitin > 0 && (
              <div className={styles.statusRow}>
                <span>🦴 Quitina</span>
                <strong style={{ color: '#e0c068' }}>{hud.chitin}</strong>
              </div>
            )}
            <div className={styles.explored}>EXPLORADO {hud.exploredPct}%</div>
          </div>
        )}
      </div>

      {/* topo-centro: onda + chefe + ADIANTAR ONDA [O] */}
      <div className={styles.center}>
        <div className={styles.wave}>
          {hud.wave.active
            ? `🌊 ONDA ${hud.wave.num} · ${waveSec}s`
            : `PROXIMA ONDA EM ${waveSec}s`}
        </div>
        {!hud.wave.active && !hud.gameOver && (
          <button className={styles.advanceBtn} onClick={onAdvanceWave}>
            ADIANTAR ONDA
          </button>
        )}
        {hud.boss && hud.bossAggro && (
          <div className={styles.bossWrap}>
            <span className={styles.bossName}>{hud.boss.name}</span>
            <div className={styles.bossBar}>
              <div
                className={styles.barFill}
                style={{ width: `${(hud.boss.hp / hud.boss.hpMax) * 100}%`, background: 'var(--c-vermelho)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* toasts */}
      <div className={styles.toasts}>
        {hud.toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.kind]}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* rodapé-direita: velocidade + rally [O] + loja + mapas */}
      <div className={styles.actions}>
        {onCycleSpeed && (
          <button
            className={`${styles.actionBtn} ${styles.speedBtn} ${hud.speed > 1 ? styles.speedActive : ''}`}
            onClick={onCycleSpeed}
            title="Velocidade do jogo (Atalho: Tecla V)"
          >
            {speedLabel}
          </button>
        )}
        <button
          className={`${styles.actionBtn} ${styles.rallyBtn} ${hud.rally.attackCd <= 0 ? styles.rallyReady : ''}`}
          disabled={hud.rally.attackCd > 0 || hud.gameOver}
          onClick={onRallyAttack}
        >
          {hud.rally.attackCd > 0 ? `ATACAR! ${hud.rally.attackCd}s` : 'ATACAR!'}
        </button>
        <button
          className={`${styles.actionBtn} ${styles.rallyBtn} ${hud.rally.collectCd <= 0 ? styles.rallyReady : ''}`}
          disabled={hud.rally.collectCd > 0 || hud.gameOver}
          onClick={onRallyCollect}
        >
          {hud.rally.collectCd > 0 ? `COLETA! ${hud.rally.collectCd}s` : 'COLETA!'}
        </button>
        <button className={styles.actionBtn} onClick={onOpenShop}>LOJA</button>
        <button className={styles.actionBtn} onClick={onOpenMaps}>MAPAS</button>
      </div>

      {hud.paused && !hud.gameOver && <div className={styles.paused}>PAUSADO</div>}
    </div>
  );
}
