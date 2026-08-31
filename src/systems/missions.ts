/**
 * Missões (m1–m44) e Conquistas (a1–a30) — EXATAS do bundle ($i e Br).
 * Missões: progresso automático, recompensa em XP.
 * Conquistas: completam sozinhas ao atingir a meta; dão XP + recursos + formigas.
 */
import type { EnemyKind, ResourceKind } from '../core/constants';

export type TrackType = 'anyResource' | 'anyEnemy' | 'resource' | 'enemy' | 'bosses';

export interface MissionTrack {
  type: TrackType;
  kind?: ResourceKind | EnemyKind;
}

export interface MissionDef {
  id: string;
  title: string;
  desc: string;
  track: MissionTrack;
  goal: number;
  rewardXp: number;
}

export interface AchievementDef extends MissionDef {
  rewardResources: Partial<Record<ResourceKind, number>>;
  rewardAnts: Partial<Record<'worker' | 'soldier' | 'scout', number>>;
}

export const MISSIONS: ReadonlyArray<MissionDef> = [
  { id: 'm1', title: 'Primeira colheita', desc: 'Colete 5 folhas no Campo.', track: { type: 'resource', kind: 'leaf' }, goal: 5, rewardXp: 30 },
  { id: 'm2', title: 'Folhas frescas', desc: 'Colete 10 folhas no Campo.', track: { type: 'resource', kind: 'leaf' }, goal: 10, rewardXp: 40 },
  { id: 'm3', title: 'Caça às aranhas', desc: 'Derrote 3 aranhas no Campo.', track: { type: 'enemy', kind: 'spider' }, goal: 3, rewardXp: 50 },
  { id: 'm4', title: 'Lagarta gulosa', desc: 'Derrote 2 lagartas famintas.', track: { type: 'enemy', kind: 'caterpillar' }, goal: 2, rewardXp: 60 },
  { id: 'm5', title: 'Vespa furiosa', desc: 'Derrote 2 vespas agressivas.', track: { type: 'enemy', kind: 'wasp' }, goal: 2, rewardXp: 70 },
  { id: 'm6', title: 'Grande colheita', desc: 'Colete 20 folhas no total.', track: { type: 'resource', kind: 'leaf' }, goal: 20, rewardXp: 80 },
  { id: 'm7', title: 'O predador', desc: 'Derrote a formiga-leão gigante!', track: { type: 'enemy', kind: 'antlion' }, goal: 1, rewardXp: 100 },
  { id: 'm8', title: 'Banquete de cogumelos', desc: 'Colete 5 cogumelos no Pântano.', track: { type: 'resource', kind: 'mushroom' }, goal: 5, rewardXp: 60 },
  { id: 'm9', title: 'Contra os mosquitos', desc: 'Derrote 3 mosquitos no Pântano.', track: { type: 'enemy', kind: 'mosquito' }, goal: 3, rewardXp: 60 },
  { id: 'm10', title: 'Marimbondo raivoso', desc: 'Derrote 3 marimbondos.', track: { type: 'enemy', kind: 'hornet' }, goal: 3, rewardXp: 85 },
  { id: 'm11', title: 'Casca dura', desc: 'Derrote 4 besouros blindados.', track: { type: 'enemy', kind: 'beetle' }, goal: 4, rewardXp: 80 },
  { id: 'm12', title: 'Fazenda de cogumelos', desc: 'Colete 15 cogumelos no total.', track: { type: 'resource', kind: 'mushroom' }, goal: 15, rewardXp: 100 },
  { id: 'm13', title: 'Espinhos do deserto', desc: 'Colete 5 cactos no Deserto.', track: { type: 'resource', kind: 'cactus' }, goal: 5, rewardXp: 70 },
  { id: 'm14', title: 'Escorpião venenoso', desc: 'Derrote 3 escorpiões no Deserto.', track: { type: 'enemy', kind: 'scorpion' }, goal: 3, rewardXp: 90 },
  { id: 'm15', title: 'Guardião do deserto', desc: 'Derrote 2 louva-a-deus.', track: { type: 'enemy', kind: 'mantis' }, goal: 2, rewardXp: 100 },
  { id: 'm16', title: 'Cactário cheio', desc: 'Colete 15 cactos no total.', track: { type: 'resource', kind: 'cactus' }, goal: 15, rewardXp: 110 },
  { id: 'm17', title: 'Flores da montanha', desc: 'Colete 5 flores na Montanha.', track: { type: 'resource', kind: 'flower' }, goal: 5, rewardXp: 70 },
  { id: 'm18', title: 'Guardião da montanha', desc: 'Derrote 3 louva-a-deus na Montanha.', track: { type: 'enemy', kind: 'mantis' }, goal: 3, rewardXp: 110 },
  { id: 'm19', title: 'Jardim alpino', desc: 'Colete 12 flores no total.', track: { type: 'resource', kind: 'flower' }, goal: 12, rewardXp: 100 },
  { id: 'm20', title: 'Cristais brilhantes', desc: 'Colete 5 cristais na Caverna.', track: { type: 'resource', kind: 'crystal' }, goal: 5, rewardXp: 80 },
  { id: 'm21', title: 'Lacraias da caverna', desc: 'Derrote 3 lacraias.', track: { type: 'enemy', kind: 'centipede' }, goal: 3, rewardXp: 120 },
  { id: 'm22', title: 'Lesmas viscosas', desc: 'Derrote 3 lesmas.', track: { type: 'enemy', kind: 'slug' }, goal: 3, rewardXp: 110 },
  { id: 'm23', title: 'Cofre de cristais', desc: 'Colete 15 cristais no total.', track: { type: 'resource', kind: 'crystal' }, goal: 15, rewardXp: 130 },
  { id: 'm24', title: 'Bananas da selva', desc: 'Colete 5 bananas na Selva.', track: { type: 'resource', kind: 'banana' }, goal: 5, rewardXp: 80 },
  { id: 'm25', title: 'Mariposas noturnas', desc: 'Derrote 3 mariposas.', track: { type: 'enemy', kind: 'moth' }, goal: 3, rewardXp: 120 },
  { id: 'm26', title: 'Vespas da selva', desc: 'Derrote 3 vespas na Selva.', track: { type: 'enemy', kind: 'wasp' }, goal: 3, rewardXp: 90 },
  { id: 'm27', title: 'Cacho de bananas', desc: 'Colete 15 bananas no total.', track: { type: 'resource', kind: 'banana' }, goal: 15, rewardXp: 120 },
  { id: 'm28', title: 'Colônia verde', desc: 'Colete 40 folhas no total.', track: { type: 'resource', kind: 'leaf' }, goal: 40, rewardXp: 130 },
  { id: 'm29', title: 'Colônia forte', desc: 'Colete 30 cogumelos no total.', track: { type: 'resource', kind: 'mushroom' }, goal: 30, rewardXp: 130 },
  { id: 'm30', title: 'Colônia blindada', desc: 'Colete 25 cactos no total.', track: { type: 'resource', kind: 'cactus' }, goal: 25, rewardXp: 140 },
  { id: 'm31', title: 'Colônia florida', desc: 'Colete 25 flores no total.', track: { type: 'resource', kind: 'flower' }, goal: 25, rewardXp: 120 },
  { id: 'm32', title: 'Colônia cristalina', desc: 'Colete 30 cristais no total.', track: { type: 'resource', kind: 'crystal' }, goal: 30, rewardXp: 150 },
  { id: 'm33', title: 'Colônia doce', desc: 'Colete 25 bananas no total.', track: { type: 'resource', kind: 'banana' }, goal: 25, rewardXp: 130 },
  { id: 'm34', title: 'Aranhas sem fim', desc: 'Derrote 15 aranhas no total.', track: { type: 'enemy', kind: 'spider' }, goal: 15, rewardXp: 140 },
  { id: 'm35', title: 'Escorpiões do deserto', desc: 'Derrote 12 escorpiões no total.', track: { type: 'enemy', kind: 'scorpion' }, goal: 12, rewardXp: 160 },
  { id: 'm36', title: 'Enxame de mosquitos', desc: 'Derrote 12 mosquitos no total.', track: { type: 'enemy', kind: 'mosquito' }, goal: 12, rewardXp: 140 },
  { id: 'm37', title: 'Blindados', desc: 'Derrote 10 besouros no total.', track: { type: 'enemy', kind: 'beetle' }, goal: 10, rewardXp: 140 },
  { id: 'm38', title: 'Vespas implacáveis', desc: 'Derrote 10 vespas no total.', track: { type: 'enemy', kind: 'wasp' }, goal: 10, rewardXp: 140 },
  { id: 'm39', title: 'Marimbondos em fúria', desc: 'Derrote 10 marimbondos no total.', track: { type: 'enemy', kind: 'hornet' }, goal: 10, rewardXp: 150 },
  { id: 'm40', title: 'Reino das lacraias', desc: 'Derrote 8 lacraias no total.', track: { type: 'enemy', kind: 'centipede' }, goal: 8, rewardXp: 160 },
  { id: 'm41', title: 'Trilha das mariposas', desc: 'Derrote 8 mariposas no total.', track: { type: 'enemy', kind: 'moth' }, goal: 8, rewardXp: 160 },
  { id: 'm42', title: 'Limpeza de lesmas', desc: 'Derrote 6 lesmas no total.', track: { type: 'enemy', kind: 'slug' }, goal: 6, rewardXp: 140 },
  { id: 'm43', title: 'Louva-a-deus supremo', desc: 'Derrote 10 louva-a-deus no total.', track: { type: 'enemy', kind: 'mantis' }, goal: 10, rewardXp: 170 },
  { id: 'm44', title: 'Formiga-leão do deserto', desc: 'Derrote uma formiga-leão gigante!', track: { type: 'enemy', kind: 'antlion' }, goal: 1, rewardXp: 100 },
];

export const ACHIEVEMENTS: ReadonlyArray<AchievementDef> = [
  { id: 'a1', title: 'Coletor Novato', desc: 'Entregue 20 recursos no ninho.', track: { type: 'anyResource' }, goal: 20, rewardXp: 40, rewardResources: { leaf: 10 }, rewardAnts: {} },
  { id: 'a2', title: 'Mestre Coletor', desc: 'Entregue 80 recursos no ninho.', track: { type: 'anyResource' }, goal: 80, rewardXp: 100, rewardResources: { mushroom: 15, cactus: 10 }, rewardAnts: { worker: 1 } },
  { id: 'a3', title: 'Caçador Iniciante', desc: 'Derrote 5 inimigos.', track: { type: 'anyEnemy' }, goal: 5, rewardXp: 50, rewardResources: { leaf: 10 }, rewardAnts: { soldier: 1 } },
  { id: 'a4', title: 'Exterminador', desc: 'Derrote 20 inimigos.', track: { type: 'anyEnemy' }, goal: 20, rewardXp: 120, rewardResources: { mushroom: 10 }, rewardAnts: { soldier: 2 } },
  { id: 'a5', title: 'Folhas Douradas', desc: 'Colete 40 folhas.', track: { type: 'resource', kind: 'leaf' }, goal: 40, rewardXp: 70, rewardResources: { leaf: 15 }, rewardAnts: { scout: 1 } },
  { id: 'a6', title: 'Coleção de Cogumelos', desc: 'Colete 30 cogumelos.', track: { type: 'resource', kind: 'mushroom' }, goal: 30, rewardXp: 60, rewardResources: { mushroom: 15 }, rewardAnts: { worker: 1 } },
  { id: 'a7', title: 'Jardim de Cactos', desc: 'Colete 25 cactos.', track: { type: 'resource', kind: 'cactus' }, goal: 25, rewardXp: 80, rewardResources: { cactus: 15 }, rewardAnts: { worker: 2 } },
  { id: 'a8', title: 'Caçador de Vespas', desc: 'Derrote 5 vespas.', track: { type: 'enemy', kind: 'wasp' }, goal: 5, rewardXp: 90, rewardResources: { mushroom: 10 }, rewardAnts: { soldier: 2 } },
  { id: 'a9', title: 'Bananas da Selva', desc: 'Colete 25 bananas.', track: { type: 'resource', kind: 'banana' }, goal: 25, rewardXp: 70, rewardResources: { banana: 15 }, rewardAnts: { worker: 1, soldier: 1 } },
  { id: 'a10', title: 'Colônia de Ferro', desc: 'Entregue 150 recursos no ninho.', track: { type: 'anyResource' }, goal: 150, rewardXp: 200, rewardResources: { leaf: 25, mushroom: 20 }, rewardAnts: { worker: 2, soldier: 1, scout: 1 } },
  { id: 'a11', title: 'Flores da Montanha', desc: 'Colete 25 flores.', track: { type: 'resource', kind: 'flower' }, goal: 25, rewardXp: 120, rewardResources: { flower: 20 }, rewardAnts: { worker: 2 } },
  { id: 'a12', title: 'Joias da Caverna', desc: 'Colete 25 cristais.', track: { type: 'resource', kind: 'crystal' }, goal: 25, rewardXp: 120, rewardResources: { crystal: 20 }, rewardAnts: { scout: 2 } },
  { id: 'a13', title: 'Tesouro do Deserto', desc: 'Colete 40 cactos.', track: { type: 'resource', kind: 'cactus' }, goal: 40, rewardXp: 90, rewardResources: { cactus: 20 }, rewardAnts: { worker: 1 } },
  { id: 'a14', title: 'Caçador do Deserto', desc: 'Derrote 10 escorpiões.', track: { type: 'enemy', kind: 'scorpion' }, goal: 10, rewardXp: 100, rewardResources: { cactus: 20 }, rewardAnts: { soldier: 2 } },
  { id: 'a15', title: 'Predador Supremo', desc: 'Derrote 10 louva-a-deus.', track: { type: 'enemy', kind: 'mantis' }, goal: 10, rewardXp: 120, rewardResources: { flower: 15 }, rewardAnts: { soldier: 2 } },
  { id: 'a16', title: 'Enxame', desc: 'Derrote 15 marimbondos.', track: { type: 'enemy', kind: 'hornet' }, goal: 15, rewardXp: 100, rewardResources: { mushroom: 12 }, rewardAnts: { soldier: 1, scout: 1 } },
  { id: 'a17', title: 'Império das Formigas', desc: 'Entregue 500 recursos no ninho.', track: { type: 'anyResource' }, goal: 500, rewardXp: 300, rewardResources: { leaf: 30, mushroom: 25, banana: 20 }, rewardAnts: { worker: 3, soldier: 2, scout: 2 } },
  { id: 'a18', title: 'Cem Batalhas', desc: 'Derrote 100 inimigos.', track: { type: 'anyEnemy' }, goal: 100, rewardXp: 250, rewardResources: { mushroom: 20 }, rewardAnts: { soldier: 3 } },
  { id: 'a19', title: 'Rainha da Coleta', desc: 'Entregue 800 recursos no ninho.', track: { type: 'anyResource' }, goal: 800, rewardXp: 150, rewardResources: { leaf: 25, banana: 20 }, rewardAnts: { scout: 2 } },
  { id: 'a20', title: 'Coleção Completa', desc: 'Colete 60 flores.', track: { type: 'resource', kind: 'flower' }, goal: 60, rewardXp: 130, rewardResources: { flower: 30, crystal: 20 }, rewardAnts: { worker: 2 } },
  { id: 'a21', title: 'Caçador de Chefes', desc: 'Derrote 1 chefe de mapa.', track: { type: 'bosses' }, goal: 1, rewardXp: 150, rewardResources: { leaf: 20 }, rewardAnts: { soldier: 1 } },
  { id: 'a22', title: 'Destruidor de Chefes', desc: 'Derrote 5 chefes.', track: { type: 'bosses' }, goal: 5, rewardXp: 250, rewardResources: { banana: 15 }, rewardAnts: { soldier: 2 } },
  { id: 'a23', title: 'Lenda dos Chefes', desc: 'Derrote 15 chefes.', track: { type: 'bosses' }, goal: 15, rewardXp: 400, rewardResources: { crystal: 20 }, rewardAnts: { soldier: 3, scout: 1 } },
  { id: 'a26', title: 'Colhedor Infatigável', desc: 'Entregue 300 recursos no ninho.', track: { type: 'anyResource' }, goal: 300, rewardXp: 250, rewardResources: { leaf: 30, mushroom: 20 }, rewardAnts: { worker: 3 } },
  { id: 'a27', title: 'Exército Implacável', desc: 'Derrote 60 inimigos.', track: { type: 'anyEnemy' }, goal: 60, rewardXp: 250, rewardResources: { mushroom: 20 }, rewardAnts: { soldier: 3 } },
  { id: 'a29', title: 'Mil Recursos', desc: 'Entregue 1000 recursos no ninho.', track: { type: 'anyResource' }, goal: 1000, rewardXp: 600, rewardResources: { crystal: 40, flower: 40, banana: 30 }, rewardAnts: { worker: 5, scout: 2 } },
  { id: 'a30', title: 'Duzentos Inimigos', desc: 'Derrote 200 inimigos.', track: { type: 'anyEnemy' }, goal: 200, rewardXp: 600, rewardResources: { mushroom: 40 }, rewardAnts: { soldier: 4 } },
];

/** [O] _0 — progresso de uma meta dado o total acumulado */
export interface MissionTotals {
  resources: number;                       // recursos entregues
  enemies: number;                         // inimigos derrotados
  bosses: number;                          // chefes derrotados
  byResource: Partial<Record<ResourceKind, number>>;
  byEnemy: Partial<Record<EnemyKind, number>>;
}

export function trackValue(track: MissionTrack, totals: MissionTotals): number {
  switch (track.type) {
    case 'anyResource': return totals.resources;
    case 'anyEnemy': return totals.enemies;
    case 'bosses': return totals.bosses;
    case 'resource': return track.kind ? (totals.byResource[track.kind as ResourceKind] ?? 0) : 0;
    case 'enemy': return track.kind ? (totals.byEnemy[track.kind as EnemyKind] ?? 0) : 0;
  }
}
