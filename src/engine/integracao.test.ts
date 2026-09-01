/**
 * Integração — roda o GameEngine REAL (sem sprites/RAF) e verifica as
 * mecânicas principais de ponta a ponta: coleta, rainha, ondas, combate,
 * exploração, níveis, regeneração, comandos e save/continue.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { GameEngine } from './GameEngine';
import { stepSimulation } from './update';
import { FOG, WAVES } from '../core/constants';
import { cardModsFrom } from '../roguelike/modifiers';
import type { CartaPainel } from '../roguelike/cardPool';
import { createEnemy } from '../entities/enemies';

// localStorage não existe no node — stub para testar save/continue
const store = new Map<string, string>();
beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
    configurable: true,
  });
});

function makeEngine(): GameEngine {
  const Ctor = GameEngine as unknown as new () => GameEngine;
  return new Ctor();
}

function run(engine: GameEngine, seconds: number): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) stepSimulation(engine as never, dt);
}

describe('integração: mecânicas principais', () => {
  it('começa como o original: 1/1/1 formigas, 0 recursos, sem inimigos, 15 folhas visíveis', () => {
    const e = makeEngine();
    e.newGame('campo');
    expect(e.ants).toHaveLength(3);
    expect(e.enemies).toHaveLength(0); // [O] sem fauna ambiente
    expect(e.wallet.leaf).toBe(0);
    const revealed = e.resources.filter((r) => e.fog.isRevealed(r.x, r.y));
    expect(revealed.length).toBe(15); // maxRes × piso 15%
    expect(e.resources.every((r) => Math.hypot(r.x - e.nest.x, r.y - e.nest.y) >= 170)).toBe(true);
  });

  it('coleta: operárias encontram folhas e depositam no ninho', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    expect(e.totals.delivered).toBeGreaterThan(5);
    expect(e.wallet.leaf).toBeGreaterThan(0);
  });

  it('rainha: continua viva com a comida chegando', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    expect(e.queen.dead).toBe(false);
    expect(e.queen.hunger).toBeGreaterThan(30);
  });

  it('ondas: onda 1 aos 90s, inimigos marcham e são repelidos', () => {
    const e = makeEngine();
    e.newGame('campo');
    let sawToast = false;
    const dt = 1 / 60;
    for (let t = 0; t < 130; t += dt) {
      stepSimulation(e as never, dt);
      if (e.toasts.some((x) => x.text.includes('ONDA 1'))) sawToast = true;
    }
    expect(e.wave.num).toBe(1);
    expect(sawToast).toBe(true);
    // os 2 inimigos da onda 1 nasceram e a colônia sobreviveu
    expect(e.totals.enemiesKilled + e.enemies.length).toBeGreaterThanOrEqual(2);
    expect(e.nestHp).toBeGreaterThan(0);
  });

  it('soldados defendem: inimigos de onda morrem (revelados = visíveis)', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    expect(e.totals.enemiesKilled).toBeGreaterThan(0);
    expect(e.level).toBeGreaterThanOrEqual(2);
  });

  it('exploração: só a exploradora revela; mapa cresce', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    expect(e.exploredPct).toBeGreaterThan(2);
  });

  it('regeneração: mundo repõe folhas ao longo do tempo', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 240);
    const alive = e.resources.length;
    expect(alive).toBeGreaterThan(0);
  });

  it('comandos de toque: CHAMAR exploradoras/soldados move as formigas', () => {
    const e = makeEngine();
    e.newGame('campo');
    const scout = e.ants.find((a) => a.cls === 'scout')!;
    const d0 = Math.hypot(scout.x - 1000, scout.y - 1000);
    e.callScouts(1000, 1000);
    expect(scout.state).toBe('command');
    expect(Math.hypot(scout.tx - 1000, scout.ty - 1000)).toBeLessThan(50);
    // acorre ao ponto (e retoma a exploração ao chegar) [O]
    let minD = Infinity;
    const dt = 1 / 60;
    for (let t = 0; t < 30; t += dt) {
      stepSimulation(e as never, dt);
      minD = Math.min(minD, Math.hypot(scout.x - 1000, scout.y - 1000));
    }
    expect(minD).toBeLessThan(60);
    expect(minD).toBeLessThan(d0);

    const soldier = e.ants.find((a) => a.cls === 'soldier')!;
    e.callSoldiers(e.nest.x + 200, e.nest.y);
    expect(soldier.state).toBe('command');
  });

  it('adiantar onda: dá recurso e zera a espera [O advanceWave]', () => {
    const e = makeEngine();
    e.newGame('campo');
    expect(e.advanceWave()).toBe(true);
    expect(e.wallet.leaf).toBe(4); // 3 + 0 + 1
    expect(e.wave.tSec).toBeLessThanOrEqual(1 / 60);
    // durante onda ativa não permite
    e.wave = { num: 1, active: true, tSec: 10, spawned: 2, spawnT: 0 };
    expect(e.advanceWave()).toBe(false);
  });

  it('colapso do ninho perde 30% das folhas e reinicia a onda [O]', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.wallet.leaf = 100;
    e.wave = { num: 1, active: true, tSec: 10, spawned: 2, spawnT: 0 };
    e.damageNest(9999);
    expect(e.nestHp).toBe(0);
    expect(e.wallet.leaf).toBe(70);
    expect(e.wave.tSec).toBe(WAVES.COMBAT_SEC);
    expect(e.wave.spawned).toBe(0);
  });

  it('save/continue: run continua de onde parou', () => {
    const e = makeEngine();
    e.newGame('campo');
    run(e, 60);
    const snap = { ants: e.ants.length, xp: e.xp, level: e.level, wave: e.wave.num };
    e.backToMenu();
    expect(e.continueGame()).toBe(true);
    expect({ ants: e.ants.length, xp: e.xp, level: e.level, wave: e.wave.num }).toEqual(snap);
  });
});

describe('integração: efeitos visíveis (melhorias percebíveis)', () => {
  it('dano e XP aparecem como texto flutuante no mundo', () => {
    const e = makeEngine();
    e.newGame('campo');
    const antes = e.worldTexts.length;
    e.damageEnemy({ hp: 100, hpMax: 100, x: 100, y: 100, scale: 40, xp: 8 } as never, 5, 'soldier');
    expect(e.worldTexts.length).toBe(antes + 1);
    expect(e.worldTexts[e.worldTexts.length - 1]!.text).toBe('-5');
    // matar inimigo mostra +XP
    e.damageEnemy({ hp: 4, hpMax: 100, x: 100, y: 100, scale: 40, xp: 8 } as never, 5, 'soldier');
    const textos = e.worldTexts.map((t) => t.text);
    expect(textos).toContain('+8 XP');
  });

  it('depósito mostra +recurso no ninho e compra gera onda de buff', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.deposit(3, 'leaf', 'worker');
    expect(e.worldTexts.some((t) => t.text.includes('+3'))).toBe(true);
    e.wallet.leaf = 500;
    const ondas0 = e.buffWaves.length;
    e.buyUpgrade('speed');
    expect(e.buffWaves.length).toBe(ondas0 + 1);
    // todas as formigas brilham
    expect(e.ants.every((a) => (a.glowT ?? 0) > 0)).toBe(true);
  });

  it('upgrade de classe brilha só nas formigas da classe', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.wallet.leaf = 500;
    e.buyUpgrade('scout'); // exploradoras
    expect(e.ants.find((a) => a.cls === 'scout')!.glowT ?? 0).toBeGreaterThan(0);
    expect(e.ants.find((a) => a.cls === 'worker')!.glowT ?? 0).toBe(0);
  });

  it('formiga rápida solta poeira; lenta não', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.cards = { passo_firme: 3, passo_leve: 3, divisao_trabalho: 3 };
    e.cardMods = cardModsFrom(e.cards);
    const w = e.ants.find((a) => a.cls === 'worker')!;
    w.state = 'explore';
    w.x = 100; w.y = 100;
    for (let i = 0; i < 300; i++) stepSimulation(e as never, 1 / 60);
    expect(e.dust.length).toBeGreaterThan(0);
    // sem cartas a base (82 px/s) não passa do limiar 92
    const e2 = makeEngine();
    e2.newGame('campo');
    const w2 = e2.ants.find((a) => a.cls === 'worker')!;
    w2.state = 'explore';
    w2.x = 100; w2.y = 100;
    for (let i = 0; i < 120; i++) stepSimulation(e2 as never, 1 / 60);
    expect(e2.dust.length).toBe(0);
  });

  it('loja mostra prévia concreta agora → próximo', async () => {
    const { statPreview } = await import('../systems/shop');
    const pv = statPreview('speed', { speed: 0 }, 0);
    expect(pv).not.toBeNull();
    expect(pv!.agora).toBe('82 px/s');
    const pv2 = statPreview('speed', { speed: 1 }, 0);
    expect(pv2!.agora).toBe('90 px/s');
    expect(pv2!.proximo).toBe('98 px/s');
  });
});

describe('integração: baralho roguelike 5A (doc 03)', () => {
  it('level-up abre painel de 3 cartas e CONGELA o mundo', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.clock.paused = false;
    e.addXp(60); // nível 2 (precisa 50)
    stepSimulation(e as never, 1 / 60);
    expect(e.level).toBe(2);
    expect(e.cardPanel).not.toBeNull();
    expect(e.cardPanel!.choices).toHaveLength(3);
    expect(e.clock.paused).toBe(true);
    // painel refletido no HUD
    const hud = e.store.getSnapshot();
    expect(hud.cardPanel).not.toBeNull();
    expect(hud.cardPanel!.level).toBe(2);
  });

  it('escolher carta aplica o efeito, fecha o painel e descongela', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.addXp(60);
    stepSimulation(e as never, 1 / 60);
    const escolha = e.cardPanel!.choices.find((c) => c.tipo === 'carta')!;
    e.chooseCard(escolha.id);
    expect(e.cards[escolha.id]).toBe(1);
    expect(e.cardPanel).toBeNull();
    expect(e.clock.paused).toBe(false);
    // modificadores saíram do neutro
    expect(JSON.stringify(e.cardMods)).not.toBe(JSON.stringify(cardModsFrom({})));
  });

  it('Paredes grossas: sobe HP máximo e cura o ninho no mesmo valor', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.nestHp = 100;
    e.addXp(60);
    stepSimulation(e as never, 1 / 60);
    e.cardPanel!.choices = [{
      tipo: 'carta', id: 'paredes_grossas', nome: 'Paredes grossas', icone: '🧱',
      raridade: 'comum', desc: '+40 HP do ninho', nivelAtual: 0, nivelMax: 3,
      eixo: 'muralha', eixoNome: 'Muralha', sinergia: false,
    } as CartaPainel];
    e.chooseCard('paredes_grossas');
    expect(e.nestHpMax()).toBe(440); // 400 + 40
    expect(Math.round(e.nestHp)).toBe(140); // 100 + 40 de cura (+ regen do passo)
  });

  it('Rainha eterna: revive 1× com metade da fome, sem game over', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.cards = { rainha_eterna: 1 };
    e.cardMods = cardModsFrom(e.cards);
    e.queen.hunger = 0;
    stepSimulation(e as never, 1 / 60);
    expect(e.queen.dead).toBe(false);
    expect(e.gameOver).toBe(false);
    expect(e.queen.hunger).toBe(50);
    // segunda morte é definitiva
    e.queen.hunger = 0;
    stepSimulation(e as never, 1 / 60);
    expect(e.queen.dead).toBe(true);
    expect(e.gameOver).toBe(true);
  });

  it('Despensa: teto de 200 por recurso, +65% no nível 3', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.grantResource('leaf', 1000);
    expect(e.wallet.leaf).toBe(200);
    e.cards = { despensa: 3 };
    e.cardMods = cardModsFrom(e.cards);
    e.grantResource('leaf', 1000);
    expect(e.wallet.leaf).toBe(330);
  });

  it('teto de população: loja bloqueia além de 60 (+ Ninhada maior)', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.wallet.leaf = 5000;
    let compras = 0;
    for (let i = 0; i < 20; i++) {
      if (e.buyUpgrade('antlimit')) compras++;
    }
    // 3 iniciais + 5×11 = 58 ≤ 60; a 12ª compra (63) é bloqueada
    expect(compras).toBe(11);
    expect(e.populationMax()).toBe(60);
    e.cards = { ninhada_maior: 3 };
    e.cardMods = cardModsFrom(e.cards);
    expect(e.populationMax()).toBe(64);
    expect(e.buyUpgrade('antlimit')).toBe(true); // 63 ≤ 64
  });

  it('cartas persistem no save e o painel pendente reabre', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.cards = { mochila: 2, couraca: 1 };
    e.cardMods = cardModsFrom(e.cards);
    e.pendingCardPanels = ['levelup'];
    e.backToMenu();
    expect(e.continueGame()).toBe(true);
    expect(e.cards).toEqual({ mochila: 2, couraca: 1 });
    expect(e.cardMods.workerCarryBonus).toBe(3);
    expect(e.cardPanel).not.toBeNull(); // painel pendente reaberto
  });
});


describe('integração: Fase 5B (48 cartas, evoluções, baús, slots)', () => {
  function setCards(e: GameEngine, cards: Record<string, number>): void {
    e.cards = { ...cards };
    e.cardMods = cardModsFrom(e.cards);
  }

  it('produção de ovos: Rainha põe operária/soldado/exploradora no ciclo', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { postura_acelerada: 3 }); // 45s × 0,67 ≈ 30s
    const antes = e.ownedAnts.worker + e.ownedAnts.soldier + e.ownedAnts.scout;
    e.wallet.leaf = 50;
    for (let i = 0; i < 60 * 35; i++) stepSimulation(e as never, 1 / 60);
    const depois = e.ownedAnts.worker + e.ownedAnts.soldier + e.ownedAnts.scout;
    expect(depois).toBeGreaterThan(antes);
    // o ciclo alterna classe: com folhas na despensa nasce > 1 ovo
    expect(e.queen.eggT).toBeGreaterThanOrEqual(0);
  });

  it('ninhada dupla pode nascer 2 e Coração dourado é grátis com fome alta', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { postura_acelerada: 3, ninhada_dupla: 2, evo_coracao_dourado: 1 });
    const antes = e.ownedAnts.worker + e.ownedAnts.soldier + e.ownedAnts.scout;
    e.wallet.leaf = 0; // sem comida: só produz grátis se fome ≥80%
    e.queen.hunger = 100;
    for (let i = 0; i < 60 * 35; i++) stepSimulation(e as never, 1 / 60);
    expect(e.ownedAnts.worker + e.ownedAnts.soldier + e.ownedAnts.scout).toBeGreaterThan(antes);
  });

  it('saciedade duradoura pausa a fome após comer', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { saciedade_duradoura: 2 }); // 30s
    // sem operárias e sem comida: nada alimenta a rainha
    e.ants = e.ants.filter((a) => a.cls !== 'worker');
    e.ownedAnts.worker = 0;
    e.wallet.leaf = 0;
    e.queen.hunger = 50;
    e.queen.satietyT = 30;
    for (let i = 0; i < 60 * 10; i++) stepSimulation(e as never, 1 / 60);
    expect(e.queen.satietyT).toBeGreaterThan(0); // ainda imune
    expect(e.queen.hunger).toBe(50);             // não drenou
  });

  it('baú no mapa: revelado pela exploradora abre painel de baú', () => {
    const e = makeEngine();
    e.newGame('campo');
    expect(e.chests.length).toBeGreaterThanOrEqual(1); // 1 baú inicial escondido
    const chest = e.chests[0]!;
    e.fog.reveal(chest.x, chest.y, FOG.SCOUT_RADIUS); // exploradora passou por cima
    stepSimulation(e as never, 1 / 60);
    expect(e.chests.length).toBe(0); // coletado
    expect(e.cardPanel).not.toBeNull();
    expect(e.cardPanel!.origem).toBe('bau_comum');
    expect(e.cardPanel!.choices).toHaveLength(3);
    e.chooseCard(e.cardPanel!.choices[0]!.id);
    expect(e.clock.paused).toBe(false);
  });

  it('chefe derrotado: quitina + baú do chefe (5 escolhas); 2º chefe é lendário', () => {
    const e = makeEngine();
    e.newGame('campo');
    const boss = { hp: 100, hpMax: 100, x: 0, y: 0, scale: 80, xp: 100, boss: true, kind: 'spider', wave: true } as never;
    e.onBossDefeated(boss);
    expect(e.chitin).toBe(2);
    expect(e.cardPanel!.origem).toBe('bau_chefe');
    expect(e.cardPanel!.choices).toHaveLength(5);
    e.chooseCard(e.cardPanel!.choices[0]!.id);
    // 2º chefe → baú lendário
    e.onBossDefeated(boss);
    expect(e.cardPanel!.origem).toBe('bau_lendario');
    expect(e.cardPanel!.choices).toHaveLength(3);
  });

  it('evolução via baú lendário: substitui a carta base e ativa a flag', () => {
    const e = makeEngine();
    e.newGame('campo');
    e.level = 6;
    setCards(e, { mochila: 3, passo_leve: 1 });
    e.bossesThisRun = 1;
    const boss = { hp: 1, hpMax: 1, x: 0, y: 0, scale: 80, xp: 10, boss: true, kind: 'spider', wave: true } as never;
    e.onBossDefeated(boss);
    expect(e.cardPanel!.choices[0]!.id).toBe('evo_caravana_recursos');
    e.chooseCard('evo_caravana_recursos');
    expect(e.cards['evo_caravana_recursos']).toBe(1);
    expect(e.cards['mochila']).toBeUndefined(); // base substituída
    expect(e.cardMods.caravanaRecursos).toBe(true);
  });

  it('substituição: slot cheio abre diálogo, troca e reembolsa XP', () => {
    const e = makeEngine();
    e.newGame('campo');
    // 2 passivas = slot cheio
    setCards(e, { paredes_grossas: 2, apetite_contido: 1 });
    e.pendingCardPanels = ['levelup'];
    (e as unknown as { openCardPanelIfNeeded(): void }).openCardPanelIfNeeded();
    // injeta uma carta nova de passiva no painel
    e.cardPanel!.choices = [{
      tipo: 'carta', id: 'despensa', nome: 'Despensa', icone: '🎒', raridade: 'incomum',
      desc: '+30% armazenamento', nivelAtual: 0, nivelMax: 3, eixo: 'economia',
      eixoNome: 'Economia', sinergia: false, requerSubstituicao: true, evolucao: false,
    }];
    const xpAntes = e.xp;
    e.chooseCard('despensa');
    expect(e.replaceDialog).not.toBeNull();
    expect(e.cardPanel).not.toBeNull(); // painel segue aberto aguardando decisão
    e.chooseReplace('apetite_contido');
    expect(e.cards['despensa']).toBe(1);
    expect(e.cards['apetite_contido']).toBeUndefined();
    expect(e.xp).toBeGreaterThan(xpAntes); // reembolso
    expect(e.cardPanel).toBeNull();
  });

  it('armadilha de resina prende o inimigo por 2s', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { armadilha_resina: 1 });
    e.traps = [{ x: e.nest.x + 100, y: e.nest.y, cd: 0 }];
    const inimigo = makeEnemyAt(e, e.nest.x + 105, e.nest.y);
    stepSimulation(e as never, 1 / 60);
    expect(inimigo.rootT).toBeGreaterThan(0);
    // preso não anda
    const x0 = inimigo.x;
    for (let i = 0; i < 30; i++) stepSimulation(e as never, 1 / 60);
    expect(Math.abs(inimigo.x - x0)).toBeLessThan(60); // quase parado (0,5s)
    // recarga da armadilha
    expect(e.traps[0]!.cd).toBeGreaterThan(0);
  });

  it('provocação: inimigo de onda persegue o soldado', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { provocacao: 2 }); // 220px
    const soldado = e.ants.find((a) => a.cls === 'soldier')!;
    soldado.x = e.nest.x + 400; // longe do ninho
    soldado.y = e.nest.y;
    soldado.stunT = 999; // imóvel: leitura determinística
    const inimigo = makeEnemyAt(e, soldado.x + 100, soldado.y);
    inimigo.wave = true;
    void inimigo;
    const d0 = Math.hypot(inimigo.x - soldado.x, inimigo.y - soldado.y);
    for (let i = 0; i < 60 * 3; i++) stepSimulation(e as never, 1 / 60);
    const d1 = Math.hypot(inimigo.x - soldado.x, inimigo.y - soldado.y);
    expect(d1).toBeLessThan(d0); // aproximou do soldado
  });

  it('espinhos do ninho machucam quem ataca (dano flat)', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { espinhos_ninho: 1 }); // 8 de dano
    const inimigo = makeEnemyAt(e, e.nest.x + 20, e.nest.y);
    inimigo.wave = true;
    const hp0 = inimigo.hp;
    for (let i = 0; i < 90; i++) stepSimulation(e as never, 1 / 60); // 1,5s
    expect(inimigo.hp).toBeLessThan(hp0); // levou espinho (e/ou soldados)
  });

  it('chuva de ácido atinge o maior grupo a cada 20s', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { chuva_acido: 1 }); // 10 de dano
    e.cardTimers.acidT = 0.01;
    const a = makeEnemyAt(e, 600, 600);
    const b = makeEnemyAt(e, 640, 610);
    const hpA = a.hp;
    for (let i = 0; i < 30; i++) stepSimulation(e as never, 1 / 60);
    expect(a.hp).toBeLessThan(hpA); // dano de ácido
    expect(b.hp).toBeLessThan(hpA);
  });

  it('guarda temporária surge quando o ninho é atacado e expira', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { muralha_defensores: 1 }); // 15s
    const antes = e.ants.length;
    e.damageNest(5, e.nest.x + 30, e.nest.y);
    expect(e.ants.length).toBe(antes + 2);
    expect(e.ants.some((a) => a.tempT !== undefined)).toBe(true);
    for (let i = 0; i < 60 * 16; i++) stepSimulation(e as never, 1 / 60);
    expect(e.ants.some((a) => a.tempT !== undefined)).toBe(false); // expirou
  });

  it('vanguarda: revelar mapa novo dá XP', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { vanguarda: 1 }); // +15 XP por 1%
    const xp0 = e.xp;
    // revela uma área nova longe (scout faria isso)
    for (let i = 0; i < 8; i++) {
      e.fog.reveal(400 + i * 60, 400 + i * 60, FOG.SCOUT_RADIUS);
    }
    for (let i = 0; i < 60; i++) stepSimulation(e as never, 1 / 60); // passa do tick%30
    expect(e.xp).toBeGreaterThan(xp0);
  });

  it('quitina, slots e cartas persistem no save', () => {
    const e = makeEngine();
    e.newGame('campo');
    setCards(e, { mente_colmeia: 1, espinhos_ninho: 2 });
    e.chitin = 7;
    e.slotBonus.passiva = 1;
    e.backToMenu();
    expect(e.continueGame()).toBe(true);
    expect(e.chitin).toBe(7);
    expect(e.slotBonus.passiva).toBe(1);
    expect(e.cards['mente_colmeia']).toBe(1);
    expect(e.slotCap('especializacao')).toBe(4); // 3 + Mente-colmeia
  });
});

function makeEnemyAt(e: GameEngine, x: number, y: number): import('../core/types').Enemy {
  const en = createEnemy('spider', x, y, 1, () => 0.5, { wave: false });
  e.enemies.push(en);
  return en;
}
