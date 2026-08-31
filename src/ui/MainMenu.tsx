/**
 * Menu principal — fundo original (menu_background.jpg), título
 * FORMIGUEIRO, NOVO JOGO / CONTINUAR e botão de som (sprites originais).
 */
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import { MAPS, type MapId } from '../core/constants';
import styles from './mainMenu.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

export default function MainMenu({ engine, hud }: Props) {
  const bg = engine.sprites?.menuBg ?? '';
  const soundIcon = engine.audio.muted
    ? engine.sprites?.soundOff ?? ''
    : engine.sprites?.soundOn ?? '';

  return (
    <div className={styles.screen} style={{ backgroundImage: bg ? `url(${bg})` : undefined }}>
      <div className={styles.dim} />
      <button
        className={styles.soundBtn}
        onClick={() => engine.toggleMute()}
        aria-label="Som"
        title={engine.audio.muted ? 'Ativar som' : 'Desativar som'}
      >
        {soundIcon && <img src={soundIcon} alt="" />}
        {!soundIcon && (engine.audio.muted ? '🔇' : '🔊')}
      </button>

      <div className={styles.stack}>
        <h1 className={styles.title}>FORMIGUEIRO</h1>
        <p className={styles.subtitle}>Cuide da rainha. Sobreviva às ondas.</p>

        <div className={styles.buttons}>
          {hud.hasSave && hud.runActive === false && (
            <button className={styles.btn} onClick={() => engine.continueGame()}>
              CONTINUAR
            </button>
          )}
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => engine.newGame()}>
            NOVO JOGO
          </button>
        </div>

        <p className={styles.hint}>
          {hud.unlockedMaps.length > 1
            ? `Mapas liberados: ${hud.unlockedMaps.map((m) => MAPS[m as MapId]?.name ?? m).join(' · ')}`
            : 'Explore o campo para liberar o Pântano…'}
        </p>
      </div>
    </div>
  );
}
