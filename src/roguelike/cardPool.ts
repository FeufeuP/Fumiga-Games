/**
 * cardPool.ts — sorteio dos painéis (doc 03 §3, §5, §6, §7).
 * Pesos de raridade sobem com o nível; sinergia por eixo dá +15% por carta
 * já escolhida no eixo (teto +60%); slots com teto (máx 1 substituição por
 * painel); baús (comum 3 / elite 4 / chefe 5 / lendário 3 com evolução);
 * cartas de classe bloqueada ficam de fora; nunca devolve vazio.
 */
import {
  TODAS, cardById, EIXOS, RARIDADES, SLOTS, temGanhoDecrescente,
  type CardDef, type Eixo, type Raridade,
} from './cards';
import { evolucoesDisponiveis, type EvolucaoDef } from './evolutions';

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
      /** carta nova em categoria cheia: exige substituir uma existente */
      requerSubstituicao: boolean;
      /** é evolução (doc 03 §5)? */
      evolucao: boolean;
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

const ORDEM_RARIDADE: Record<Raridade, number> = {
  comum: 0, incomum: 1, rara: 2, epica: 3, lendaria: 4,
};

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
  tamanho?: number;              // 3 (level-up/comum/lendário), 4 (elite), 5 (chefe)
  rng?: () => number;            // default Math.random
  /** baú de elite/chefe: garante 1 carta com raridade mínima */
  garantia?: 'rara' | 'epica';
  /** baú lendário: garante a evolução disponível como 1ª opção */
  garantirEvolucao?: boolean;
  /** tetos atuais por categoria (bônus de Mente-colmeia/baú já somados) */
  slotCaps?: Partial<Record<CardDef['categoria'], number>>;
  /** classes desbloqueadas (Fase 6) — cartas gated ficam fora até aqui */
  classesDesbloqueadas?: string[];
}

/**
 * Sorteia o painel. Regras:
 * - só cartas abaixo do nível máximo; evoluções só via garantia;
 * - carta nova exige slot livre (ou marca "requer substituição", máx 1/painel);
 * - peso = raridade(nível) × (1 + sinergia do eixo); sem repetição;
 * - trava anti-vazio com fallbacks (cura/comida/quitina/XP) — nunca vazio.
 */
export function drawPanel(cartas: Record<string, number>, nivel: number, opts: DrawOpts = {}): CartaPainel[] {
  const tamanho = opts.tamanho ?? 3;
  const rng = opts.rng ?? Math.random;
  const caps: Record<string, number> = {
    passiva: opts.slotCaps?.passiva ?? SLOTS.passiva.inicial,
    especializacao: opts.slotCaps?.especializacao ?? SLOTS.especializacao.inicial,
    comportamento: opts.slotCaps?.comportamento ?? SLOTS.comportamento.inicial,
  };
  const desbloqueadas = new Set(opts.classesDesbloqueadas ?? []);
  const garantiaMin = opts.garantia ? ORDEM_RARIDADE[opts.garantia] : -1;

  const usadosPorCategoria: Record<string, number> = {
    passiva: slotsUsados(cartas, 'passiva'),
    especializacao: slotsUsados(cartas, 'especializacao'),
    comportamento: slotsUsados(cartas, 'comportamento'),
  };

  const candidatas: CardDef[] = [];
  for (const c of TODAS) {
    if (c.categoria === 'evolucao') continue;              // evolução não é sorteável
    if (c.requerClasse && !desbloqueadas.has(c.requerClasse)) continue;
    const atual = cartas[c.id] ?? 0;
    if (atual >= c.valores.length) continue;               // já no máximo
    candidatas.push(c);
  }

  const painel: CartaPainel[] = [];
  let substituicoes = 0; // máx 1 carta que exige substituição por painel [doc 03 §6]

  const paraPainel = (c: CardDef): void => {
    const atual = cartas[c.id] ?? 0;
    const cheia = atual === 0 && (usadosPorCategoria[c.categoria] ?? 0) >= (caps[c.categoria] ?? 0);
    if (cheia) substituicoes++;
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
      requerSubstituicao: cheia,
      evolucao: false,
    });
  };

  // ── baú lendário: evolução disponível entra primeiro ──
  if (opts.garantirEvolucao) {
    const evo = evolucoesDisponiveis(cartas, nivel)[0];
    if (evo) {
      const def = cardById(evo.id);
      if (def) {
        painel.push({
          tipo: 'carta',
          id: def.id,
          nome: def.nome,
          icone: def.icone,
          raridade: def.raridade,
          desc: def.descCurta,
          nivelAtual: 0,
          nivelMax: 1,
          eixo: def.eixo,
          eixoNome: EIXOS[def.eixo].nome,
          sinergia: eixoAtivo(cartas, def.eixo, def.id),
          requerSubstituicao: false,
          evolucao: true,
        });
      }
    }
  }

  // ── baú de elite/chefe: 1 carta com raridade mínima garantida ──
  if (garantiaMin >= 0 && painel.length < tamanho) {
    const elegantes = candidatas.filter(
      (c) => ORDEM_RARIDADE[c.raridade] >= garantiaMin && !painel.some((p) => p.id === c.id),
    );
    if (elegantes.length > 0) {
      const pesos = elegantes.map((c) => pesoRaridade(c.raridade, nivel) * (1 + bonusSinergia(cartas, c.eixo)));
      const total = pesos.reduce((a, b) => a + b, 0);
      let r = rng() * total;
      let idx = elegantes.length - 1;
      for (let i = 0; i < elegantes.length; i++) {
        r -= pesos[i] as number;
        if (r <= 0) { idx = i; break; }
      }
      paraPainel(elegantes[idx] as CardDef);
    }
  }

  // ── sorteio comum ponderado ──
  const restantes = candidatas.filter((c) => !painel.some((p) => p.id === c.id));
  while (painel.length < tamanho && restantes.length > 0) {
    // pula candidatas que exigiriam uma 2ª substituição no mesmo painel
    const elegiveis = restantes.filter((c) => {
      const atual = cartas[c.id] ?? 0;
      const cheia = atual === 0 && (usadosPorCategoria[c.categoria] ?? 0) >= (caps[c.categoria] ?? 0);
      return !cheia || substituicoes < 1;
    });
    const lista = elegiveis.length > 0 ? elegiveis : restantes;
    const pesos = lista.map((c) => pesoRaridade(c.raridade, nivel) * (1 + bonusSinergia(cartas, c.eixo)));
    const total = pesos.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = lista.length - 1;
    for (let i = 0; i < lista.length; i++) {
      r -= pesos[i] as number;
      if (r <= 0) { idx = i; break; }
    }
    const c = lista.splice(idx, 1)[0] as CardDef;
    const iRest = restantes.indexOf(c);
    if (iRest >= 0) restantes.splice(iRest, 1);
    paraPainel(c);
  }

  // ── trava anti-vazio (doc 03 §9): cura → comida → quitina → XP ──
  const fallbacks: CartaPainel[] = [
    { tipo: 'fallback', id: 'fallback_cura', nome: 'Reparo do ninho', icone: '🏠', raridade: 'comum', desc: 'Cura 25% do HP do ninho' },
    { tipo: 'fallback', id: 'fallback_comida', nome: 'Suprimentos', icone: '🍂', raridade: 'comum', desc: '+30 folhas no estoque' },
    { tipo: 'fallback', id: 'fallback_quitina', nome: 'Quitina', icone: '🦴', raridade: 'comum', desc: '+1 quitina (classes futuras)' },
    { tipo: 'fallback', id: 'fallback_xp', nome: 'Sabedoria', icone: '📘', raridade: 'comum', desc: '+100 XP instantâneo' },
  ];
  let fi = 0;
  while (painel.length < tamanho && fi < fallbacks.length) {
    painel.push(fallbacks[fi++] as CartaPainel);
  }
  return painel;
}

/** Receita das evoluções disponíveis (para UI/baú lendário). */
export function receitasDisponiveis(cartas: Record<string, number>, level: number): EvolucaoDef[] {
  return evolucoesDisponiveis(cartas, level);
}

export { RARIDADES, temGanhoDecrescente };
