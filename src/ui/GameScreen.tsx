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
import CardPanel from './CardPanel';
import ReplaceDialog from './ReplaceDialog';
import { colonyStats } from '../systems/shop';
import { RARIDADES, SLOTS } from '../roguelike/cards';
import styles from './game.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

export default function GameScreen({ engine, hud }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef({ down: false, dragged: false, x: 0, y: 0 });
  const tapRef = useRef<{ lastAt: number; pending: number }>({ lastAt: 0, pending: 0 });
  const [modal, setModal] = useState<'none' | 'shop' | 'maps' | 'pause'>('none');

  const openPause = (): void => {
    setModal('pause');
    engine.clock.paused = true;
    engine.publishHud();
  };

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
      if (k === 'p' && modal === 'none' && !hud.gameOver && !hud.cardPanel && !hud.replaceDialog) openPause();
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
    // [O registerTap] toque no ninho → interior; toque simples chama
    // exploradoras; toque duplo (≤320ms) chama soldados.
    if (engine.clickWorld(world.x, world.y) === 'interior') {
      engine.enterInterior();
      return;
    }
    const now = performance.now();
    const t = tapRef.current;
    if (now - t.lastAt < 320) {
      t.lastAt = 0;
      window.clearTimeout(t.pending);
      engine.callSoldiers(world.x, world.y);
    } else {
      t.lastAt = now;
      t.pending = window.setTimeout(() => {
        engine.callScouts(world.x, world.y);
      }, 320);
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
      <Hud
        hud={hud}
        onOpenShop={() => setModal('shop')}
        onOpenMaps={() => setModal('maps')}
        onRallyAttack={() => engine.rallyAttack()}
        onRallyCollect={() => engine.rallyCollect()}
        onAdvanceWave={() => engine.advanceWave()}
      />
      {!hud.gameOver && <CameraControls engine={engine} hud={hud} onOpenPause={openPause} />}
      {modal === 'shop' && !hud.gameOver && (
        <ShopModal engine={engine} hud={hud} onClose={() => setModal('none')} />
      )}
      {modal === 'maps' && !hud.gameOver && (
        <MapsModal engine={engine} hud={hud} onClose={() => setModal('none')} />
      )}
      {modal === 'pause' && !hud.gameOver && (
        <PauseMenu engine={engine} hud={hud} onClose={() => { engine.clock.paused = false; setModal('none'); }} />
      )}
      {hud.gameOver && <GameOverOverlay engine={engine} hud={hud} />}
      {!hud.gameOver && hud.cardPanel && !hud.replaceDialog && <CardPanel engine={engine} hud={hud} />}
      {!hud.gameOver && hud.replaceDialog && <ReplaceDialog engine={engine} hud={hud} />}
    </div>
  );
}

function PauseMenu({ engine, hud, onClose }: { engine: GameEngine; hud: HudState; onClose: () => void }) {
  const [tab, setTab] = useState<'stats' | 'colonia' | 'cartas' | 'ach' | 'score' | null>(null);
  const coloniaStats = colonyStats(hud.upgrades, hud.rebirths, engine.cardMods, {
    population: hud.ants.worker + hud.ants.soldier + hud.ants.scout,
    populationMax: engine.populationMax(),
    nestHpMax: hud.nestHpMax,
  });
  const close = () => { setModalExit(); };
  const setModalExit = () => { onClose(); engine.backToMenu(); };
  const titulo = tab === 'stats' ? 'ESTATÍSTICAS' : tab === 'colonia' ? 'COLÔNIA (loja + cartas)'
    : tab === 'cartas' ? 'CARTAS DA BUILD'
    : tab === 'ach' ? 'CONQUISTAS' : 'PLACAR';
  return (
    <div className={styles.pauseOverlay}>
      <div className={styles.pausePanel}>
        <h2>{tab ? titulo : 'PAUSADO'}</h2>
        {tab === null && (
          <div className={styles.pauseBtns}>
            <button className={styles.btnPrimary} onClick={onClose}>CONTINUAR</button>
            <button className={styles.btn} onClick={() => setTab('stats')}>ESTATÍSTICAS</button>
            <button className={styles.btn} onClick={() => setTab('colonia')}>COLÔNIA</button>
            <button className={styles.btn} onClick={() => setTab('cartas')}>CARTAS ({hud.cards.length})</button>
            <button className={styles.btn} onClick={() => setTab('ach')}>CONQUISTAS</button>
            <button className={styles.btn} onClick={() => setTab('score')}>PLACAR</button>
            <button className={styles.btn} onClick={close}>SAIR PARA O MENU</button>
          </div>
        )}
        {tab === 'stats' && (
          <div className={styles.stats}>
            <span>Nível: {hud.level} · Renascimentos: {hud.rebirths}</span>
            <span>Formigas: {hud.ants.worker + hud.ants.soldier + hud.ants.scout}</span>
            <span>Recursos entregues: {hud.totals.delivered}</span>
            <span>Inimigos derrotados: {hud.totals.enemiesKilled}</span>
            <span>Chefes derrotados: {hud.totals.bossesKilled}</span>
            <span>Missões concluídas: {hud.missions.done}/{hud.missions.total}</span>
            <span>Conquistas desbloqueadas: {hud.achievements.done}/{hud.achievements.total}</span>
          </div>
        )}
        {tab === 'cartas' && (
          <div className={styles.cartasLista}>
            <p className={styles.cartasResumo}>
              🦴 Quitina: {hud.chitin} ·{' '}
              {(['especializacao', 'comportamento', 'passiva'] as const).map((cat) => (
                <span key={cat}>
                  {SLOTS[cat].nome}: {hud.slots[cat]?.usados ?? 0}/{hud.slots[cat]?.teto ?? 0}{' '}
                </span>
              ))}
            </p>
            {hud.cards.length === 0 && (
              <p className={styles.cartasVazio}>Nenhuma carta ainda — suba de nível para escolher!</p>
            )}
            {hud.cards.map((c) => (
              <div key={c.id} className={styles.cartaRow}>
                <span className={styles.cartaIcone}>{c.icone}</span>
                <span className={styles.cartaNome}>{c.nome}</span>
                <span className={styles.cartaPips}>
                  {Array.from({ length: c.nivelMax }, (_, i) => (
                    <span key={i} className={i < c.nivel ? styles.cartaPipOn : styles.cartaPipOff} />
                  ))}
                </span>
                <span
                  className={styles.cartaRar}
                  style={{ color: (RARIDADES as Record<string, { cor: string }>)[c.raridade]?.cor }}
                >
                  {c.categoria === 'evolucao' ? 'EVOLUÇÃO' : `nv ${c.nivel}/${c.nivelMax}`}
                </span>
              </div>
            ))}
          </div>
        )}
        {tab === 'colonia' && (
          <div className={styles.stats}>
            {coloniaStats.map((st) => (
              <span key={st.label}>{st.label}: <strong>{st.value}</strong></span>
            ))}
          </div>
        )}
        {tab === 'ach' && (
          <div className={styles.achList}>
            {hud.achievements.progress.map((a) => (
              <div key={a.id} className={styles.achRow}>
                <span>{a.done ? '🏆' : '🔒'} {a.title}</span>
                <span>{a.value}/{a.goal}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'score' && (
          <div className={styles.stats}>
            <span>Recursos ×5: {hud.totals.delivered} × 5 = {hud.totals.delivered * 5}</span>
            <span>Inimigos ×20: {hud.totals.enemiesKilled} × 20 = {hud.totals.enemiesKilled * 20}</span>
            <span>Chefes ×100: {hud.totals.bossesKilled} × 100 = {hud.totals.bossesKilled * 100}</span>
            <span>XP ×2: {hud.xp} × 2 = {hud.xp * 2}</span>
            <span>Conquistas ×50: {hud.achievements.done} × 50 = {hud.achievements.done * 50}</span>
            <span>Missões ×100: {hud.missions.done} × 100 = {hud.missions.done * 100}</span>
            <span>Renascimentos ×200: {hud.rebirths} × 200 = {hud.rebirths * 200}</span>
            <span><strong>PLACAR: {hud.score} pontos</strong></span>
          </div>
        )}
        {tab !== null && (
          <div className={styles.pauseBtns}>
            <button className={styles.btnPrimary} onClick={() => setTab(null)}>VOLTAR</button>
            <button className={styles.btn} onClick={close}>SAIR PARA O MENU</button>
          </div>
        )}
      </div>
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
          <span>Missões concluídas: {hud.missions.done}/{hud.missions.total}</span>
          <span>Conquistas: {hud.achievements.done}/{hud.achievements.total}</span>
          <span>Renascimentos: {hud.rebirths}</span>
          <span>PLACAR: {hud.score} pontos</span>
        </div>
        <div className={styles.gameOverBtns}>
          <button className={styles.btn} onClick={() => engine.backToMenu()}>MENU</button>
          <button className={styles.btnPrimary} onClick={() => engine.restart()}>RECOMEÇAR</button>
        </div>
      </div>
    </div>
  );
}
