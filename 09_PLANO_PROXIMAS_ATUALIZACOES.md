# 🐜 FORMIGUEIRO — Plano de Atualizações Futuras (Fases 6A–10A)

> Documento de planejamento estratégico e operacional para o desenvolvimento futuro do jogo **Formigueiro**.
> Derivado da análise de viabilidade, engajamento e retenção de jogadores.

---

## 📊 Matriz de Prioridade e Viabilidade

| Ideia / Funcionalidade | Prioridade | Viabilidade Técnica | Impacto no Jogador | Fase do Plano |
|---|---|---|---|---|
| **1. Gerenciamento de Save (Importar/Exportar e Slots)** | 🔴 **Crítica (Alta)** | 🟢 **MUITO ALTA** | Evita perda de progresso; permite jogar no PC e Celular | **Fase 7A** |
| **2. Árvore de Talentos Permanentes (Meta-Progresso com Renascimento)** | 🔴 **Crítica (Alta)** | 🟢 **ALTA** | Cria o verdadeiro loop roguelite ("só mais uma run") | **Fase 6A** |
| **3. Bestiário e Compêndio das Pragas (Interior)** | 🟡 **Média-Alta** | 🟢 **MUITO ALTA** | Colecionismo, estatísticas e lore das 12 espécies e 6 chefes | **Fase 6C** |
| **4. Berçário Real Animado (Desenvolvimento de Ovos e Larvas)** | 🟡 **Média** | 🟢 **ALTA** | Imersão visual no interior do formigueiro | **Fase 6B** |
| **5. Modo Ondas Infinitas (Endless) & Modo Boss Rush** | 🟡 **Média** | 🟢 **ALTA** | Desafio de alto nível para builds de 74 cartas | **Fase 8A & 8B** |
| **6. Ambiência Sonora e Efeitos Climáticos por Bioma** | 🟢 **Baixa-Média** | 🟢 **ALTA** | Imersão audiovisual nos 6 mapas do jogo | **Fase 9A** |
| **7. Formigas Engenheiras e Barricadas de Terra** | 🟢 **Baixa** | 🟡 **MÉDIA** | Profundidade tática adicional na defesa do ninho | **Fase 10A** |

---

## 🚀 Cronograma Detalhado por Fases

### 🔹 FASE 6A — Árvore de Talentos Permanentes (Meta-Progresso de Renascimento)

* **Objetivo:** Dar utilidade e propósito de longo prazo aos pontos de **Renascimento (Prestígio)**.
* **Mecânica:**
  * Tela dedicada acessível na sala de **RENASCIMENTO** do interior.
  * Árvore com 4 ramificações principais:
    1. **Genética Real (Rainha):** +Redução permanente de fome, +Chance de ovos duplos, +Vida inicial da Rainha.
    2. **Mente Colmeia (Colônia):** +Capacidade inicial de carregamento, +Velocidade base de todas as formigas, +Visão da névoa.
    3. **Feromônio de Guerra (Combate):** +Dano base dos Soldados, +HP dos Soldados, +Redução de tempo no Cemitério.
    4. **Arquitetura Subterrânea (Ninho):** +HP base do Ninho, +Capacidade da Despensa, +Resistência a dano.
* **Arquitetura & Código:**
  * `src/meta/talentTree.ts`: Definição declarativa dos nós da árvore (requisitos, custos em pontos de renascimento e multiplicadores).
  * Integrado ao `modsFrom(upgrades, rebirths, talents)` para aplicação instantânea na partida.
  * Persistido no `RunSaveV3`.

---

### 🔹 FASE 6B — Berçário Real Animado no Interior

* **Objetivo:** Tornar o interior do formigueiro vivo e dinâmico durante a produção de formigas.
* **Mecânica:**
  * Na **Sala da Rainha**, exibir os ovos, larvas e pupas depositados no chão do berçário.
  * Animações procedurais em pixel art:
    * Ovos pulsando suavemente.
    * Larvas se mexendo e sendo alimentadas pelas operárias internas.
    * Pupas em casulos prestes a eclodir.
* **Arquitetura & Código:**
  * `src/ui/interior/QueenNursery.tsx`: Componente de renderização dos estágios de metamorfose baseados na fila real do `eggCycle` da Rainha.

---

### 🔹 FASE 6C — Bestiário & Compêndio das Pragas

* **Objetivo:** Adicionar uma sala de enciclopédia interativa no interior do formigueiro.
* **Mecânica:**
  * Galeria das 12 espécies de inimigos (Aranha, Vespa, Escorpião, Lacraia, etc.) e dos 6 Chefes.
  * Para cada criatura:
    * Sprite animado em tamanho real.
    * Contagem total de eliminação acumulada (`totals.byEnemy[kind]`).
    * Stats completos: HP, Dano, Velocidade, Tipo de Ataque, Drop de Recurso.
    * Lore e Dica Tática de combate.
* **Arquitetura & Código:**
  * `src/ui/interior/BestiaryRoom.tsx`: Tela de navegação do bestiário.
  * Dados derivados de `ENEMIES` em `constants.ts` combinados com o histórico persistido do save.

---

### 🔹 FASE 7A — Gerenciamento Avançado de Save (Importar/Exportar e Slots)

* **Objetivo:** Permitir cópia/cola de progresso entre PC/Celular e suporte a múltiplos perfis de jogo.
* **Mecânica:**
  * **Exportar Save:** Gera uma string codificada em Base64 com o envelope do `RunSaveV3` + Checksum FNV-1a. Botão de "Copiar para Área de Transferência".
  * **Importar Save:** Caixa de texto para colar a string de save. Validação automática de integridade e versão antes de carregar.
  * **3 Slots de Save:** Permitir alternar entre Slot 1, Slot 2 e Slot 3 na tela inicial.
* **Arquitetura & Código:**
  * `src/save/exportImport.ts`: Funções de validação, sanitização e codificação de strings.
  * `src/ui/SaveSlotsModal.tsx`: Interface de seleção e gerenciamento de perfis.

---

### 🔹 FASE 8A & 8B — Modos de Jogo Extras (Ondas Infinitas & Boss Rush)

* **Objetivo:** Oferecer desafios pós-jogo e testes de builds extremas para o baralho de 74 cartas.
* **8A — Modo Ondas Infinitas (Endless Mode):**
  * Ondas contínuas sem limite com multiplicadores exponenciais de HP/Dano dos inimigos.
  * A cada 5 ondas, um modificador de ambiente aleatório é ativado (ex: *Tempestade de Poeira*, *Fome Voraz*, *Enxame Elétrico*).
  * Placar global dedicado para a maior onda alcançada.
* **8B — Modo Boss Rush (Desafio de Chefes):**
  * Sequência ininterrupta contra os 6 chefes do jogo (Formiga Vermelha Rei ➔ Rainha dos Mosquitos ➔ Escorpião Imperador ➔ Rei Louva-a-Deus ➔ Rainha Lacraia ➔ Mariposa Titã).
  * Intervalo de 15 segundos entre chefes para selecionar 2 cartas do baralho roguelike.

---

### 🔹 FASE 9A — Ambiência Sonora & Clima por Bioma

* **Objetivo:** Elevar a imersão sensorial em cada um dos 6 biomas.
* **Mecânica:**
  * **Clima Visual (Canvas 2D):**
    * *Campo:* Folhas e pétalas ao vento.
    * *Pântano:* Gotas de chuva e névoa baixa com ondulação.
    * *Deserto:* Tempestade de areia e distorção de calor.
    * *Montanha:* Rajadas de neve/neblina.
    * *Caverna:* Partículas de esporos brilhantes de cristal.
    * *Selva:* Raios de sol filtrados pelas copas (*god rays*).
  * **Áudio Sintetizado WebAudio:** Ruído de vento, chuva, gotas de água e farfalhar de folhas gerados proceduralmente sem arquivos pesados de áudio.

---

### 🔹 FASE 10A — Formigas Engenheiras e Barricadas de Terra

* **Objetivo:** Expandir a variedade de formigas operárias com funções defensivas no mapa externo.
* **Mecânica:**
  * Nova classe desbloqueável: **Engenheira**.
  * As Engenheiras coletam terra/pedra e constroem **Barricadas de Terra** nos caminhos do mapa.
  * Inimigos da onda atacam e precisam destruir as barricadas antes de avançar para o ninho, dando tempo para os Soldados e Torres de Ácido eliminarem a ameaça.

---

## 📌 Garantia de Qualidade e Critérios de Entrega

Para cada fase concluída:

1. Compilação TypeScript estrita sem erros (`tsc --noEmit`).
2. Testes automatizados no Vitest com cobertura das novas regras e mecânicas.
3. Teste de performance mantendo **60 fps cravados** no Canvas 2D.
4. Atualização do `CHANGELOG.md` e do arquivo executável único `Formigueiro-Jogo-Completo.html`.
