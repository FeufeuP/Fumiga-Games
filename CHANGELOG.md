# 🐜 CHANGELOG — Formigueiro

Formato: fase do plano (`01_PLANO_DE_DESENVOLVIMENTO.md`) → o que entrou.

---

## 0.1.0 — Reconstrução: Fases 1 e 2 (2026-08-31)

> Contexto: o código-fonte da implementação anterior nunca foi enviado ao
> repositório (só docs + APK). Esta é a **reconstrução do zero** seguindo o
> dossiê, o plano e as decisões D1–D6 de 28/08/2026.

### Fase 1 — Fundação
- **Arquitetura híbrida do plano**: Canvas 2D puro para o mundo (60 fps,
  zero React) + React 18 com CSS Modules para a interface + store próprio
  com `useSyncExternalStore` na ponte.
- **Stack**: Vite 5 + TypeScript strict + Vitest. Build multi-arquivo com
  `base: './'` (pré-requisito WebView, doc 07).
- `core/constants.ts` — TODOS os números de balanceamento (base
  `04_CONSTANTS_PROPOSTAS.ts` + ajustes D2/D4/D6: mundo grande, ordem
  corrigida dos mapas, calmaria fixa de 30s, paleta GRASS do gramado).
- `core/rng.ts` — RNG mulberry32 semeado; runs reproduzíveis (regra #3).
- `core/clock.ts` — delta fixo de 60 Hz, clamp de 250ms, sem spiral of death.
- `core/events.ts` — barramento tipado; o motor emite, save/UI escutam.
- `engine/spatialHash.ts` — vizinhos em O(1) (regra #1 de performance).
- `engine/fogOfWar.ts` — névoa com camadas revelado (permanente, RLE no
  save) e ativo (recalculada a 4 Hz), célula de 24px.
- `render/spriteRegistry.ts` — contrato da Parte 12.5 (id, dimensões,
  âncora, hitbox 70%, frames); placeholders geométricos da Parte 12.4.
  Lógica nunca importa imagem (regra #1 de engenharia).

### Fase 2 — Fatia vertical jogável (a run já roda ~3 minutos)
- **Mapa Campo** 3400×2400 (D2: mundo grande com câmera — seguir/livre,
  suavização com zona morta, WASD/setas, arrasto, CENTRALIZAR, PRÓXIMA
  FORMIGA). Gramado com ~3.600 props determinísticos por seed fixa do mapa.
- **Ninho**: monte de terra clicável no centro (0.50, 0.52), HP 400,
  estoque 200.
- **Coletora** completa: procurar (só recurso revelado) → colher (0,8s/un) →
  carregar (até 3) → voltar → depositar.
- **Operária** (interna): alimenta a Rainha (1 comida = 5 fome, a cada 2s,
  enquanto não saciada) e repara o ninho (10 HP/s).
- **Exploradora**: revela a névoa preferindo células desconhecidas.
- **Soldado**: patrulha o anel do ninho (combate chega na Fase 4).
- **Rainha** (docs/02 L1): fome 100 drenando 1/s; faixas saciada/normal/
  faminta/crítica/inanição com produção +10% / normal / +50% tempo /
  parada / 3 HP/s; produção serial ovo 6s → larva 8s → pupa 6s = 20s,
  fila de 5; derrota total quando a Rainha cai.
- **HUD da Parte 3.2**: painel do ninho, recursos no estoque, FOME e
  COMIDA nas posições normalizadas, toasts com os textos do original
  ("A rainha está com fome!...", agora com acentos).
- **Menu inicial da Parte 3.1** com Rainha placeholder e CONTINUAR quando
  há save.
- **Esqueleto do interior (Fase 3)**: as 11 salas nas coordenadas exatas
  da Parte 3.3 + FOME/COMIDA sobre a Sala da Rainha; mundo pausa lá dentro.
- **Save v1 desde o primeiro dia** (regra #6): envelope versionado +
  checksum FNV-1a, gatilhos imediato/debounce 5s/periódico 30s
  (lacuna L11), salva em visibilitychange/beforeunload.
- **Alvos de toque ≥ 34px** em ponteiro grosso e painel de produção à
  direita no mobile (lições da Fase 8 anterior).

### Testes — 46 passando
- RNG determinístico, curva de XP (D3b), economia (teto do estoque),
  névoa (revelação + RLE), geração de mundo (determinismo, clareira do
  ninho, densidade), produção da Rainha (tempos por faixa de fome),
  loop econômico da coletora de ponta a ponta e **smoke test do motor
  integrado** (2 minutos de simulação, produção, inanição, teto de
  população).

### Pendências known
- ESLint/Prettier ainda não configurados (entram no fechamento formal de fase).
- Combate/ondas (Fase 4), roguelike (Fase 5), meta (Fase 6), backup
  rotativo + migrações de save (Fase 7), APK (Fase 8).
- Interior funcional completo (Fase 3): salas além de SAÍDA/RAINHA são
  esqueleto.

---

## 0.2.0 — Reconstrução FIEL ao HTML original (2026-08-31)

> Nova direção definida pelo usuário: antes de evoluir, deixar a recriação
> **o mais fiel possível ao jogo do `Formigueiro.original.html`** — design,
> mecânicas, sprites das personagens, telas de menu e de jogo (não a
> estrutura do código). Os 39 sprites originais foram extraídos do HTML e
> viraram a base visual (`src/assets/sprites/`).

### Fidelidade — números e mecânicas extraídos do bundle
- **Formigas** (K0): Operária 22px/30HP/5dano · Soldado 44px/60HP/10 ·
  Exploradora 20px/28HP/6. Velocidade **[O] antMoveSpeed**: base 82,
  exploradora ×1.35 (110.7), carregando ×0.9, upgrade +10%/nível.
  Desenho com âncora (43, 45.5)/3, 7 frames, recolor por pixel:
  soldado `#d9413a/#8c1f1f`, exploradora `#3fae5a/#1f6b38`.
- **Inimigos** (Ur): 12 espécies com hp/dano/velocidade/aggro/escala/xp
  exatos. Poder da onda escala hp, dano, escala e alcance:
  `power = min(0.5·1.1^(n−1), 3)`.
- **Ondas** (ZA/Tr/LA/U0/CA): 20s combate + 90s calmaria, 2N inimigos em
  lotes de 2, máx. 100 vivos, **chefe a cada 15 ondas** + 2 escoltas a 0.5.
  Recompensa: 3+2N folhas, XP 15+5N, ninho +20%.
- **Chefes**: 6 mapas com stats próprios (Formiga Vermelha Rei 1500HP …
  Mariposa Tita 5200HP) e drops por recurso. Desenho `scale×0.42` com halo
  pulsante `scale×(0.52+0.04·sin(t·3))` **[O]**.
- **Rainha**: fome 100, drena ⅓/s, +8/item, come 1 item a cada 3s por
  operária até fome 90, avisos em 30/10 com histerese, morte a 0.
- **Ninho**: 400HP, regen 1.2/s sem inimigo a 320px, operárias reparam
  10/s cada quando destruído.
- **Coleta [O N0/R0/Ii]**: detecção 150×visão, coleta a 18+tamanho/2,
  tamanhos Ii (folha 28, cogumelo 40…), sorte 10%×nível, XP 3+boost por item.
- **Mapas**: 6 biomas com seeds fixas (1234/9876/3333/4444/5555/6666),
  contagens de cenário e fauna próprias, desbloqueio por exploração
  (30%→Pântano … 70%→Selva), ninho a 84px.
- **XP [O qa]**: nível n = 50+25(n−1).

### Telas
- Menu com `menu_background.jpg` + botões de som originais; NOVO JOGO /
  CONTINUAR.
- HUD fiel: nível+XP, onda/contagem, chefe com barra, carteira por recurso,
  FOME da rainha e NINHO em barras, toasts do original.
- **Loja**: 16 melhorias do original em 4 abas com custo dinâmico
  `amount + step × compras` (+5 formigas nas compras de classes).
- **Mapas**: seletor com bloqueio/liberação e "VOCÊ ESTÁ AQUI".
- Interior: madeira `interior_wood_tile.png`, rainha `hero_ant.png`, FOME.
- Game over: "A RAINHA CAIU" com estatísticas da run.
- Áudio WebAudio sintetizado (clique, onda, chefe, nível, morte).

### Arquitetura
- `GameEngine.create()` assíncrono (sprites carregados antes do menu).
- Save **v2** consolidado em 1 arquivo: carteira, melhorias, ondas por
  mapa, rainha, formigas, recursos e névoa (RLE) + checksum.
- Mundo/física/entidades reescritos para o modelo do original; save v1 e
  sistemas antigos (economia de comida única, produção em fila) removidos.

---

## 0.3.0 — Ciclo A: lacunas de fidelidade fechadas (2026-08-31)

> Pesquisa direta no bundle concluída; sistemas desconhecidos decodificados
> e implementados com os valores exatos.

### Sistemas novos [O]
- **Smash do chefe**: após o 1º golpe recebido, ataque em área a cada 15s —
  dano + arremesso das formigas (300–380 px/s + 260–350 para cima) com
  física de voo (z/vx/vy/vz) e aterrissagem.
- **Barra do chefe** só aparece 4s após dano (bossAggroT).
- **Cemitério**: formiga morta derruba a carga no chão e entra na fila de
  respawn (15s ×(1−0.3·upgrade), mín. 3s) — morte não é mais permanente.
- **Rally ATACAR!/COLETA!**: botões do HUD com cooldown 20s/25s; soldados
  atacam 45% mais rápido por 6s e avançam; operárias ×1.6 por 8s.
- **Regeneração de recursos**: a cada 0.8s até 2 nós por tipo até
  `round(maxRes × clamp(explorado%, 15%, 100%))`, sempre em área revelada.
- **17ª melhoria** `nesthp` (+100 HP do ninho) com custo MULTI-recurso
  `ob(l)` (nível 1: 30 folhas; nível 6: 6 tipos de uma vez).
- **44 missões** e **27 conquistas** exatas do bundle, com recompensas
  (XP, recursos, formigas) e progresso automático; totais cumulativos.
- **Renascimento**: zera a run (missões incluídas), mantém conquistas e
  totais, concede +12% vel, +12% visão, +1 carga, +10% dano, +15% HP e
  +20% XP por renascimento. Placar: missões×100 + renascimentos×200.
- **Nuvens** à deriva sobre o mapa; recursos com flutuação senoidal
  (phase); tremor de câmera no smash e dano ao ninho.

### Telas
- HUD: botões de rally pulsando quando prontos, "EXPLORADO N%".
- **Interior completo**: 9 salas nas posições do bundle — cemitério
  (renascimentos com contagem), conquistas, missões, formigas, mapa,
  melhorias, inventário, renascer (com bônus e placar) e sala da rainha.
- **Menu de pausa** com CONTINUAR/ESTATÍSTICAS/CONQUISTAS/PLACAR/SAIR.
- Game over com missões, conquistas, renascimentos e placar.

### Salvar
- **v3**: totais por recurso/inimigo, missões, conquistas, renascimentos,
  contagens de formigas e fila do cemitério (v2 aceito com defaults).
