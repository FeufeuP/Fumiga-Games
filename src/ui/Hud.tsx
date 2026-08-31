/**
 * HUD — fiel ao original: nível + XP no topo-esquerda, onda no centro,
 * recursos no topo-direita, FOME da rainha e vida do ninho embaixo,
 * barra do chefe quando ele está vivo, avisos flutuantes (toasts).
 */
import { RESOURCES, type ResourceKind } from '../core/constants';
import type { HudState } from '../core/types';
import styles from './hud.module.css';

interface Props {
  hud: HudState;
  onOpenShop: () => void;
  onOpenMaps: () => void;
}

const RES_ORDER: ResourceKind[] = ['leaf', 'mushroom', 'cactus', 'banana', 'flower', 'crystal'];

export default function Hud({ hud, onOpenShop, onOpenMaps }: Props) {
  const xpPct = Math.min(100, (hud.xp / Math.max(1, hud.xpToNext)) * 100);
  const hungerPct = (hud.queenHunger / hud.queenHungerMax) * 100;
  const nestPct = (hud.nestHp / hud.nestHpMax) * 100;
  const waveSec = Math.max(0, Math.ceil(hud.wave.tSec));

  return (
    <div className={styles.hud}>
      {/* topo-esquerda: nível + XP */}
      <div className={styles.level}>
        <span className={styles.levelLabel}>NÍVEL {hud.level}</span>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${xpPct}%`, background: 'var(--c-dourado)' }} />
        </div>
      </div>

      {/* topo-centro: onda + chefe */}
      <div className={styles.center}>
        <div className={styles.wave}>
          {hud.wave.active
            ? `🌊 ONDA ${hud.wave.num} · ${waveSec}s`
            : `Próxima onda em ${waveSec}s`}
        </div>
        {hud.boss && (
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

      {/* topo-direita: recursos */}
      <div className={styles.resources}>
        {RES_ORDER.map((k) => (
          <span key={k} className={styles.res}>
            {RESOURCES[k].icon} {hud.resources[k] ?? 0}
          </span>
        ))}
      </div>

      {/* toasts */}
      <div className={styles.toasts}>
        {hud.toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.kind]}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* rodapé-esquerda: rainha + ninho */}
      <div className={styles.queen}>
        <span className={styles.queenLabel}>
          👑 FOME {Math.ceil(hud.queenHunger)}/{hud.queenHungerMax}
        </span>
        <div className={styles.bar}>
          <div
            className={styles.barFill}
            style={{
              width: `${hungerPct}%`,
              background: hungerPct < 30 ? 'var(--c-vermelho)' : 'var(--c-verde)',
            }}
          />
        </div>
        <span className={styles.queenLabel}>
          🏠 NINHO {Math.ceil(hud.nestHp)}/{hud.nestHpMax}
        </span>
        <div className={styles.bar}>
          <div
            className={styles.barFill}
            style={{ width: `${nestPct}%`, background: 'var(--c-terra-clara)' }}
          />
        </div>
      </div>

      {/* rodapé-direita: loja + mapas */}
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onOpenShop}>LOJA</button>
        <button className={styles.actionBtn} onClick={onOpenMaps}>MAPAS</button>
      </div>

      {hud.paused && !hud.gameOver && <div className={styles.paused}>PAUSADO</div>}
    </div>
  );
}
