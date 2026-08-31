/**
 * Tela de jogo — canvas do mundo + HUD + loja/mapas/fim de jogo.
 * Input: arrastar move a câmera (vira CAM LIVRE), clique curto no ninho
 * entra no interior, WASD/setas no modo livre, atalhos L (loja) e M (mapas).
 */
import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import { CAMERA } from '../core/constants';
import Hud from './Hud';
import ShopModal from './ShopModal';
import MapsModal from './MapsModal';
import CameraControls from './CameraControls';
import styles from './game.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

export default function GameScreen({ engine, hud }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef({ down: false, dragged: false, x: 0, y: 0 });
  const [modal, setModal] = useState<'none' | 'shop' | 'maps'>('none');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engine.attach(canvas);
    return () => engine.detach();
  }, [engine]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      engine.keyDown(k);
      if (k === 'c') engine.centerCamera();
      if (k === 'f') engine.setCameraMode(hud.cameraMode === 'follow' ? 'free' : 'follow');
      if (k === 'n') engine.cycleAnt();
      if (k === 'p') engine.togglePause();
      if (k === 'l' && !hud.gameOver) setModal((m) => (m === 'shop' ? 'none' : 'shop'));
      if (k === 'm' && !hud.gameOver) setModal((m) => (m === 'maps' ? 'none' : 'maps'));
      if (k === 'escape') setModal('none');
    };
    const up = (e: KeyboardEvent) => engine.keyUp(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [engine, hud.cameraMode, hud.gameOver]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { down: true, dragged: false, x: e.clientX, y: e.clientY };
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d.down) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.dragged && Math.hypot(dx, dy) > CAMERA.DRAG_THRESHOLD) d.dragged = true;
    if (d.dragged) {
      engine.panCamera(dx, dy);
      d.x = e.clientX;
      d.y = e.clientY;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    d.down = false;
    if (d.dragged) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const world = engine.camera.toWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (engine.clickWorld(world.x, world.y) === 'interior') {
      engine.enterInterior();
    }
  };

  return (
    <div className={styles.screen}>
      <canvas
        ref={canvasRef}
        className={`pixel-art ${styles.canvas}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (dragRef.current.down = false)}
      />
      <Hud hud={hud} onOpenShop={() => setModal('shop')} onOpenMaps={() => setModal('maps')} />
      {!hud.gameOver && <CameraControls engine={engine} hud={hud} />}
      {modal === 'shop' && !hud.gameOver && (
        <ShopModal engine={engine} hud={hud} onClose={() => setModal('none')} />
      )}
      {modal === 'maps' && !hud.gameOver && (
        <MapsModal engine={engine} hud={hud} onClose={() => setModal('none')} />
      )}
      {hud.gameOver && <GameOverOverlay engine={engine} hud={hud} />}
    </div>
  );
}

function GameOverOverlay({ engine, hud }: { engine: GameEngine; hud: HudState }) {
  const mm = Math.floor(hud.runSeconds / 60);
  const ss = Math.floor(hud.runSeconds % 60);
  return (
    <div className={styles.gameOver}>
      <div className={styles.gameOverPanel}>
        <h2>A RAINHA CAIU</h2>
        <p className={styles.gameOverSub}>A colônia se dispersa. O ninho fica para a próxima geração.</p>
        <div className={styles.stats}>
          <span>Tempo: {mm}m{ss.toString().padStart(2, '0')}s</span>
          <span>Recursos entregues: {hud.totals.delivered}</span>
          <span>Inimigos derrotados: {hud.totals.enemiesKilled}</span>
          <span>Chefes derrotados: {hud.totals.bossesKilled}</span>
          <span>Nível da colônia: {hud.level}</span>
        </div>
        <div className={styles.gameOverBtns}>
          <button className={styles.btn} onClick={() => engine.backToMenu()}>MENU</button>
          <button className={styles.btnPrimary} onClick={() => engine.restart()}>RECOMEÇAR</button>
        </div>
      </div>
    </div>
  );
}
