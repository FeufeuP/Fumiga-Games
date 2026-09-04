# 🐜 CHANGELOG — Formigueiro

Formato: fase do plano (`01_PLANO_DE_DESENVOLVIMENTO.md`) → o que entrou.

---

## 0.5.0 — Chão procedural por tileset + fonte pixel oficial (2026-09-02)

### Chão novo (arte de referência do autor)

- **Tilesets extraídos de `images/chão {campo,pântano,deserto}.jpeg`** por
  `scripts/extract-tiles.py`: detecta a grade da folha pelas faixas pretas,
  recorta cada quadro e escreve `src/assets/tiles/<bioma>.png` + `tiles.json`.
- **Tiles tileáveis de verdade**: bordas opostas fundidas (wrap-blend) — a
  costura medida ficou em **0.00** de diferença.
- **Sem grade fantasma**: a arte desenha uma moldura de folhagem em cada quadro
  (medida: vai até ~24% da meia-largura). A textura de base passa a sair do
  **miolo** (34% de recorte), com devignette + achatamento de baixa frequência.
  A vinheta caiu de **+32 → +0,5** níveis e a variação de brilho entre tiles
  do mesmo grupo de **10,0 → 0,9**.
- **Classificação relativa por bioma** (k-means/maior-vão no eixo verde-vermelho):
  cada folha tem paleta própria, então "base" e "mancha" são descobertas
  comparando os tiles entre si. Limiar fixo dividia o pântano ao meio e o chão
  saía num xadrez verde/marrom.
- **Geração procedural** (`src/render/terrain.ts`): value noise fBm de 3
  oitavas, determinístico por `(x, y, seed)` — nada vai para o save.
- **Transição suave** por **máscara direcional**: o tile só desbota no lado em
  que encosta em terreno mais raso, com contorno ondulado por harmônicos. A
  primeira tentativa (dithering de Bayer no limiar) picotava a clareira —
  **26% dos tiles de terra ficavam isolados**; agora são **<10%**, e as manchas
  saem coesas com beirada orgânica.
- **Cache em chunk** de 8×8 tiles com LRU (64 blocos): ~12 blits por frame em
  vez de ~1500 `drawImage`.
- Correção de precisão: o hash usava `seed * 1442695040888963407`, que estoura
  o float64 e **colapsava o ruído num valor só** (mapa inteiro de um tipo).
  Agora é tudo `Math.imul` em 32 bits — 260/260 células distintas.

### Fonte

- **Fonte pixel oficial** gerada de `images/fonte pixelada.jpeg`:
  `scripts/extract-font.py` recupera o grid nativo da arte (pixelão de 3px,
  **pureza 0.0 — corte sem perda**) e lê as 52 letras na resolução original.
- Os caracteres que a folha não traz são **desenhados no mesmo esqueleto**:
  10 numerais, 30+ sinais de pontuação e **24 acentuadas** (Á Â Ã À É Ê Í Ó Ô
  Õ Ú Ü Ç…), compostas sobre a letra base — 121 glifos no total.
- `scripts/build-font.py` vetoriza para **WOFF2 de 2,4 KB** (fonttools), então
  a UI inteira usa `font-family` normal e o texto escala sem borrar.
- Aplicada em toda a interface e também no canvas; os `'Courier New'` soltos
  viraram `var(--font-pixel)`.

### Verificação

- `tsc` limpo; **152/152 testes** (8 novos em `src/render/terrain.test.ts`,
  cobrindo determinismo, coesão das manchas e o colapso do ruído).
- Boot real em DOM: menu → JOGAR → chão desenhado por tiles, **0 erros**.
- `scripts/preview-terrain.mjs` renderiza o chão offline (mesma matemática)
  para inspecionar bioma/semente sem abrir o navegador.

## 0.4.0 — Interior rev 2.0: estrutura de formigueiro REAL (2026-09-02)

- **Layout transcrito de uma imagem de referência real** (corte de ninho
  em terra): segmentação por contraste local (δ=18) + filtro de maioria +
  componentes conexos → posições (cx/cy) e tamanhos das 10 câmaras + eixo.
- **Eixo serpenteante real**: polilinha (0.50,0.09)→…→(0.46,0.86) suavizada
  por Catmull-Rom→bezier — desce da boca, deriva à esquerda no meio e volta
  ao centro na base (Sala da Rainha).
- **Câmaras com tamanhos variados** como na referência (MELHORIAS grande no
  meio-esquerdo, MAPA/FORMIGAS compactas à direita etc.), semântica de
  profundidade preservada (logística rasa → meta profunda).
- **Relaxação determinística em runtime**: pares que colidam no viewport
  atual são separados (passo limitado + resfriamento, ≤600 iter, sem
  aleatoriedade); deriva 0pp em telas grandes (fiel), 5–27pp em apertadas.
- Câmaras dimensionadas por `clamp(84px, 14.5vmin, 140px) × s` — encolhem
  em telas baixas/paisagem.
- **Validado em 14 viewports** (320×690 → 1920×1080, retrato+paisagem):
  zero sobreposição visual; galerias ainda terminam na ponta das bocas.
- Doc 10 → rev 2.0; `tsc` limpo; 144/144 testes; executável regenerado.

## 0.3.5 — Túneis conectam nas bocas (sem sobrepor salas) (2026-09-02)

- **Correção rev 1.2**: as galerias avançavam ~7un sobre as câmaras (o traço
  cruzava a borda escavada). Agora o fim de cada galeria é calculado pela
  **ponta da boca** — `tipX` derivado dos mesmos harmônicos do contorno da
  caverna — e o cap arredondado (26px) encosta na silhueta sem cruzá-la.
- Endpoint convertido de unidades da caixa (120) para % da tela usando a
  largura real do `clamp()`; layout reconstruído no resize (`useMemo`).
- Verificado numericamente em 320/390/768/1366/1920px: margem uniforme de
  0,15un entre o alcance do cap e a ponta da boca — zero sobreposição.
- `tsc` limpo; 144/144 testes; spec 10 em rev 1.2.

## 0.3.4 — Câmaras escavadas orgânicas (doc 10, rev 1.1) (2026-09-02)

- **As 10 salas deixaram de ser botões-retângulo**: agora são câmaras
  escavadas — blobs SVG orgânicos gerados por harmonias de raio (2f/3f/5f)
  com fases sorteadas (stream `Rng(0xcafe)`, independente do layout),
  achatados verticalmente, cada uma com contorno único.
- **Boca da câmara**: abertura afundada (~32% do raio) no lado voltado ao
  eixo; as galerias agora terminam NA PONTA de cada túnel, entrando ~7un
  pela boca — túnel e sala se encontram de verdade.
- Camadas de escavação: borda externa `#14100c` → aro de terra `#8b562d` →
  cavidade `#1f1008` → piso de terra `#3a2012`; ícone+rótulo flutuam na
  cavidade com sombra dura; hover clareia a cavidade e amplia o ícone.
- Spec atualizada (§8.1 + histórico 1.1); `tsc` limpo; 144/144 testes;
  executável único regenerado.

## 0.3.3 — Interior spec 1.0: formigueiro real de verdade (2026-09-02)

- **Correção do 0.3.2**: galerias sem `position: absolute` deixavam as 10
  câmaras amontoadas no canto superior esquerdo.
- **Novo documento `10_DESIGN_INTERIOR_FORMIGUEIRO.md`** (spec 1.0): design
  completo do ninho — topologia exata de **12 nós** (1 saída + 10 câmaras +
  1 sala real) e **11 túneis** (eixo central + 10 galerias), bandas de
  profundidade semânticas, offsets seedados, paleta e regras 16-bit.
- **Interior reconstruído conforme a spec**: superfície com grama + monte
  de terra e SAÍDA plantada nele; eixo central serpenteante desenhado em
  SVG (traço duplo borda/miolo, `non-scaling-stroke`); 10 câmaras em
  profundidades distintas (13,8%→67,3% da tela) ligadas por galerias bezier
  curvas; Sala da Rainha na base. Distribuição verificada: sem sobreposição
  (gap mínimo 10,5pp por lado) e offsets 8,8–21,2%.
- `tsc --noEmit` limpo; 144/144 testes; executável único regenerado.

## 0.3.2 — UI: fontes maiores + formigueiro real 16-bit (2026-09-02)

- **Tipografia**: +4px em 81 tamanhos de fonte da interface (HUD, loja,
  mapas, painéis, menus) — textos pequenos saíram de 9–13px para 13–17px.
- **Interior redesenhado** (pixel-art 16-bit, corte transversal de ninho
  real): SAÍDA no topo (sprite btn_back + rótulo), túnel central escavado
  descendo até a SALA DA RAINHA na base (moldura dourada) e **10 câmaras
  laterais espalhadas de forma orgânica** — seed fixa via `Rng` mulberry32:
  desorganizado como um formigueiro de verdade, porém estável entre
  sessões. Cada câmara liga ao túnel por uma galeria de comprimento variável.
- **CARTAS, CLASSES e CONQUISTAS saíram do menu de pausa** e viraram câmaras
  do formigueiro (🃏 CARTAS, 🦴 CLASSES, 🏆 CONQUISTAS). A pausa fica com
  CONTINUAR / ESTATÍSTICAS / COLÔNIA / PLACAR / SAIR.
- CSS morto do pause removido; `tsc --noEmit` limpo; 144/144 testes.

## 0.3.1 — Botão voltar novo, plano 09 e executável único (2026-09-01)

- **`btn_back.png` redesenhado**: quadrado 112×112 (múltiplo 2× do alvo de 56px
  do CSS, `image-rendering: pixelated`), madeira nobre + moldura dourada +
  seta de retorno, fundo externo 100% transparente (croma-key com
  descontaminação de borda — zero resíduo, contorno com anti-alias).
- **`Formigueiro-Jogo-Completo.html`**: executável único offline (~0,98 MB) —
  JS + CSS inlinados e todos os 39 assets embutidos como data URI.
  Gerado por `npm run build:single` (`scripts/build-singlefile.mjs`),
  atendendo ao critério 4 de entrega do doc `09_PLANO_PROXIMAS_ATUALIZACOES.md`.
- **Docs**: adicionado `09_PLANO_PROXIMAS_ATUALIZACOES.md` (Fases 6A–10A:
  talentos, berçário, bestiário, save import/export + slots, Endless/Boss
  Rush, clima por bioma, engenheiras) — nenhuma dessas fases implementada
  ainda; são planejamento.
- Testes: 144/144 passando; `tsc --noEmit` limpo.

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
