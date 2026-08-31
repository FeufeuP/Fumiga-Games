/**
 * App — roteador de telas. O motor é singleton; a UI só lê a store
 * (useSyncExternalStore) e chama métodos públicos do motor.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { GameEngine } from './engine/GameEngine';
import MainMenu from './ui/MainMenu';
import GameScreen from './ui/GameScreen';
import InteriorScreen from './ui/InteriorScreen';

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new GameEngine();
  }
  const engine = engineRef.current;

  const hud = useSyncExternalStore(engine.store.subscribe, engine.store.getSnapshot);

  useEffect(() => {
    // save de segurança ao fechar
    return () => {
      engine.detach();
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
