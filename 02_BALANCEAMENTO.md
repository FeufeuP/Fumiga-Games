# 🐜 FORMIGUEIRO — Balanceamento e Lacunas Resolvidas

> Preenche as 11 lacunas identificadas na leitura do dossiê. Todo valor aqui é **proposta
> fundamentada e simulada**, não chute — cada seção mostra o raciocínio e o resultado.
> Estes números vivem em `src/core/constants.ts` e são ajustáveis sem tocar em lógica.
>
> **Marcação:** ✅ valor proposto · ⚖️ decisão de design que muda a sensação do jogo ·
> 🔶 depende do HTML original.

---

## L1 — Rainha, fome e produção ✅

### O problema
O dossiê define fome como mecânica central mas não dá nenhum número. Se a fome for
generosa, ela vira decoração; se for punitiva, o jogador nunca produz nada.

### Calibragem
Uma coletora produz `carga 3 ÷ viagem 22s × valor médio 2,2 = 0,30 comida/s`.
Testei quatro configurações buscando: **1 coletora = tenso, 3 coletoras = confortável.**

| Config | 1 coletora | 3 coletoras | Veredito |
|---|---|---|---|
| consumo 0,40/s | 3,8× consumo | 11,2× | frouxo demais — fome irrelevante |
| **consumo 1,00/s** | **1,5×** | **4,5×** | ✅ escolhido |
| consumo 1,15/s | 1,3× | 3,9× | tenso demais no início |

### Valores

| Constante | Valor | Efeito |
|---|---|---|
| `QUEEN_HUNGER_MAX` | 100 | — |
| `QUEEN_HUNGER_DRAIN` | 1,0 /s | Rainha esvazia em **100 s** se ninguém alimentar |
| `FOOD_TO_HUNGER` | 5 | 1 comida = 5 pontos de fome |
| Consumo real | 0,20 comida/s | 22 comida por onda de 110 s |
| Ritmo exigido | 1 comida a cada 5 s | uma Operária dá conta até ~3 formigas |

### Estados de fome ⚖️

| Faixa | Nome | Efeito | Leitura visual (Parte 11.8) |
|---|---|---|---|
| 70–100% | Saciada | produção +10% | Rainha ativa, coroa brilhando |
| 30–69% | Normal | produção normal | postura neutra |
| 10–29% | Faminta | produção **+50% de tempo** | postura cansada (Parte 11.8) |
| 1–9% | Crítica | produção **parada**, Rainha perde 1 HP/s | postura abatida, HUD pulsando vermelho |
| 0% | Inanição | 3 HP/s, sem regeneração | — |

A Rainha **não morre de fome instantaneamente**: com 500 HP e 3 HP/s, o jogador tem
~2,8 minutos de aviso. Isso transforma fome em *pressão*, não em *morte súbita* — que é o
que a Parte 2.1 pede ao chamar a Rainha de "coração".

### Ciclo de produção

```text
ovo 6s → larva 8s → pupa 6s → adulta        = 20 s base, fila serial (1 por vez)
```

| Modificador | Efeito |
|---|---|
| Fome < 30% | +50% no tempo total (30 s) |
| Fome = 0 | fila congelada |
| Cartas de Rainha | reduzem tempo, chance de produção dupla |

Fila serial (e não paralela) é deliberada: cria a decisão "produzir Soldado agora ou
Coletora primeiro?", que é o que dá peso à Sala da Rainha.

---

## L2 — Custos e população ✅

Custos calibrados para que **cada formiga custe tempo perceptível** mas nunca trave o jogo.
Coluna final = segundos com 3 coletoras, já descontada a fome da Rainha.

| Classe | Comida | Quitina | Tempo real (3 coletoras) | Papel do custo |
|---|---|---|---|---|
| Operária | 8 | — | 11 s | barata, é infraestrutura |
| Coletora | 10 | — | 14 s | investimento que se paga em ~33 s |
| Exploradora | 10 | — | 14 s | mesma faixa, função diferente |
| Soldado | 18 | — | 26 s | dobro da Coletora: escolha real |
| Defensora | 25 | 10 (desbloqueio) | 36 s | classe avançada |
| Tóxica | 30 | 20 | 43 s | especialista |
| Gigante | 50 | 40 | 71 s | evento, não rotina |

### População

| Constante | Valor | Nota |
|---|---|---|
| `POP_MAX_INICIAL` | 8 formigas | |
| `POP_MAX_TETO` | 24 | com cartas de Colônia |
| Início da run | 2 Operárias, 2 Coletoras, 1 Exploradora, 1 Soldado | 6 de 8 slots ocupados |

A colônia começa **quase cheia** de propósito: o jogador sente o limite na primeira onda e
entende que "capacidade de população" é uma carta valiosa.

---

## L3 — XP por fonte ✅ (a lacuna mais crítica)

### O problema
A curva `10n + 8n²` é quadrática. Sem fontes de XP que escalem junto, a progressão morre
no nível 8–10 — e o roguelike inteiro depende dela.

### Valores propostos

| Fonte | XP | Escala? |
|---|---|---|
| Recurso coletado | `1 × valor em comida` | sim, mapas melhores dão recursos melhores |
| Inimigo morto | `5 × força da onda` | **sim** — acompanha o crescimento da onda |
| Onda sobrevivida | `15 × número da onda` | **sim**, linear |
| Elite | 40 | fixo |
| Chefe | 150 | fixo |
| Objetivo/missão | 25–100 | por missão |

Duas fontes escalam com a onda. É isso que sustenta a curva quadrática.

### Simulação — nível por onda

| Onda | XP ganha | XP acumulada | Nível | Cartas |
|---|---|---|---|---|
| 1 | 53 | 53 | 2 | 1 |
| 3 | 132 | 260 | 4 | 3 |
| 5 (elite) | 226 | 644 | 6 | 5 |
| 10 (**chefe**) | 502 | 2.375 | 9 | 8 |
| 15 | ~700 | 5.400 | 12 | 11 |
| 20 (**chefe**) | 888 | 9.570 | 15 | 14 |
| 26 | 1.368 | 16.808 | 18 | 17 |
| 30 (**chefe**) | 1.248 | 22.430 | **20** | **19** |

**Resultado:** ~1 carta por onda no início, desacelerando para 1 a cada 1,5 onda no fim.
19 escolhas numa run de 30 ondas — densidade correta para o gênero, e sempre há próximo
nível à vista.

---

## L4 — Velocidades, alcances e raios ✅

Unidade base: **1 tile = 32 px**. Coletora a 55 px/s cruza a tela lógica (960px) em ~17 s.

| Classe | Velocidade | Detecção | Agressão | Ataque |
|---|---|---|---|---|
| Operária | 50 px/s | 80 px | — (só autodefesa) | 20 px |
| Coletora | 55 px/s | **140 px** (acha recurso) | foge a 100 px | 20 px |
| Exploradora | **75 px/s** | 120 px | evita combate | 22 px |
| Soldado | 60 px/s | 160 px | **200 px** | 28 px |
| Defensora | 45 px/s | 120 px | anel de 140 px do ninho | 26 px |
| Tóxica | 52 px/s | 180 px | 160 px | **160 px** (projétil) |
| Gigante | **35 px/s** | 140 px | 180 px | 40 px |

| Inimigo | Velocidade | Agressão |
|---|---|---|
| pequeno | 45 px/s | 150 px |
| médio | 40 px/s | 180 px |
| chefe | 30 px/s | 300 px |

### Névoa de guerra
| Constante | Valor |
|---|---|
| Raio de revelação (Exploradora) | 180 px |
| Raio passivo (outras classes) | 90 px |
| Raio do ninho | 220 px |
| Re-escurecimento | **não** — revelado fica revelado na run |

Sem re-escurecimento porque a Parte 6.4 lista "revelação permanente" como *carta de
Exploradora* — o que só faz sentido se o padrão for temporário… mas re-escurecer punindo
o jogador o tempo todo é frustrante. **Solução:** revelado permanece visível, mas
**recursos e inimigos só aparecem dentro do raio ativo**. A carta "revelação permanente"
passa a mostrar recursos em área já explorada. Preserva o valor da carta sem a frustração.

### Cadências
| Classe | Ataques/s | Antecipação (Parte 11.9) |
|---|---|---|
| Operária/Coletora | 0,8 | 200 ms |
| Exploradora | 1,0 | 150 ms |
| Soldado | 1,2 | 250 ms |
| Defensora | 1,0 | 300 ms |
| Tóxica | 0,7 | 400 ms |
| Gigante | 0,5 | 500 ms |

---

## L5 — Derrota parcial vs. total ⚖️

A Parte 10 exige que sejam diferentes mas não define nenhuma. Proposta:

### Derrota parcial — "Ninho em ruínas"
**Gatilho:** HP do ninho chega a 0 **com a Rainha viva**.

| Consequência | |
|---|---|
| Ninho entra em estado *ruína* | funciona a 50% (armazenamento, defesa) |
| Todas as formigas **externas** morrem | vão para o cemitério |
| Formigas internas sobrevivem | Operárias resistem |
| Recursos em campo são perdidos | os depositados ficam |
| Onda atual é cancelada | trégua de 60 s para reconstruir |
| Cartas e nível **mantidos** | a build sobrevive |
| Reconstrução | Operárias reparam a 10 HP/s; ninho volta ao normal em 100% |

**A run continua.** É um golpe duro, não o fim.

### Derrota total — "A Rainha caiu"
**Gatilho:** HP da Rainha chega a 0 (combate ou inanição).

| Consequência | |
|---|---|
| Run termina imediatamente | tela de game over |
| Build roguelike é perdida | cartas e níveis somem |
| Quitina **persiste** | Parte 5 é explícita |
| Recompensas de fim de run | XP de colônia, quitina, desbloqueios (Parte 6.8) |
| Estatísticas | ondas, chefes, cartas, tempo, recursos |

Essa assimetria é o que dá sentido a "o ninho é a armadura, a Rainha é o coração"
(Parte 2.1): perder a armadura dói, perder o coração acaba.

---

## L6 — Desbloqueio de mapas ✅

Progressão dupla: **façanha na run + custo em quitina**. A façanha prova habilidade; a
quitina dá ao jogador algo para fazer com a moeda entre runs.

| Mapa | Requisito | Quitina | Chefe |
|---|---|---|---|
| Campo | inicial | — | Campo |
| Pântano | derrotar o chefe do Campo | 15 | Pântano |
| Caverna | chegar à onda 20 no Pântano | 30 | Caverna |
| Deserto | derrotar o chefe da Caverna | 50 | Deserto |
| Montanha | 2 chefes na mesma run | 80 | Montanha |
| Selva | derrotar os chefes de 4 mapas | 120 | Selva |

Cada mapa aumenta a dificuldade base e a qualidade dos recursos:

| Mapa | Mult. inimigos | Mult. recursos | Traço |
|---|---|---|---|
| Campo | ×1,0 | ×1,0 | equilibrado |
| Pântano | ×1,2 | ×1,1 | veneno, terreno lento |
| Caverna | ×1,4 | ×1,3 | névoa densa, cristais |
| Deserto | ×1,6 | ×1,2 | fome acelerada +25% |
| Montanha | ×1,8 | ×1,4 | inimigos com armadura |
| Selva | ×2,0 | ×1,6 | inimigos rápidos, ondas densas |

---

## L7 — Renascimento (Rebirth) ✅

**Disponível:** após derrotar qualquer chefe ou alcançar a onda 15.

### Fórmula
```text
Pontos de Renascimento = floor( √(onda_alcançada × 2) + chefes × 3 + nível_colônia ÷ 4 )
```

| Situação | Pontos |
|---|---|
| Onda 10, 1 chefe, nível 9 | `√20 + 3 + 2` = **9** |
| Onda 20, 2 chefes, nível 15 | `√40 + 6 + 3` = **15** |
| Onda 30, 3 chefes, nível 20 | `√60 + 9 + 5` = **21** |

Raiz quadrada para a onda: recompensa ir longe, mas com retorno decrescente — evita farmar
a mesma onda fácil eternamente.

### O que reseta e o que fica

| Reseta ❌ | Persiste ✅ |
|---|---|
| cartas e build da run | quitina |
| nível de colônia | pontos de renascimento |
| formigas e população | cartas descobertas |
| recursos e comida | classes desbloqueadas |
| onda atual | mapas desbloqueados |
| estado do ninho | conquistas e missões |
| | melhorias permanentes |
| | registro de melhores runs |

### Bônus permanentes (gastos em pontos)

| Bônus | Custo | Efeito | Máx |
|---|---|---|---|
| Colônia veterana | 5 | +1 formiga inicial | 6 |
| Reservas | 8 | +20 comida no início | 5 |
| Instinto | 10 | +10% XP | 8 |
| Casta forte | 12 | +5% HP de todas as formigas | 10 |
| Rainha resiliente | 15 | +10% fome máxima | 5 |
| Sorte do explorador | 20 | +5% chance de raridade alta | 5 |
| Slot extra | 40 | +1 slot de build | 3 |

Teto proposital: mesmo maximizado, o bônus total fica em ~40% — a Parte 6.8 pede
explicitamente para *não* apagar o senso de risco.

---

## L8 — Áudio ✅ (mínimo viável)

O dossiê lista a pasta mas nenhum som. Proposta enxuta — **sintetizado via WebAudio**, sem
arquivos, o que preserva o requisito de HTML único e offline com custo de ~2 KB.

| Categoria | Sons |
|---|---|
| UI | clique, hover, abrir/fechar painel, erro |
| Coleta | pegar recurso, depositar, comida entregue |
| Combate | mordida, dano recebido, morte, crítico, ácido |
| Eventos | onda começando, elite, chefe, level-up, carta escolhida, baú, evolução |
| Rainha | alimentada, fome crítica, produção concluída |
| Ninho | dano, ruína, reparo concluído |
| Ambiente | 1 loop por mapa (6) |

Controles: volume master/música/efeitos separados, mudo, persistidos no save.

---

## L9 — Conflito de slots ⚖️ *(resolvido)*

**O conflito:** 4 classes começam desbloqueadas (Operária, Coletora, Exploradora, Soldado),
mas a Parte 6.5 dá apenas **3 slots de formigas ativas**.

**Diagnóstico:** os "slots de formigas" da Parte 6.5 são *slots de carta de build*, não
limite de quais classes podem existir. Os dois conceitos colidiram na leitura.

**Resolução:**
- as 4 classes iniciais **sempre podem ser produzidas** — sem limite de classe;
- os 3 slots são de **cartas de especialização de classe**. Investir em Soldado ocupa um
  slot; a colônia inteira pode ter soldados de qualquer forma, só não recebem os bônus
  profundos da carta;
- isso torna a escolha significativa (*em quais classes eu me especializo?*) sem proibir o
  jogador de usar uma classe que já tem.

Renomeação sugerida na UI: **"Especializações"** em vez de "slots de formigas".

---

## L10 — Inventário e Missões duplicados 🔶

Aparecem na tela inicial (Parte 3.1) **e** no interior (Parte 3.3).

**Proposta:** mesma tela, contextos diferentes.
- **Fora da run** (menu inicial): modo consulta — coleção de cartas, conquistas, itens
  permanentes. Sem interação que afete uma run.
- **Dentro da run** (interior): modo ativo — inventário da run, missões em andamento,
  progresso atual.

Um componente, uma prop `modo: 'meta' | 'run'`. Confirmar contra o HTML original na Fase 0.

---

## L11 — Frequência de save ✅

"Salvar em coleta importante" (Parte 8), com 6 coletoras, dispararia ~50 writes/min —
travando o jogo em celulares.

**Resolução — três camadas:**

| Camada | Quando | O quê |
|---|---|---|
| **Imediato** | level-up, carta, baú, chefe, entrada/saída do interior, derrota, renascimento | save completo, síncrono |
| **Debounce 5 s** | coleta, produção, dano | agrupa rajadas num único write |
| **Periódico 30 s** | sempre | rede de segurança |

Mais: **backup rotativo de 3 slots**, checksum para detectar corrupção, e reparo com
fallback para o backup válido mais recente.

---

## Tabela-resumo — inimigos base

Valores da onda 1 (multiplicados por `força` e pelo modificador do mapa).

| Inimigo | HP | Dano | Vel. | Tam. | Traço |
|---|---|---|---|---|---|
| Aranha | 25 | 8 | 50 | 32 | rápida, frágil |
| Lagarta | 45 | 5 | 30 | 40 | lenta, resistente |
| Vespa | 20 | 12 | 70 | 32 | voa, ignora terreno |
| Escorpião | 40 | 14 | 45 | 48 | veneno 2/s por 3 s |
| Besouro | 70 | 10 | 35 | 48 | armadura 3 |
| Sapo | 90 | 18 | 40 | 64 | engole formiga pequena |

| Chefe | HP | Dano | Fases | Quitina |
|---|---|---|---|---|
| Campo | 600 | 20 | 2 | 3 |
| Pântano | 850 | 24 | 2 | 3 |
| Caverna | 1.100 | 28 | 3 | 4 |
| Deserto | 1.400 | 32 | 3 | 4 |
| Montanha | 1.800 | 38 | 3 | 4 |
| Selva | 2.400 | 45 | 4 | 5 |

---

## ⚖️ Recomendação de ritmo (fora das lacunas)

Simulando a Parte 7 literalmente: 110 s por onda ⇒ **primeiro chefe aos 18 min**, três
chefes em **55 min**. Longo para o gênero — roguelikes de sobrevivência costumam fechar
uma run em 20–30 min.

**Proposta: calmaria decrescente.** Mantém o combate de 20 s intacto e só encurta a pausa,
que fica generosa quando o jogador ainda está aprendendo.

| Ondas | Calmaria | Ciclo |
|---|---|---|
| 1–5 | 90 s | 110 s |
| 6–10 | 70 s | 90 s |
| 11–20 | 55 s | 75 s |
| 21+ | 40 s | 60 s |

**Resultado:** chefe 1 aos **~14 min** (–22%), chefe 3 aos **~36 min** (–35%). A run ganha
aceleração natural, que é exatamente a curva de tensão do gênero.

*Se preferir manter a Parte 7 ao pé da letra, é uma linha em `constants.ts`.*
