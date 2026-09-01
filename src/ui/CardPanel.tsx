/**
 * CardPanel — painel de level-up do baralho roguelike (Fase 5A, doc 03 §6.3).
 * O mundo fica CONGELADO enquanto o jogador escolhe 1 de 3 cartas.
 * Moldura colorida por raridade; brilho dourado nas cartas sinérgicas.
 */
import { useEffect } from 'react';
import type { HudState } from '../core/types';
import { RARIDADES } from '../roguelike/cards';
import type { CartaPainel } from '../roguelike/cardPool';
import styles from './cardPanel.module.css';

interface Props {
  engine: { chooseCard(id: string): void };
  hud: HudState;
}

function LevelPips({ atual, max }: { atual: number; max: number }): React.ReactNode {
  const pips: React.ReactNode[] = [];
  for (let i = 0; i < max; i++) {
    pips.push(
      <span key={i} className={i < atual ? styles.pipOn : styles.pipOff} />,
    );
  }
  return <span className={styles.pips}>{pips}</span>;
}

function Card({ choice, index, onChoose }: {
  choice: CartaPainel;
  index: number;
  onChoose(id: string): void;
}): React.ReactNode {
  const r = RARIDADES[choice.raridade];
  const sinergia = choice.tipo === 'carta' && choice.sinergia;
  const substitui = choice.tipo === 'carta' && choice.requerSubstituicao;
  return (
    <button
      type="button"
      className={`${styles.card} ${sinergia ? styles.sinergia : ''}`}
      style={{ borderColor: r.cor }}
      onClick={() => onChoose(choice.id)}
      aria-label={`${choice.nome}: ${choice.desc}`}
    >
      <span
        className={styles.raridadeTag}
        style={{ color: r.cor, borderColor: r.cor }}
      >
        {r.nome}
      </span>
      {sinergia && <span className={styles.sinergiaTag}>✦ SINERGIA</span>}
      {substitui && <span className={styles.substituiTag}>♻ TROCA</span>}
      {choice.tipo === 'carta' && choice.evolucao && (
        <span className={styles.evoTag}>✨ EVOLUÇÃO</span>
      )}
      <span className={styles.icone}>{choice.icone}</span>
      <span className={styles.nome}>{choice.nome}</span>
      {choice.tipo === 'carta' ? (
        <LevelPips atual={choice.nivelAtual} max={choice.nivelMax} />
      ) : (
        <span className={styles.pips} />
      )}
      <span className={styles.desc}>{choice.desc}</span>
      {choice.tipo === 'carta' && (
        <span className={styles.eixo}>eixo: {choice.eixoNome}</span>
      )}
      <span className={styles.tecla}>{index + 1}</span>
    </button>
  );
}

export default function CardPanel({ engine, hud }: Props): React.ReactNode {
  const panel = hud.cardPanel;
  const choices = panel?.choices ?? [];

  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= choices.length) {
        const c = choices[n - 1];
        if (c) engine.chooseCard(c.id);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [engine, choices]);

  if (!panel) return null;

  const titulo =
    panel.origem === 'bau_lendario' ? '✨ BAÚ LENDÁRIO!'
      : panel.origem === 'bau_chefe' ? '🏆 BAÚ DO CHEFE!'
      : panel.origem === 'bau_comum' ? '🎁 BAÚ ENCONTRADO!'
      : `⭐ NÍVEL ${panel.level}!`;
  const sub =
    panel.origem === 'bau_lendario' ? 'O 2º chefe deixou algo especial'
      : panel.origem === 'bau_chefe' ? 'Escolha uma de cinco recompensas'
      : panel.origem === 'bau_comum' ? 'A exploradora achou um tesouro'
      : 'A colônia cresceu — escolha uma recompensa';

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h2 className={styles.titulo}>{titulo}</h2>
        <p className={styles.subtitulo}>{sub}</p>
        <div className={styles.cartas}>
          {choices.map((c, i) => (
            <Card key={c.id} choice={c} index={i} onChoose={(id) => engine.chooseCard(id)} />
          ))}
        </div>
        <p className={styles.rodape}>O mundo está congelado · teclas 1–{choices.length}</p>
      </div>
    </div>
  );
}
