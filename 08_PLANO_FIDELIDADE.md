# 08 — PLANO DE RECREAÇÃO FIEL AO ORIGINAL

> Decisão do usuário (31/08/2026): antes de evoluir o jogo, a recriação deve ser
> **fiel ao `Formigueiro.original.html`** em design, mecânicas, sprites, telas de
> menu e de jogo — não em estrutura interna (multi-arquivo mantido).
> Fonte da verdade: o próprio bundle original, de onde extraí tudo abaixo.

## Constantes recuperadas do original (código, não chute)

| Sistema | Valor original |
|---|---|
| Ondas | 20s de combate, 90s de calmaria, onda N = 2×N inimigos, 2 por lote, poder = min(0,5×1,1^(N−1), 3) |
| Chefe | a cada **15 ondas** + 2 escoltas a 0,5 de poder |
| Recompensa de onda | +folhas (3+2N), +XP (15+5N), ninho +20% do HP máx |
| Rainha | fome máx 100, drena ⅓/s (300s), come **qualquer recurso** (ordem fixa), +8 fome por item, operárias alimentam a cada 3s cada, até fome 90, morre a 0 |
| Ninho | HP 400, regenera 1,2/s sem inimigo a 320px, destruído → operárias reparam 10/s cada |
| XP | por depósito = 3 (+xpboost); nível n exige 50+25(n−1) |
| Formigas | worker 30HP/5dano/tam22 · soldier 60/10/44 · scout 28/6/20 — operária COLETA (não existe coletora) |
| Compra de formigas | +5 por compra na LOJA: operária folha 15 (+10), soldado cogumelo 25 (+15), exploradora folha 25 (+15) |
| Desbloqueio de mapa | exploração: Campo→Pântano 30%→Deserto 40%→Montanha 50%→Caverna 60%→Selva 70% |
| Formiga sprite | 96×96 desenhado a ⅓ (32px), âncora (43, 45,5)/3 |
| Recoloração | soldado #d9413a/#8c1f1f · exploradora #3fae5a/#1f6b38 (troca de pixels laranja/marrom) |

## Sprites originais (39, extraídos por ordem do bundle)

- `background_menu.jpg` 1920×899 · `btn_voltar` 390×340 · `som_on` 390×340 · `som_off` 220×192
- `tile_madeira_interior` 64×64 (fundo #4a2c14, tile 128px)
- `ant_worker_frame1–7` 96×96 · `caterpillar_frame1–7` 96×96 · `spider_frame1–6` 56×56
- `tree` 56 · `mushroom` 56 · `leaf` 32 · `nest` 32 · `stone_small` 56 · `stone_big` 64
- `hero_ant` 88×92 · `cloud` 72×36
- Chefes: `boss_antlion` 512×379 · `boss_mosquito` · `boss_scorpion` · `boss_mantis` 96×96 · `boss_centipede` 93×96 · `boss_moth` 89×96
- Demais visuais (rainha, grama, flor, cacto, banana, cristal, ícones, inimigos de UI) são **procedurais/emoji** no original — recriar igual

## Mapas (dados reais)

| Mapa | Mundo | Chão | Recurso | Fauna (contagem) | Chefe (HP/dano) | Cenário |
|---|---|---|---|---|---|---|
| Campo | 3400×2400 | #59a04c/#4c8f41 | folha×100 | aranha7, lagarta5, besouro4, vespa3, formiga-leão1 | Formiga Vermelha Rei 1500/18 | 18 árvores, 18 pedras, 220 gramas, 50 flores, seed 1234 |
| Pântano | 3400×2400 | #4d7a5a | cogumelo×90 | mosquito7, lagarta5, vespa4, besouro3, marimbondo3, f-leão1 | Rainha dos Mosquitos 2100/17 | 9 poças, 32 árvores, seed 9876 |
| Deserto | 3600×2600 | #d9b55c | cacto×80 | escorpião6, besouro4, vespa3, aranha4, louva-a-deus2, f-leão1 | Escorpião Imperador 2800/22 | 30 pedras, seed 3333 |
| Montanha | 3600×2600 | #7d837d | flor×80 | louva-a-deus6, escorpião3, marimbondo4, besouro3, f-leão2 | Rei Louva-a-Deus 3800/26 | seed 4242 (conferir) |
| Caverna | 3800×2800 | #3a2f35 | cristal×90 | lacraia6, escorpião4, aranha4, besouro3, louva-a-deus2, f-leão1 | Rainha Lacraia 4200/28 | seed 5555 |
| Selva | 4000×3000 | #2e7d32 | banana×80 | mariposa6, lesma5, aranha4, vespa4, louva-a-deus2, marimbondo2, f-leão1 | Mariposa Tita 5200/30 | 60 árvores, seed 6666 (conferir) |

## Inimigos (stats reais do bundle)

mosquito 60/4/62 · vespa 70/8/80 · lagarta 80/5/20 · marimbondo 90/9/70 · aranha 100/6/26 ·
lesma 120/8/15 · escorpião 140/9/24 · besouro 160/7/18 · mariposa 160/12/60 ·
louva-a-deus 200/11/30 · lacraia 240/14/34 · formiga-leão 300/12/14 (HP/dano/vel — + aggro, r, escala, xp por espécie)

## Fases de execução (esta iteração)

- **F1 — Assets**: extrair os 39 sprites → `src/assets/sprites/`; registro assíncrono
  (tela "CARREGANDO A COLONIA"); recoloração soldado/exploradora; animações (operária 7,
  lagarta 7, aranha 6 frames).
- **F2 — Mecânicas**: 3 classes (operária coleta), economia por tipo de recurso,
  fome da Rainha original, ninho com regeneração/reparo, ondas 20s/90s, 12 inimigos com
  IA e combate, chefe a cada 15 ondas, XP linear 50+25(n−1), loja com a grade de 16
  melhorias, desbloqueio de mapa por exploração.
- **F3 — Telas**: menu com fundo original + botões originais; HUD no layout do original
  (textos SEM acento, como o original); interior com tile de madeira; tela de derrota
  ("A RAINHA CAIU" + estatísticas); mapa de mundos liberados.

## Não-escopo agora (futuro, quando o usuário pedir)

Sistema roguelike de cartas do dossiê, renascimento, conquistas completas (30),
missões, áudio completo — o original tem parte disso, entra na próxima iteração
se o usuário quiser.

---

## Apêndice B — valores [O] confirmados direto do bundle (31/08/2026)

Extraídos por grep direto no minificado durante a implementação da fase F2;

| Item | Valor original | Onde está |
|---|---|---|
| Velocidade das formigas | base **82**; scout ×1.35 (110.7); carregando ×0.9; upgrade +10%/nível | `ANTS.*.speed`, `antSpeed` |
| Tamanho de desenho das formigas | `K0` = worker 22, soldier 44, scout 20; âncora (43, 45.5) com z=y/32 | `ANTS.*.size`, `drawAnt` |
| Sombra da formiga | elipse rgba(0,0,0,.22), raio K0/22×6 | `drawAnt` |
| Animação | `floor(anim)%frames`, só quando anda (alvo/pendente/carga) | `walkPhase` em `seek` |
| Detecção de recurso | `N0=150 × visionScale` | `BEHAVIOR.WORKER_DETECT` |
| Alcance de coleta | `R0=18 + Ii[kind]/2` | `BEHAVIOR.PICKUP_BASE` |
| Tamanho dos recursos (Ii) | folha 28, cogumelo 40, cacto 30, banana 30, flor 28, cristal 30 | `BEHAVIOR.RESOURCE_SIZE` |
| Poder da onda | `min(0.5·1.1^(n−1), 3)` — escala hp, dano, escala e alcance | `WAVES.POWER`, `createEnemy` |
| Fim da onda | por TIMER (waveT=20s), não por extermínio | `updateWaves` |
| Chefe desenho | `scale×0.42`; halo `scale×(0.52+0.04·sin(t·3))` | `SPRITE_DRAW.BOSS_*` |
| Ninho desenho | `drawImage(nest, -L, -D, 84, P)` → 84px | `SPRITE_DRAW.NEST` |
| Inimigos com sprite | aranha 6 frames e lagarta 7 frames, desenhados a `o.scale` | `Renderer.drawEnemyEntity` |
| XP por nível | `qa`: 50+25(n−1) | `xpToNextLevel` |

Correções sobre decisões [P] anteriores: velocidades 55/65/85 **substituídas**
pelos valores [O] acima; chefe ×0.45 → **×0.42**; ninho 96px → **84px**.

---

## Apêndice C — Ciclo A: lacunas de fidelidade (plano executável)

Pesquisa direta no bundle (31/08/2026). Escopo fechado em 9 frentes:

### C1. Constantes novas (`core/constants.ts`)
- `RALLY`: ATACAR! (buff 6s, cd 20s, cooldown de ataque ×0.55) e COLETA! (buff 8s, cd 25s, operária ×1.6)
- `BOSS_SMASH`: só após o 1º golpe recebido; a cada 15s; dano = dano do chefe; raio 90px; knockback 300–380 px/s + vz 260–350 (voo)
- `BOSS`: barra de HP só com aggro 4s após dano (`bossAggroT`)
- `ANT_RESPAWN`: morte derruba a carga no chão; fila de respawn 15s×(1−0.3·upgrade), mínimo 3s
- `RESOURCE_REGEN`: a cada 0.8s até 2 nós por tipo até `round(maxRes × clamp(explorado%, 15%, 100%))`; nasce só em área revelada
- `REBIRTH_BONUS`: por renascimento → +12% vel, +12% visão, +1 carga, +10% dano, +15% HP, +20% XP
- `UPGRADES`: +17ª melhoria `nesthp` (+100 HP ninho, custo MULTI-recurso `ob(l)`: nível l usa tipos f0[0..min(l+1,6)[ com 20+(l+1−i)×10)
- `MISSIONS` m1–m44 e `ACHIEVEMENTS` a1–a30 EXATOS (títulos, metas, recompensas XP/recursos/formigas)
- `SCORE`: missões×100 + renascimentos×200
- `NEST.HP_PER_UPGRADE = 100` (Er)

### C2. Tipos (`core/types.ts`)
- `Ant` ganha `z, vx, vy, vz` (física de voo ao ser golpeado pelo smash)
- `Totals` ganha `byResource`, `byEnemy`; estado de missões/conquistas/renascimentos/fila de respawn

### C3. Sistema de missões/conquistas (`systems/missions.ts` NOVO)
- `progressResource/progressEnemy/progressBoss` + `checkAchievements` (auto) + recompensas (XP + recursos + spawn de formigas)

### C4. Simulação (`engine/update.ts`)
- Timers: rally buffs, smash do chefe, respawn queue, resource regen, bossAggroT
- `killAnt`: derruba carga → fila de respawn (não é morte permanente!)
- Física do `z` (gravidade) nas formigas no ar

### C5. Motor (`engine/GameEngine.ts`)
- `ownedAnts` (contagem por classe é estado, não derivada), respawn devolve a formiga
- `rallyAttack()/rallyCollect()`, `rebirth()`, `nestHpMax()`, score, shake de câmera
- Progresso de missões/conquistas em deposit/dano; recompensas aplicadas
- `modsFrom` incorpora bônus de renascimento

### C6. Render (`render/Renderer.ts` + `sprites.ts`)
- Nuvens (cloud.png) à deriva; recursos com bobbing (`phase`); formiga no ar (sombora separada); anel do smash; shake

### C7. UI
- HUD: botões ATACAR!/COLETA! com cooldown, barra do chefe só em aggro, "EXPLORADO N%"
- Interior: 9 salas (cemitério com respawn, conquistas, missões, formigas, mapa, melhorias, inventário, renascer, rainha)
- Menu de pausa: ESTATISTICAS/CONQUISTAS/PLACAR/SAIR; game over mostra placar

### C8. Save v3
- Missões, conquistas, renascimentos, fila de respawn, contagens; migrar v2 com defaults

### C9. Qualidade
- Testes: missão/conquista completam, respawn, regen, rebirth, rally, custo multi-recurso; tsc; build; CHANGELOG; push main

---

## Apêndice D — Ciclo B: polimento final (plano executável)

Pesquisa no bundle concluída. Itens com dados EXATOS:

### B1. Áudio idêntico (`engine/audio.ts` reescrito)
- `Wt(freq, dur, type, vol, delay)`: oscilador com rampa exponencial 1e-4, stop+0.06
- SFX [O]: click 600/.05/square/.06 · collect 760/.06/triangle/.09 · deposit 440/.09/sine/.10
  · attack 180/.07/sawtooth/.08 · kill 200+120/.1/.14 sawtooth · win 523-659-784 sine
  · levelUp 523-659-880 sine · error 140/.14/square/.07
- **Música [O]**: sequenciador real — melodia r0 (32 notas, square, 0.035, 0.19×0.9s),
  baixo mb (32 notas, triangle, 0.05, 0.19×1.8, nos tempos i%2===0), ruído kb
  (0.03s, 0.012) nos i%2===1; scheduler setInterval 90ms com lookahead 0.25s
- Persistência: `formigueiro-sound-v1` / `formigueiro-music-v1`

### B2. Menu fiel (`ui/MainMenu.tsx`)
- Subtítulo "EXPLORE, COLETE, COMBATE, EVOLUA" com ✦; badge **V1.5** topo-direita
- Coluna: JOGAR (glow) / OPCOES / CREDITOS · grid: CONQUISTAS · ESTATISTICAS · PLACAR · SAIR
- JOGAR = continua do save (sem NOVO JOGO — reset é via Renascer, como no original)

### B3. Modais do menu (`ui/MenuModals.tsx` NOVO)
- OPCOES [O]: "Configuracoes" + Efeitos sonoros (sprite) + Musica: LIGADA/DESLIGADA +
  Resetar progresso (vermelho) + fechar (btn_back)
- CREDITOS [O]: texto exato ("Feito para feira escolar", equipe, engine) + TELA CHEIA
- PLACAR [O]: 7 linhas ×{5,20,100,2,50,100,200} + caixa "PONTUACAO TOTAL" vermelha
- ESTATISTICAS/CONQUISTAS: linhas do bundle

### B4. Placar real (Sm) — substitui a fórmula simplificada
`recursos×5 + inimigos×20 + chefes×100 + XP×2 + conquistas×50 + missões×100 + renasc×200`

### B5. HUD topo-esquerda [O]
Card: NIVEL · RENASC · FORMIGAS · FOLHAS + barras NINHO e RAINHA
(cores: >50% #5fce55 · >25% #e8c23c · senão #e2574c). XP sai do HUD (fica nas estatísticas).

### B6. Interior: rainha com bobbing (sin) · B7. Reset de progresso + save limpo

### Apêndice D.1 — Execução do ciclo B (2026-08-31) ✅
- **B1 ✅** `audio.ts` reescrito; integração: `AntWorld.playSfx()` (engine → AudioManager,
  mock no-op) usado por collect (colheita), attack (golpe), smash (pisão do chefe),
  kill (inimigo/formiga), respawn, levelUp; música via `ensureMusic()` no primeiro
  gesto (App `pointerdown/keydown`) e `setMusic` nas OPCOES.
- **B2 ✅** MainMenu fiel: JOGAR(glow)/OPCOES/CREDITOS + grid CONQUISTAS/ESTATISTICAS/
  PLACAR + SAIR danger + badge V1.5 + subtítulo ✦; JOGAR continua o save.
- **B3 ✅** `MenuModals.tsx` NOVO: OPCOES (sprite 84px, Musica LIGADA/DESLIGADA,
  Resetar progresso), CREDITOS exato + TELA CHEIA, PLACAR 7 linhas + PONTUACAO TOTAL
  (#f0655c→#c0392b, borda #fde056) + rodapé, ESTATISTICAS, CONQUISTAS com barras.
- **B4 ✅** SCORE em `core/constants.ts` com os 7 pesos [O]; `engine.score` e pausa
  mostram a composição completa.
- **B5 ✅** Hud: card topo-esquerda NIVEL/RENASC/FORMIGAS/FOLHAS + NINHO/RAINHA com
  cores #5fce55/#e8c23c/#e2574c; XP removido do HUD.
- **B6 ✅** Rainha do interior com bobbing (CSS 2s, ±6px).
- **B7 ✅** `engine.resetProgress()` remove o save e zera conquistas/missoes/renasc;
  `exitGame()` = Android.exit → window.close → toast; `toggleFullscreen()` com toasts [O].
- Verificação: `tsc --noEmit` limpo · 62/62 testes · `vite build` ok.

---

## Apêndice E — Correção de bugs das mecânicas principais (01/09/2026) ✅

Diagnóstico headless (motor real simulado a 60 Hz) revelou que as mecânicas
principais estavam quebradas. Causas-raiz encontradas comparando com o bundle:

### Bugs críticos corrigidos
1. **Inimigos ambientes inexistentes no original** — criávamos 20 inimigos no
   início (contagens de `Tt[].enemies`); no bundle esse array só alimenta
   `waveKinds()` (espécies das ONDAS). Resultado: massacre do ninho em ~30s.
   → Removida a fauna ambiente (`world.ts`); inimigos só vêm das ondas.
2. **Soldados cegos** — `nearestVisibleEnemy` usava a névoa ATIVA (raio de
   render); o original usa `isRevealed` (névoa persistente) e X0=280 de aggro.
   → Corrigido + defesa do ninho: engaja inimigos revelados a 340+extensão.
3. **Recursos nunca visíveis** — espalhávamos 100 nós pelo mapa inteiro
   (irrevelados). No bundle, recursos iniciais nascem NA ÁREA REVELADA
   (anel do ninho revelado a 260px, ≥170px do centro), contagem
   `maxRes × exploredFactor` (piso 15% = 15 nós no Campo).
   → `seedWorld()` fiel + revelação inicial 260px [O revealInstant].
4. **Coleta lentíssima e incapaz** — colheita de 0.8s/unidade (invenção [P]) e
   volta ao ninho a cada 1 item. No bundle: pickup INSTANTÂNEO
   (dist < R0+Ii/2, nó removido) e a operária continua coletando até a
   capacidade (`carry.length < capacity`).
5. **IA das formigas reescrita** [O updateAnt]:
   - Operária: vagueia DENTRO do revelado (wanderAngle, muda rumo ao apontar
     para sombra), auto-defesa (GA=110), fuga ao tomar dano (fearT=0.9s),
     deposita a 28px e **cura-se por completo ao entregar** (`hp=maxHp`).
   - Soldado: engaja revelados (X0=280) ou defende o ninho (340+ext),
     movimento de enxame (separação 40 + coesão 44 + alinhamento 66).
   - Exploradora: anel de fronteira expansivo (frontierR cresce 1 célula a
     cada 0.6s quando o anel está revelado), ângulos distribuídos por ordem
     de nascimento, separação entre exploradoras (60px), desvio de inimigos
     (140px), auto-defesa (BA=120).
   - **Só a exploradora revela névoa** (fogCell×2) — no bundle operárias e
     soldados não revelam nada.
6. **IA dos inimigos fiel** [O updateEnemy]: onda marcha ao ninho e ataca
   formiga só se colada (corpo ≤12); ataque cd 0.9s (chefe 1.1s); ninho a
   40+ext+8; sem sombra para nascer → **borda do mundo** (não mais a 500px
   do ninho!); obstáculos empurram e desviam o rumo.
7. **Chefe nasce longe do ninho** [O]: ponto livre ≥240 das bordas e
   ≥720 do ninho (não mais na sombra).
8. **Colapso do ninho** [O]: perde 30% das folhas, onda reinicia (20s),
   shake 2 — antes só mostrava toast.
9. **Rainha** alimentada pela contagem de operárias PERTENCENTES [O
   state.ants.worker], não vivas.
10. **Regen do ninho** bloqueado só por inimigo REVELADO a 320px [O
    enemyNearNest com isRevealed].
11. **Smash do chefe**: arrasto horizontal no ar (×(1−1.6·dt)) e stun de
    0.9s ao aterrissar [O].
12. **Armadura com piso 50%** [O max(0.5, 1−0.1·n)].
13. **Comandos de toque** [O registerTap]: toque no ninho (<90px) → interior;
    toque simples → CHAMAR EXPLORADORAS; toque duplo (≤320ms) → CHAMAR
    SOLDADOS; marca verde/vermelha no mundo (tapMarks).
14. **ADIANTAR ONDA** [O advanceWave]: botão na contagem "PROXIMA ONDA EM
    Xs" dá 3+N+1 recursos e zera a espera.
15. **Começo fiel**: 1 operária + 1 soldado + 1 exploradora [O gs()], 0
    recursos na carteira, formigas nascem a 8–22px do ninho.
16. visionScale exato (1+0.15·n+0.12·r), DEPOSIT_RADIUS 28, save com os novos
    campos da IA e fronteira recalculada no load.

### Validação (motor real, 60 Hz)
- 5 seeds × 300s: 0–2 mortes, rainha viva e alimentada, ninho intacto,
  ondas 1–2 repelidas (6 kills), 29–36% explorado, sem death spiral.
- 3 seeds × 600s com compras automáticas: 49–59 formigas, nível 16–17,
  ondas 1–5 repelidas, ninho cheio, rainha viva.
- `tsc --noEmit` limpo · **72/72 testes** (11 novos de integração) · build ok.

## Apêndice F — Fase 5A: baralho roguelike de 20 cartas (01/09/2026) ✅

Implementa o design do doc `03_BARALHO_ROGUELIKE.md` (Parte 6 do dossiê) com as
20 cartas que provam TODOS os mecanismos do sistema. Código novo em `src/roguelike/`.

### Arquivos novos
- `roguelike/cards.ts` — catálogo declarativo das 20 cartas (interface CardDef),
  raridades (cor/peso), 7 eixos, slots 3/3/2. Efeito NÃO vive aqui.
- `roguelike/modifiers.ts` — ÚNICO lugar que traduz carta em efeito
  (`cardModsFrom(cards) → CardMods`, ~20 campos).
- `roguelike/cardPool.ts` — sorteio do painel: peso de raridade por nível
  (comum max(60−2,2n,20), incomum 25+0,5n, rara 10+0,9n, épica 4+0,6n,
  lendária 1+0,2n), sinergia +15%/carta do eixo (teto +60%), teto de slots,
  trava anti-vazio com fallbacks (cura 25% / +30 folhas / +100 XP).
- `roguelike/cards.test.ts` — 24 testes (catálogo, pesos, sinergia, slots, mods).
- `ui/CardPanel.tsx` + `cardPanel.module.css` — modal de level-up: moldura
  colorida por raridade, pips de nível, brilho dourado pulsante em carta
  sinérgica, teclas 1–3, responsivo (coluna no celular).

### As 20 cartas (valorPorNivel = TOTAL por nível, ganho marginal decrescente)
- **Ninho (6)**: Paredes grossas ⚪ +40/70/95 HP (cura o delta ao subir) ·
  Terra batida ⚪ +2/3/4 armadura flat (dano mín. 1) · Reparo rápido 🟢
  +50/85/115% (regen E reparo) · Despensa 🟢 +30/50/65% armazenamento
  (teto base 200/recurso, toast ao desperdiçar) · Espinhos de raiz 🔵
  reflete 30/50% do dano ao atacante ≤160px · Fortaleza viva 🟣 +3/5 HP/s
  fora de combate.
- **Colônia (4)**: Passo firme ⚪ +8/14/19% vel todas · Ninhada maior 🟢
  +2/3/4 pop máx (teto 60 [P], loja bloqueia) · Divisão de trabalho 🟢
  +10/17/23% (vel + dano + XP) · Feromônio de comando 🔵 +25/40%
  (anel de comando 14–48px ÷ mult → formigas mais juntas).
- **Rainha (4)**: Apetite contido ⚪ −12/20/27% dreno · Estômago amplo ⚪
  +25/42/57% fome máx (avisos/alimentação escalam por %) · Porção reforçada
  🟢 +2/3/4 por item · Rainha eterna 🟡 revive 1× com 50% fome/ninho.
- **Coletora (3)**: Passo leve ⚪ +12/20/27% vel · Mochila ⚪ +2/3/4 carga ·
  Faro apurado 🟢 +40/70/95px detecção.
- **Soldado (3)**: Mandíbulas afiadas ⚪ +4/7/9 dano flat (fora do crítico) ·
  Couraça ⚪ +15/26/35 HP (vivos ganham na hora) · Instinto de caça 🟢
  +50/85/115px agressão.

### Integração no engine
- `AntWorld.cardMods` + `SimHost.{addXp, grantResource, nestHpMax}`; XP de
  TODAS as fontes passa por `addXp` (eficiência); recursos por `grantResource`
  (teto Despensa); `nestHpMax()` inclui cartas; Rainha parametrizada
  (`QueenState.hungerMax`, `updateQueen(opts)`); `Clock` congela DENTRO do
  passo quando o painel abre.
- Level-up (curva [O] 50+25(n−1) intacta) → `onLevelUp(level, gained)` →
  painel de 3 cartas, `clock.paused = true`; level-ups em cascata empilham
  (`pendingCardPanels`); `chooseCard()` aplica via modifiers + side-effects,
  despausa e salva.
- Save v3: campos opcionais `cards`, `pendingCardPanels`, `queenReviveUsed`,
  `queen.hungerMax` — retrocompatível; painel pendente reabre no "continuar".
- Renascimento/nova run zeram o baralho (cartas são por partida [doc 03 §1]).

### Validação
- `tsc --noEmit` limpo · **103/103 testes** (12 arquivos: +24 do baralho,
  +7 de integração do painel) · `npm run build` ok.
- Cobertura testada: painel abre e congela no level-up; escolha aplica e
  despausa; Paredes grossas cura; Rainha eterna revive 1× e a 2ª é definitiva;
  Despensa teto 200→330; população 60 com Ninhada maior liberando +4;
  persistência de cartas + painel pendente no save.

## Apêndice G — Fase 5B: 48 cartas novas, evoluções, baús e slots (01/09/2026) ✅

Baralho final: **68 cartas jogáveis + 6 evoluções = 74 definições**, mantendo a
arquitetura 5A (catálogo declarativo → `modifiers.ts` tradutor único →
`cardPool.ts` sorteio com raridade/sinergia/efeito decrescente).

### O que entrou

**48 cartas novas por eixo** (níveis 3 com ganho decrescente, `descCurta` ≤60):
- **Colônia (5)**: Colônia unida 🟢 +10/15/20% aliados ≤80px · Mente-colmeia 🟣
  +10% colônia e +1 slot de especialização · Descanso noturno ⚪ regenera
  1/1.5/2 HP/s à noite · Preparo de inverno ⚪ +1/2/3 XP por recurso ·
  Trabalho em turnos 🟢 operárias forrageiam de noite.
- **Rainha (8)**: Postura acelerada ⚪ −11/22/33% intervalo de ovos · Ninhada
  dupla 🟢 15/25/35% chance de 2 ovos · Saciedade duradoura ⚪ 20/30/40s sem
  fome após comer · Força real 🟡 soldados +25/42/57% HP · Fertilidade 🟣
  +25/50/75% ovos por postura · Devoradora voraz ⚪ −30/50/70% dreno ·
  Ovo de escolha 🟡 escolhe a classe do próximo ovo · Instinto guerreiro 🟢
  1º ovo de cada onda é soldado.
- **Operária (7)**: Carregadora 🟢 descarga +1/2/3 item · Passo interno ⚪
  +18/32/46% vel perto do ninho · Mãos hábeis 🟢 repara 5/8/11 HP/s ·
  Turno extra ⚪ +1/2/3 teto de operárias · Engenheiras 🟡 reparam mesmo em
  combate · Instinto de retorno 🟢 foge a 140/180/220px · Casca dura ⚪
  operárias +16/26/40 HP.
- **Exploradora (9)**: Olhos largos 🟢 +25/50/70px visão · Pernas longas ⚪
  +14/24/34% vel · Sentido de recurso 🟣 detecta tudo no mapa · Mapeadoras
  ⚪ mapa revela 40/60/80% passivo · Caçadora de tesouros 🟢 +7/12/17%
  chance de baú · Vanguarda 🟢 +15/25/35% XP por área nova · Faro de batalha
  ⚪ +2/4/6 XP por kill · Ninho seguro 🟢 explorer revive 1×/partida ·
  Persistência 🟡 XP de área dobra.
- **Soldado (8)**: Golpe preciso ⚪ +8/15/23% crítico · Coletor de quitina 🟢
  +1/2/2 quitina por chefe · Provocação 🟢 inimigos a 140/220/300px persegue
  o soldado · Fúria da colônia ⚪ +2/4/4% dano por formiga viva (máx 30/45/60%)
  · Comando 🟡 soldados causam +30/50/70% · Fúria assassina 🟢 +25/42/57%
  dano vs chefes · Suporte tático ⚪ aliados ≤130px +12/20/27% dano ·
  Reflexos rápidos 🟢 esquiva 12/20/27%.
- **Comportamento (11)**: Enxame de mordidas ⚪ 1/2/4 dano/0,5s por formiga ≤40px
  · Espinhos do ninho 🟢 8/12/17 dano/s ao atacante · Armadilha de resina 🟢
  prende 2s, recarga 20/15/10s · Nuvem de feromônio 🟡 zona +15/30/45% vel
  · Chuva de ácido 🟣 10/16/22 dano/20s no maior grupo · Muralha de
  defensores 🟢 2 guardas por 15/20/25s quando o ninho é atacado ·
  Investida do gigante 🟣 12/20/28 dano a cada 8s · Feromônio de fúria 🟡
  +50% dano com ninho <50% · túnel de fuga ⚪ operárias escapam 2×/onda ·
  reciclagem 🟢 25% dos custos devolvidos · alerta precoce ⚪ +5/10/15s
  antes da onda.

**6 evoluções** (🟣 lendaria, receita = base no máx + suporte nível ≥1, nível
mínimo 6–8; substitui as cartas base no baralho):
Legião de ataque (Mandíbulas+Comando) · Caravana de recursos (Mochila+Passo
leve) · Coração dourado (Porção+Devoradora: ovos grátis com fome ≥80%) ·
Bastião (Paredes+Muralha) · Espiral tóxica (Toxina+Nuvem) · Sentinela
(Couraça+Provocação).

**Slots com teto (§6)**: passiva 2→6, especialização 3→6, comportamento 2→4;
evolução não gasta slot. Slot cheio → no máx 1 carta nova/painel marcada
"♻ TROCA": abre diálogo de substituição (reembolso de XP = níveis×25,
~50%) ou recusa (carta devolvida).

**Baús (§7)**: comum no mapa (500px+, revelado pela exploradora; onda limpa
25%+bonus, máx 3 no mapa) → painel de 3; chefe → 5 escolhas com rara+
garantida + 2 quitina; 2º chefe → lendário de 3 com evolução disponível
garantida na 1ª posição. Quitina é a moeda das classes (Fase 5C).

**Classes bloqueadas (§8)**: 17 cartas exigem Defensora (5) / Tóxica (6) /
Gigante (6) desbloqueadas — fora do sorteio até custar quitina (próxima fase).

### Integração no engine
- Produção de ovos na Rainha (`updateQueenProduction`: ciclo
  operária→soldado→operária→exploradora, custo 3 itens, ninhada dupla,
  Coração dourado grátis); saciedade pausa o dreno.
- `Scene`: `chests`/`traps`/`pheromoneZone`; `HudState`: quitina, cartas com
  slots, `replaceDialog`, `cardPanel.origem`; Renderer desenha zona de
  feromônio (anel 190px), armadilhas (🪤) e baús (🎁 com bob).
- Painéis por origem (nível/baú comum/chefe/lendário) em fila tipada;
  substituição com reembolso; guardas temporários não contam no cemitério;
  save v3 estendido (quitina, baús, slotBonus, traps recalculadas, ovo/saciedade).
- UI: CardPanel com badges ♻ TROCA/✨ EVOLUÇÃO, diálogo de substituição,
  aba CARTAS no menu de pausa (slots por categoria com pips), quitina no HUD.

### Validação
- `tsc --noEmit` limpo · **142/142 testes** (13 arquivos: +20 do baralho 5B,
  +14 de integração: ovos/ciclo, coração dourado, saciedade, baú revelado,
  chefe→baú de 5, 2º chefe→lendário, evolução substitui base, substituição com
  reembolso, armadilha prende 2s, provocação redireciona inimigo, espinhos,
  chuva de ácido, guardas temporários, vanguarda dá XP, persistência) ·
  `npm run build` ok.
