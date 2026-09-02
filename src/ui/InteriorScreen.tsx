/**
 * Interior do formigueiro — rev 2.0 (doc 10): estrutura TRANSCRITA de uma
 * imagem de referência real de corte de ninho em terra (segmentação por
 * contraste local + componentes conexos, calibração manual):
 *  · eixo central SERPENTEANTE (deriva à esquerda no meio, volta ao centro);
 *  · 10 câmaras nas posições/proporções da referência (tamanhos variados);
 *  · galerias saem do eixo e terminam exatamente na boca de cada câmara
 *    (rev 1.2), com curvatura orgânica seedada (Rng 0x5eed);
 *  · silhuetas escavadas únicas por harmônicos (stream Rng 0xcafe).
 * Semântica preservada: logística rasa (perto da saída) → meta profunda
 * (perto da Rainha). Sala da Rainha na base do eixo.
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

/**
 * ESTRUTURA REAL — rev 2.0 (doc 10 §3): posições transcritas da imagem de
 * referência (corte de ninho em terra), extraídas por segmentação
 * (contraste local δ=18 + componentes conexos) e calibradas à mão.
 * cx/cy normalizados [0..1] da tela; s = escala do tamanho da câmara.
 */
interface ChamberSpec {
  id: Exclude<RoomId, null>;
  label: string;
  icon: string;
  /** centro horizontal (0..1) */
  cx: number;
  /** profundidade (0..1) */
  cy: number;
  /** escala de tamanho relativa */
  s: number;
}

/** semântica de profundidade preservada: logística rasa → meta profunda */
const CHAMBERS: ChamberSpec[] = [
  { id: 'cemetery', label: 'CEMITÉRIO', icon: '⚰️', cx: 0.3, cy: 0.22, s: 0.9 },
  { id: 'map', label: 'MAPA', icon: '🗺️', cx: 0.83, cy: 0.28, s: 0.85 },
  { id: 'missions', label: 'MISSÕES', icon: '📜', cx: 0.2, cy: 0.34, s: 1.1 },
  { id: 'ants', label: 'FORMIGAS', icon: '🐜', cx: 0.88, cy: 0.35, s: 0.85 },
  { id: 'inventory', label: 'INVENTÁRIO', icon: '🎒', cx: 0.63, cy: 0.42, s: 1.0 },
  { id: 'upgrades', label: 'MELHORIAS', icon: '⚙️', cx: 0.42, cy: 0.52, s: 1.3 },
  { id: 'achievements', label: 'CONQUISTAS', icon: '🏆', cx: 0.3, cy: 0.62, s: 1.05 },
  { id: 'cards', label: 'CARTAS', icon: '🃏', cx: 0.16, cy: 0.7, s: 0.95 },
  { id: 'classes', label: 'CLASSES', icon: '🦴', cx: 0.68, cy: 0.72, s: 1.0 },
  { id: 'rebirth', label: 'RENASCER', icon: '🔄', cx: 0.86, cy: 0.75, s: 0.9 },
];

/**
 * Eixo serpenteante da referência (doc 10 §6, rev 2.0): desce da boca
 * (centro do topo), deriva à esquerda no meio e volta ao centro na base.
 */
const SHAFT_PTS: Array<[number, number]> = [
  [0.5, 0.09], [0.47, 0.2], [0.42, 0.3], [0.38, 0.4],
  [0.42, 0.5], [0.46, 0.62], [0.43, 0.74], [0.46, 0.86],
];

/** Catmull-Rom → bezier: polilinha em curva suave (coordenadas em % da tela) */
function smoothPath(pts: Array<[number, number]>): string {
  const f = (v: number) => (v * 100).toFixed(2);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

const SHAFT = smoothPath(SHAFT_PTS);

/** x do eixo (0..1) numa profundidade y — interpolação linear da polilinha */
function shaftXAt(y: number): number {
  for (let i = 0; i < SHAFT_PTS.length - 1; i++) {
    const [x1, y1] = SHAFT_PTS[i];
    const [x2, y2] = SHAFT_PTS[i + 1];
    if (y <= y2 || i === SHAFT_PTS.length - 2) {
      const t = Math.min(1, Math.max(0, (y - y1) / (y2 - y1 || 1)));
      return x1 + (x2 - x1) * t;
    }
  }
  return 0.5;
}

/**
 * Câmara escavada orgânica (doc 10 §8.1): blob irregular por harmonias de
 * raio (2f/3f/5f) com fases sorteadas, achatado verticalmente, com a
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

/** layout pronto p/ render; depende de vw p/ converter caixa (120) → % tela */
interface ChamberLayout {
  spec: ChamberSpec;
  leftPct: string;
  topPct: string;
  widthCss: string;
  gallery: string;
  cave: string;
  floor: string;
}

function buildLayout(vw: number, vh: number): ChamberLayout[] {
  const caveRng = new Rng(0xcafe); // silhuetas das câmaras (stream separado)
  const baseW = Math.min(140, Math.max(84, Math.min(vw, vh) * 0.145)); // = clamp(84px, 14.5vmin, 140px)
  const capUn = 13 / (vw / 100); // raio do traço da galeria em unidades-%
  // teto de profundidade: não invadir a Sala da Rainha (~165px na base)
  const yMax = 100 - (165 / vh) * 100;
  const rng = new Rng(0x5eed); // curvaturas orgânicas das galerias

  // caixas iniciais: posições da REFERÊNCIA (doc 10 §3, rev 2.0)
  const boxes = CHAMBERS.map((spec) => {
    const cwPct = ((baseW * spec.s) / vw) * 100;
    const half = cwPct / 2;
    return {
      spec,
      x: Math.min(100 - half - 0.6, Math.max(half + 0.6, spec.cx * 100)),
      y: spec.cy * 100,
      half,
      hph: half * 0.8,
    };
  });

  // RELAXAÇÃO determinística (rev 2.0): separa pares que colidam neste
  // viewport — em telas grandes quase não mexe (fiel à referência); em
  // telas apertadas abre espaço. Passo com resfriamento, sem aleatoriedade.
  const MIN_D = 1.02;
  for (let iter = 0; iter < 600; iter++) {
    const cool = Math.pow(0.995, iter);
    let moved = false;
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const A = boxes[a];
        const B = boxes[b];
        const rx = A.half + B.half;
        const ry = A.hph + B.hph;
        const dx = (A.x - B.x) / rx;
        const dy = (A.y - B.y) / ry;
        const d = Math.hypot(dx, dy);
        if (d < MIN_D) {
          const ux = d > 1e-6 ? dx / d : 0;
          const uy = d > 1e-6 ? dy / d : 1;
          const s = ((MIN_D - d) / 2) * cool; // passo limitado + resfriamento
          A.x += ux * s;
          A.y += uy * s;
          B.x -= ux * s;
          B.y -= uy * s;
          moved = true;
        }
      }
    }
    for (const bx of boxes) {
      bx.x = Math.min(100 - bx.half - 0.6, Math.max(bx.half + 0.6, bx.x));
      bx.y = Math.min(Math.max(10 + bx.hph, bx.y), yMax - bx.hph);
    }
    if (!moved) break;
  }

  return boxes.map((bx) => {
    const { spec, x: cxPct, y: yPct, half } = bx;
    const cwPct = half * 2;
    const shX = shaftXAt(yPct / 100) * 100;
    const dir = shX >= cxPct ? 1 : -1; // boca aponta para o eixo
    const { cave, floor, tipInset } = cavePaths(caveRng, dir === 1 ? 'L' : 'R');
    const insetPct = (tipInset / 120) * cwPct;
    // galeria: do CENTRO DO EIXO (na profundidade da câmara) até a PONTA da
    // boca — cap arredondado encosta na silhueta sem cruzá-la (rev 1.2)
    const tip = cxPct + dir * insetPct;
    const end = tip - dir * (capUn + 0.15);
    const bend1 = shX + dir * Math.abs(end - shX) * 0.35 + rng.float(-1.5, 1.5);
    const bend2 = shX + dir * Math.abs(end - shX) * 0.75 + rng.float(-1.5, 1.5);
    const y1 = yPct + rng.float(-2.5, 2.5);
    const y2 = yPct + rng.float(-2.5, 2.5);
    const gallery = `M ${shX.toFixed(2)} ${yPct.toFixed(2)} C ${bend1.toFixed(2)} ${y1.toFixed(2)}, ${bend2.toFixed(2)} ${y2.toFixed(2)}, ${end.toFixed(2)} ${yPct.toFixed(2)}`;
    return {
      spec,
      leftPct: `${cxPct.toFixed(2)}%`,
      topPct: `${yPct.toFixed(2)}%`,
      widthCss: `calc(clamp(84px, 14.5vmin, 140px) * ${spec.s})`,
      gallery,
      cave,
      floor,
    };
  });
}

/** camada de túneis: cada traço é desenhado 2× (borda + miolo);
 *  galerias saem do eixo serpenteante e terminam na boca (rev 2.0) */
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
      {/* eixo central serpenteante da referência */}
      <path d={SHAFT} fill="none" stroke="#8b562d" strokeWidth={76} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={SHAFT} fill="none" stroke="#2a170d" strokeWidth={64} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
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
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 720));
  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const layout = useMemo(() => buildLayout(vw, vh), [vw, vh]);

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

      {/* câmaras escavadas nas posições da referência (doc 10 §3, rev 2.0) */}
      {layout.map(({ spec, leftPct, topPct, widthCss, cave, floor }) => (
        <button
          key={spec.id}
          className={styles.cave}
          style={{ left: leftPct, top: topPct, width: widthCss }}
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
