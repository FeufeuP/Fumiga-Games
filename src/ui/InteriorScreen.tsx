/**
 * Interior do formigueiro — fiel ao original: madeira + rainha + 9 salas
 * (cemitério, conquistas, missões, formigas, mapa, melhorias, inventário,
 * renascer, sair). Coordenadas normalizadas do bundle (Vr).
 */
import { useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import type { HudState } from '../core/types';
import { ANTS, MAPS, QUEEN, RESOURCES, type MapId, type ResourceKind } from '../core/constants';
import styles from './interior.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
}

const FOOD_ORDER: ResourceKind[] = ['leaf', 'mushroom', 'cactus', 'banana', 'flower', 'crystal'];
const ALL_MAPS: MapId[] = ['campo', 'pantano', 'deserto', 'montanha', 'caverna', 'selva'];

type RoomId = 'cemetery' | 'achievements' | 'missions' | 'ants' | 'map'
  | 'upgrades' | 'inventory' | 'rebirth' | null;

/** [O] Vr — posições das salas (cx, cy num canvas 1000×560) */
const ROOMS: Array<{ id: Exclude<RoomId, null>; label: string; icon: string; cx: number; cy: number }> = [
  { id: 'cemetery', label: 'CEMITÉRIO', icon: '⚰️', cx: 168, cy: 104 },
  { id: 'achievements', label: 'CONQUISTAS', icon: '🏆', cx: 206, cy: 192 },
  { id: 'missions', label: 'MISSÕES', icon: '📜', cx: 150, cy: 300 },
  { id: 'ants', label: 'FORMIGAS', icon: '🐜', cx: 192, cy: 396 },
  { id: 'map', label: 'MAPA', icon: '🗺️', cx: 164, cy: 498 },
  { id: 'upgrades', label: 'MELHORIAS', icon: '⚙️', cx: 832, cy: 132 },
  { id: 'inventory', label: 'INVENTÁRIO', icon: '🎒', cx: 852, cy: 330 },
  { id: 'rebirth', label: 'RENASCER', icon: '🔄', cx: 812, cy: 428 },
];

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
      <button className={styles.backBtn} onClick={() => engine.exitInterior()} aria-label="Voltar">
        {back && <img src={back} alt="Voltar" />}
        {!back && '← VOLTAR'}
      </button>

      {/* salas laterais [O Vr] */}
      <div className={styles.roomCol} style={{ left: '3%' }}>
        {ROOMS.filter((r) => r.cx < 500).map((r) => (
          <button key={r.id} className={styles.roomBtn} onClick={() => setRoom(r.id)}>
            <span className={styles.roomIcon}>{r.icon}</span>
            <span>{r.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.roomCol} style={{ right: '3%' }}>
        {ROOMS.filter((r) => r.cx >= 500).map((r) => (
          <button key={r.id} className={styles.roomBtn} onClick={() => setRoom(r.id)}>
            <span className={styles.roomIcon}>{r.icon}</span>
            <span>{r.label}</span>
          </button>
        ))}
      </div>

      {/* centro: sala da rainha */}
      <div className={styles.room}>
        <h2 className={styles.title}>SALA DA RAINHA</h2>
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
        <div className={styles.stock}>
          {FOOD_ORDER.map((k) => (
            <span key={k} className={styles.stockItem}>
              {RESOURCES[k].icon} {hud.resources[k] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* painel da sala escolhida */}
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
                      <span className={styles.roomIcon}>{ANTS[cls].icon}</span>
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
                        <span className={styles.roomIcon}>{unlocked ? m.icon : '🔒'}</span>
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
                        <span className={styles.roomIcon}>{RESOURCES[k].icon}</span>
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
