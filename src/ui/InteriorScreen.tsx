/**
 * Interior do formigueiro — redesenho 0.3.2 (16-bit):
 * corte transversal de um formigueiro de verdade — SAÍDA no topo,
 * túnel central descendo até a SALA DA RAINHA na base e câmaras
 * laterais espalhadas de forma orgânica (layout determinístico por
 * seed, mas "desorganizado" como num ninho real).
 * CARTAS, CLASSES e CONQUISTAS agora vivem AQUI (saíram do menu de pausa).
 */
import { useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import { ANTS, MAPS, QUEEN, RESOURCES, type MapId, type ResourceKind } from '../core/constants';
import { Rng } from '../core/rng';
import { RARIDADES, SLOTS } from '../roguelike/cards';
import styles from './interior.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

const FOOD_ORDER: ResourceKind[] = ['leaf', 'mushroom', 'cactus', 'banana', 'flower', 'crystal'];
const ALL_MAPS: MapId[] = ['campo', 'pantano', 'deserto', 'montanha', 'caverna', 'selva'];

type RoomId = 'cemetery' | 'achievements' | 'missions' | 'ants' | 'map' | 'upgrades'
  | 'inventory' | 'rebirth' | 'cards' | 'classes' | null;

interface RoomDef {
  id: Exclude<RoomId, null>;
  label: string;
  icon: string;
}

/** as 10 câmaras do ninho (conquistas/cartas/classes incluídas) */
const ROOMS: RoomDef[] = [
  { id: 'cemetery', label: 'CEMITÉRIO', icon: '⚰️' },
  { id: 'achievements', label: 'CONQUISTAS', icon: '🏆' },
  { id: 'missions', label: 'MISSÕES', icon: '📜' },
  { id: 'ants', label: 'FORMIGAS', icon: '🐜' },
  { id: 'map', label: 'MAPA', icon: '🗺️' },
  { id: 'upgrades', label: 'MELHORIAS', icon: '⚙️' },
  { id: 'inventory', label: 'INVENTÁRIO', icon: '🎒' },
  { id: 'rebirth', label: 'RENASCER', icon: '🔄' },
  { id: 'cards', label: 'CARTAS', icon: '🃏' },
  { id: 'classes', label: 'CLASSES', icon: '🦴' },
];

/**
 * Distribuição "desorganizada" das câmaras ao longo do túnel central:
 * embaralhamento com seed fixa (Rng mulberry32) — orgânico, porém estável
 * entre renders/sessions, como manda a regra #3 de engenharia.
 * 5 faixas de profundidade × 2 lados, com jitter vertical e galerias
 * de comprimento variável.
 */
const LAYOUT: Array<{ room: RoomDef; side: 'L' | 'R'; y: number; off: number }> = (() => {
  const rng = new Rng(0x5eed);
  const pool = [...ROOMS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const rows = [0.2, 0.32, 0.44, 0.56, 0.68];
  return pool.map((room, i) => ({
    room,
    side: i % 2 === 0 ? ('L' as const) : ('R' as const),
    y: rows[Math.floor(i / 2)] + rng.float(-0.022, 0.022),
    off: rng.int(10, 34),
  }));
})();

const CLASSES_DEFS = [
  {
    id: 'defensora',
    nome: 'Defensora',
    icone: '🛡️',
    cost: 3,
    desc: 'Soldados guardam anel de defesa a 150px do ninho e absorvem mais dano.',
  },
  {
    id: 'toxica',
    nome: 'Tóxica',
    icone: '🧪',
    cost: 6,
    desc: 'Soldados cospem ácido a 180px com corrosão contínua nos inimigos.',
  },
  {
    id: 'gigante',
    nome: 'Gigante',
    icone: '🗿',
    cost: 10,
    desc: 'Soldados crescem 45%, ganham +40 HP, +5 dano e empurram inimigos ao atacar.',
  },
] as const;

export default function InteriorScreen({ engine, hud }: Props) {
  const wood = engine.sprites?.woodTile ?? '';
  const back = engine.sprites?.btnBack ?? '';
  const heroAnt = engine.sprites?.heroAntUrl ?? '';
  const [room, setRoom] = useState<RoomId>(null);
  const [shopTab, setShopTab] = useState('coleta');

  const hungerPct = (hud.queenHunger / hud.queenHungerMax) * 100;
  const cemetery = engine.respawnQueue;

  return (
    <div className={styles.screen} style={{ backgroundImage: wood ? `url(${wood})` : undefined }}>
      {/* saída no topo do túnel */}
      <button className={styles.exitBtn} onClick={() => engine.exitInterior()} aria-label="Sair do formigueiro">
        {back && <img src={back} alt="Saída" />}
        <span>SAÍDA</span>
      </button>

      {/* túnel central até a sala da rainha */}
      <div className={styles.tunnel} />

      {/* câmaras laterais espalhadas (formigueiro real) */}
      {LAYOUT.map(({ room: r, side, y, off }) => {
        const chamber = (
          <button className={styles.chamber} onClick={() => setRoom(r.id)}>
            <span className={styles.chamberIcon}>{r.icon}</span>
            <span className={styles.chamberLabel}>{r.label}</span>
          </button>
        );
        const connector = <span className={styles.connector} style={{ width: off }} />;
        return (
          <div
            key={r.id}
            className={side === 'L' ? styles.galleyLeft : styles.galleyRight}
            style={{ top: `${(y * 100).toFixed(2)}%` }}
          >
            {side === 'L' ? <>{chamber}{connector}</> : <>{connector}{chamber}</>}
          </div>
        );
      })}

      {/* sala da rainha na base do túnel */}
      <div className={styles.queenRoom}>
        <h2 className={styles.title}>👑 SALA DA RAINHA</h2>
        <div className={styles.queenRow}>
          {heroAnt && <img className={styles.queen} src={heroAnt} alt="Rainha" />}
          {!heroAnt && <div className={styles.queenEmoji}>🐜</div>}
          <div className={styles.hungerWrap}>
            <span className={styles.label}>
              👑 FOME {Math.ceil(hud.queenHunger)}/{hud.queenHungerMax}
            </span>
            <div className={styles.bar}>
              <div
                className={styles.fill}
                style={{
                  width: `${hungerPct}%`,
                  background: hungerPct < 30 ? 'var(--c-vermelho)' : 'var(--c-verde)',
                }}
              />
            </div>
            <span className={styles.hint}>
              Ela come 1 item a cada {Math.round(QUEEN.FEED_INTERVAL_SEC)}s —
              mantenha comida no estoque!
            </span>
          </div>
        </div>
        <div className={styles.stock}>
          {FOOD_ORDER.map((k) => (
            <span key={k} className={styles.stockItem}>
              {RESOURCES[k].icon} {hud.resources[k] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* painel da câmara escolhida */}
      {room && (
        <div className={styles.overlay} onClick={() => setRoom(null)}>
          <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <header className={styles.panelHeader}>
              <h3>{ROOMS.find((r) => r.id === room)?.label}</h3>
              <button className={styles.closeBtn} onClick={() => setRoom(null)}>✕</button>
            </header>
            <div className={styles.panelBody}>
              {room === 'cemetery' && (
                cemetery.length === 0 ? (
                  <p className={styles.hint}>Nenhuma formiga no cemitério.</p>
                ) : (
                  <>
                    <p className={styles.hint}>
                      {cemetery.length} formiga(s) renascendo — ao renascer, ela
                      sai daqui e caminha até a saída.
                    </p>
                    {(['worker', 'soldier', 'scout'] as const).map((cls) => {
                      const q = cemetery.filter((c) => c.cls === cls);
                      if (q.length === 0) return null;
                      const min = Math.min(...q.map((c) => c.t));
                      return (
                        <div key={cls} className={styles.cemeteryRow}>
                          <span>{ANTS[cls].icon} {ANTS[cls].name} ×{q.length}</span>
                          <span>prox. {Math.ceil(min)}s</span>
                        </div>
                      );
                    })}
                  </>
                )
              )}

              {room === 'missions' && (
                <div className={styles.list}>
                  {hud.missions.progress.map((m) => (
                    <div key={m.id} className={`${styles.listItem} ${m.done ? styles.done : ''}`}>
                      <div className={styles.listTop}>
                        <span className={styles.listTitle}>{m.done ? '✅' : '📜'} {m.title}</span>
                        <span className={styles.listXp}>+{m.rewardXp} XP</span>
                      </div>
                      <p className={styles.hint}>{m.desc}</p>
                      <div className={styles.bar}>
                        <div className={styles.fill} style={{ width: `${(m.value / m.goal) * 100}%` }} />
                      </div>
                      <span className={styles.listCount}>{m.value}/{m.goal}</span>
                    </div>
                  ))}
                </div>
              )}

              {room === 'achievements' && (
                <div className={styles.list}>
                  {hud.achievements.progress.map((a) => (
                    <div key={a.id} className={`${styles.listItem} ${a.done ? styles.done : ''}`}>
                      <div className={styles.listTop}>
                        <span className={styles.listTitle}>{a.done ? '🏆' : '🔒'} {a.title}</span>
                      </div>
                      <p className={styles.hint}>{a.desc}</p>
                      <div className={styles.bar}>
                        <div className={styles.fill} style={{ width: `${(a.value / a.goal) * 100}%` }} />
                      </div>
                      <span className={styles.listCount}>{a.value}/{a.goal}</span>
                    </div>
                  ))}
                </div>
              )}

              {room === 'ants' && (
                <div className={styles.antsGrid}>
                  {(['worker', 'soldier', 'scout'] as const).map((cls) => (
                    <div key={cls} className={styles.antsCard}>
                      <span className={styles.chamberIcon}>{ANTS[cls].icon}</span>
                      <span className={styles.listTitle}>{ANTS[cls].name}</span>
                      <span className={styles.big}>{hud.ants[cls]}</span>
                      <p className={styles.hint}>{ANTS[cls].desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {room === 'map' && (
                <div className={styles.mapGrid}>
                  {ALL_MAPS.map((id) => {
                    const m = MAPS[id];
                    const unlocked = hud.unlockedMaps.includes(id);
                    const current = hud.mapId === id;
                    return (
                      <button
                        key={id}
                        className={`${styles.mapCard} ${unlocked ? '' : styles.locked}`}
                        disabled={!unlocked || current}
                        onClick={() => { engine.selectMap(id); setRoom(null); }}
                      >
                        <span className={styles.chamberIcon}>{unlocked ? m.icon : '🔒'}</span>
                        <span>{m.name}</span>
                        {current && <span className={styles.currentTag}>VOCÊ ESTÁ AQUI</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {room === 'upgrades' && (
                <>
                  <div className={styles.tabs}>
                    {['coleta', 'ataque', 'defesa', 'niveis'].map((t) => (
                      <button
                        key={t}
                        className={`${styles.tab} ${shopTab === t ? styles.tabActive : ''}`}
                        onClick={() => setShopTab(t)}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className={styles.list}>
                    {Object.entries(hud.shopCosts)
                      .filter(([id]) => {
                        const cats: Array<Record<string, string>> = [
                          { antlimit: 'coleta', scout: 'coleta', speed: 'coleta', capacity: 'coleta', vision: 'coleta', luck: 'coleta' },
                          { soldier: 'ataque', strength: 'ataque', attackspeed: 'ataque', crit: 'ataque', critdmg: 'ataque' },
                          { armor: 'defesa', hpboost: 'defesa', heal: 'defesa', respawn: 'defesa', nesthp: 'defesa' },
                          { xpboost: 'niveis' },
                        ];
                        return cats.some((c) => c[id] === shopTab);
                      })
                      .map(([id, cost]) => {
                        const name = UPGRADE_NAMES[id] ?? id;
                        const bought = hud.upgrades[id] ?? 0;
                        return (
                          <button
                            key={id}
                            className={styles.buyRow}
                            disabled={cost.maxed || (
                              cost.multi
                                ? cost.multi.some((c) => (hud.resources[c.kind] ?? 0) < c.amount)
                                : (hud.resources[cost.kind] ?? 0) < cost.amount
                            )}
                            onClick={() => engine.buyUpgrade(id)}
                          >
                            <span className={styles.listTitle}>{name}{bought > 0 ? ` · ${bought}` : ''}</span>
                            <span className={styles.listXp}>
                              {cost.maxed
                                ? 'MÁX'
                                : cost.multi
                                  ? cost.multi.map((c) => `${RESOURCES[c.kind].icon}${c.amount}`).join(' ')
                                  : `${RESOURCES[cost.kind].icon} ${cost.amount}`}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </>
              )}

              {room === 'inventory' && (
                <>
                  <div className={styles.invGrid}>
                    {FOOD_ORDER.map((k) => (
                      <div key={k} className={styles.invCard}>
                        <span className={styles.chamberIcon}>{RESOURCES[k].icon}</span>
                        <span className={styles.big}>{hud.resources[k] ?? 0}</span>
                        <span className={styles.hint}>{RESOURCES[k].name}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.cemeteryRow}>
                    <span>🐜 Formigas</span>
                    <span>{hud.ants.worker + hud.ants.soldier + hud.ants.scout}</span>
                  </div>
                </>
              )}

              {room === 'rebirth' && (
                <>
                  <div className={styles.cemeteryRow}>
                    <span>🔄 RENASCIMENTO</span>
                    <span>{hud.rebirths} vez(es)</span>
                  </div>
                  <p className={styles.hint}>
                    Renascer zera recursos, melhorias e missões — mas concede
                    bônus permanentes: +12% velocidade, +12% visão, +1 carga,
                    +10% dano, +15% vida e +20% XP por renascimento.
                    Conquistas e totais são mantidos.
                  </p>
                  <div className={styles.cemeteryRow}>
                    <span>PLACAR</span>
                    <span>{hud.score} pontos</span>
                  </div>
                  <button className={styles.rebirthBtn} onClick={() => { engine.rebirth(); setRoom(null); }}>
                    RENASCER AGORA
                  </button>
                </>
              )}

              {room === 'cards' && (
                <div className={styles.cardsList}>
                  <p className={styles.cardsSummary}>
                    🦴 Quitina: {hud.chitin} ·{' '}
                    {(['especializacao', 'comportamento', 'passiva'] as const).map((cat) => (
                      <span key={cat}>
                        {SLOTS[cat].nome}: {hud.slots[cat]?.usados ?? 0}/{hud.slots[cat]?.teto ?? 0}{' '}
                      </span>
                    ))}
                  </p>
                  {hud.cards.length === 0 && (
                    <p className={styles.hint}>Nenhuma carta ainda — suba de nível para escolher!</p>
                  )}
                  {hud.cards.map((c) => (
                    <div key={c.id} className={styles.cardRow}>
                      <span className={styles.cardIcon}>{c.icone}</span>
                      <span className={styles.cardName}>{c.nome}</span>
                      <span className={styles.pips}>
                        {Array.from({ length: c.nivelMax }, (_, i) => (
                          <span key={i} className={i < c.nivel ? styles.pipOn : styles.pip} />
                        ))}
                      </span>
                      <span
                        className={styles.cardRar}
                        style={{ color: (RARIDADES as Record<string, { cor: string }>)[c.raridade]?.cor }}
                      >
                        {c.categoria === 'evolucao' ? 'EVOLUÇÃO' : `nv ${c.nivel}/${c.nivelMax}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {room === 'classes' && (
                <div className={styles.cardsList}>
                  <p className={styles.cardsSummary}>
                    🦴 Quitina disponível: <strong>{hud.chitin}</strong>
                  </p>
                  {CLASSES_DEFS.map((cls) => {
                    const unlocked = hud.unlockedClasses?.includes(cls.id);
                    return (
                      <div key={cls.id} className={styles.classRow}>
                        <span className={styles.cardIcon}>{cls.icone}</span>
                        <div className={styles.classInfo}>
                          <strong className={styles.className}>{cls.nome}</strong>
                          <span className={styles.classDesc}>{cls.desc}</span>
                        </div>
                        {unlocked ? (
                          <span className={styles.classActive}>✓ ATIVA</span>
                        ) : (
                          <button
                            className={styles.classBtn}
                            disabled={hud.chitin < cls.cost}
                            onClick={() => engine.unlockClass(cls.id)}
                          >
                            LIBERAR (🦴 {cls.cost})
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const UPGRADE_NAMES: Record<string, string> = {
  antlimit: '+5 Operárias', soldier: '+5 Soldados', scout: '+5 Exploradoras',
  speed: '+10% Velocidade', capacity: '+1 Carga', vision: '+15% Visão', luck: 'Sorte',
  strength: '+10% Força', attackspeed: '+15% Ataque', crit: '+10% Crítico', critdmg: '+50% Crítico',
  armor: '−10% Dano', hpboost: '+15% Vida', heal: 'Regeneração', respawn: 'Renascer Rápido',
  xpboost: '+1 XP', nesthp: '+100 Vida do Formigueiro',
};
