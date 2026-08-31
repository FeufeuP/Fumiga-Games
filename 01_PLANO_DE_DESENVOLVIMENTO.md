# 🐜 FORMIGUEIRO — Plano de Desenvolvimento

> Documento operacional. Deriva de `Dossie_Perfeito_Melhorado.md` (Partes 1, 9, 10, 13).
> Status: **Fases 0, 1 e 2 concluídas.**
>
> ⚠️ **Mudança de requisito (decidida pelo usuário):** o alvo deixou de ser um HTML
> único. O projeto agora é **multi-arquivo**, com módulos separados por sistema.
> A Parte 1.4 do dossiê ("carregar como HTML único") fica **suspensa**; os demais
> requisitos dela — offline, pixel art sem blur, WebView, localStorage, mesmo
> package name, viewport desktop e mobile — **continuam valendo**.
>
> 🌱 **Esclarecimento de cenário (usuário):** o mapa externo é um **gramado**, não
> terra. Grama, árvores, arbustos, pedras, rochas, gravetos, folhas caídas e trevos.
> O formigueiro é o monte de terra no meio do gramado e é **clicável**: clicar nele
> abre o interior. A paleta de terra do dossiê (Parte 2.2) continua valendo para o
> ninho, o interior e a interface — o gramado usa a paleta `GRASS`.

---

## 1. Arquitetura escolhida — Híbrida

### 1.1 Divisão por responsabilidade

Com o single-file fora de cena, some a tensão de orçamento de bytes. Permanece a
tensão real de performance: **React re-renderiza mal a 60 fps**. Por isso a divisão
não é por gosto, é por responsabilidade.

```
┌─────────────────────────────────────────────────────────┐
│  MUNDO (60 fps, alta frequência)                        │
│  Canvas 2D puro + TypeScript                            │
│  mapa · câmera · névoa · formigas · inimigos · chefes   │
│  partículas · efeitos · sprites · colisão               │
│  → ZERO React. Loop próprio com requestAnimationFrame.  │
├─────────────────────────────────────────────────────────┤
│  INTERFACE (baixa frequência, orientada a eventos)      │
│  React 18 + CSS Modules                                 │
│  menu · HUD · interior · cartas · baús · loja · modais  │
│  → Re-renderiza só quando o estado muda.                │
├─────────────────────────────────────────────────────────┤
│  ESTADO CENTRAL (a ponte)                               │
│  Store próprio, ~80 linhas, publish/subscribe           │
│  O motor escreve. O React lê via useSyncExternalStore.  │
└─────────────────────────────────────────────────────────┘
```

**Tailwind sai.** CSS Modules + variáveis CSS entregam a mesma paleta da Parte 2.2 com
uma fração do peso e sem passo de purge para configurar. A Parte 11.16 (botões cartoon)
descreve componentes muito específicos — escrever esse CSS à mão é mais curto do que
compor 12 classes utilitárias por botão.

### 1.2 Stack final

| Camada | Escolha | Motivo |
|---|---|---|
| Linguagem | TypeScript strict | contratos de sprite e save exigem tipos |
| Build | Vite (multi-arquivo, code splitting) | módulos separados, cache por chunk |
| Mundo | Canvas 2D, `imageSmoothingEnabled=false` | pixel art sem blur (Parte 1.4) |
| UI | React 18 + CSS Modules | menus e modais são árvores, não pixels |
| Estado | store próprio + `useSyncExternalStore` | sem Redux/Zustand; menos bytes |
| Persistência | localStorage + IndexedDB (fallback) | Parte 1.4 exige preservar ambos |
| Testes | Vitest | mesmo motor do Vite, sem config extra |
| Mobile | Capacitor | mesmo package name / assinatura (Parte 1.4) |
| Assets | PNG base64 inline no build | requisito offline |

### 1.3 Saída do build

`npm run build` gera `dist/` com HTML + JS + CSS + assets separados:

- `react` isolado em seu próprio chunk (muda raramente → cache longo);
- código do jogo em chunk próprio (muda a cada versão);
- CSS extraído;
- assets com hash no nome.

Para o APK, o Capacitor empacota `dist/` inteiro — o app roda offline lendo os
arquivos do bundle local, sem necessidade de inlining.

---

## 2. Estrutura de arquivos (Parte 9, condensada)

A árvore original é um excelente **mapa dos sistemas**, mas criar 500 arquivos antes de
existir jogo produz centenas de stubs vazios que atrapalham a navegação. Mantenho **todos
os sistemas**, agrupando arquivos que sempre mudam juntos.

Regra de corte: *um arquivo por sistema com fronteira própria; um diretório quando o
sistema passa de ~400 linhas.*

```text
formigueiro/
├── index.html
├── package.json · tsconfig.json · vite.config.ts
├── eslint.config.js · prettier.config.js
├── capacitor.config.ts
├── README.md · CHANGELOG.md · LICENSE · .gitignore
├── docs/            ← esta documentação
├── backups/         ← HTML original intocado + builds anteriores
├── scripts/         ← build single-file, gerar placeholders, verificar save
├── tests/
├── entregas/        ← HTML e APK versionados
└── src/
    ├── main.tsx · App.tsx
    ├── core/
    │   ├── types.ts          tipos globais compartilhados
    │   ├── store.ts          estado central + pub/sub
    │   ├── constants.ts      TODOS os números de balanceamento
    │   ├── rng.ts            RNG semeado (runs reproduzíveis)
    │   ├── clock.ts          tempo, pausa, delta fixo
    │   ├── events.ts         barramento de eventos tipado
    │   └── validation.ts
    ├── engine/
    │   ├── GameEngine.ts     orquestra o loop
    │   ├── update.ts         passo de simulação
    │   ├── movement.ts · collision.ts · spatialHash.ts
    │   ├── pathfinding.ts · camera.ts · fogOfWar.ts
    │   └── performance.ts
    ├── world/
    │   ├── world.ts · terrain.ts · exploration.ts
    │   ├── resourcesOnMap.ts · spawnPoints.ts
    │   ├── mapProgress.ts · mapUnlocks.ts
    │   └── maps/  campo · pantano · caverna · deserto · montanha · selva
    ├── entities/
    │   ├── ants/     registry · factory · stats · needs · commands
    │   │             + 1 arquivo de comportamento por classe (7)
    │   ├── enemies/  types · factory · ai · spawner · drops
    │   ├── bosses/   registry · ai · phases + 1 por mapa (6)
    │   └── queen/    state · hunger · feeding · production
    ├── systems/
    │   ├── combat.ts · damage.ts · projectiles.ts · statusEffects.ts
    │   ├── waves.ts · elites.ts · bossWaves.ts
    │   ├── economy.ts · resources.ts · chitin.ts · storage.ts
    │   ├── nest.ts · cemetery.ts · shop.ts
    │   ├── missions.ts · achievements.ts
    │   ├── rebirth.ts · metaProgression.ts
    │   └── defeat.ts
    ├── roguelike/
    │   ├── xp.ts · deck.ts · rarities.ts
    │   ├── cards/  index.ts + 11 arquivos por categoria
    │   ├── synergies.ts · evolutions.ts · chests.ts
    │   ├── buildSlots.ts · runRewards.ts
    │   └── effects.ts        aplicação dos efeitos ao estado
    ├── save/
    │   ├── index.ts · saveTypes.ts · storage.ts
    │   ├── serializer.ts · deserializer.ts
    │   ├── migrations.ts · backup.ts · checksum.ts · repair.ts
    ├── render/
    │   ├── Renderer.ts · pixelPerfect.ts · cameraTransform.ts
    │   ├── drawWorld.ts · drawTerrain.ts · drawFog.ts
    │   ├── drawEntities.ts · drawEffects.ts
    │   ├── spriteRegistry.ts   ← contrato da Parte 12.5
    │   ├── animationPlayer.ts · particles.ts
    ├── ui/
    │   ├── MainMenu.tsx · GameScreen.tsx · InteriorScreen.tsx
    │   ├── Hud.tsx · Tutorial.tsx
    │   ├── roguelike/  LevelUpPanel · UpgradeCard · ChestModal
    │   ├── interior/   11 salas
    │   ├── screens/    GameOver · Rebirth · Shop · Cemetery
    │   └── components/ Bar · Card · Icon · Tooltip · Badge · RoomButton · ConfirmDialog
    ├── audio/
    │   └── AudioManager.ts · sfx.ts
    ├── styles/
    │   ├── variables.css · reset.css · global.css
    │   ├── pixel-art.css · responsive.css · animations.css
    └── assets/
        ├── placeholders/  ants · enemies · bosses · resources · interior · ui
        └── official/      ← vazio até a equipe entregar (Parte 12.6)
```

**~140 arquivos** em vez de ~500, sem perder nenhum sistema. A Parte 9 continua sendo a
referência de *quais sistemas existem*; este layout é *onde eles moram*.

---

## 3. Fases de execução

Princípio: **toda fase termina com algo que roda no navegador.** Nada de "só funciona no
final". A ordem respeita a Parte 13, reorganizada em fatias verticais.

### Fase 0 — Análise do HTML original ✅ *concluída*
Concluída — ver `docs/05_ANALISE_HTML_ORIGINAL.md`.

**Achado:** o arquivo recebido é o *shell do Vite* (444 bytes), não o jogo; a `src/`
não veio junto. Não havia telas, textos nem sprites para catalogar. O que ele
confirmou: stack React + TS + Vite, alvo mobile com zoom travado, e que **não existe
arte oficial a preservar** — validando a Parte 12 integralmente.

### Fase 1 — Fundação ✅ *concluída*
Tipos, store, constantes, RNG semeado, clock com pausa, loop de update com delta fixo,
canvas pixel-perfect, `spriteRegistry` com o contrato da Parte 12.5, gerador de
placeholders geométricos.
**Entrega:** tela preta com um quadrado laranja que anda a 60 fps e pausa.

### Fase 2 — Fatia vertical jogável ✅ *concluída*
Mapa Campo · câmera · névoa de guerra · 1 tipo de recurso · Coletora completa
(procurar → coletar → carregar → voltar → depositar) · Operária (levar comida à Rainha) ·
Rainha com fome · ninho com HP · HUD com FOME e COMIDA.
**Entrega: o jogo já é jogável por ~3 minutos.** É aqui que o loop econômico prova que
funciona ou não.

### Fase 3 — Interior  ✅ CONCLUÍDA
As 11 salas nas coordenadas normalizadas exatas da Parte 3.3, navegação, pausa ao entrar,
Sala da Rainha funcional com fila de produção.

**Fechamento (últimas duas salas).** `upgrades` e `inventory` dividiam um
placeholder — as duas mostravam o mesmo parágrafo. Agora cada uma responde a
uma pergunta que nenhuma outra tela respondia:

- **MELHORIAS** (`src/ui/rooms/UpgradesRoom.tsx`) — o que já foi comprado e
  **quanto isso vale agora**, em números do jogo (`+180` de vida do ninho,
  `+24%` de dano). A LOJA mostra o que dá para comprar; sem esta sala o
  jogador não tinha como ver o efeito acumulado, e a amplificação do
  renascimento (×1,50 com 2 pontos) era invisível. Só lê estado — comprar
  continua sendo responsabilidade da LOJA.
- **INVENTÁRIO** (`src/ui/rooms/InventoryRoom.tsx`) — a coleção permanente das
  68 cartas, com contagem por raridade, filtros e detalhe ao tocar. Cartas não
  descobertas aparecem como **silhueta**: a lacuna é visível, o conteúdo não —
  revelar o nome estragaria a descoberta, escondê-las tiraria a meta.

**Bug corrigido junto:** a coleção só registrava a carta *escolhida*, mas a
tela promete "assim que aparece". O motor passou a emitir `card_seen` para
todas as cartas oferecidas no painel. Ficou **fora** de `IMMEDIATE_EVENTS`
de propósito: dispara 3–4× por painel e o `card_chosen` seguinte já persiste.

### Fase 4 — Combate e ondas  ✅ CONCLUÍDA
Inimigos + IA + agressão + alvo · Soldado e Exploradora · ondas 1–10 com telegrafia de 2s ·
elite na onda 5 · **primeiro chefe (Campo) na onda 10** · drops de quitina · knockback ·
antecipação→impacto→recuperação (Parte 11.9).

### Fase 5 — Roguelike (o núcleo novo)
**5A ✅ CONCLUÍDA:** XP e curva · painel de level-up que congela o mundo ·
**20 cartas iniciais** cobrindo as 5 raridades, os 3 slots e os 7 eixos ·
raridades com moldura colorida · aplicação de efeitos via `modifiers.ts` ·
sinergia por eixo no sorteio · cartas persistidas no save.
**5B ✅ CONCLUÍDA:** as 48 cartas restantes (68 no total) · 6 evoluções ·
4 tipos de baú com garantia de raridade · slots de build com teto ·
trava anti-painel-vazio · tela de inventário da run com as receitas.

### Fase 6 — Meta e conteúdo  ✅ CONCLUÍDA
Cemitério · loja · missões · conquistas · renascimento · classes Defensora/Tóxica/Gigante ·
mapas 2–6 com seus chefes.

| Sistema | Onde | Estado |
|---|---|---|
| Conquistas (27) e missões (44) | `src/meta/achievements.ts` | dados reais do HTML original |
| Rastreamento por evento | `src/meta/{progressSystem,metaTracker}.ts` | contadores cumulativos, persistidos |
| Loja (8 melhorias + 3 classes) | `src/meta/shop.ts` | preço escalona por nível |
| Renascimento | `src/meta/shop.ts` | +25% por ponto; mantém classes/quitina/conquistas |
| Cemitério (12 lápides) | `src/meta/shop.ts` · `bury()` | gravado na morte da Rainha |
| Salas da interface | `src/ui/rooms/MetaRooms.tsx` | 6 salas, antes stubs |
| Classes jogáveis | `src/entities/ants/specialists.ts` | Defensora, Tóxica, Gigante |
| Bestiário | `src/core/constants.ts` · `enemyFactory.ts` | 13 espécies, fauna por mapa |
| Desbloqueio de mapas | `src/meta/metaTracker.ts` | testado: chefe do Campo abre o Pântano |

**Regra de fronteira mantida:** o motor não conhece conquistas. Ele emite
eventos; `metaTracker` traduz. O único ponto em que o meta toca a partida é
`startRun` (bônus comprados) e `grantReward` (prêmio resgatado).

**Bônus permanentes aplicados na run:** vida do ninho, comida inicial, vida e
dano das formigas, XP, quitina, formigas iniciais extras.

### Fase 7 — Persistência  ✅ CONCLUÍDA
Save com versão, checksum, backup rotativo, migração, reparo. Os 10 gatilhos da Parte 8
(com debounce — ver lacuna L11). Botão Continuar no menu.

### Fase 8 — Entrega ✅
Testes · perfil de performance com 60 inimigos · responsivo desktop/mobile · WebView ·
build multi-arquivo · **APK assinado**.

**Entregue:**
- `entregas/Formigueiro-1.0.apk` — 4,8 MB, package `br.com.formigueiro.jogo`,
  versionCode 1 / versionName 1.0, minSdk 23 / targetSdk 35,
  assinado nos esquemas **v1 + v2 + v3** (`apksigner verify` → `Verifies`).
- **Keystore nova** (`android-keys/formigueiro-release.keystore`), por decisão do
  usuário: identidade nova, instalação antiga descartada. Validade até 2056.
  Perder este arquivo = não conseguir mais atualizar o app publicado.
- `scripts/build-apk.sh` — pipeline de um comando: typecheck → testes → build web →
  `cap sync` → APK assinado → verificação. Falha em qualquer etapa aborta o release.
- **Offline nativo**: os assets vão dentro do APK; `base: './'` porque em
  `file://`/`android_asset` caminho absoluto não resolve. Service worker mantido
  para o navegador, com guarda de protocolo em `main.tsx`.
- `androidScheme: 'https'` → a WebView serve de `https://localhost`, o que evita
  origem opaca e o descarte do `localStorage` entre atualizações (risco 5).
- Regras de backup incluem save e excluem cache/service worker — restaurar
  assets velhos por cima de um save novo era mais um vetor do risco 5.

**Correções de responsividade encontradas testando o APK de verdade:**
- **Viewport adaptativa.** O canvas era travado em 960×720 e ocupava só **38%**
  de um celular em pé. Agora a área lógica acompanha a proporção da tela
  preservando a *área* visível (±3%), então ninguém leva vantagem competitiva
  por causa do aparelho: **89%** em retrato, **100%** em paisagem.
  A escala continua inteira e o smoothing continua desligado — adapta sem distorcer.
- **Alvos de toque.** Como os paddings escalavam junto com `--hud-scale`, no
  celular os botões chegavam a **16px** de altura, metade do mínimo do nosso
  próprio gate. Piso de 34px sob `@media (pointer: coarse)`; no desktop nada muda.
- **Toque roubado (bug real, anterior a esta fase).** A coluna de câmera e o
  painel de produção disputavam o canto inferior esquerdo; a câmera ficava por
  cima e **dois botões de comprar formiga estavam mortos** no celular — tocar em
  "operária" acionava "CENTRALIZAR". No mobile a coluna foi para a direita.
  Coberto por `scripts/hud-overlap.mjs`, que agora testa *quem responde ao toque*
  no centro de cada botão, em 5 telas — e não apenas se os retângulos colidem.

---

## 4. Regras de engenharia inegociáveis

1. **Lógica nunca importa imagem.** Só `spriteRegistry` conhece caminhos de arquivo.
   Trocar um PNG jamais toca em `.ts` de sistema. *(Parte 12.2)*
2. **Todo número de balanceamento vive em `core/constants.ts`.** Zero literais mágicos
   espalhados. Facilita o ajuste fino e a leitura por quem revisar.
3. **RNG sempre semeado.** `rng.ts` centraliza; nada de `Math.random()` solto. Runs viram
   reproduzíveis e bugs de sorte viram testáveis.
4. **Delta fixo na simulação** (60 Hz lógico), interpolação só no desenho. Garante que o
   jogo se comporte igual em 30, 60 ou 144 Hz.
5. **O motor não conhece o React.** Comunicação só via store e eventos — permite trocar a
   camada de UI sem reescrever o jogo.
6. **Save versionado desde o primeiro dia.** Migração escrita junto com a mudança de
   formato, nunca depois.
7. **Sem dependência nova sem justificativa de bytes.** Cada KB entra no HTML final.
8. **Pixel-perfect sempre:** escala inteira do canvas, coordenadas arredondadas no desenho,
   `image-rendering: pixelated` no CSS.

---

## 5. Riscos mapeados

| Risco | Impacto | Mitigação |
|---|---|---|
| 60 inimigos + 20 formigas + partículas travando em mobile | 🔴 alto | spatial hash desde a Fase 1; pool de objetos; teste de carga na Fase 4, não na 8 |
| HTML single-file estourando o tamanho | 🟠 médio | orçamento por fase; Preact como saída de emergência |
| ~70 cartas virando trabalho infinito | 🟠 médio | 20 cartas na Fase 5A provam o sistema; resto é conteúdo, não engenharia |
| Ritmo lento (chefe só aos 18 min) | 🟠 médio | ver Balanceamento §2 — proposta de calmaria dinâmica |
| Save corrompendo entre versões | 🟠 médio | checksum + backup rotativo + migração desde a Fase 1 |
| Arte oficial chegando com dimensões diferentes | 🟡 baixo | contrato de sprite com `scale` e `anchor` absorve variação |
| Coordenadas da Parte 3 conflitando com o HTML real | 🟡 baixo | resolver na Fase 0; o dossiê tem precedência |

---

## 6. Definição de pronto (por fase)

Uma fase só fecha quando:
- roda no navegador sem erro de console;
- `tsc --noEmit` limpo, ESLint limpo;
- testes da fase passam;
- funciona em viewport 360×640 **e** 1920×1080;
- os números novos estão em `constants.ts`, não espalhados;
- o `CHANGELOG.md` registra o que entrou.
