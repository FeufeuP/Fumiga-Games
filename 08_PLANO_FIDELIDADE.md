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
