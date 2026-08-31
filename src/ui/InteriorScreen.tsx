/**
 * Interior do formigueiro — fiel ao original: parede de madeira
 * (interior_wood_tile.png), a rainha (hero_ant.png), barra de FOME
 * e o botão voltar (btn_back.png). A alimentação é automática:
 * o sistema da rainha consome os recursos da carteira.
 */
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import { QUEEN, RESOURCES, type ResourceKind } from '../core/constants';
import styles from './interior.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

const FOOD_ORDER: ResourceKind[] = ['leaf', 'mushroom', 'cactus', 'banana', 'flower', 'crystal'];

export default function InteriorScreen({ engine, hud }: Props) {
  const wood = engine.sprites?.woodTile ?? '';
  const back = engine.sprites?.btnBack ?? '';
  const heroAnt = engine.sprites?.heroAntUrl ?? '';

  const hungerPct = (hud.queenHunger / hud.queenHungerMax) * 100;

  return (
    <div
      className={styles.screen}
      style={{ backgroundImage: wood ? `url(${wood})` : undefined }}
    >
      <button className={styles.backBtn} onClick={() => engine.exitInterior()} aria-label="Voltar">
        {back && <img src={back} alt="Voltar" />}
        {!back && '← VOLTAR'}
      </button>

      <div className={styles.room}>
        <h2 className={styles.title}>SALA DA RAINHA</h2>
        {heroAnt && <img className={styles.queen} src={heroAnt} alt="Rainha" />}
        {!heroAnt && <div className={styles.queenEmoji}>🐜</div>}

        <div className={styles.hungerWrap}>
          <span className={styles.label}>
            👑 FOME {Math.ceil(hud.queenHunger)}/{hud.queenHungerMax}
          </span>
          <div className={styles.bar}>
            <div
              className={styles.fill}
              style={{
                width: `${hungerPct}%`,
                background: hungerPct < 30 ? 'var(--c-vermelho)' : 'var(--c-verde)',
              }}
            />
          </div>
          <span className={styles.hint}>
            Ela come 1 item a cada {Math.round(QUEEN.FEED_INTERVAL_SEC)}s —
            mantenha comida no estoque! Alimenta até {QUEEN.FEED_UNTIL} de fome.
          </span>
        </div>

        <div className={styles.stock}>
          {FOOD_ORDER.map((k) => (
            <span key={k} className={styles.stockItem}>
              {RESOURCES[k].icon} {hud.resources[k] ?? 0}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
