/**
 * Modais do menu principal — fiéis ao original [O]:
 * OPCOES (Configuracoes), CREDITOS, PLACAR (Tm), ESTATISTICAS e CONQUISTAS.
 * Cada modal tem título com ✦/🐜, botão fechar (btn_back) e fundo escuro.
 */
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import { SCORE } from '../core/constants';
import styles from './menuModals.module.css';

export type MenuModalId = 'opcoes' | 'creditos' | 'placar' | 'estatisticas' | 'conquistas';

interface Props {
  id: MenuModalId;
  engine: GameEngine;
  hud: HudState;
  onClose: () => void;
}

export default function MenuModals({ id, engine, hud, onClose }: Props) {
  const back = engine.sprites?.btnBack ?? '';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>
          {id === 'creditos' ? '🐜 ' : '✦ '}
          {TITLES[id]}
          {id === 'creditos' ? ' 🐜' : ' ✦'}
        </h2>

        {id === 'opcoes' && <Opcoes engine={engine} />}
        {id === 'creditos' && <Creditos engine={engine} />}
        {id === 'placar' && <Placar hud={hud} />}
        {id === 'estatisticas' && <Estatisticas hud={hud} />}
        {id === 'conquistas' && <Conquistas hud={hud} />}

        <button className={styles.close} onClick={onClose} aria-label="Fechar">
          {back ? <img src={back} alt="Fechar" /> : '◀ VOLTAR'}
        </button>
      </div>
    </div>
  );
}

const TITLES: Record<MenuModalId, string> = {
  opcoes: 'Configuracoes',
  creditos: 'CREDITOS',
  placar: 'PLACAR',
  estatisticas: 'ESTATISTICAS',
  conquistas: 'CONQUISTAS',
};

// ── OPCOES ────────────────────────────────────────────────────────
function Opcoes({ engine }: { engine: GameEngine }) {
  const soundIcon = engine.audio.soundOn
    ? engine.sprites?.soundOn ?? ''
    : engine.sprites?.soundOff ?? '';

  return (
    <div className={styles.body}>
      <div className={styles.row}>
        <span>Efeitos sonoros</span>
        <button
          className={styles.soundBtn}
          onClick={() => engine.toggleMute()}
          title={engine.audio.soundOn ? 'Desativar efeitos' : 'Ativar efeitos'}
        >
          {soundIcon ? <img src={soundIcon} alt="" /> : engine.audio.soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      <button
        className={`${styles.btn} ${engine.audio.musicOn ? styles.btnGreen : styles.btnDark}`}
        onClick={() => engine.toggleMusic()}
      >
        Musica: {engine.audio.musicOn ? 'LIGADA' : 'DESLIGADA'}
      </button>

      <button className={`${styles.btn} ${styles.btnRed}`} onClick={() => engine.resetProgress()}>
        Resetar progresso
      </button>
    </div>
  );
}

// ── CREDITOS ──────────────────────────────────────────────────────
function Creditos({ engine }: { engine: GameEngine }) {
  return (
    <div className={styles.body}>
      <div className={styles.creditsBlock}>
        <strong>FORMIGUEIRO</strong>
        <p>Jogo 2D de colonia de formigas</p>
        <p>Feito para feira escolar</p>
      </div>

      <div className={styles.creditsBlock}>
        <strong>DESENVOLVIMENTO</strong>
        <p>Equipe do projeto escolar</p>
        <p>Arte: pixel art feita pela equipe</p>
        <p>Engine: HTML5 + Canvas (WebView)</p>
      </div>

      <div className={styles.creditsBlock}>
        <strong>AGRADECIMENTOS</strong>
        <p>Professores, colegas e apoiadores</p>
        <p>que ajudaram no desenvolvimento.</p>
      </div>

      <button className={`${styles.btn} ${styles.btnGreen}`} onClick={() => void engine.toggleFullscreen()}>
        TELA CHEIA
      </button>
    </div>
  );
}

// ── PLACAR (Tm) ───────────────────────────────────────────────────
function Placar({ hud }: { hud: HudState }) {
  const rows: Array<[string, number, number]> = [
    ['Recursos coletados', hud.totals.delivered, SCORE.PER_RESOURCE],
    ['Inimigos derrotados', hud.totals.enemiesKilled, SCORE.PER_ENEMY],
    ['Chefes derrotados', hud.totals.bossesKilled, SCORE.PER_BOSS],
    ['XP acumulado', hud.xp, SCORE.PER_XP],
    ['Conquistas', hud.achievements.done, SCORE.PER_ACHIEVEMENT],
    ['Missoes concluidas', hud.missions.done, SCORE.PER_MISSION],
    ['Renascer usados', hud.rebirths, SCORE.PER_REBIRTH],
  ];

  return (
    <div className={styles.body}>
      <div className={styles.placarRows}>
        {rows.map(([label, count, weight]) => (
          <div key={label} className={styles.placarRow}>
            <span>
              {label} ({count})
            </span>
            <span>
              {count} × {weight} = <strong>{count * weight}</strong>
            </span>
          </div>
        ))}
      </div>

      <div className={styles.totalBox}>
        <span>PONTUACAO TOTAL</span>
        <strong>{hud.score}</strong>
      </div>

      <p className={styles.footer}>Continue jogando para aumentar seu placar!</p>
    </div>
  );
}

// ── ESTATISTICAS ──────────────────────────────────────────────────
function Estatisticas({ hud }: { hud: HudState }) {
  const stats: Array<[string, string]> = [
    ['Nivel', String(hud.level)],
    ['Renascimentos', String(hud.rebirths)],
    ['XP total', String(hud.xp)],
    ['Recursos coletados', String(hud.totals.delivered)],
    ['Inimigos derrotados', String(hud.totals.enemiesKilled)],
    ['Chefes derrotados', String(hud.totals.bossesKilled)],
    ['Mapas explorados', String(hud.unlockedMaps.length)],
    ['Conquistas', `${hud.achievements.done}/${hud.achievements.total}`],
    ['Missoes', `${hud.missions.done}/${hud.missions.total}`],
    ['Placar', String(hud.score)],
  ];

  return (
    <div className={styles.body}>
      <div className={styles.statsGrid}>
        {stats.map(([k, v]) => (
          <div key={k} className={styles.stat}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CONQUISTAS ────────────────────────────────────────────────────
function Conquistas({ hud }: { hud: HudState }) {
  return (
    <div className={styles.body}>
      <p className={styles.progressLabel}>
        {hud.achievements.done}/{hud.achievements.total} conquistas desbloqueadas
      </p>
      <div className={styles.achList}>
        {hud.achievements.progress.map((a) => (
          <div key={a.id} className={`${styles.ach} ${a.done ? styles.achDone : ''}`}>
            <span className={styles.achIcon}>{a.done ? '🏆' : '🔒'}</span>
            <div className={styles.achText}>
              <strong>{a.title}</strong>
              <span>{a.desc}</span>
              <div className={styles.achBar}>
                <div className={styles.achFill} style={{ width: `${Math.min(100, (a.value / a.goal) * 100)}%` }} />
              </div>
            </div>
            <span className={styles.achCount}>
              {Math.min(a.value, a.goal)}/{a.goal}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
