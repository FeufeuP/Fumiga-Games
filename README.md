# 🐜 FORMIGUEIRO — Documentação

## Como rodar o jogo

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm test           # 46 testes (Vitest)
npm run build      # typecheck + build de produção em dist/
```

O código-fonte vive em `src/` (reconstrução iniciada em 31/08/2026 —
Fases 1 e 2 prontas; ver `CHANGELOG.md`).

Ordem de leitura:

| # | Arquivo | O que é |
|---|---------|---------|
| 0 | [`../00_COMPREENSAO_DO_PROJETO.md`](../00_COMPREENSAO_DO_PROJETO.md) | Leitura consolidada do dossiê + lacunas encontradas |
| 1 | [`01_PLANO_DE_DESENVOLVIMENTO.md`](01_PLANO_DE_DESENVOLVIMENTO.md) | Arquitetura híbrida, estrutura de arquivos, 8 fases, riscos |
| 2 | [`02_BALANCEAMENTO.md`](02_BALANCEAMENTO.md) | As 11 lacunas resolvidas com números simulados |
| 3 | [`03_BARALHO_ROGUELIKE.md`](03_BARALHO_ROGUELIKE.md) | 68 cartas, raridades, sinergias, 6 evoluções, baús |
| 4 | [`04_CONSTANTS_PROPOSTAS.ts`](04_CONSTANTS_PROPOSTAS.ts) | Todos os números em TypeScript, pronto para virar `src/core/constants.ts` |
| 5 | `05_ANALISE_HTML_ORIGINAL.md` | ⏳ Pendente — aguarda o HTML original |

**Fonte de autoridade:** `../../uploads/Dossie_Perfeito_Melhorado.md`.
Onde este conjunto propõe algo novo, está marcado `[P]`; o que vem do dossiê, `[D]`.
