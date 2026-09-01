/**
 * HUD — fiel ao original [O]: card no topo-esquerda com
 * NIVEL(⭐)/RENASC(👑)/FORMIGAS(🐜)/FOLHAS(🍃) + barras NINHO e RAINHA
 * (cores >50% #5fce55, >25% #e8c23c, senão #e2574c); XP NÃO aparece
 * no HUD (só em ESTATISTICAS). Onda no centro, recursos no topo-direita.
 */
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
}

const RES_ORDER: ResourceKind[] = ['leaf', 'mushroom', 'cactus', 'banana', 'flower', 'crystal'];

export default function Hud({ hud, onOpenShop, onOpenMaps, onRallyAttack, onRallyCollect, onAdvanceWave }: Props) {
  const hungerPct = (hud.queenHunger / hud.queenHungerMax) * 100;
  const nestPct = (hud.nestHp / hud.nestHpMax) * 100;
  const waveSec = Math.max(0, Math.ceil(hud.wave.tSec));
  const antsTotal = hud.ants.worker + hud.ants.soldier + hud.ants.scout;
  const barColor = (pct: number) => (pct > 50 ? '#5fce55' : pct > 25 ? '#e8c23c' : '#e2574c');

  return (
    <div className={styles.hud}>
      {/* topo-esquerda [O]: card NIVEL/RENASC/FORMIGAS/FOLHAS + NINHO/RAINHA */}
      <div className={styles.statusCard}>
        <div className={styles.statusRow}><span>⭐ NIVEL</span><strong>{hud.level}</strong></div>
        <div className={styles.statusRow}><span>👑 RENASC</span><strong>{hud.rebirths}</strong></div>
        <div className={styles.statusRow}><span>🐜 FORMIGAS</span><strong>{antsTotal}</strong></div>
        <div className={styles.statusRow}><span>🍃 FOLHAS</span><strong>{hud.resources.leaf ?? 0}</strong></div>
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

      {/* topo-direita: recursos + exploração [O] */}
      <div className={styles.resources}>
        {RES_ORDER.map((k) => (
          <span key={k} className={styles.res}>
            {RESOURCES[k].icon} {hud.resources[k] ?? 0}
          </span>
        ))}
        <span className={styles.explored}>EXPLORADO {hud.exploredPct}%</span>
      </div>

      {/* toasts */}
      <div className={styles.toasts}>
        {hud.toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.kind]}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* rodapé-direita: rally [O] + loja + mapas */}
      <div className={styles.actions}>
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
