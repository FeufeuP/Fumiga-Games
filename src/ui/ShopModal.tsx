/**
 * Loja — 16 melhorias do original em 4 abas (Coleta, Ataque, Defesa, Níveis).
 * Custo dinâmico: amount + step × compras; mostra o recurso cobrado.
 */
import { useState } from 'react';
import { RESOURCES, UPGRADES, type UpgradeDef } from '../core/constants';
import type { HudState } from '../core/types';
import type { GameEngine } from '../engine/GameEngine';
import styles from './shop.module.css';

interface Props {
  engine: GameEngine;
  hud: HudState;
  onClose: () => void;
}

const TABS: Array<{ id: UpgradeDef['category']; label: string; icon: string }> = [
  { id: 'coleta', label: 'COLETA', icon: '🍃' },
  { id: 'ataque', label: 'ATAQUE', icon: '⚔️' },
  { id: 'defesa', label: 'DEFESA', icon: '🛡️' },
  { id: 'niveis', label: 'NÍVEIS', icon: '⭐' },
];

export default function ShopModal({ engine, hud, onClose }: Props) {
  const [tab, setTab] = useState<UpgradeDef['category']>('coleta');
  const items = UPGRADES.filter((u) => u.category === tab);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2>LOJA DA COLÔNIA</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">✕</button>
        </header>

        <div className={styles.wallet}>
          {(Object.keys(RESOURCES) as Array<keyof typeof RESOURCES>).map((k) => (
            <span key={k} className={styles.walletItem}>
              {RESOURCES[k].icon} {hud.resources[k] ?? 0}
            </span>
          ))}
        </div>

        <nav className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        <div className={styles.grid}>
          {items.map((u) => {
            const cost = hud.shopCosts[u.id];
            const bought = hud.upgrades[u.id] ?? 0;
            const affordable = cost && !cost.maxed && (
              cost.multi
                ? cost.multi.every((c) => (hud.resources[c.kind] ?? 0) >= c.amount)
                : (hud.resources[cost.kind] ?? 0) >= cost.amount
            );
            return (
              <button
                key={u.id}
                className={`${styles.item} ${affordable ? styles.itemCan : ''}`}
                disabled={!affordable}
                onClick={() => engine.buyUpgrade(u.id)}
              >
                <div className={styles.itemTop}>
                  <span className={styles.itemIcon}>{u.icon}</span>
                  <span className={styles.itemName}>{u.name}</span>
                  {u.max === Infinity ? null : (
                    <span className={styles.itemLevel}>{bought}/{u.max}</span>
                  )}
                </div>
                <p className={styles.itemDesc}>{u.desc}</p>
                <div className={styles.itemCost}>
                  {cost?.maxed
                    ? 'MÁXIMO'
                    : cost?.multi
                      ? cost.multi.map((c) => `${RESOURCES[c.kind].icon}${c.amount}`).join(' ')
                      : `${RESOURCES[cost?.kind ?? 'leaf'].icon} ${cost?.amount ?? '—'}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
