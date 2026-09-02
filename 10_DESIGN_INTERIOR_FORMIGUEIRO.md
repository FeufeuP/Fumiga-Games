# 🐜 10 — DESIGN DO INTERIOR DO FORMIGUEIRO (Spec 1.0)

> Documento de design definitivo do interior do ninho (`InteriorScreen`).
> Baseado na arquitetura real de ninhos de formigas cortadeiras (*Atta sexdens*)
> e formigas do gênero *Formica*: **um eixo vertical central com câmaras
> distribuídas em profundidades variadas, conectadas por galerias curtas** —
> nunca corredores retos organizados em grade, e nunca tudo num canto só.

---

## 1. Objetivo

Reproduzir, em pixel-art 16-bit, o **corte transversal (perfil) de um
formigueiro real**: quem entra pela saída desce pelo túnel central e encontra
câmaras escavadas em profundidades diferentes, dos dois lados, cada uma com
uma função do jogo. No fundo do eixo fica a Sala da Rainha.

## 2. Topologia exata

O ninho tem **12 nós** e **11 túneis**:

| # | Nó | Tipo | Posição |
|---|---|---|---|
| 1 | SAÍDA (botão `btn_back` + rótulo) | entrada/saída | centro do topo, sobre a faixa de grama |
| 2–11 | 10 câmaras funcionais (câmaras escavadas) | câmara | laterais do eixo, profundidades variadas |
| 12 | SALA DA RAINHA | câmara real | base do eixo central |

| # | Túnel | Tipo | Trajeto |
|---|---|---|---|
| 1 | Eixo central (túnel principal) | serpenteante | da boca (sob a saída) até a Sala da Rainha |
| 2–11 | 10 galerias laterais | curvas orgânicas | do eixo até a **boca** de cada câmara (ponta do túnel) |

**Regra de ouro:** nenhuma câmara encosta em outra; galeria nenhuma é reta
e horizontal — todas têm curvatura/ângulo orgânico (estilo raiz).

## 3. Inventário exato das câmaras (os botões do jogo)

Profundidade = posição no eixo (% da zona útil, de cima para baixo).
Lados alternam; o desalinhamento vem do jitter e dos offsets horizontais.

| # | Câmara | Ícone | cx | cy (profund.) | tam. s | Função |
|---|---|---|---|---|---|---|
| 1 | CEMITÉRIO | ⚰️ | 0.30 | 0.20 | 0.90 | fila de renascimento das formigas |
| 2 | MAPA | 🗺️ | 0.80 | 0.27 | 0.85 | seletor dos 6 biomas |
| 3 | MISSÕES | 📜 | 0.18 | 0.34 | 1.10 | 44 missões com progresso |
| 4 | FORMIGAS | 🐜 | 0.88 | 0.40 | 0.85 | censo por classe |
| 5 | INVENTÁRIO | 🎒 | 0.60 | 0.42 | 1.00 | estoque de recursos |
| 6 | MELHORIAS | ⚙️ | 0.42 | 0.53 | 1.20 | loja (17 melhorias, 4 abas) |
| 7 | CONQUISTAS | 🏆 | 0.26 | 0.63 | 1.05 | 27 conquistas (veio da pausa) |
| 8 | CARTAS | 🃏 | 0.15 | 0.73 | 0.95 | build roguelike de 74 cartas (veio da pausa) |
| 9 | CLASSES | 🦴 | 0.66 | 0.72 | 1.00 | Defensora/Tóxica/Gigante c/ quitina (veio da pausa) |
| 10 | RENASCER | 🔄 | 0.86 | 0.77 | 0.90 | prestígio + placar |
| — | SALA DA RAINHA | 👑 | 0.46 | ~0.88 | grande | base do eixo (moldura dourada) |

**Semântica de profundidade:** funções logísticas ficam rasas (perto da
saída); funções de progressão/meta ficam profundas (perto da Rainha).

## 4. Zonas verticais da tela

```
┌─────────────────────────────────────────────┐
│ SUPERFÍCIE (grama + monte de terra + SAÍDA) │  ~9–11% (mín. 64px)
├─────────────────────────────────────────────┤
│                                             │
│   [câmara E] ──galeria──┐   ┌─galeria── [D] │
│                         │   │               │
│              EIXO CENTRAL (serpenteante)    │  SUBSOLO
│                         │   │               │
│   [câmara E] ──galeria──┘   └─galeria── [D] │
│                                             │
├─────────────────────────────────────────────┤
│      👑 SALA DA RAINHA (moldura dourada)    │  base, ~200px
└─────────────────────────────────────────────┘
```

- Fórmula da profundidade de uma câmara (CSS):
  `top: calc(11% + frac × 56%)` com `translateY(-50%)` — garante folga da
  grama (acima) e da Sala da Rainha (abaixo) em telas de 320px a 1920px.
- Offset horizontal (afastamento do eixo): `left/right: calc(50% + X%)`
  com **X individual por câmara, sorteado por seed** (8–22% da largura).

## 5. Estrutura extraída de referência real (rev 2.0)

As posições saem de uma **imagem real de corte de ninho em terra** (estilo
confirmado pelo jogador), processada por segmentação:

1. conversão para luminância e **contraste local** (diferença da média
   borrada, δ=18) isola vazios (túneis/câmaras) da textura do solo;
2. filtro de maioria 3×3 (2 passes) consolida as cavidades;
3. **componentes conexos** medem centro/tamanho de cada câmara;
4. transcrição manual para a tabela do §3 (12 nós) + polilinha do eixo (§6).

Sobre isso roda a **relaxação determinística em runtime** (`buildLayout`):
pares de câmaras cujas caixas colidam NO VIEWPORT ATUAL são empurrados
metade da violação por iteração (com resfriamento 0.995^i, ≤600 iter),
priorizando separação vertical, com limites de superfície/sala real/laterais.
Em telas grandes não mexe nada (deriva 0pp = fiel à referência); em telas
apertadas abre espaço (~5–27pp). Sem `Math.random()` — mesmo viewport,
mesmo layout, sempre.

Validado em 14 viewports (320×690 … 1920×1080, retrato e paisagem):
**zero sobreposição visual** (blobs reais ≈72% da caixa).

## 6. Túneis (camada SVG)

Camada `<svg viewBox="0 0 100 100" preserveAspectRatio="none">` cobrindo a
tela (`vector-effect: non-scaling-stroke` → espessuras em px reais):

| Elemento | Forma | Borda | Miolo |
|---|---|---|---|
| Eixo central | **polilinha da referência** (Catmull-Rom→bezier): (0.50,0.09)→(0.47,0.20)→(0.42,0.30)→(0.38,0.40)→(0.42,0.50)→(0.46,0.62)→(0.43,0.74)→(0.46,0.86) | 76px `#8b562d` | 64px `#2a170d` |
| Galerias (×10) | path cúbico do eixo ao centro da câmara | 26px `#8b562d` | 18px `#241109` |
| Boca do túnel | retângulo sob o monte | — | `#1b0e06` |

Cada traço é desenhado **duas vezes** (borda depois miolo) com
`stroke-linecap="square"` — leitura de "túnel escavado" com contorno duro.

## 7. Superfície (primeira vez no jogo)

- Faixa de grama: `linear-gradient(#87c054 → #5a9b41)` com borda inferior
  6px `#3f7a2e` (transição solo/ar de cima para baixo);
- **Monte de terra** central em degraus (clip-path em polígono escalonado,
  cor `#7a4a2b`, sombra dura 3px) — a SAÍDA fica plantada nele;
- Pontilhado de "buracos de ventilação" opcionais (specks repetidos).

## 8. Estilo pixel-art 16-bit (regras)

1. Cores chapadas da paleta do projeto (`variables.css`): terras
   `#29170f/#5d341e/#8b562d`, contorno `#14120f`, dourado `#fbd046`,
   grama `#5a9b41/#3f7a2e`;
2. Bordas **3–4px sólidas** em `#14100c` — nada de 1px fino;
3. Sombras em **degrau** (`box-shadow: 0 5px 0 …`) — nada de blur suave;
4. Brilho interno superior `inset 0 3px 0 rgba(255,255,255,.09)`;
5. Cantos 8–12px (rachaduras arredondadas de câmara escavada);
6. `image-rendering: pixelated` em toda imagem;
7. Tipografia monoespaçada bold, títulos com `text-shadow 2px 2px 0`.

### 8.1 Câmara escavada (rev 1.1) — não é botão

As câmaras **não são botões-retângulo**: cada uma é uma cavidade escavada
no subsolo, desenhada em SVG:

- **Contorno orgânico**: blob irregular gerado por harmonias de raio
  (2f/3f/5f) com fases e amplitudes sorteadas — stream `Rng(0xcafe)`,
  independente do stream do layout (`0x5eed`) — achatado verticalmente
  (×0,82) para ficar mais largo que alto, como câmaras reais;
- **Boca da câmara**: o raio afunde ~32% no lado voltado ao eixo central —
  é ali, **na ponta da boca** (posição calculada pelos mesmos harmônicos
  do contorno), que a galeria TERMINA: cap arredondado funde o túnel com a
  abertura, **sem sobrepor a câmara** (rev 1.2). O endpoint é convertido
  de unidades da caixa (120) para % da tela pela largura real do `clamp()`,
  recalculado no resize;
- **Camadas** (traçadas do mesmo path): borda externa `#14100c` (11un) →
  aro de terra `#8b562d` (6un) → cavidade escura `#1f1008` → arco de piso
  de terra `#3a2012` no fundo (profundidade);
- **Conteúdo**: ícone + rótulo flutuam no centro da cavidade, com sombra
  dura de texto para leitura sobre o escuro;
- **Estados**: hover clareia a cavidade (`#2c1809`) e amplia o ícone;
  active afunda a câmara 2px; foco visível para teclado.

## 9. Interação

| Ação | Resposta |
|---|---|
| hover na câmara | clareia o miolo (`#6d4128`) |
| clique na câmara | abre painel modal da função (mesmos painéis de 0.3.2) |
| clique na SAÍDA | `engine.exitInterior()` |
| clique fora do painel | fecha painel |
| alvo de toque | ≥ 34px (pointer grosso) |

## 10. Critérios de aceite

- [ ] 12 nós visíveis: 1 saída + 10 câmaras + 1 sala real;
- [ ] 11 túneis: eixo contínuo + 10 galerias encostando nas câmaras;
- [ ] Câmaras distribuídas em **profundidades distintas**, dois lados, sem sobreposição;
- [ ] Nada aglomerado num canto (bug 0.3.2 corrigido: galerias SEM `position: absolute`);
- [ ] Layout idêntico entre sessões (seed fixa);
- [ ] 320px–1920px sem cortar câmara;
- [ ] `tsc --noEmit` limpo + 144/144 testes.

## 11. Mapeamento de implementação

| Peça | Arquivo | Símbolo |
|---|---|---|
| Posições extraídas da referência | `src/ui/InteriorScreen.tsx` | `CHAMBERS` (cx/cy/s) |
| Camada de túneis | `src/ui/InteriorScreen.tsx` | `<NestTunnels>` (SVG) |
| Superfície/monte | `src/ui/interior.module.css` | `.surface`, `.mound` |
| Boca do túnel | `src/ui/interior.module.css` | `.mouth` |
| Câmara escavada + relaxação | `src/ui/InteriorScreen.tsx` + `interior.module.css` | `cavePaths()`, `buildLayout()`, `.cave*` |
| Sala real | `src/ui/interior.module.css` | `.queenRoom` |

## 12. Histórico de revisões

| Versão | Data | Mudança |
|---|---|---|
| 0.3.2 | 01/09/26 | primeiro túnel central — galerias sem `position: absolute` ⇒ câmaras amontoadas no canto superior esquerdo |
| 1.0 | 02/09/26 | spec completa: profundidades por banda, offsets seedados, galerias SVG bezier, superfície com grama/monte; implementação corrigida |
| **1.0.1** | **02/09/26** | **auditoria spec↔código: alinhados 3 desvios — eixo passa a x=50±4 e y 9→74 exatos; boca do túnel `.mouth` (#1b0e06) adicionada sob o monte; galerias estendidas +6un até o centro da câmara** |
| **1.1** | **02/09/26** | **câmaras deixam de ser botões: viram SALAS ESCAVADAS orgânicas (blob 2f/3f/5f, stream 0xcafe, boca voltada ao eixo); galerias terminam na PONTA de cada túnel, entrando pela boca (§8.1)** |
| **1.2** | **02/09/26** | **conexão exata: fim da galeria calculado pela PONTA DA BOCA (tipX pelos mesmos harmônicos) — túnel encosta na silhueta com cap arredondado, sem cruzar a borda da câmara; layout recalculado no resize (clamp→%)** |
| **2.0** | **02/09/26** | **estrutura TRANSCRITA de imagem real de referência (segmentação: contraste local + componentes conexos): 10 câmaras com cx/cy/tamanhos da referência, eixo serpenteante por polilinha, relaxação determinística em runtime — zero sobreposição visual em 14 viewports** |

