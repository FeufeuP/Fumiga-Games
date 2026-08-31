/**
 * Menu principal — fiel ao original [O]:
 * fundo menu_background.jpg, título FORMIGUEIRO, subtítulo
 * "EXPLORE ✦ COLETE ✦ COMBATE ✦ EVOLUA", badge V1.5,
 * coluna JOGAR (glow) / OPCOES / CREDITOS, grid
 * CONQUISTAS / ESTATISTICAS / PLACAR e botão SAIR (danger).
 * Modais ficam em MenuModals.
 */
import { useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import MenuModals, { type MenuModalId } from './MenuModals';
import styles from './mainMenu.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

export default function MainMenu({ engine, hud }: Props) {
  const [modal, setModal] = useState<MenuModalId | null>(null);
  const bg = engine.sprites?.menuBg ?? '';

  const jogar = () => {
    // [O] JOGAR continua o save; sem save, começa do zero
    if (hud.hasSave) engine.continueGame();
    else engine.newGame();
  };

  return (
    <div className={styles.screen} style={{ backgroundImage: bg ? `url(${bg})` : undefined }}>
      <div className={styles.dim} />

      <span className={styles.badge}>V1.5</span>

      <div className={styles.stack}>
        <h1 className={styles.title}>FORMIGUEIRO</h1>
        <p className={styles.subtitle}>
          EXPLORE <span className={styles.spark}>✦</span> COLETE <span className={styles.spark}>✦</span>{' '}
          COMBATE <span className={styles.spark}>✦</span> EVOLUA
        </p>

        <div className={styles.column}>
          <button className={`${styles.btn} ${styles.btnPlay}`} onClick={jogar}>
            JOGAR
          </button>
          <button className={styles.btn} onClick={() => setModal('opcoes')}>
            OPCOES
          </button>
          <button className={styles.btn} onClick={() => setModal('creditos')}>
            CREDITOS
          </button>
        </div>

        <div className={styles.grid}>
          <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => setModal('conquistas')}>
            🏆<br />CONQUISTAS
          </button>
          <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => setModal('estatisticas')}>
            📊<br />ESTATISTICAS
          </button>
          <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => setModal('placar')}>
            🥇<br />PLACAR
          </button>
        </div>

        <button className={`${styles.btn} ${styles.btnExit}`} onClick={() => engine.exitGame()}>
          SAIR
        </button>
      </div>

      {modal && <MenuModals id={modal} engine={engine} hud={hud} onClose={() => setModal(null)} />}
    </div>
  );
}
