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
