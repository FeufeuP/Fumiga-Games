# 🐜 FORMIGUEIRO — Riscos: situação real + decisões tomadas

> ✅ **Todas as 6 decisões foram respondidas pelo usuário em 28/08/2026 e já
> estão implementadas.** Ver §Decisões no fim do documento.

> Documento de resposta direta: **cada risco verificado no código**, e a lista
> fechada de decisões que dependem de você.
> Verificado em 28/08/2026 com o servidor rodando e medição por Playwright.

---

## Parte A — Os 7 riscos, um por um

### 1. 60 inimigos + 20 formigas + partículas travando em mobile
**Impacto: alto → ✅ RESOLVIDO E MEDIDO AGORA**

A mitigação prometia "teste de carga na Fase 4". Eu ainda não tinha feito esse teste —
os scripts que existiam (`stress.mjs`, `mob.mjs`) mediam FPS com a população *normal*
de 6 formigas, não com a carga do risco. **Fiz o teste de verdade agora**
(`scripts/carga.mjs`), injetando exatamente a carga descrita:

| Cenário | Carga | FPS |
|---|---|---|
| Desktop 1280×800 | 20 formigas + 60 inimigos + 306 props | **59** |
| Mobile 360×640 | 20 formigas + 60 inimigos + 306 props | **60** |

Zero erros de console nos dois. Spatial hash ativo em `GameEngine`, `collector`,
`scout`, `soldier` e `enemyAI`.

**Ressalva honesta:** o *pool de objetos* prometido na mitigação **não existe**. Não fez
falta porque o alvo já é 60 FPS, mas se as partículas do roguelike (Fase 5) pesarem,
é a primeira otimização a fazer.

---

### 2. HTML single-file estourando o tamanho
**Impacto: médio → ✅ RISCO EXTINTO**

Você cancelou o single-file e pediu projeto multi-arquivo. O plugin do Vite foi
removido e não será reintroduzido. O build atual sai em **4 arquivos** (~196 KB,
21,5 KB gzip do jogo + 45,2 KB gzip do React). Preact deixa de ser necessário.

---

### 3. ~70 cartas virando trabalho infinito
**Impacto: médio → ⬜ AINDA ABERTO (é a Fase 5, não começou)**

`src/roguelike/` tem só `xp.ts`. A pasta `cards/` está vazia. As 68 cartas estão
**projetadas** em `docs/03_BARALHO_ROGUELIKE.md`, nenhuma implementada.
A mitigação (20 cartas na Fase 5A provam o sistema) continua válida e é o plano.

---

### 4. Ritmo lento (chefe só aos 18 min)
**Impacto: médio → ✅ RESOLVIDO**

`WAVES.USE_DYNAMIC_CALM: true` está ativo em `constants.ts`, com a tabela
`DYNAMIC_CALM` encurtando a calmaria de 90s → 40s. Chefe 1 cai para ~14 min.

⚠️ **Mas a análise do original mudou o contexto:** o jogo real usa 20s de combate +
**90s fixos** de calmaria. Ou seja, meu ajuste é uma *melhoria proposta*, não uma
correção. Fica sob a sua decisão **D6** abaixo.

---

### 5. Save corrompendo entre versões
**Impacto: médio → 🔴 NÃO RESOLVIDO — nada foi implementado**

`src/save/` está **vazia**. Não há `localStorage`, checksum, backup rotativo nem
migração. O `version` que aparece em `store.ts` é outra coisa: contador interno de
mudanças para o React, sem relação com versão de save.

A mitigação dizia "desde a Fase 1" e isso **não foi cumprido**. É a Fase 7 do plano.
O original usa `localStorage` na chave `formigueiro-save-v1`, sem checksum — então
aqui vamos além dele.

---

### 6. Arte oficial chegando com dimensões diferentes
**Impacto: baixo → ✅ RESOLVIDO, e o risco virou realidade**

O contrato de sprite existe em `spriteRegistry.ts` com `scale`, `anchorX/anchorY` e
`hitbox` (padrão 70% do sprite), e há função de troca que "preserva dimensões, âncora
e hitbox — só a imagem muda".

**E foi exatamente o que aconteceu:** a arte oficial apareceu (39 sprites dentro do
`Formigueiro.html`) em dimensões variadas — 32×32 até 512×379. O contrato absorve.

---

### 7. Coordenadas da Parte 3 conflitando com o HTML real
**Impacto: baixo → ✅ RESOLVIDO na Fase 0**

O conflito real apareceu e é **maior do que o previsto**: o mundo do original é
3400×2400 a 4000×3000 com câmera, contra 960×720 da Parte 3. A regra que eu tinha
escrito ("o dossiê tem precedência") **não serve mais** — é a decisão **D2** abaixo.

As coordenadas do *interior* (Parte 3.3), essas sim, foram implementadas e conferem.

---

### Placar

| Situação | Riscos |
|---|---|
| ✅ Resolvido | 1, 2, 4, 6, 7 |
| 🔴 Não resolvido | **5 (save)** |
| ⬜ Não começou | 3 (cartas — Fase 5) |

---

## Parte B — O que só você pode decidir

Seis decisões. Todas vêm do choque entre o jogo original e o dossiê.

### D1 — Quantas classes de formiga?
| | |
|---|---|
| **Original** | 3: Operária (coleta), Soldado (ataca), Exploradora (revela) |
| **Dossiê** | 4+: Coletora coleta, Operária vira construtora do ninho; e ainda Defensora, Tóxica, Gigante |

O dossiê inventa a Coletora e muda o papel da Operária. Meu código já tem as 4.
**a)** Voltar às 3 originais · **b)** Manter as 4 do dossiê · **c)** 4 agora + as
outras 3 como desbloqueio.

---

### D2 — Tamanho do mundo e câmera
| | |
|---|---|
| **Original** | 3400×2400 a 4000×3000, câmera com scroll, modo livre/seguir, botão centralizar |
| **Dossiê** | 960×720, tela fixa |

O mundo real é **12 a 17× maior**. Isso muda névoa de guerra, minimapa, IA de
patrulha e o layout do HUD. É a decisão de maior impacto técnico.
**a)** Mundo grande com câmera (fiel ao original) · **b)** 960×720 fixo (fiel ao
dossiê, mais simples) · **c)** intermediário, ex. 1920×1440.

---

### D3 — Curva de XP
| | Nível 10 | Nível 20 |
|---|---|---|
| **Original** `50+25n` | 275 | 525 |
| **Dossiê** `10n+8n²` | 900 | 3.400 |

A do dossiê é **6,5× mais lenta** no nível 20. Como cada nível dá uma carta, isso
define o ritmo inteiro do roguelike.
**a)** Linear do original · **b)** Quadrática do dossiê · **c)** Meio-termo.

---

### D4 — Como desbloquear mapas
| | |
|---|---|
| **Original** | % de exploração do mapa anterior (20% → 30% → 40% → 50% → 60/70%) |
| **Dossiê** | façanha específica + custo em quitina |

**a)** Exploração · **b)** Façanha + quitina · **c)** Os dois (o que vier primeiro).

---

### D5 — Usar os 39 sprites oficiais agora?
Eles existem e estão extraídos. A Parte 12 do dossiê manda usar placeholder até o
fim. Mas a arte final já está na mão.
**a)** Trocar agora (jogo bonito imediatamente) · **b)** Continuar com placeholder e
trocar no fim · **c)** Sprites reais onde existem, placeholder no resto (Rainha,
Defensora, Tóxica, Gigante e os chefes que faltam não têm arte).

---

### D6 — Ritmo das ondas
Original: 20s de combate + **90s fixos**. Meu ajuste: calmaria caindo 90→40s.
**a)** 90s fixos (fiel) · **b)** Manter minha calmaria dinâmica · **c)** Fixo, mas
menor (ex. 60s).

---

## Parte C — O que falta construir (não depende de decisão)

Ordem do plano, com esforço estimado.

| Fase | O que é | Situação |
|---|---|---|
| **4 — Combate e ondas** | elites, chefes, telégrafo de ataque, morte e cemitério | parcial: ondas e inimigos existem, faltam chefes |
| **5A — Roguelike** | 20 cartas, painel de escolha, raridades, XP por fonte | ⬜ não começou — **é o núcleo do pedido** |
| **5B — Roguelike** | as 48 cartas restantes, sinergias, evoluções, baús | ⬜ |
| **6 — Meta e conteúdo** | 6 mapas, 12 inimigos, 30 conquistas, missões, loja de quitina, renascimento | ⬜ |
| **7 — Persistência** | **save com checksum + backup + migração** ← risco 5 | 🔴 |
| **8 — Entrega** | build final, APK Android, ícones, teste em dispositivo | ⬜ |

Faltam ainda, dentro dessas fases: as 9 salas do interior que hoje são stub
(Cemitério, Conquistas, Missões, Mapa, Melhorias, Loja, Inventário, Renascer),
áudio WebAudio, e o sistema de partículas.

---

## Parte D — Minha recomendação

Se quiser um caminho pronto, eu seguiria assim:

1. **D5 = (c)** — plugar os sprites reais já. É a mudança de maior impacto visual
   pelo menor esforço, e o contrato de sprite foi feito exatamente para isso.
2. **D1 = (b)**, **D3 = (b)**, **D4 = (c)** — manter o dossiê, que é o seu pedido.
3. **D2 = (c)** — mundo intermediário 1920×1440 com câmera. Dá a sensação de
   exploração do original sem o custo de um mundo 17× maior.
4. **D6 = (b)** — calmaria dinâmica; 90s parados é muito tempo sem ação.
5. Depois: **Fase 5A** (o roguelike é o coração do dossiê), e **Fase 7** logo em
   seguida para fechar o risco do save.


---

## Parte E — Decisões do usuário (28/08/2026) e o que foi feito

| # | Decisão | Escolha | Situação |
|---|---|---|---|
| D1 | Classes de formiga | **(c)** 4 agora + 3 como desbloqueio | ✅ já era assim: `worker · collector · scout · soldier` liberadas; `defender · toxic · giant` com `unlocked: false` |
| D2 | Mundo e câmera | **(a)** mundo grande, fiel ao original | ✅ implementado |
| D3 | Curva de XP | **(b)** quadrática `10n + 8n²` | ✅ já era assim |
| D4 | Desbloqueio de mapas | **(b)** façanha + quitina | ✅ mantido, com a **ordem corrigida** do original |
| D5 | Sprites oficiais | **(b)** continuar com placeholder | ✅ nada alterado; os 39 PNG ficam guardados em `backups/sprites-originais/` |
| D6 | Ritmo das ondas | **30s de calmaria** | ✅ `CALM_SEC_DEFAULT: 30`, `USE_DYNAMIC_CALM: false` |

### D2 — o que a mudança para mundo grande envolveu

Foi a alteração mais profunda desde o início do projeto:

- **`core/constants.ts`** — `WORLD` passou a separar *viewport* (960×720, base da
  pixel art e da HUD) de *mundo* (por mapa). Novo bloco `CAMERA`. Cada mapa em
  `MAPS` ganhou `world`, `ground` e `groundAlt` com os valores reais do original.
  Ninho movido para o centro do mundo (`NEST_SPAWN.y` 0,72 → 0,52).
- **`render/Camera.ts`** (novo) — modos `follow`/`free`, suavização com zona morta,
  travamento nos limites do mundo, `toScreen`/`toWorld` e culling por retângulo.
- **`render/Renderer.ts`** — desenha dentro de `translate(-camera.left, -camera.top)`;
  culling em props, recursos, formigas e inimigos; névoa percorre só as células
  visíveis (eram ~21.000 por frame no maior mapa); fundo sólido fora dos limites.
- **`render/drawGrassland.ts`** — o chão cobre o mundo inteiro com as manchas
  geradas por hash determinístico **por célula de grade**, então só o que está na
  tela é desenhado, e o cenário não treme entre frames.
- **`world/world.ts`** — `worldSize`, `nestPositionFor`, mapa ativo global;
  recursos e props escalam por área (densidade constante); **spawn de inimigos
  agora nasce num anel ao redor do ninho, logo fora da tela** — na borda do mundo
  eles levariam minutos para chegar.
- **`engine/fogOfWar.ts`** — célula de 16 → 24px, grade dimensionada por mapa.
- **`ui/GameScreen.tsx`** — arrastar move a câmera, setas/WASD no modo livre,
  botões `CAM SEGUIR`/`CAM LIVRE` e `CENTRALIZAR`. Clique curto (< 8px de arrasto)
  no ninho ainda entra no interior.

**Medição depois da mudança:** mundo 3400×2400, **3.624 props**, 375 recursos,
20 formigas + 60 inimigos → **60 FPS no desktop e no mobile**, zero erros.

### Risco 5 — save resolvido

- **`save/saveSchema.ts`** — versão 3, checksum FNV-1a, RLE da névoa, migrações
  encadeadas (v1→v2→v3). A migração v2→v3 descarta runs antigas de propósito:
  as coordenadas eram de 960×720 e não há como reposicioná-las com segurança —
  o progresso permanente é preservado.
- **`save/saveSystem.ts`** — gravação imediata / debounce 5s / periódica 30s;
  **backup rotativo** e queda automática para o backup quando o checksum falha;
  exportar/importar; detecção de `localStorage` bloqueado.
- **`save/autoSave.ts`** — liga os eventos do jogo à gravação sem que o motor
  precise conhecer a persistência. Grava também em `pagehide` e
  `visibilitychange` (o último evento confiável em WebView Android).

**Verificado no navegador:** save de 1.133 bytes; névoa de 21.000 células
comprimida em **54 números**; recarregar a página restaura o progresso;
corromper o principal cai no backup **sem perder dados**.

### Ritmo com 30s de calmaria

| | Antes (90s) | Agora (30s) |
|---|---|---|
| Ciclo de uma onda | 110s | **50s** |
| Chefe 1 (onda 10) | ~18 min | **~7,5 min** |
| Onda 20 | ~37 min | **~17 min** |


---

## Parte F — Decisões da Fase 6 (meta-progressão)

Tomadas por mim durante a implementação, seguindo a regra combinada:
eu proponho os números, o usuário revisa e ajusta.

### F1 — Conteúdo veio do HTML original, não foi inventado
As 27 conquistas e 44 missões foram **extraídas do bundle** do jogo original
com os mesmos títulos, descrições, metas e recompensas. Quem jogou a versão
antiga reconhece tudo. Inventar conteúdo novo aqui seria trair a referência.

*Nota:* o original tinha os ids `a1`–`a30` mas só 27 conquistas de fato —
`a24`, `a25` e `a28` não existem no arquivo. Mantive a numeração original em
vez de renumerar, para o save antigo continuar batendo.

### F2 — Preços da loja calibrados contra a renda de quitina
Elite dá 1–2, chefe 3–5. Uma partida até a onda 20 rende ~15 de quitina. Daí:
melhoria de nível 1 ≈ uma partida curta; uma classe ≈ 2–3 partidas; a árvore
inteira ≈ 15 partidas. É a vida útil que queremos antes do renascimento.

| Item | Custo base | +por nível | Máx |
|---|---|---|---|
| Ninho Reforçado (+40 HP) | 8 | 6 | 5 |
| Despensa Inicial (+25 comida) | 6 | 5 | 4 |
| Casta Robusta (+10% vida) | 10 | 8 | 5 |
| Mandíbulas Hereditárias (+8% dano) | 12 | 9 | 5 |
| Memória da Colônia (+10% XP) | 14 | 10 | 4 |
| Carapaça Aproveitada (+15% quitina) | 15 | 12 | 3 |
| Ninhada Precoce (+1 operária e soldado) | 18 | 14 | 3 |
| Segunda Rainha (revive 1×) | 40 | — | 1 |
| Defensora / Tóxica / Gigante | 25 / 45 / 70 | — | 1 |

### F3 — O renascimento não pode apagar o que é permanente por contrato
O dossiê (Parte 4, linha 295) diz que a **quitina persiste após renascer**.
Estendi a mesma lógica para o que o jogador conquistou com esforço:
classes compradas, conquistas, mapas e cartas descobertas **ficam**.
O que zera são só as melhorias empilháveis — que é o que dá sentido ao ciclo.
Requisito para renascer: 1 chefe **e** onda 15. Um teste cobre cada garantia.

### F4 — Recompensa resgatada sem partida ativa
XP, comida e formigas são coisas *da run*. Resgatar no menu não tem onde
creditar. Em vez de perder o prêmio em silêncio, a conquista é marcada e a
interface avisa: "comece uma partida para usar o prêmio". As recompensas de
recursos viram **comida** (2,2 por unidade, a média do jogo), porque o
depósito estoca comida, não folha por folha.

### F5 — As três classes precisam resolver o que o Soldado não resolve
Senão são soldados caros. Cada uma tem uma regra de decisão própria:
- **Defensora** só considera inimigo dentro do anel do ninho — não é atraída
  para longe, que é justamente a falha do Soldado;
- **Tóxica** recua se o inimigo chega a menos de 45% do alcance dela;
- **Gigante** mira o inimigo mais próximo do **ninho** (não dela) e bate em
  área.

### F6 — Bestiário de 13 espécies com HP reescalado
O original usava 60–300 de HP; aqui a força da onda já multiplica de 0,50 até
3,0, então os valores foram divididos por ~4 preservando a **proporção entre
as espécies**: mosquito o mais fraco e rápido, formiga-leão o mais duro e
lento. Cada mapa tem fauna própria (a formiga-leão só aparece no Deserto,
a lacraia na Caverna e na Selva).

### Ponto a revisar com o usuário
- Quitina do chefe do Campo (3) segue parecendo baixa perto do custo da
  Gigante (70). Com a Carapaça Aproveitada no máximo sobe para ~4–5.
