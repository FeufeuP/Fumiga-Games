/**
 * cardPool.ts — sorteio do painel de level-up (doc 03 §3, §5, §6).
 * Pesos de raridade sobem com o nível; sinergia por eixo dá +15% por carta
 * já escolhida no eixo (teto +60%); slots com teto; nunca devolve vazio.
 */
import { CARDS_5A, cardById, EIXOS, RARIDADES, SLOTS, type CardDef, type Eixo, type Raridade } from './cards';

export type CartaPainel =
  | {
      tipo: 'carta';
      id: string;
      nome: string;
      icone: string;
      raridade: Raridade;
      desc: string;        // descCurta já formatada com o valor do próximo nível
      nivelAtual: number;  // 0 = nova
      nivelMax: number;
      eixo: Eixo;
      eixoNome: string;
      sinergia: boolean;   // eixo já ativo na build → brilho na UI
    }
  | {
      tipo: 'fallback';
      id: string;
      nome: string;
      icone: string;
      raridade: Raridade;
      desc: string;
    };

/** [doc 03 §3] peso base da raridade pelo nível atual da colônia. */
export function pesoRaridade(r: Raridade, nivel: number): number {
  switch (r) {
    case 'comum': return Math.max(60 - 2.2 * nivel, 20);
    case 'incomum': return 25 + 0.5 * nivel;
    case 'rara': return 10 + 0.9 * nivel;
    case 'epica': return 4 + 0.6 * nivel;
    case 'lendaria': return 1 + 0.2 * nivel;
  }
}

/** Sinergia: +15% por carta já escolhida no eixo, teto +60% (doc 03 §5). */
export function bonusSinergia(cartas: Record<string, number>, eixo: Eixo): number {
  let n = 0;
  for (const [id, nivel] of Object.entries(cartas)) {
    if (nivel <= 0) continue;
    const c = cardById(id);
    if (c && c.eixo === eixo) n++;
  }
  return Math.min(0.15 * n, 0.6);
}

function eixoAtivo(cartas: Record<string, number>, eixo: Eixo, ignoreId: string): boolean {
  for (const [id, nivel] of Object.entries(cartas)) {
    if (nivel <= 0 || id === ignoreId) continue;
    const c = cardById(id);
    if (c && c.eixo === eixo) return true;
  }
  return false;
}

/** Quantos slots de uma categoria estão ocupados (cartas distintas, não níveis). */
export function slotsUsados(cartas: Record<string, number>, categoria: CardDef['categoria']): number {
  let n = 0;
  for (const [id, nivel] of Object.entries(cartas)) {
    if (nivel <= 0) continue;
    const c = cardById(id);
    if (c && c.categoria === categoria) n++;
  }
  return n;
}

function formatar(c: CardDef, nivelAtual: number): string {
  const proximo = c.valores[nivelAtual] as number | undefined;
  return c.descCurta.replace('{v}', String(proximo ?? c.valores[c.valores.length - 1]));
}

export interface DrawOpts {
  tamanho?: number;   // default 3 (painel de level-up)
  rng?: () => number; // default Math.random
}

/**
 * Sorteia o painel. Regras:
 * - só cartas abaixo do nível máximo;
 * - carta nova exige slot livre na categoria (subir nível não gasta slot);
 * - peso = raridade(nível) × (1 + sinergia do eixo);
 * - sem repetição dentro do painel;
 * - se faltar carta, preenche com fallbacks (doc 03 §9) — nunca vazio.
 */
export function drawPanel(cartas: Record<string, number>, nivel: number, opts: DrawOpts = {}): CartaPainel[] {
  const tamanho = opts.tamanho ?? 3;
  const rng = opts.rng ?? Math.random;

  const usadosPorCategoria: Record<string, number> = {
    passiva: slotsUsados(cartas, 'passiva'),
    especializacao: slotsUsados(cartas, 'especializacao'),
    comportamento: slotsUsados(cartas, 'comportamento'),
  };

  const candidatas: CardDef[] = [];
  for (const c of CARDS_5A) {
    const atual = cartas[c.id] ?? 0;
    if (atual >= c.valores.length) continue;             // já no máximo
    if (atual === 0) {
      const teto = SLOTS[c.categoria].inicial;           // 5A: teto inicial
      if ((usadosPorCategoria[c.categoria] ?? 0) >= teto) continue; // categoria cheia
    }
    candidatas.push(c);
  }

  const painel: CartaPainel[] = [];
  const restantes = [...candidatas];
  while (painel.length < tamanho && restantes.length > 0) {
    const pesos = restantes.map((c) => pesoRaridade(c.raridade, nivel) * (1 + bonusSinergia(cartas, c.eixo)));
    const total = pesos.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = restantes.length - 1;
    for (let i = 0; i < restantes.length; i++) {
      r -= pesos[i] as number;
      if (r <= 0) { idx = i; break; }
    }
    const c = restantes.splice(idx, 1)[0] as CardDef;
    const atual = cartas[c.id] ?? 0;
    painel.push({
      tipo: 'carta',
      id: c.id,
      nome: c.nome,
      icone: c.icone,
      raridade: c.raridade,
      desc: formatar(c, atual),
      nivelAtual: atual,
      nivelMax: c.valores.length,
      eixo: c.eixo,
      eixoNome: EIXOS[c.eixo].nome,
      sinergia: eixoAtivo(cartas, c.eixo, c.id),
    });
  }

  // Trava anti-vazio (doc 03 §9): cura → comida.
  let fi = 0;
  const fallbacks: CartaPainel[] = [
    { tipo: 'fallback', id: 'fallback_cura', nome: 'Reparo do ninho', icone: '🏠', raridade: 'comum', desc: 'Cura 25% do HP do ninho' },
    { tipo: 'fallback', id: 'fallback_comida', nome: 'Suprimentos', icone: '🍂', raridade: 'comum', desc: '+30 folhas no estoque' },
    { tipo: 'fallback', id: 'fallback_xp', nome: 'Sabedoria', icone: '📘', raridade: 'comum', desc: '+100 XP instantâneo' },
  ];
  while (painel.length < tamanho && fi < fallbacks.length) {
    painel.push(fallbacks[fi++] as CartaPainel);
  }
  return painel;
}

export { RARIDADES };
