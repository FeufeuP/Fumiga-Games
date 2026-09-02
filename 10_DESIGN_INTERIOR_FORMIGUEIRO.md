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
| 2–11 | 10 câmaras funcionais (botões) | câmara | laterais do eixo, profundidades variadas |
| 12 | SALA DA RAINHA | câmara real | base do eixo central |

| # | Túnel | Tipo | Trajeto |
|---|---|---|---|
| 1 | Eixo central (túnel principal) | serpenteante | da boca (sob a saída) até a Sala da Rainha |
| 2–11 | 10 galerias laterais | curvas orgânicas | do eixo até o centro de cada câmara |

**Regra de ouro:** nenhuma câmara encosta em outra; galeria nenhuma é reta
e horizontal — todas têm curvatura/ângulo orgânico (estilo raiz).

## 3. Inventário exato das câmaras (os botões do jogo)

Profundidade = posição no eixo (% da zona útil, de cima para baixo).
Lados alternam; o desalinhamento vem do jitter e dos offsets horizontais.

| Band. | Câmara | Ícone | Lado | Profund. (frac) | Offset X (seed) | Função |
|---|---|---|---|---|---|---|
| 1 | CEMITÉRIO | ⚰️ | E | 0.06 | 8–22% | fila de renascimento das formigas |
| 2 | MAPA | 🗺️ | D | 0.17 | 8–22% | seletor dos 6 biomas |
| 3 | MISSÕES | 📜 | E | 0.28 | 8–22% | 44 missões com progresso |
| 4 | FORMIGAS | 🐜 | D | 0.39 | 8–22% | censo por classe |
| 5 | INVENTÁRIO | 🎒 | E | 0.50 | 8–22% | estoque de recursos |
| 6 | MELHORIAS | ⚙️ | D | 0.61 | 8–22% | loja (17 melhorias, 4 abas) |
| 7 | CONQUISTAS | 🏆 | E | 0.71 | 8–22% | 27 conquistas (veio da pausa) |
| 8 | CARTAS | 🃏 | D | 0.81 | 8–22% | build roguelike de 74 cartas (veio da pausa) |
| 9 | CLASSES | 🦴 | E | 0.91 | 8–22% | Defensora/Tóxica/Gigante c/ quitina (veio da pausa) |
| 10 | RENASCER | 🔄 | D | 0.99 | 8–22% | prestígio + placar |

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

## 5. Geração determinística (organicamente desorganizada)

Tudo vem de `new Rng(0x5eed)` (mulberry32, regra #3 do plano — nada de
`Math.random()` solto):

1. **Offset X** por câmara: `rng.float(8, 22)` (% da largura);
2. **Jitter Y** por câmara: `rng.float(-1.2, +1.2)` pontos percentuais;
3. **Curvatura da galeria**: pontos de controle do bezier com desvios
   `rng.float(-3, +3)` — um gancho diferente para cada galeria.

Resultado: **desorganizado como um ninho real, mas idêntico em toda sessão**
(um formigueiro não se reorganiza cada vez que você olha para ele).

## 6. Túneis (camada SVG)

Camada `<svg viewBox="0 0 100 100" preserveAspectRatio="none">` cobrindo a
tela (`vector-effect: non-scaling-stroke` → espessuras em px reais):

| Elemento | Forma | Borda | Miolo |
|---|---|---|---|
| Eixo central | path cúbico serpenteando x=50±4, da boca (y≈9) à Rainha (y≈74) | 76px `#8b562d` | 64px `#2a170d` |
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
| Bandas/lados/offsets/jitter | `src/ui/InteriorScreen.tsx` | `CHAMBERS` + `LAYOUT` (Rng 0x5eed) |
| Camada de túneis | `src/ui/InteriorScreen.tsx` | `<NestTunnels>` (SVG) |
| Superfície/monte | `src/ui/interior.module.css` | `.surface`, `.mound` |
| Boca do túnel | `src/ui/interior.module.css` | `.mouth` |
| Câmara/galeria/zoom visual | `src/ui/interior.module.css` | `.chamber`, `.galleyL/R` |
| Sala real | `src/ui/interior.module.css` | `.queenRoom` |

## 12. Histórico de revisões

| Versão | Data | Mudança |
|---|---|---|
| 0.3.2 | 01/09/26 | primeiro túnel central — galerias sem `position: absolute` ⇒ câmaras amontoadas no canto superior esquerdo |
| 1.0 | 02/09/26 | spec completa: profundidades por banda, offsets seedados, galerias SVG bezier, superfície com grama/monte; implementação corrigida |
| **1.0.1** | **02/09/26** | **auditoria spec↔código: alinhados 3 desvios — eixo passa a x=50±4 e y 9→74 exatos; boca do túnel `.mouth` (#1b0e06) adicionada sob o monte; galerias estendidas +6un até o centro da câmara** |
