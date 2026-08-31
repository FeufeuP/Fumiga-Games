/**
 * Mapas — seletor fiel ao original: 6 mapas, liberados por % de exploração
 * (Campo → Pântano 30% → Deserto → Montanha → Caverna → Selva 70%).
 */
import { MAPS, MAP_UNLOCK, RESOURCES, type MapId } from '../core/constants';
import type { HudState } from '../core/types';
import type { GameEngine } from '../engine/GameEngine';
import styles from './maps.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
  onClose: () => void;
}

const ORDER: MapId[] = ['campo', 'pantano', 'deserto', 'montanha', 'caverna', 'selva'];

export default function MapsModal({ engine, hud, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2>MAPAS</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">✕</button>
        </header>

        <p className={styles.explore}>
          Exploração atual: <strong>{hud.exploredPct}%</strong> — explore mais para liberar novos mapas!
        </p>

        <div className={styles.grid}>
          {ORDER.map((id) => {
            const m = MAPS[id];
            const unlocked = hud.unlockedMaps.includes(id);
            const current = hud.mapId === id;
            const unlock = Object.values(MAP_UNLOCK).find((u) => u.next === id);
            return (
              <button
                key={id}
                className={`${styles.mapCard} ${unlocked ? styles.unlocked : ''} ${current ? styles.current : ''}`}
                disabled={!unlocked || current}
                onClick={() => engine.selectMap(id)}
              >
                <span className={styles.mapIcon}>{unlocked ? m.icon : '🔒'}</span>
                <span className={styles.mapName}>{m.name}</span>
                <span className={styles.mapRes}>
                  {unlocked ? `${RESOURCES[m.resource].icon} ${RESOURCES[m.resource].name}` : unlock ? `Libere com ${unlock.pct}% de exploração` : ''}
                </span>
                {current && <span className={styles.currentTag}>VOCÊ ESTÁ AQUI</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
