# 🐜 FORMIGUEIRO — Baralho Roguelike

> Detalha a Parte 6 do dossiê. **68 cartas** em 11 categorias, 5 raridades,
> sinergias, 6 evoluções e 4 tipos de baú.
>
> Regra que governa tudo (Parte 6.10): *toda carta precisa de pelo menos uma sinergia e
> uma situação em que ela é a melhor escolha do painel.*

---

## 1. Estrutura de uma carta

```ts
interface Card {
  id: string;                    // 'soldier_mandibles'
  nome: string;
  raridade: Raridade;
  icone: string;
  descCurta: string;             // ≤ 60 caracteres, cabe na carta
  descLonga: string;             // tooltip
  sistema: Sistema;              // qual módulo do jogo altera
  valorPorNivel: number[];       // [10, 18, 25] → ganho decrescente
  maxNiveis: number;
  tags: Tag[];                   // para pesos e sinergias
  prerequisitos?: string[];
  sinergias: string[];
  incompativeis?: string[];
  aoEscolher(state, nivel): void;
  aoEvoluir?(state): void;
}
```

**Ganho decrescente sempre.** `[10, 18, 25]` em vez de `[10, 20, 30]` — impede que
empilhar a mesma carta seja automaticamente ótimo (Parte 6.10: "multiplicadores sem
limite" é proibido).

---

## 2. Raridades e pesos

| Raridade | Cor | Peso base | Níveis típicos |
|---|---|---|---|
| Comum | `#8d8d8d` | 60 | 3 |
| Incomum | `#5ab85a` | 25 | 3 |
| Rara | `#4b9ee8` | 10 | 2 |
| Épica | `#a767df` | 4 | 2 |
| Lendária | `#f0ad36` | 1 | 1 |

### Progressão dos pesos por nível

```text
Comum    = max(60 − nível × 2,2, 20)      // nunca some de vez
Incomum  = 25 + nível × 0,5
Rara     = 10 + nível × 0,9
Épica    =  4 + nível × 0,6
Lendária =  1 + nível × 0,2
```

| Nível | Comum | Incomum | Rara | Épica | Lendária |
|---|---|---|---|---|---|
| 1 | 57,8% | 25,5% | 10,9% | 4,6% | 1,2% |
| 5 | 49,0% | 27,5% | 14,5% | 7,0% | 2,0% |
| 10 | 38,0% | 30,0% | 19,0% | 10,0% | 3,0% |
| 15 | 27,0% | 32,5% | 23,5% | 13,0% | 4,0% |
| 20 | 19,2% | 33,7% | 26,9% | 15,4% | 4,8% |

**Simulação:** numa run de 30 ondas (19 painéis de 4 cartas), o jogador vê em média
**~10 cartas épicas ou lendárias**. Frequente o bastante para gerar empolgação, raro o
bastante para que a lendária ainda seja um evento.

Piso de 20% em Comum é intencional: cartas comuns de nível alto continuam úteis e mantêm
o painel com opções acessíveis quando o jogador precisa de algo básico.

---

## 3. O baralho — 68 cartas

Legenda de raridade: ⚪ Comum · 🟢 Incomum · 🔵 Rara · 🟣 Épica · 🟡 Lendária

### 3.1 Colônia (6)

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Passo firme | ⚪ | +8/14/19% velocidade de todas as formigas | 3 |
| Ninhada maior | 🟢 | +2/3/4 de população máxima | 3 |
| Divisão de trabalho | 🟢 | +10/17/23% eficiência em todas as tarefas | 3 |
| Feromônio de comando | 🔵 | +25/40% alcance de comando | 2 |
| Colônia unida | 🟣 | formigas próximas (≤80px) ganham +15% de tudo | 2 |
| Mente-colmeia | 🟡 | +1 slot de especialização e +10% em tudo | 1 |

### 3.2 Ninho (6)

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Paredes grossas | ⚪ | +40/70/95 HP do ninho | 3 |
| Terra batida | ⚪ | +2/3/4 de armadura | 3 |
| Reparo rápido | 🟢 | +50/85/115% velocidade de reparo | 3 |
| Despensa | 🟢 | +30/50/65% capacidade de armazenamento | 3 |
| Espinhos de raiz | 🔵 | devolve 30/50% do dano recebido | 2 |
| Fortaleza viva | 🟣 | ninho regenera 5 HP/s fora de combate | 2 |

### 3.3 Rainha (7)

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Apetite contido | ⚪ | −12/20/27% de consumo de fome | 3 |
| Estômago amplo | ⚪ | +25/42/57% de fome máxima | 3 |
| Porção reforçada | 🟢 | +2/3/4 de fome por comida entregue | 3 |
| Postura acelerada | 🟢 | −15/25/33% no tempo de produção | 3 |
| Ninhada dupla | 🔵 | 15/25% de chance de produzir 2 formigas | 2 |
| Saciedade duradoura | 🔵 | 20/30s de imunidade à fome após alimentar | 2 |
| Rainha eterna | 🟡 | Rainha revive 1× com 50% de HP e fome | 1 |

### 3.4 Operária (5)

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Carregadora | ⚪ | +1/2/3 comida por viagem | 3 |
| Passo interno | ⚪ | +20/34/46% velocidade dentro do ninho | 3 |
| Mãos hábeis | 🟢 | +5/8/11 HP/s de reparo | 3 |
| Turno extra | 🟢 | +2/3 de Operárias máximas | 2 |
| Engenheiras | 🔵 | Operárias reparam o ninho **durante** o combate | 2 |

### 3.5 Coletora (6)

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Passo leve | ⚪ | +12/20/27% de velocidade | 3 |
| Mochila | ⚪ | +2/3/4 de capacidade de carga | 3 |
| Faro apurado | 🟢 | +40/70/95px de alcance de detecção | 3 |
| Colheita farta | 🟢 | 15/25/33% de chance de recurso extra | 3 |
| Instinto de retorno | 🔵 | retornam sozinhas quando cheias ou em perigo | 2 |
| Casca dura | 🔵 | +20/32 HP e imunes a lentidão | 2 |

### 3.6 Exploradora (6)

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Olhos largos | ⚪ | +30/52/70px de raio de revelação | 3 |
| Pernas longas | ⚪ | +15/25/34% de velocidade | 3 |
| Sentido de recurso | 🟢 | mostra recursos em área já revelada | 2 |
| Mapeadoras | 🟢 | revelação permanente (não re-escurece) | 1 |
| Caçadora de tesouros | 🔵 | +10/17% de chance de baú no mapa | 2 |
| Vanguarda | 🟣 | revelar área nova dá +15 XP | 2 |

### 3.7 Soldado (7)

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Mandíbulas afiadas | ⚪ | +4/7/9 de dano | 3 |
| Couraça | ⚪ | +15/26/35 HP | 3 |
| Instinto de caça | 🟢 | +50/85/115px de alcance de agressão | 3 |
| Golpe preciso | 🟢 | +10/17/23% de chance crítica | 3 |
| Coletor de quitina | 🔵 | +1/2 quitina extra por elite/chefe | 2 |
| Provocação | 🔵 | atrai inimigos para longe do ninho | 2 |
| Fúria da colônia | 🟣 | +3% de dano por formiga viva (máx +45%) | 2 |

### 3.8 Defensora (5) — *requer classe desbloqueada*

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Anel ampliado | ⚪ | +30/52/70px de raio do anel | 3 |
| Escudo reforçado | ⚪ | +5/8/11 de armadura | 3 |
| Interceptação | 🟢 | +2/3 alvos simultâneos | 2 |
| Postura firme | 🟢 | imune a knockback, +25% de dano parado | 2 |
| Recuperação | 🔵 | regenera 3/5 HP/s fora de combate | 2 |

### 3.9 Tóxica (6) — *requer classe desbloqueada*

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Ácido concentrado | ⚪ | +5/8/11 de dano do projétil | 3 |
| Jato longo | ⚪ | +30/52/70px de alcance | 3 |
| Cadência rápida | 🟢 | +20/34/46% de velocidade de disparo | 3 |
| Corrosão prolongada | 🟢 | +2/3/4s de duração da corrosão | 3 |
| Propagação | 🔵 | corrosão salta para 1/2 inimigos próximos | 2 |
| Ácido crítico | 🔵 | 15/25% de chance de dano dobrado | 2 |

### 3.10 Gigante (6) — *requer classe desbloqueada*

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Massa | ⚪ | +50/85/115 HP | 3 |
| Impacto | ⚪ | +6/10/14 de dano | 3 |
| Empurrão | 🟢 | +20/34/46px de knockback | 3 |
| Inabalável | 🟢 | imune a atordoamento e veneno | 1 |
| Onda de choque | 🔵 | ataques atingem área de 60/90px | 2 |
| Passo pesado | 🔵 | +25/40% de velocidade (era o ponto fraco) | 2 |

### 3.11 Comportamentos e armas da colônia (8)

Estas não pertencem a uma classe — são *comportamentos coletivos*, o que a Parte 6.4 pede.

| Carta | R | Efeito | Níveis |
|---|---|---|---|
| Enxame de mordidas | 🟢 | a cada 8s, todas as formigas próximas atacam juntas | 3 |
| Espinhos do ninho | 🟢 | inimigos que tocam o ninho recebem 8/13/17 de dano | 3 |
| Armadilha de resina | 🔵 | 3 armadilhas que prendem por 2s, recarga 15s | 2 |
| Nuvem de feromônio | 🔵 | zona que dá +20% de velocidade e +10% de dano | 2 |
| Chuva de ácido | 🟣 | a cada 20s, ácido cai sobre o maior grupo | 2 |
| Muralha de defensores | 🟣 | invoca 2 defensoras temporárias por 15s | 2 |
| Investida gigante | 🟣 | a cada 30s, uma gigante espectral avança | 2 |
| Feromônio de fúria | 🟡 | abaixo de 30% de HP do ninho: +50% de dano na colônia | 1 |

---

## 4. Sinergias

Sinergias **aumentam o peso** das cartas relacionadas quando o painel é montado. Não são
combos escondidos — a UI mostra um brilho na carta que combina com a build atual.

| Eixo | Cartas que se puxam | Fantasia |
|---|---|---|
| **Economia** | Mochila + Faro apurado + Colheita farta + Despensa | colônia rica |
| **Muralha** | Paredes grossas + Terra batida + Espinhos + Anel ampliado | fortaleza |
| **Agressão** | Mandíbulas + Instinto de caça + Fúria + Provocação | exército |
| **Veneno** | Ácido concentrado + Corrosão + Propagação + Chuva de ácido | controle de área |
| **Enxame** | Ninhada maior + Ninhada dupla + Postura acelerada + Turno extra | números |
| **Exploração** | Olhos largos + Mapeadoras + Caçadora + Vanguarda | XP por mapa |
| **Peso** | Massa + Impacto + Empurrão + Onda de choque | linha de frente |

**Regra de peso:** cada carta já escolhida de um eixo dá **+15% de peso** às demais cartas
daquele eixo, com teto de +60%. Builds ganham identidade sem que o painel fique previsível.

---

## 5. Evoluções

As 5 do dossiê (Parte 6.6) + 1 nova para a Coletora ter alternativa. Toda evolução exige
`carta base no nível máximo + carta de suporte + nível mínimo de colônia`, e **muda
comportamento**, não só números.

| Evolução | Receita | Nível | Comportamento novo |
|---|---|---|---|
| **Legião de ataque** | Mandíbulas afiadas (máx) + Fúria da colônia | 8 | Soldados atacam em formação de 3; o grupo compartilha dano recebido |
| **Nuvem de ácido** | Corrosão prolongada (máx) + Propagação | 8 | Poças de ácido se fundem em uma nuvem persistente que segue os inimigos |
| **Muralha viva** | Anel ampliado (máx) + Escudo reforçado | 8 | Defensoras se conectam formando uma barreira física que bloqueia movimento |
| **Colosso do ninho** | Impacto (máx) + Empurrão | 10 | A Gigante ganha investida com dano em linha e atordoamento em área |
| **Caravana de recursos** | Mochila (máx) + Passo leve | 6 | Coletoras andam em fila; a primeira que chega descarrega por todas |
| **Coração dourado** 🆕 | Porção reforçada (máx) + Ninhada dupla | 10 | A Rainha produz sem consumir comida enquanto a fome estiver acima de 80% |

Evoluções **não ocupam slot** — substituem a carta base.

---

## 6. Slots de build

Conforme resolvido na lacuna L9 (ver `02_BALANCEAMENTO.md`), os slots são de
**especialização**, não de existência de classe.

| Tipo | Inicial | Máximo |
|---|---|---|
| Especializações de classe | 3 | 6 |
| Comportamentos/armas | 3 | 5 |
| Passivas (Colônia, Ninho, Rainha) | 2 | 4 |

Aumentam via: Mente-colmeia 🟡, bônus de renascimento (40 pontos), certos baús lendários.

**Slot cheio:** ao escolher uma carta de categoria lotada, a UI oferece **substituir** uma
existente (devolvendo 50% dos níveis investidos em XP) ou recusar a carta.

---

## 7. Baús

| Tipo | Origem | Escolhas | Garantia |
|---|---|---|---|
| Comum | mapa, exploração | 3 | — |
| Elite | onda de elite | 4 | 1 rara |
| Chefe | onda de chefe | 5 | 1 rara ou épica |
| Lendário | 2º chefe da run, evento raro | 3 | evolução disponível ou item único |

Todos pausam o mundo e abrem modal central (Parte 6.7). Animação de abertura: tampa
levanta → luz na cor da raridade máxima → cartas deslizam.

---

## 8. Regras anti-degeneração (Parte 6.10)

| Proibição do dossiê | Como o baralho cumpre |
|---|---|
| carta obrigatória em toda build | nenhuma carta dá mais de +35% num eixo sozinha |
| multiplicadores sem limite | tudo é aditivo com ganho decrescente; teto explícito |
| crescimento que elimine o perigo | ameaça cresce quadraticamente (nº × força); build cresce linearmente |
| opções inúteis | 68 cartas revisadas: cada uma tem sinergia declarada |
| evolução impossível de encontrar | 6 evoluções, receitas de 2 cartas, ambas comuns/incomuns na base |
| excesso de texto | descrição curta limitada a 60 caracteres |

### Trava de segurança
Se o painel só puder oferecer cartas já no nível máximo, ele substitui a sobra por:
1. carta de outra categoria; 2. cura do ninho (+25% de HP); 3. 30 de comida; 4. 1 quitina.
**O painel nunca aparece vazio nem com opção inútil.**

---

## 9. Ordem de implementação

**Fase 5A — 20 cartas** ✅ CONCLUÍDA — que provam todos os mecanismos do sistema:
todas as 6 de Ninho, 4 de Colônia, 4 de Rainha, 3 de Coletora, 3 de Soldado.
Cobrem: raridade, níveis múltiplos, ganho decrescente, sinergia, aplicação de efeito.

**Fase 5B — as 48 restantes** ✅ CONCLUÍDA — + sinergias + evoluções + baús + slots.

> **Estado da implementação (v0.5.0)**
>
> | Peça | Arquivo | Situação |
> |---|---|---|
> | 68 cartas | `src/roguelike/cards/{deck5a,deck5b}.ts` | completas, todas com efeito |
> | Sorteio e pesos | `src/roguelike/cardPool.ts` | raridade por nível + sinergia por eixo |
> | Efeitos | `src/roguelike/modifiers.ts` | único lugar que sabe o que cada carta faz |
> | 6 evoluções | `src/roguelike/evolutions.ts` | receita, progresso e substituição da base |
> | 4 baús | `src/roguelike/chests.ts` | garantias de raridade, respeitam slots |
> | Slots | `src/roguelike/slots.ts` | 3/3/2 com tetos 6/5/4 e reembolso de 50% |
> | Trava anti-vazio | `src/roguelike/fallback.ts` | cura, comida e quitina |
> | Painel e inventário | `src/ui/CardPanel.tsx`, `src/ui/screens/RunInventory.tsx` | |
>
> | Brilho de sinergia | `cardPool.synergyInfo` + `CardPanel.tsx` | etiqueta do eixo + tooltip |
> | Substituição | `src/ui/ReplaceDialog.tsx` | reembolso de 50% em XP |
>
> **Sistema roguelike completo.** O painel oferece no máximo UMA carta que
> exige substituição por vez: um painel inteiro de cartas que não cabem
> seria hostil, mas nunca mostrar a troca esconderia a mecânica.

A partir daí, adicionar carta é preencher um objeto em `roguelike/cards/` — **conteúdo,
não engenharia**.
