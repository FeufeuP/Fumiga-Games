/**
 * HUD do mapa externo — posições da Parte 3.2:
 * ninho topo-esquerda · recursos topo-centro · FOME/COMIDA embaixo.
 */
import type { HudState } from '../core/types';
import { HUD, MAP_NAMES } from '../core/constants';
import styles from './hud.module.css';

interface Props {
  hud: HudState;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Hud({ hud }: Props) {
  const hungerPct = Math.max(0, Math.min(1, hud.hunger / hud.hungerMax));
  const foodPct = Math.max(0, Math.min(1, hud.food / hud.foodCap));
  const nestPct = Math.max(0, Math.min(1, hud.nestHp / hud.nestHpMax));

  const bandClass =
    hud.hungerBand === 'sated' || hud.hungerBand === 'normal'
      ? styles.barGreen
      : hud.hungerBand === 'hungry'
        ? styles.barYellow
        : styles.barRed;

  return (
    <div className={styles.hud}>
      {/* painel do ninho — topo esquerda */}
      <div className={styles.panel} style={{ left: `${HUD.nest.x * 100}%`, top: `${HUD.nest.y * 100}%`, width: `${HUD.nest.w * 100}%` }}>
        <div className={styles.panelTitle}>NINHO</div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>VIDA</span>
          <div className={styles.bar}>
            <div className={`${styles.barFill} ${styles.barGreen}`} style={{ width: `${nestPct * 100}%` }} />
          </div>
          <span className={styles.barValue}>{Math.ceil(hud.nestHp)}</span>
        </div>
        <div className={styles.panelSub}>
          {MAP_NAMES[hud.mapId]} · {fmtTime(hud.runSeconds)}
        </div>
      </div>

      {/* recursos — topo centro */}
      <div className={styles.panel} style={{ left: `${HUD.resources.x * 100}%`, top: `${HUD.resources.y * 100}%`, width: `${HUD.resources.w * 100}%` }}>
        <div className={styles.panelTitle}>RECURSOS NO ESTOQUE</div>
        <div className={styles.resRow}>
          <span className={styles.foodDot} /> {Math.floor(hud.food)} / {hud.foodCap}
          <span className={styles.resDivider}>·</span>
          <span className={styles.chitinDot} /> {hud.chitin}
          <span className={styles.resDivider}>·</span>
          POP {hud.popTotal}/{hud.popCap}
        </div>
      </div>

      {/* FOME — barra inferior (Parte 3.2: x 0.34, y 0.91) */}
      <div className={styles.bottomBar} style={{ left: `${HUD.hunger.x * 100}%`, top: `${HUD.hunger.y * 100}%`, width: `${HUD.hunger.w * 100}%` }}>
        <div className={`${styles.barLabelBig} ${hud.hungerBand === 'critical' || hud.hungerBand === 'starving' ? styles.pulseRed : ''}`}>
          FOME
        </div>
        <div className={styles.bigBar}>
          <div className={`${styles.bigBarFill} ${bandClass}`} style={{ width: `${hungerPct * 100}%` }} />
        </div>
      </div>

      {/* COMIDA — barra inferior direita */}
      <div className={styles.bottomBar} style={{ left: `${HUD.food.x * 100}%`, top: `${HUD.food.y * 100}%`, width: `${HUD.food.w * 100}%` }}>
        <div className={styles.barLabelBig}>COMIDA</div>
        <div className={styles.bigBar}>
          <div className={`${styles.bigBarFill} ${styles.barGreen}`} style={{ width: `${foodPct * 100}%` }} />
        </div>
      </div>

      {/* toasts */}
      <div className={styles.toasts}>
        {hud.toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${t.kind === 'danger' ? styles.toastDanger : t.kind === 'warn' ? styles.toastWarn : styles.toastInfo}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* pausa */}
      {hud.paused && !hud.gameOver && (
        <div className={styles.pauseHint}>PAUSADO — toque em CONTINUAR para voltar</div>
      )}
    </div>
  );
}
