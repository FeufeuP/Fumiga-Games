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
