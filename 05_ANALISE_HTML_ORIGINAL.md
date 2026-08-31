# 🐜 FORMIGUEIRO — Análise do HTML Original

> Cinco passagens da Parte 1.1 aplicadas ao **`Formigueiro.html`** — o bundle real
> do jogo (1,28 MB). Backup preservado em `backups/Formigueiro.original.html`
> **antes** de qualquer leitura, conforme exige a Parte 1.1.
>
> *(O `index.html` enviado antes era o shell do Vite e foi descartado a pedido do usuário.)*

---

## Resumo executivo

| | |
|---|---|
| Tamanho | 1.279.895 bytes (1,28 MB) em 30 linhas |
| Formato | build de produção Vite, single-file, JS minificado |
| Sprites embutidos | **39 PNG/JPG reais**, 479 KB — extraídos para `backups/sprites-originais/` |
| Stack | React 18 + TypeScript + Vite + Canvas 2D |
| Save | `localStorage`, chave `formigueiro-save-v1` |
| Áudio | WebAudio sintetizado (`createOscillator`), sem arquivos |

**Três descobertas que mudam o plano** (detalhadas no fim):
1. O mundo é **3400×2400 a 4000×3000**, não 960×720 — há câmera com scroll.
2. Existem **3 classes de formiga**, não 4. **Não há Coletora**: a Operária coleta.
3. A arte oficial **já existe** — 39 sprites reais. A Parte 12 (placeholders) precisa ser revista.

---

## Passagem 1 — Estrutura

```
linha  1–15   <head>: 5 metas + title
linha 16      20.624 chars — loader de módulos Vite
linha 17–24   ~1.003.000 chars — bundle React + jogo (minificado)
linha 25      252.804 chars — CSS inline (Tailwind com @layer properties)
linha 27–28   <body> + <div id="root">
linha 29      947 chars — script de detecção de iframe
```

Metas novas em relação ao shell anterior:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```
Confirmam a intenção de rodar como app instalado em tela cheia.

Título real: `🐜 Formigueiro — Jogo de Formigas` *(sem "Roguelike" — ver Passagem 2)*.

---

## Passagem 2 — Texto

### Descoberta: o título NÃO diz "Roguelike"

| Fonte | Título |
|---|---|
| Shell anterior (descartado) | `🐜 Formigueiro — Jogo de Formigas Roguelike` |
| **Bundle real** | `🐜 Formigueiro — Jogo de Formigas` |

O shell era mais **novo** que este bundle e já antecipava a direção roguelike. Ou seja:
o roguelike da Parte 6 é mesmo **funcionalidade a construir**, não algo existente.

### Textos de sistema recuperados

```text
A rainha está com fome! Leve comida ao ninho.
A rainha está FAMINTA! Ela vai morrer!
O formigueiro foi reconstruído pelas operárias!
O formigueiro entrou em colapso!
Recursos insuficientes.
Progresso reiniciado.
Canvas 2D indisponível.
CARREGANDO A COLONIA
CHEFE: {nome} apareceu na onda {n}!
```

### Interface

```text
VER MAIS · VOLTAR AO MENU · RENOVAR COLONIA · SAIR DO JOGO
LOJA DE QUITINA · CEMITERIO · CONQUISTAS · INVENTARIO · MAPA · MELHORIAS · RENASCIMENTO
IA: LIGADA / DESLIGADA · CAM LIVRE / CAM SEGUIR · Musica: LIGADA / DESLIGADA
Centralizar câmera · Próxima formiga · Alternar modo de câmera · Sair do formigueiro
MAPAS LIBERADOS · PONTUACAO TOTAL · Continue jogando para aumentar seu placar!
Recursos no estoque · Inimigos derrotados · Chefes derrotados
Missoes concluidas · Conquistas desbloqueadas · Renascimentos
Nenhuma formiga no cemiterio.
Ao renascer, a formiga sai daqui e caminha até a saída.
Reviver instantaneamente com quitina chega na Fase 4.
Conquistas, renascimentos e totais são mantidos.
O progresso de ondas é salvo por mapa.
```

**Nota:** boa parte da UI é escrita **sem acento** (`CEMITERIO`, `Missoes`, `colonia`),
provavelmente por limitação da fonte pixel art. Vale padronizar com acentos na nova versão.

### Conquistas — 30 definidas (`a1`–`a30`)

Estrutura real:
```js
{ id:"a26", title:"Colhedor Infatigável", desc:"Entregue 300 recursos no ninho.",
  track:{type:"anyResource"}, goal:300,
  rewardXp:250, rewardResources:{leaf:30,mushroom:20}, rewardAnts:{worker:3} }
```
Tipos de rastreamento: `anyResource · anyEnemy · resource · enemy · bosses`.
Recompensas combinam **XP + recursos + formigas**.

---

## Passagem 3 — Assets

### 🔴 39 sprites reais embutidos — a arte oficial já existe

Extraí todos para `backups/sprites-originais/`, identificados visualmente:

| Categoria | Arquivos | Dimensões |
|---|---|---|
| **Operária** (animação) | `ant_worker_frame1–7` | 96×96 |
| **Aranha** (animação) | `spider_frame1–6` | 56×56 |
| **Lagarta** (animação) | `caterpillar_frame1–5` | 96×96 |
| **Chefe Formiga-leão** | `boss_antlion_formiga-vermelha-rei` | 512×379 |
| **Chefe Lacraia** | `boss_centipede_lacraia` | 93×96 |
| **Chefe Escorpião** | `boss_scorpion_escorpiao` | 96×96 |
| **Chefe Louva-a-deus** | `boss_mantis_louva-a-deus` | 96×96 |
| **Sapo** | `boss_frog_sapo` | 89×96 |
| **Mosquito/Mosca** | `mosquito_mosca` | 96×96 |
| **Lacraia (corpo)** | `centipede_lacraia_corpo1–2` | 96×96 |
| Cenário | `tree_arvore`, `mushroom_cogumelo`, `stone_pedra_pequena`, `stone_pedrinha` | 56–64 |
| Recursos | `leaf_folha`, `flower_flor` | 32×32 |
| Interface | `ui_botao_hex_som`, `ui_botao_hex_mudo`, `ui_botao_hex_alto-falante`, `ui_placa_nome` | 220–390 |
| Fundo do menu | `background_menu.jpg` | 283 KB |
| Interior | `tile_madeira_interior` | 64×64 |

**Estilo confirmado:** pixel art cartoon, contorno escuro, alta saturação — exatamente
a direção da Parte 11. A formiga Operária é **laranja**, como manda a Parte 12.4.

### Recoloração dinâmica de sprite

O código tem uma função que **troca cores por faixa de pixel** em runtime:
```js
// pixels laranja → cor A ; pixels marrom-escuro → cor B
y>180 && z>60 && z<130 && K<80  → corA
y>90 && y<160 && z<80 && K<60   → corB
```
É assim que Operária/Soldado/Exploradora compartilham a mesma folha de sprites
com cores diferentes. **Técnica que vale preservar** — economiza muita arte.

### Ícones: 44 emojis
`🐜 ⚔️ 💨 🍃 🍄 🌵 🍌 🌸 💎 🛡️ ⚡ 💪 💥 🎒 👁️ ❤️ ♻️ ⏱️ ⭐ 🔒 🏰 🌾 🐸 🏜️ ⛰️ ⛏️ 🌴 🕷️ 🐛 🪲 🐝 🦁 🦂 🦗 🐌 🪱 🦋 🦟 🍀 🏆`

⚠️ Confirma o problema que eu já havia corrigido: **emoji não renderiza em WebView
Android**. A troca por SVG que fiz continua necessária.

### Áudio
`AudioContext` + `createOscillator` — **som 100% sintetizado**, zero arquivos.
Exatamente o que propus em `02_BALANCEAMENTO.md` §L8. ✅

---

## Passagem 4 — Comportamento

### Inimigos — 12 espécies, stats reais

| Inimigo | HP | Dano | Vel. | Aggro | r | Escala | XP |
|---|---|---|---|---|---|---|---|
| Mosquito 🦟 | 60 | 4 | 62 | 170 | 70 | 110 | 8 |
| Vespa 🐝 | 70 | 8 | 80 | 200 | 60 | 110 | 14 |
| Lagarta 🐛 | 80 | 5 | 20 | 120 | 80 | 170 | 9 |
| Marimbondo 🐝 | 90 | 9 | 70 | 210 | 65 | 120 | 15 |
| Aranha 🕷️ | 100 | 6 | 26 | 150 | 100 | 200 | 10 |
| Lesma 🐌 | 120 | 8 | 15 | 120 | 85 | 200 | 16 |
| Escorpião 🦂 | 140 | 9 | 24 | 160 | 100 | 220 | 18 |
| Besouro 🪲 | 160 | 7 | 18 | 130 | 90 | 170 | 16 |
| Mariposa 🦋 | 160 | 12 | 60 | 200 | 90 | 210 | 22 |
| Louva-a-deus 🦗 | 200 | 11 | 30 | 180 | 110 | 240 | 24 |
| Lacraia 🪱 | 240 | 14 | 34 | 190 | 110 | 260 | 28 |
| Formiga-leão 🦁 | 300 | 12 | 14 | 200 | 130 | 290 | 30 |

### Formigas — apenas 3 classes

```js
worker : { name:"Operária",    icon:"🐜", desc:"Coleta recursos na área descoberta." }
soldier: { name:"Soldado",     icon:"⚔️", desc:"Ataca inimigos próximos na área descoberta." }
scout  : { name:"Exploradora", icon:"💨", desc:"Revela a sombra do mapa por onde passa." }
```

| Classe | HP | Dano |
|---|---|---|
| worker | 30 | 5 |
| soldier | 60 | 10 |
| scout | 28 | 6 |

✅ **Batem exatamente com a Parte 4 do dossiê** — confirma que o dossiê deriva deste jogo.
❌ **Não existe Coletora.** A Parte 4.2 do dossiê a inventa e transfere a coleta para ela.

### Mapas — 6, com dados completos

| Mapa | Mundo | Recurso | Chefe | HP chefe | Dano | Desbloqueio |
|---|---|---|---|---|---|---|
| Campo 🌾 | 3400×2400 | leaf ×100 | Formiga Vermelha Rei | 1.500 | 18 | inicial |
| Pântano 🐸 | 3400×2400 | mushroom ×90 | Rainha dos Mosquitos | 2.100 | 17 | 20% do Campo |
| Deserto 🏜️ | 3600×2600 | cactus ×80 | Escorpião Imperador | 2.800 | 22 | 30% do Pântano |
| Montanha ⛰️ | 3600×2600 | flower ×80 | Rei Louva-a-Deus | 3.800 | 26 | 40% do Deserto |
| Caverna ⛏️ | 3800×2800 | crystal ×90 | Rainha Lacraia | 4.200 | 28 | 50% da Montanha |
| Selva 🌴 | 4000×3000 | banana ×80 | Mariposa Tita | 5.200 | 30 | 60/70% da Caverna |

Cada mapa define ainda: `pools · motes · trees · stones · grass · flowers · seed`
— ou seja, **geração procedural com seed fixa por mapa**.

⚠️ **A ordem do dossiê está errada.** Dossiê: Campo → Pântano → Caverna → Deserto →
Montanha → Selva. **Real:** Campo → Pântano → **Deserto → Montanha → Caverna** → Selva.

### Grade de melhorias — 16 upgrades em 4 categorias

Categorias: `COLETA 🍃 · ATAQUE ⚔️ · DEFESA 🛡️ · NIVEIS ⭐`

| id | Cat | Nome | Custo | Máx | Passo |
|---|---|---|---|---|---|
| antlimit | coleta | +5 Operárias | leaf 15 | ∞ | +10 |
| soldier | ataque | +5 Soldados | mushroom 25 | ∞ | +15 |
| scout | coleta | +5 Exploradoras | leaf 25 | ∞ | +15 |
| speed | coleta | +10% Velocidade | leaf 30 | 8 | — |
| strength | ataque | +10% Força | mushroom 40 | 8 | — |
| attackspeed | ataque | +15% Ataque | mushroom 35 | 6 | — |
| crit | ataque | +10% Crítico | mushroom 25 | 8 | — |
| critdmg | ataque | +50% Crítico | mushroom 20 | 6 | — |
| armor | defesa | −10% Dano | cactus 20 | 8 | — |
| hpboost | defesa | +15% Vida | cactus 20 | 8 | — |
| heal | defesa | Regeneração | cactus 15 | 5 | — |
| respawn | defesa | Renascer Rápido | cactus 20 | 5 | — |
| capacity | coleta | +1 Carga | leaf 25 | 3 | — |
| vision | coleta | +15% Visão | leaf 15 | 8 | — |
| luck | coleta | Sorte | leaf 15 | 8 | — |
| xpboost | niveis | +1 XP | banana 12 | 8 | — |

**É esta grade que a Parte 6 do dossiê manda substituir pelo Roguelike.**

### Constantes do motor

```js
qn = 400   // HP máximo do ninho
Er = 100   // +HP de ninho por upgrade "nesthp"
yl = 100   // fome máxima da Rainha
ub = 1/3   // consumo de fome por segundo  ← 300s até zerar
rb = 8     // fome restaurada por entrega
s0 = 30    // limiar de aviso "com fome"
i0 = 90    // abaixo disso as operárias alimentam
cb = 3     // ?
wr = 40    // raio do ninho
Tr = 20    // duração do combate (s)
JA = LA = 90  // duração da calmaria (s)
```

✅ **Ondas: 20s de combate + 90s de calmaria — idêntico à Parte 7 do dossiê.**

### Progressão

```js
XP por nível  = 50 + 25×(nível−1)        // LINEAR
Bônus/nível   = speed +12% · vision +12% · capacity +1
                damage +10% · hp +15% · xp +20%
kl(r)         = 15 + r×5
```

⚠️ **Divergência grande:** o original usa curva **linear** (`50+25n`); o dossiê pede
**quadrática** (`10n + 8n²`). No nível 20: original 525 XP, dossiê 3.400 XP.

### Save
`localStorage`, chave `formigueiro-save-v1`, com campo `version`.
Guarda: `nestHp · queenHunger · waves{} por mapa · upgrades{} · totals{} · ants{} ·
respawn[] · revives[]`. Sem IndexedDB, sem checksum, sem backup.

### Outros sistemas presentes
Câmera com dois modos (livre/seguir) · IA das formigas ligável/desligável ·
cemitério com fila de respawn · loja de quitina (com "chega na Fase 4" — inacabada) ·
renascimento · missões · conquistas · exploração percentual por mapa · tela cheia.

---

## Passagem 5 — Layout

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
      maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#1c1917" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### Mundo grande + câmera
`world: { w: 3400–4000, h: 2400–3000 }` — o mundo é **12 a 17× maior** que a área
lógica de 960×720 que a Parte 3 recomenda. Existe câmera com scroll, modo seguir e
botão "Centralizar câmera".

### Renderização
`imageSmoothingEnabled = false` (11 ocorrências) · `devicePixelRatio` ·
`requestAnimationFrame` · Canvas 2D. Mesma abordagem que implementei. ✅

### Cores de chão por mapa
```
Campo    #59a04c / #4c8f41     Pântano  #4d7a5a / #43684f
Deserto  #d9b55c / #c8a34a     Montanha #7d837d / #6c726c
Caverna  #3a2f35 / #2f262b     Selva    #2e7d32 / #256428
```
🌱 **O Campo é verde-grama (`#59a04c`)** — confirma o esclarecimento do usuário de que
o jogo se passa num gramado. Minha `GRASS.BASE` é `#47843a`; a oficial é mais clara.

---

## Divergências entre o original e o dossiê

| # | Tema | Original | Dossiê | Decisão |
|---|---|---|---|---|
| 1 | **Classes** | 3 (worker/soldier/scout); Operária coleta | 4+; Coletora coleta, Operária fica no ninho | ⚠️ **decidir** |
| 2 | **Mundo** | 3400×2400 a 4000×3000 com câmera | 960×720 | ⚠️ **decidir** |
| 3 | **Curva de XP** | linear `50+25n` | quadrática `10n+8n²` | ⚠️ **decidir** |
| 4 | **Ordem dos mapas** | Campo→Pântano→Deserto→Montanha→Caverna→Selva | …→Caverna→Deserto→Montanha→… | ✅ usar a do original |
| 5 | **Desbloqueio** | % de exploração | façanha + quitina | ⚠️ **decidir** |
| 6 | **Progressão** | grade fixa de 16 upgrades | cartas roguelike | ✅ dossiê (é o pedido central) |
| 7 | **Arte** | 39 sprites reais prontos | "tudo placeholder" | ✅ **usar a arte real** |
| 8 | **HP dos chefes** | 1.500–5.200 | 600–2.400 | ✅ usar a do original |
| 9 | **Fome** | 1/3 por s (300s) | — | ✅ original; meu 1,0/s era 3× mais duro |
| 10 | **Inimigos** | 12 espécies | 6 | ✅ usar as 12 |
| 11 | **Ondas** | 20s + 90s | 20s + 90s | ✅ idênticos |
| 12 | **HP das formigas** | 30/60/28 | 30/60/28 | ✅ idênticos |

---

## O que isto muda no que já foi construído

### Aproveitável integralmente ✅
Arquitetura híbrida · store · RNG semeado · clock de delta fixo · spatial hash ·
névoa de guerra · pixel-perfect · contrato de sprite · ícones SVG · interior com as
11 salas · sistema de ondas · gramado com props.

### Precisa de ajuste 🔧
| Item | Ação |
|---|---|
| `spriteRegistry` | apontar para os 39 PNG reais em vez de placeholders |
| Classes | remover Coletora ou justificá-la como adição do dossiê |
| Mundo + câmera | passar de 960×720 fixo para mundo grande com scroll |
| Ordem dos mapas | corrigir para a do original |
| Stats de inimigos | trocar meus 6 propostos pelos 12 reais |
| Chefes | usar HP/dano/nomes reais |
| Fome | `1/3` por segundo em vez de `1,0` |
| Cor do gramado | `#59a04c` (oficial do Campo) |

### Continua valendo do meu trabalho 📌
As lacunas L3 (XP por fonte), L5 (derrota parcial vs. total), L7 (fórmula de
renascimento), L9 (slots) e L11 (debounce de save) **não existem no original** — são
mesmo decisões novas, e as propostas de `02_BALANCEAMENTO.md` seguem válidas.

---

## Conclusão

A Fase 0 agora está **de fato completa**. Diferente do arquivo anterior, este bundle
entregou tudo o que a Parte 1 pedia: estrutura, textos, sprites, comportamento e layout.

O dossiê é **fiel ao original** onde importa (HP das formigas, ritmo das ondas, 6 mapas,
recursos, salas do interior) e **diverge deliberadamente** onde propõe evolução
(roguelike, novas classes, novos sistemas). As divergências não intencionais — ordem dos
mapas, escala do mundo, curva de XP — estão listadas acima para decisão.
