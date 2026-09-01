/**
 * ReplaceDialog — slot cheio (doc 03 §6): ao escolher carta nova de categoria
 * lotada, o jogador substitui uma existente (reembolso de 50% em XP) ou recusa.
 */
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import styles from './cardPanel.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

export default function ReplaceDialog({ engine, hud }: Props): React.ReactNode {
  const dialog = hud.replaceDialog;
  if (!dialog) return null;
  const nova = hud.cards.find((c) => c.id === dialog.novaId);

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h2 className={styles.titulo}>♻️ SLOT CHEIO</h2>
        <p className={styles.subtitulo}>
          {nova ? `${nova.icone} ${nova.nome} precisa do slot — substituir qual?` : 'Substituir qual carta?'}
        </p>
        <div className={styles.cartas}>
          {dialog.opcoes.map((op) => (
            <button
              key={op.id}
              type="button"
              className={styles.card}
              style={{ borderColor: '#d94a3b' }}
              onClick={() => engine.chooseReplace(op.id)}
            >
              <span className={styles.icone}>{op.icone}</span>
              <span className={styles.nome}>{op.nome}</span>
              <span className={styles.desc}>
                nível {op.nivel}/{op.nivelMax} · devolve XP
              </span>
              <span className={styles.tecla}>♻️</span>
            </button>
          ))}
        </div>
        <p className={styles.rodape}>
          <button
            type="button"
            className={styles.recusar}
            onClick={() => engine.refuseReplace()}
          >
            RECUSAR A CARTA NOVA
          </button>
        </p>
      </div>
    </div>
  );
}
