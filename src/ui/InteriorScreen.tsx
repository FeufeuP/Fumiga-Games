/**
 * Interior do formigueiro — spec 1.0 (doc 10_DESIGN_INTERIOR_FORMIGUEIRO.md).
 *
 * Corte transversal de um ninho real:
 *  · SUPERFÍCIE (grama + monte de terra) com a SAÍDA no topo;
 *  · EIXO CENTRAL serpenteante (SVG) descendo até a SALA DA RAINHA na base;
 *  · 10 CÂMARAS em profundidades variadas (bandas semânticas), lados
 *    alternados, offsets horizontais e curvaturas de galeria sorteados por
 *    seed fixa (Rng 0x5eed) — desorganizado como um ninho de verdade,
 *    porém idêntico entre sessões (regra #3 de engenharia).
 *
 * Topologia: 12 nós (1 saída + 10 câmaras + 1 sala real) e 11 túneis
 * (1 eixo central + 10 galerias bezier).
 */
import { useEffect, useMemo, useState } from 'react';
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

/** banda de profundidade (frac 0..1 na zona útil) + lado — doc 10, §3 */
interface ChamberSpec {
  id: Exclude<RoomId, null>;
  label: string;
  icon: string;
  side: 'L' | 'R';
  frac: number;
}

const CHAMBERS: ChamberSpec[] = [
  { id: 'cemetery', label: 'CEMITÉRIO', icon: '⚰️', side: 'L', frac: 0.06 },
  { id: 'map', label: 'MAPA', icon: '🗺️', side: 'R', frac: 0.17 },
  { id: 'missions', label: 'MISSÕES', icon: '📜', side: 'L', frac: 0.28 },
  { id: 'ants', label: 'FORMIGAS', icon: '🐜', side: 'R', frac: 0.39 },
  { id: 'inventory', label: 'INVENTÁRIO', icon: '🎒', side: 'L', frac: 0.5 },
  { id: 'upgrades', label: 'MELHORIAS', icon: '⚙️', side: 'R', frac: 0.61 },
  { id: 'achievements', label: 'CONQUISTAS', icon: '🏆', side: 'L', frac: 0.71 },
  { id: 'cards', label: 'CARTAS', icon: '🃏', side: 'R', frac: 0.81 },
  { id: 'classes', label: 'CLASSES', icon: '🦴', side: 'L', frac: 0.91 },
  { id: 'rebirth', label: 'RENASCER', icon: '🔄', side: 'R', frac: 0.99 },
];

/**
 * Câmara escavada orgânica (doc 10 §8, rev 1.1): blob irregular por harmonias
 * de raio (2f/3f/5f) com fases sorteadas, achatado verticalmente, com a
 * "boca" afundada no lado voltado ao eixo — por onde a galeria chega.
 */
function cavePaths(rng: Rng, side: 'L' | 'R'): { cave: string; floor: string; tipInset: number } {
  const cx = 60;
  const cy = 48;
  const base = 40;
  const a1 = rng.float(0.05, 0.13);
  const a2 = rng.float(0.04, 0.1);
  const a3 = rng.float(0.03, 0.07);
  const p1 = rng.float(0, Math.PI * 2);
  const p2 = rng.float(0, Math.PI * 2);
  const p3 = rng.float(0, Math.PI * 2);
  const mouth = side === 'L' ? 0 : Math.PI; // boca voltada para o eixo central
  const N = 26;
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    let r = base * (1 + a1 * Math.sin(2 * t + p1) + a2 * Math.sin(3 * t + p2) + a3 * Math.sin(5 * t + p3));
    const d = Math.abs(((t - mouth + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (d < 0.7) r *= 0.68 + 0.14 * (d / 0.7); // afunda a boca na direção do túnel
    const x = Math.round(cx + r * Math.cos(t));
    const y = Math.round(cy + r * 0.82 * Math.sin(t));
    pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  const cave = `${pts.join(' ')} Z`;
  const floor = `M ${cx - 26} ${cy + 18} Q ${cx} ${cy + 30}, ${cx + 26} ${cy + 18} L ${cx + 22} ${cy + 12} Q ${cx} ${cy + 22}, ${cx - 22} ${cy + 12} Z`;
  // ponta da boca (t = mouth, mesmo cálculo do contorno): é AQUI que a
  // galeria deve terminar — na silhueta, sem sobrepor a câmara (rev 1.2)
  const r0 = base * (1 + a1 * Math.sin(p1) + a2 * Math.sin(p2) + a3 * Math.sin(p3)) * 0.68;
  const tipX = cx + (side === 'L' ? r0 : -r0);
  const tipInset = side === 'L' ? 120 - tipX : tipX; // recuo da boca a partir da borda da caixa
  return { cave, floor, tipInset };
}

/** geometria gerada por seed (doc 10, §5); depende de vw p/ converter o
 *  recuo da boca (unidades da caixa 120) em % da tela */
interface ChamberLayout {
  spec: ChamberSpec;
  /** top em % da tela: 11% + frac × 56% (+ jitter) */
  y: number;
  /** afastamento horizontal do eixo, em % da largura */
  x: number;
  /** path SVG da galeria (borda e miolo usam o mesmo path) */
  gallery: string;
  /** contorno orgânico da câmara escavada (viewBox 120×96) */
  cave: string;
  /** arco de piso de terra dentro da câmara */
  floor: string;
}

function buildLayout(vw: number): ChamberLayout[] {
  const rng = new Rng(0x5eed);
  const caveRng = new Rng(0xcafe); // stream separado p/ preservar o layout 1.0 auditado
  const cwPx = Math.min(140, Math.max(112, vw * 0.16)); // espelha o clamp() do CSS .cave
  const cwPct = (cwPx / vw) * 100;
  return CHAMBERS.map((spec) => {
    const s = spec.side === 'R' ? 1 : -1;
    const x = rng.float(8, 22); // offset horizontal (doc §4)
    const y = 11 + spec.frac * 56 + rng.float(-1.2, 1.2); // profundidade + jitter
    const { cave, floor, tipInset } = cavePaths(caveRng, spec.side);
    const insetPct = (tipInset / 120) * cwPct;
    // galeria: do eixo central até a PONTA DA BOCA da câmara (rev 1.2) —
    // termina a um raio-de-cap da silhueta: o cap arredondado encosta na
    // boca sem cruzar a borda da câmara, em qualquer largura de tela
    const capUn = 13 / (vw / 100); // raio do traço (26px) em unidades-%
    const reach = x + insetPct - capUn - 0.15;
    const sx = 50 + s * 3.6;
    const ex = 50 + s * reach;
    const c1x = 50 + s * (3.6 + (reach - 3.6) * 0.35);
    const c2x = 50 + s * (3.6 + (reach - 3.6) * 0.8);
    const c1y = y + rng.float(-3, 3);
    const c2y = y + rng.float(-3, 3);
    const gallery = `M ${sx.toFixed(2)} ${y.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${ex.toFixed(2)} ${y.toFixed(2)}`;
    return { spec, y, x, gallery, cave, floor };
  });
}

/** eixo central serpenteante: da boca (y=9) à Sala da Rainha (y=74), x=50±4 — doc §6 */
const SHAFT = 'M 50 9 C 46 22, 54 36, 50 50 C 46 61, 54 68, 50 74';

/** camada de túneis: cada traço é desenhado 2× (borda + miolo);
 *  galerias terminam na ponta da boca com cap arredondado (rev 1.2) */
function NestTunnels({ layout }: { layout: ChamberLayout[] }) {
  return (
    <svg className={styles.svgLayer} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {/* galerias (por baixo do eixo e das câmaras) */}
      {layout.map(({ spec, gallery }) => (
        <g key={spec.id}>
          <path d={gallery} fill="none" stroke="#8b562d" strokeWidth={26} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={gallery} fill="none" stroke="#241109" strokeWidth={18} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      {/* eixo central */}
      <path d={SHAFT} fill="none" stroke="#8b562d" strokeWidth={76} strokeLinecap="square" vectorEffect="non-scaling-stroke" />
      <path d={SHAFT} fill="none" stroke="#2a170d" strokeWidth={64} strokeLinecap="square" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

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

  // o recuo da boca depende da largura da câmara em % da tela → rebuild no resize
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const layout = useMemo(() => buildLayout(vw), [vw]);

  const hungerPct = (hud.queenHunger / hud.queenHungerMax) * 100;
  const cemetery = engine.respawnQueue;

  return (
    <div className={styles.screen} style={{ backgroundImage: wood ? `url(${wood})` : undefined }}>
      {/* túneis: eixo central + galerias (doc §6) */}
      <NestTunnels layout={layout} />

      {/* superfície: grama + monte + boca + saída (doc §7) */}
      <div className={styles.surface}>
        <div className={styles.mound} />
        <div className={styles.mouth} />
        <button className={styles.exitBtn} onClick={() => engine.exitInterior()} aria-label="Sair do formigueiro">
          {back && <img src={back} alt="Saída" />}
          <span>SAÍDA</span>
        </button>
      </div>

      {/* câmaras escavadas em profundidades variadas (doc §3–5, rev 1.1) */}
      {layout.map(({ spec, x, y, cave, floor }) => (
        <button
          key={spec.id}
          className={styles.cave}
          style={{
            top: `${y.toFixed(2)}%`,
            ...(spec.side === 'R'
              ? { left: `calc(50% + ${x.toFixed(2)}%)` }
              : { right: `calc(50% + ${x.toFixed(2)}%)` }),
          }}
          onClick={() => setRoom(spec.id)}
        >
          <svg className={styles.caveArt} viewBox="0 0 120 96" aria-hidden="true">
            {/* borda externa escura + aro de terra + cavidade escavada + piso */}
            <path d={cave} className={styles.caveEdge} />
            <path d={cave} className={styles.caveRim} />
            <path d={cave} className={styles.caveHole} />
            <path d={floor} className={styles.caveFloor} />
          </svg>
          <span className={styles.caveContent}>
            <span className={styles.chamberIcon}>{spec.icon}</span>
            <span className={styles.chamberLabel}>{spec.label}</span>
          </span>
        </button>
      ))}

      {/* sala da rainha na base do eixo */}
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
              <h3>{CHAMBERS.find((c) => c.id === room)?.label}</h3>
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
