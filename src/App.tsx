/**
 * App — roteador de telas. O motor é singleton assíncrono (carrega os
 * sprites originais antes do menu); a UI só lê a store
 * (useSyncExternalStore) e chama métodos públicos do motor.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { GameEngine } from './engine/GameEngine';
import MainMenu from './ui/MainMenu';
import GameScreen from './ui/GameScreen';
import InteriorScreen from './ui/InteriorScreen';

export default function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    let cancelled = false;
    void GameEngine.create().then((e) => {
      if (cancelled) {
        e.detach();
        return;
      }
      engineRef.current = e;
      setEngine(e);
    });
    return () => {
      cancelled = true;
      engineRef.current?.detach();
      engineRef.current = null;
    };
  }, []);

  if (!engine) return <LoadingScreen />;
  return <Screens engine={engine} />;
}

function Screens({ engine }: { engine: GameEngine }) {
  const hud = useSyncExternalStore(engine.store.subscribe, engine.store.getSnapshot);

  useEffect(() => () => engine.detach(), [engine]);

  // [O Or] música começa no primeiro gesto do usuário (política de autoplay)
  useEffect(() => {
    const gesture = () => engine.audio.ensureMusic();
    window.addEventListener('pointerdown', gesture);
    window.addEventListener('keydown', gesture);
    return () => {
      window.removeEventListener('pointerdown', gesture);
      window.removeEventListener('keydown', gesture);
    };
  }, [engine]);

  return (
    <>
      {hud.screen === 'menu' && <MainMenu engine={engine} hud={hud} />}
      {hud.screen === 'game' && <GameScreen engine={engine} hud={hud} />}
      {hud.screen === 'interior' && (
        <>
          <GameScreen engine={engine} hud={hud} />
          <InteriorScreen engine={engine} hud={hud} />
        </>
      )}
    </>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center',
        background: '#14120f',
        color: '#f5e6c8',
        fontFamily: 'var(--font-pixel)',
        fontWeight: 700,
        letterSpacing: 2,
      }}
    >
      <div style={{ fontSize: 40 }}>🐜</div>
      <div style={{ fontSize: 20 }}>CARREGANDO FORMIGUEIRO…</div>
    </div>
  );
}
