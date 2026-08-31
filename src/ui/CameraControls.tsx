/**
 * Controles de câmera — SEGUIR/LIVRE, CENTRALIZAR, PRÓXIMA FORMIGA,
 * PAUSAR/CONTINUAR (texts do original: "CAM LIVRE / CAM SEGUIR",
 * "Centralizar câmera · Próxima formiga").
 */
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import styles from './cameraControls.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
  onOpenPause: () => void;
}

export default function CameraControls({ engine, hud, onOpenPause }: Props) {
  return (
    <div className={styles.col}>
      <button
        className={styles.btn}
        onClick={() => engine.setCameraMode(hud.cameraMode === 'follow' ? 'free' : 'follow')}
      >
        {hud.cameraMode === 'follow' ? 'CAM LIVRE' : 'CAM SEGUIR'}
      </button>
      <button className={styles.btn} onClick={() => engine.centerCamera()}>
        CENTRALIZAR
      </button>
      <button className={styles.btn} onClick={() => engine.cycleAnt()}>
        PRÓXIMA FORMIGA
      </button>
      <button className={styles.btn} onClick={onOpenPause}>
        MENU
      </button>
    </div>
  );
}
