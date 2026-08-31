# 🐜 FORMIGUEIRO — DOSSIÊ DEFINITIVO DE RECRIAÇÃO E DESENVOLVIMENTO

## Documento único de autoridade

Este arquivo reúne toda a especificação necessária para recriar o Jogo Formigueiro a partir do HTML original, incluindo estrutura de código, método de análise, interface, posições, sprites, sistemas atuais, mecânicas futuras, salvamento, testes, entrega e o novo sistema de progressão Roguelike.

A IA que receber este documento e o HTML original deve conseguir recriar o jogo completo sem depender de conversas, documentos adicionais ou arquivos auxiliares.

O HTML original é usado como referência de:

- aparência;
- textos;
- composição das telas;
- controles;
- sprites embutidos;
- fluxo de navegação;
- comportamento já presente;
- escala visual;
- paleta e identidade.

A nova implementação deve ser editável e organizada, mas o resultado final deve gerar novamente um HTML independente para distribuição.

---

# PARTE 1 — MÉTODO DE RECRIAÇÃO A PARTIR DO HTML

## 1.1 Leitura do HTML

A IA deve analisar o HTML em cinco passagens:

1. **Estrutura:** localizar entrada, canvas, camadas, menus, modais e estilos.
2. **Texto:** catalogar todos os textos visíveis, títulos, botões, mensagens e descrições.
3. **Assets:** identificar imagens, sprites, fontes, sons incorporados e data URIs.
4. **Comportamento:** localizar estado, timers, eventos, controles, saves, combate, ondas e transições.
5. **Layout:** medir proporções da tela, posições relativas e dimensões dos elementos.

Não editar o bundle diretamente sem antes criar uma cópia de segurança. A lógica deve ser reescrita em módulos legíveis e depois compilada para uma nova build single-file.

## 1.2 Extração de conteúdo

Para cada elemento encontrado no HTML, registrar:

- nome lógico;
- texto original;
- posição;
- tamanho;
- cor;
- sprite usado;
- evento disparado;
- estado alterado;
- som associado;
- regra de salvamento;
- comportamento em mobile.

## 1.3 Reconstrução

Ordem obrigatória:

```text
Tipos → Estado → Dados → Motor → Renderização → Interface → Save → Testes → Build
```

Cada sistema deve ser independente, testável e conectado ao estado central por eventos ou ações.

## 1.4 Compatibilidade

A build final deve:

- funcionar offline;
- carregar como HTML único;
- usar pixel art sem blur;
- funcionar em WebView;
- preservar localStorage/IndexedDB;
- manter o mesmo package name no Android;
- aceitar viewport desktop e mobile.

---

# PARTE 2 — IDENTIDADE E EXPERIÊNCIA

## 2.1 Conceito

Formigueiro é um jogo 2D de colônia, exploração, coleta e sobrevivência. O jogador controla a colônia, não uma única formiga.

Loop principal:

```text
Explorar → revelar sombra → coletar → retornar ao ninho → escolher melhorias
→ sobreviver a ondas → subir de nível → escolher recompensa Roguelike
→ derrotar chefes → desbloquear mapas → renascer
```

Fantasia central:

- a Rainha é o coração;
- o ninho é a base e a armadura;
- Operárias mantêm a vida interna;
- Coletoras abastecem a colônia;
- Exploradoras revelam o mundo;
- combatentes protegem e eliminam ameaças.

## 2.2 Visual

Pixel art com:

- contorno #14120f;
- terra marrom;
- madeira escura;
- destaques laranja;
- vida verde;
- perigo vermelho;
- fome amarelo/laranja;
- quitina roxa;
- fonte pixelada;
- sombras duras;
- `image-rendering: pixelated`.

Paleta:

```text
Fundo: #1c1d24
Terra escura: #29170f
Terra média: #5d341e
Terra clara: #8b562d
Contorno: #14120f
Texto: #f5e6c8
Dourado: #fbd046
Laranja: #e96520
Vermelho: #d94a3b
Verde: #55b84b
Azul: #63b5dc
Roxo: #b67ad9
```

---

# PARTE 3 — TELAS E POSIÇÕES

A área lógica recomendada é 960×720. Usar coordenadas normalizadas para escalar.

## 3.1 Tela inicial

- fundo ocupa 100% da tela;
- logo `FORMIGUEIRO`: centro x 0,50, y 0,14, largura 0,50, altura 0,12;
- subtítulo: centro x 0,50, y 0,27;
- Rainha: centro x 0,50, y 0,40, largura/altura aproximada 0,18;
- JOGAR: x 0,50, y 0,60, largura 0,28, altura 0,07;
- INVENTÁRIO: y 0,69;
- MISSÕES: y 0,78;
- versão: canto inferior direito.

## 3.2 Mapa externo

- canvas ocupa a tela inteira;
- HUD fica fixa acima do canvas;
- ninho começa aproximadamente no centro x 0,50 e y 0,72 do mundo;
- recursos aparecem em grupos irregulares;
- formigas são centralizadas no ponto lógico;
- inimigos aparecem na borda ou fora da sombra;
- chefe ocupa de 8% a 16% da largura;
- barra de chefe fica fixa no topo central.

HUD:

- mapa/ninho: x 0,02, y 0,02, largura 0,30;
- recursos: x 0,35, y 0,02, largura 0,38;
- pausa/configurações: canto superior direito;
- onda: centro superior, x 0,50, y 0,08;
- objetivo: x 0,02, y 0,17;
- FOME: x 0,34, y 0,91, largura 0,32;
- COMIDA: x 0,66, y 0,91, largura 0,25.

## 3.3 Interior do formigueiro

Fundo de terra/madeira vertical, corredor central sinuoso e salas ovais laterais.

Layout:

```text
                         SAÍDA

       CEMITÉRIO                      MELHORIAS

       CONQUISTAS                     LOJA

       MISSÕES                        INVENTÁRIO

       FORMIGAS                       RENASCER

       MAPA

                         RAINHA
```

Posições normalizadas:

- Saída: x 0,50, y 0,10, w 0,16, h 0,10;
- Cemitério: x 0,16, y 0,17, w 0,18, h 0,12;
- Conquistas: x 0,20, y 0,34, w 0,18, h 0,12;
- Missões: x 0,16, y 0,52, w 0,18, h 0,12;
- Formigas: x 0,18, y 0,70, w 0,17, h 0,12;
- Mapa: x 0,16, y 0,87, w 0,18, h 0,12;
- Melhorias/Roguelike: x 0,82, y 0,21, w 0,18, h 0,12;
- Loja: x 0,80, y 0,40, w 0,18, h 0,12;
- Inventário: x 0,83, y 0,58, w 0,18, h 0,12;
- Renascimento: x 0,82, y 0,75, w 0,18, h 0,12;
- Rainha: centro x 0,50, y 0,90, w 0,34, h 0,19;
- botão SAIR global: canto superior direito.

FOME e COMIDA ficam sobre a Sala da Rainha, aproximadamente em y 0,81. A plataforma da Rainha não deve ser coberta por painéis.

---

# PARTE 4 — ENTIDADES

## 4.1 Operária

Fica dentro do ninho. Busca comida, alimenta a Rainha e repara o ninho.

- HP 30;
- dano 5 apenas como autodefesa;
- reparo base 10 HP/s;
- tamanho 22;
- desbloqueio inicial.

## 4.2 Coletora

Atua fora. Encontra, coleta, carrega e retorna com recursos.

- HP 30;
- dano 5;
- foge de ameaças;
- única função externa de coleta.

## 4.3 Exploradora

Revela sombra e não coleta após o rework.

- HP 28;
- dano 6;
- velocidade superior;
- começa desbloqueada.

## 4.4 Soldado

Caça, protege, provoca chefes e recolhe quitina.

- HP 60;
- dano 10;
- tamanho 44;
- disponível inicialmente.

## 4.5 Classes futuras

**Defensora:** anel ao redor do ninho, HP 70, dano 9, custo 10 quitinas.

**Tóxica:** ácido à distância, 12 dano/projétil, alcance 160 px, corrosão 2 dano/s por 3 s, HP 40, custo 20 quitinas.

**Gigante:** tanque, HP 200, dano 18, tamanho 80, knockback 40 px, lenta, custo 40 quitinas.

## 4.6 Rainha

- fica no interior;
- fome;
- produção;
- HP proposto 500;
- sprite grande de aproximadamente 96 px;
- não participa da exploração externa.

---

# PARTE 5 — RECURSOS E ECONOMIA

Recursos comuns:

- folha;
- cogumelo;
- cacto;
- banana;
- flor;
- cristal.

Fluxo:

```text
Coletora coleta → carrega → retorna → deposita → Operária transporta comida
→ Rainha recebe → produção acelera
```

Quitina:

- moeda separada;
- chefes dropam 2–4;
- elites dropam 1–2;
- persiste após renascimento;
- usada em classes, loja e revive.

---

# PARTE 6 — ROGUELIKE DE PROGRESSÃO

## 6.1 Mudança central

O sistema de melhorias deixa de ser uma grade fixa tradicional. Durante cada partida, a colônia sobe de nível ao coletar XP e escolhe recompensas aleatórias. O sistema é inspirado no gênero de sobrevivência Roguelike, com escolhas durante a rodada, combinações, evoluções e meta-progressão.

As melhorias não devem ser apenas bônus lineares. Cada escolha altera o estilo da colônia.

## 6.2 XP e níveis

Fontes de XP:

- coletar recursos;
- derrotar inimigos;
- sobreviver a ondas;
- derrotar elites;
- derrotar chefes;
- concluir objetivos.

Ao preencher a barra de XP:

1. congelar o mundo;
2. abrir painel de três a cinco cartas;
3. oferecer opções ponderadas pela build atual;
4. permitir escolher uma;
5. aplicar imediatamente;
6. fechar painel e retomar.

A fórmula inicial recomendada:

```text
XP necessária = 10 × nível atual + 8 × nível atual²
```

## 6.3 Cartas de melhoria

Cada carta possui:

- id único;
- nome;
- raridade;
- ícone;
- descrição curta;
- descrição detalhada;
- classe/sistema afetado;
- valor por nível;
- máximo de níveis;
- tags;
- pré-requisitos;
- sinergias;
- incompatibilidades;
- efeito ao escolher;
- efeito ao evoluir.

Raridades:

```text
Comum → Incomum → Rara → Épica → Lendária
```

Probabilidade ajustável por nível e mapa.

## 6.4 Categorias de cartas

### Colônia

- velocidade global;
- capacidade de população;
- eficiência de tarefas;
- alcance de comando;
- redução de cooldown de ordens.

### Ninho

- HP máximo;
- armadura;
- reparo;
- regeneração fora de combate;
- área de defesa;
- capacidade de armazenamento.

### Rainha

- fome máxima;
- redução de consumo;
- velocidade de produção;
- comida por entrega;
- chance de produção dupla;
- tempo de proteção após alimentação.

### Operária

- velocidade de transporte;
- comida por viagem;
- reparo por segundo;
- velocidade interna;
- quantidade máxima.

### Coletora

- velocidade;
- carga;
- alcance de detecção;
- chance de recurso extra;
- retorno automático;
- resistência.

### Exploradora

- raio de revelação;
- velocidade de exploração;
- visão de recursos;
- revelação permanente;
- chance de encontrar baús.

### Soldado

- dano;
- vida;
- alcance de agressão;
- velocidade;
- provocação;
- chance crítica;
- coleta de quitina.

### Defensora

- raio do anel;
- dano de interceptação;
- quantidade de alvos;
- armadura;
- recuperação.

### Tóxica

- dano ácido;
- alcance;
- cadência;
- duração da corrosão;
- propagação;
- chance de ácido crítico.

### Gigante

- vida;
- dano;
- força do empurrão;
- resistência a atordoamento;
- área de impacto;
- velocidade.

### Armas/efeitos

Mesmo que o jogo use formigas como agentes, as cartas podem representar comportamentos e armas da colônia:

- enxame de mordidas;
- chuva de ácido;
- muralha de defensores;
- investida gigante;
- feromônio de fúria;
- espinhos do ninho;
- armadilha de resina;
- nuvem de feromônio.

## 6.5 Slots e limite de build

A rodada começa com poucos slots:

- 3 slots de formigas ativas;
- 3 slots de comportamentos/armas;
- 2 slots de passivas.

Upgrades podem:

- aumentar slots;
- substituir carta;
- fundir cartas;
- transformar uma carta em evolução;
- desbloquear sinergias.

## 6.6 Evoluções

Uma evolução exige:

- carta base em nível mínimo;
- carta de suporte ou passiva específica;
- nível mínimo de colônia;
- custo ou evento de evolução.

Exemplos:

```text
Soldado + Mandíbulas afiadas + Fúria da colônia
→ Legião de ataque

Tóxica + Corrosão prolongada + Propagação
→ Nuvem de ácido

Defensora + Anel ampliado + Armadura
→ Muralha viva

Gigante + Impacto + Empurrão
→ Colosso do ninho

Coletora + Carga + Velocidade
→ Caravana de recursos
```

Evoluções devem alterar comportamento, não apenas multiplicar números.

## 6.7 Baús e recompensas

Chefes e elites podem gerar baús:

- baú comum: 3 escolhas;
- baú de elite: 4 escolhas ou carta rara garantida;
- baú de chefe: 5 escolhas, uma rara/épica garantida;
- baú lendário: evolução ou item único.

A abertura pausa o jogo e usa modal central.

## 6.8 Recompensas entre partidas

Ao terminar a partida, converter parte do desempenho em progressão permanente:

- XP de colônia;
- quitina;
- pontos de renascimento;
- desbloqueio de cartas;
- desbloqueio de classes;
- melhorias iniciais.

Não usar a progressão Roguelike para apagar o senso de risco da rodada.

## 6.9 Meta-progressão

Persistente entre partidas:

- cartas descobertas;
- classes desbloqueadas;
- mapas;
- bônus de renascimento;
- conquistas;
- quitina;
- melhorias permanentes;
- registro de melhores runs.

## 6.10 Balanceamento

Evitar:

- carta obrigatória em toda build;
- multiplicadores sem limite;
- crescimento que elimine o perigo;
- opções inúteis;
- evolução impossível de encontrar;
- excesso de texto.

Toda carta deve possuir pelo menos uma sinergia e uma situação de uso.

---

# PARTE 7 — ONDAS, INIMIGOS E CHEFES

Ondas normais:

- 20 s de combate;
- 90 s de calmaria;
- 2 inimigos iniciais;
- +2 por onda;
- força inicial 50%;
- +10% por onda;
- teto ×3;
- spawn na borda;
- telegráfico 2 s antes.

Elite a cada 5 ondas:

- menos inimigos;
- +50% vida/dano;
- 1–2 quitinas;
- chance de baú.

Chefe a cada 10 ondas:

- chefe do mapa;
- escolta reduzida ×0,5;
- recompensa completa;
- baú de chefe;
- carta rara/épica garantida.

Chefes dos mapas:

- Campo;
- Pântano;
- Caverna;
- Deserto;
- Montanha;
- Selva.

---

# PARTE 8 — SALVAMENTO

O save deve conter:

- estado da rodada;
- build Roguelike atual;
- cartas escolhidas e níveis;
- fila de produção;
- Rainha e fome;
- ninho e ruína;
- formigas vivas/mortas;
- mapa e onda;
- recursos;
- quitina;
- progressão permanente;
- conquistas;
- configurações.

Salvar em:

- início;
- nível ganho;
- escolha de carta;
- coleta importante;
- fim de onda;
- baú;
- chefe;
- entrada/saída do formigueiro;
- derrota;
- renascimento.

Usar versão, backup, validação, migração e recuperação.

---

# PARTE 9 — ESTRUTURA COMPLETA DE ARQUIVOS

```text
formigueiro/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── eslint.config.js
├── prettier.config.js
├── postcss.config.js
├── tailwind.config.ts
├── .gitignore
├── .env.example
├── README.md
├── CHANGELOG.md
├── LICENSE
├── capacitor.config.ts
├── public/
├── android/
├── backups/
├── security/
├── scripts/
├── tests/
├── docs/
├── entregas/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    ├── styles.css
    ├── index.css
    ├── vite-env.d.ts
    ├── game/
    │   ├── types.ts
    │   ├── state.ts
    │   ├── defaults.ts
    │   ├── constants.ts
    │   ├── selectors.ts
    │   ├── reducers.ts
    │   ├── actions.ts
    │   ├── events.ts
    │   ├── clock.ts
    │   ├── rng.ts
    │   ├── validation.ts
    │   ├── integration.ts
    │   ├── data.ts
    │   ├── engine.ts
    │   ├── resources.ts
    │   ├── waves.ts
    │   ├── nest.ts
    │   ├── ants.ts
    │   ├── production.ts
    │   ├── economy.ts
    │   ├── progression.ts
    │   ├── missions.ts
    │   ├── achievements.ts
    │   ├── combat.ts
    │   ├── interior.ts
    │   ├── defeat.ts
    │   ├── roguelike.ts
    │   ├── xp.ts
    │   ├── cards.ts
    │   ├── deck.ts
    │   ├── rarities.ts
    │   ├── synergies.ts
    │   ├── evolutions.ts
    │   ├── chests.ts
    │   ├── runRewards.ts
    │   ├── metaProgression.ts
    │   ├── save/
    │   │   ├── index.ts
    │   │   ├── saveTypes.ts
    │   │   ├── storage.ts
    │   │   ├── serializer.ts
    │   │   ├── deserializer.ts
    │   │   ├── migrations.ts
    │   │   ├── backup.ts
    │   │   ├── checksum.ts
    │   │   ├── repair.ts
    │   │   └── saveEvents.ts
    │   ├── engine/
    │   │   ├── GameEngine.ts
    │   │   ├── update.ts
    │   │   ├── simulation.ts
    │   │   ├── collision.ts
    │   │   ├── spatialHash.ts
    │   │   ├── pathfinding.ts
    │   │   ├── movement.ts
    │   │   ├── camera.ts
    │   │   ├── fogOfWar.ts
    │   │   ├── pause.ts
    │   │   ├── timers.ts
    │   │   └── performance.ts
    │   ├── world/
    │   │   ├── world.ts
    │   │   ├── mapTypes.ts
    │   │   ├── mapData.ts
    │   │   ├── mapLoader.ts
    │   │   ├── mapProgress.ts
    │   │   ├── exploration.ts
    │   │   ├── resourcesOnMap.ts
    │   │   ├── spawnPoints.ts
    │   │   ├── terrain.ts
    │   │   ├── mapUnlocks.ts
    │   │   └── maps/{campo,pantano,caverna,deserto,montanha,selva}.ts
    │   ├── ants/{antTypes,antFactory,antRegistry,antStats,antState,antMovement,antNeeds,antAnimation,antSpawner,antDeath,antRespawn,antCommands,antSelection,worker,collector,scout,soldier,defender,toxic,giant}.ts
    │   ├── combat/{combatEngine,damage,attacks,projectiles,statusEffects,aggro,targeting,knockback,areaAttacks,enemyTypes,enemyFactory,enemyAI,enemyMovement,enemySpawner,enemyDrops,combatEvents}.ts
    │   ├── waves/{waveTypes,waveManager,waveRules,waveSchedule,waveSpawner,eliteWaves,bossWaves,waveRewards,waveAnnouncements,wavePreview,advanceWave}.ts
    │   ├── bosses/{bossTypes,bossRegistry,bossFactory,bossAI,bossAttacks,bossPhases,bossWeaknesses,bossRewards,bossAnnouncements,campoBoss,pantanoBoss,cavernaBoss,desertoBoss,montanhaBoss,selvaBoss}.ts
    │   ├── economy/{resourceTypes,resourceData,resourceSpawner,resourceCollector,resourceTransport,storage,food,chitin,costs,rewards,upgrades,economyEvents}.ts
    │   ├── nest/{nestState,nestStats,nestDamage,nestRepair,nestStages,nestCollapse,nestRegeneration,nestStorage,nestEntry,nestEvents}.ts
    │   ├── queen/{queenState,queenStats,queenHunger,queenFeeding,queenDeath,productionTypes,productionQueue,productionTimer,productionStages,productionRules,egg,larva,pupa,queenEvents}.ts
    │   ├── interior/{interiorState,roomTypes,roomRegistry,roomNavigation,interiorPause,interiorSave,queenRoom,cemeteryRoom,achievementsRoom,missionsRoom,upgradesRoom,shopRoom,inventoryRoom,antsRoom,mapRoom,rebirthRoom,exitRoom}.ts
    │   ├── cemetery/{cemeteryState,deadAnt,respawnQueue,respawnTimer,instantRevive,reviveCosts,cemeteryEvents}.ts
    │   ├── shop/{shopState,shopInventory,shopRotation,shopItems,shopPurchase,shopReroll,shopUnlocks,contrabandUpgrades,shopEvents}.ts
    │   ├── progression/{progressionState,upgradeTypes,upgradeRegistry,upgradePurchase,permanentUpgrades,runUpgrades,rebirth,rebirthBonuses,unlocks,progressionEvents}.ts
    │   └── meta/{missionTypes,missionData,missionTracker,missionRewards,achievementTypes,achievementData,achievementTracker,metaEvents}.ts
    ├── ui/
    │   ├── Layout.tsx
    │   ├── MainMenu.tsx
    │   ├── Tutorial.tsx
    │   ├── GameScreen.tsx
    │   ├── InteriorScreen.tsx
    │   ├── Hud.tsx
    │   ├── RoguelikeLevelUp.tsx
    │   ├── UpgradeCard.tsx
    │   ├── ChestScreen.tsx
    │   ├── QueenRoomView.tsx
    │   ├── ProductionQueueView.tsx
    │   ├── FoodStorageView.tsx
    │   ├── CemeteryScreen.tsx
    │   ├── ShopScreen.tsx
    │   ├── UpgradesScreen.tsx
    │   ├── GameOverScreen.tsx
    │   ├── RebirthScreen.tsx
    │   └── components/{Bar,Card,Icon,Tooltip,Badge,RoomButton,AntCard,EnemyHealthBar,BossHealthBar,MissionCard,AchievementCard,UpgradeCard,ResourceCard,ConfirmDialog}.tsx
    ├── render/{Renderer,canvas,drawWorld,drawTerrain,drawFog,drawResources,drawAnts,drawEnemies,drawBosses,drawNest,drawEffects,drawInterior,spriteSheet,animationPlayer,particles,cameraTransform,pixelPerfect}.ts
    ├── audio/{AudioManager,music,effects,volume,mute}.ts
    ├── styles/{variables,reset,global,pixel-art,layout,hud,menus,interior,game-over,animations,responsive,mobile,accessibility}.css
    └── assets/
        ├── sprites/{ants/{worker,collector,scout,soldier,defender,toxic,giant,queen},enemies/{spider,caterpillar,wasp,scorpion,beetle,frog},bosses/{campo,pantano,caverna,deserto,montanha,selva},npcs/shopkeeper}/
        ├── environments/{campo,pantano,caverna,deserto,montanha,selva}/
        ├── resources/{leaf,mushroom,cactus,banana,flower,crystal}.png
        ├── interior/{nest-background,tunnel,room-platform,queen-room,cemetery,shop,food-storage}.png
        ├── ui/{buttons,panels,bars,icons,backgrounds}/
        ├── fonts/{pixel-font.woff2,pixel-font.css}
        └── manifest/{manifest.webmanifest,favicon.png,icons/}
```

---

# PARTE 10 — CRITÉRIO DE CONCLUSÃO

O projeto só está concluído quando:

- o jogo recriado inicia e funciona;
- mapa, câmera e comandos funcionam;
- todos os recursos podem ser coletados;
- formigas possuem funções distintas;
- ondas, elites e chefes funcionam;
- o interior do formigueiro é navegável;
- Rainha, fome, comida e produção funcionam;
- ninho pode sofrer dano, ruir e ser reparado;
- derrota parcial e total são diferentes;
- o sistema Roguelike apresenta escolhas, raridades, sinergias e evoluções;
- baús funcionam;
- progressão permanente funciona;
- missões e conquistas funcionam;
- quitina e loja funcionam;
- cemitério funciona;
- save sobrevive a recarregamento e atualização;
- mobile e desktop funcionam;
- não há erros fatais;
- testes passam;
- HTML single-file é gerado;
- APK pode ser gerado e atualizado com a mesma assinatura.

Este documento é a especificação definitiva e independente do jogo. A IA deve usar o HTML original apenas para conferir a referência visual e o comportamento existente; todas as regras e funcionalidades futuras necessárias estão descritas aqui.

# PARTE 11 — DIREÇÃO ARTÍSTICA PIXELADA DE AVENTURA CARTOON

## 11.1 Intenção visual

O jogo deve adotar uma direção artística de aventura cartoon medieval/fantástica, inspirada na energia visual de jogos de ação cooperativa como Castle Crashers, mas reinterpretada integralmente em pixel art própria para o universo de formigas.

A referência deve ser entendida como linguagem geral:

- personagens expressivos;
- silhuetas fáceis de reconhecer;
- proporções exageradas;
- humor visual;
- cores vibrantes;
- ação legível;
- poses dinâmicas;
- inimigos carismáticos;
- cenários com personalidade;
- efeitos de impacto grandes e claros.

Não copiar personagens, sprites, logos, cenários, paleta exata, animações ou elementos proprietários de Castle Crashers. A inspiração deve permanecer no nível de energia, legibilidade e exagero cartoon, com design original de formigas, insetos e ambientes.

## 11.2 Silhueta

Cada personagem deve ser identificável apenas pelo contorno escuro.

Regras:

- cabeça, tórax e abdômen com massas separadas;
- pernas com espaços visíveis entre si;
- antenas com curvas claras;
- armas, escudos ou cargas ultrapassam a silhueta;
- classes diferentes nunca podem parecer iguais em tamanho;
- chefes devem ser reconhecíveis mesmo em miniatura;
- contorno de 2–5 pixels conforme escala;
- evitar detalhes internos que desapareçam em telas pequenas.

## 11.3 Proporções

As proporções devem ser cartunescas, não realistas:

- cabeça ligeiramente maior;
- olhos e expressões destacados;
- tórax robusto;
- abdômen com forma e cor próprias;
- pernas simplificadas;
- armas e acessórios exagerados;
- chefes entre 2 e 5 vezes o tamanho de uma formiga básica.

A anatomia deve continuar reconhecível como inseto, mas com leitura imediata de personagem jogável.

## 11.4 Contorno e preenchimento

Contorno padrão:

```text
#14120f ou #17110d
```

Regras do contorno:

- externo mais espesso que linhas internas;
- sem anti-aliasing;
- cantos em degraus de pixel;
- contorno reforçado no lado inferior;
- contorno não deve unir pernas em um bloco ilegível;
- ataques e projéteis devem ter contorno próprio.

Preenchimento:

- cor base;
- sombra em tom 20–35% mais escuro;
- luz em tom 15–25% mais claro;
- brilho reservado para itens raros, ácido, quitina e eventos especiais;
- máximo de 4–7 cores principais por sprite pequeno.

## 11.5 Paletas por função

### Operária

- laranja queimado;
- marrom-avermelhado;
- sombra vinho;
- detalhes bege para ferramentas/carga.

### Coletora

- laranja da Operária;
- folha verde presa ao corpo;
- faixa ou bolsa contrastante.

### Exploradora

- verde médio;
- verde claro em antenas e olhos;
- detalhes de brilho para indicar visão.

### Soldado

- vermelho escuro;
- vermelho vivo em mandíbulas;
- sombra vinho;
- detalhes metálicos ou de ferrugem.

### Defensora

- vinho/chumbo;
- escudo com cor contrastante;
- destaques cinza ou dourado.

### Tóxica

- verde ácido;
- amarelo-esverdeado translúcido;
- azul ou roxo em pequenas bolhas de veneno.

### Gigante

- marrom escuro ou vermelho profundo;
- grandes áreas de sombra;
- detalhes de armadura ou cicatrizes.

### Rainha

- marrom nobre;
- coroa amarela/dourada;
- abdômen amplo;
- detalhes de realeza e alimento.

## 11.6 Expressões

Personagens importantes devem comunicar estado por olhos, antenas e postura:

- neutro;
- feliz após comida;
- alerta;
- assustado;
- ferido;
- furioso;
- derrotado;
- comemorando.

A expressão deve ser visível sem depender de texto.

## 11.7 Animação pixel art

Cada formiga jogável deve ter de 6 a 8 frames quando possível:

1. repouso A;
2. repouso B;
3. caminhada 1;
4. caminhada 2;
5. caminhada 3;
6. caminhada 4;
7. ação;
8. dano/morte.

Regras:

- não interpolar sprites com blur;
- manter volume do corpo entre frames;
- pernas alternam em padrões simples;
- antenas possuem pequeno atraso;
- carga acompanha o balanço do corpo;
- ataque deve ter antecipação, impacto e recuperação;
- morte deve ser curta e legível.

## 11.8 Animação da Rainha

A Rainha deve possuir:

- respiração em 2–3 frames;
- olhos piscando ocasionalmente;
- coroa com brilho sutil;
- animação ao receber comida;
- animação de produção;
- postura cansada em fome baixa;
- postura abatida em risco;
- postura imóvel na morte.

## 11.9 Animação de combate

Todo golpe precisa de três momentos:

```text
antecipação → impacto → recuperação
```

Antecipação:

- personagem recua ou levanta membro;
- efeito de aviso aparece;
- duração de 150–500 ms.

Impacto:

- flash de 1–2 frames;
- partículas;
- número de dano;
- som;
- deslocamento opcional.

Recuperação:

- personagem retorna à postura;
- inimigo pode piscar;
- controle retorna sem travamento.

## 11.10 Efeitos de impacto

Criar sprites ou partículas para:

- poeira;
- terra;
- folhas voando;
- faíscas;
- mordida;
- ácido;
- veneno;
- choque;
- cura;
- coleta;
- quitina;
- nível ganho;
- evolução;
- baú aberto;
- ninho reparado;
- chefe derrotado.

Efeitos importantes devem usar cores fortes, mas ocupar pouco tempo de tela.

## 11.11 Ácido da Tóxica

Visual:

- projétil verde-amarelo;
- contorno escuro;
- pequena cauda de gotas;
- impacto gera poça circular;
- corrosão mostra bolhas subindo;
- alvo afetado recebe tonalidade verde por curto período.

## 11.12 Quitina

A quitina deve ter leitura premium:

- fragmento roxo cristalino;
- brilho em dois tons;
- contorno quase preto;
- pequena animação flutuante;
- partículas roxas na coleta;
- ícone consistente em HUD, inventário e loja.

## 11.13 Chefes

Chefes devem usar formas grandes e expressivas:

- entradas com impacto;
- pose de apresentação;
- nome e barra de vida destacados;
- ataque com silhueta ampla;
- fases visuais distintas;
- dano evidente sem ocultar o personagem;
- derrota teatral curta;
- drop visível de quitina e baú.

Cada chefe precisa de uma forma dominante:

- Campo: massa e força terrestre;
- Pântano: lodo, veneno e umidade;
- Caverna: rocha, sombra e cristais;
- Deserto: espinhos, calor e areia;
- Montanha: gelo, pedra e peso;
- Selva: folhas, cipós e velocidade.

## 11.14 Cenários

### Campo

- terra quente;
- folhas;
- pedras pequenas;
- flores;
- céu ou luz filtrada;
- insetos pequenos no fundo.

### Pântano

- água escura;
- lama;
- plantas largas;
- névoa verde;
- bolhas;
- raízes.

### Caverna

- paredes rochosas;
- cristais;
- áreas muito escuras;
- reflexos azuis/roxos;
- poeira suspensa.

### Deserto

- areia em faixas;
- pedras secas;
- cactos;
- luz amarela forte;
- sombras compactas.

### Montanha

- rocha;
- neve;
- vento;
- cristais frios;
- sombras azuladas.

### Selva

- folhagem densa;
- árvores enormes;
- cipós;
- luz verde;
- flores e partículas.

## 11.15 Interior do formigueiro

O interior deve parecer uma base viva e acolhedora:

- madeira e terra com contorno grosso;
- plataformas ovais;
- túneis irregulares;
- luz quente em cada sala;
- salas com ícones grandes;
- personagens pequenos realizando tarefas;
- partículas de poeira e comida;
- fundo com repetição não perfeitamente simétrica.

As salas devem ter personalidade visual:

- Cemitério: cinza, roxo, velas/pedras;
- Conquistas: dourado, troféus;
- Missões: papel, placas e marcadores;
- Melhorias: engrenagens, placas e luz;
- Loja: moedas, balcão e vendedor;
- Inventário: baús e sacos;
- Formigas: ovos, silhuetas e registros;
- Mapa: pergaminho e pinos;
- Renascimento: brilho dourado e aura;
- Rainha: plataforma maior e iluminação central.

## 11.16 Botões e UI cartoon

Botões devem parecer placas físicas:

- fundo marrom;
- contorno preto;
- sombra inferior;
- brilho superior discreto;
- ícone acima ou à esquerda;
- texto centralizado;
- estado pressionado deslocado para baixo;
- estado bloqueado dessaturado;
- estado disponível com pulso dourado.

## 11.17 Cartas Roguelike

Cada carta deve possuir:

- formato vertical;
- moldura por raridade;
- ícone central grande;
- nome no topo;
- descrição em poucas linhas;
- tags no rodapé;
- brilho proporcional à raridade.

Cores:

```text
Comum: #8d8d8d
Incomum: #5ab85a
Rara: #4b9ee8
Épica: #a767df
Lendária: #f0ad36
```

A abertura de cartas deve pausar o mundo e criar uma sensação de escolha importante.

## 11.18 Leitura em telas pequenas

- silhueta vem antes do detalhe;
- ícones devem ter versão simplificada;
- texto nunca pode explicar algo que a imagem não comunica minimamente;
- efeitos não podem cobrir a Rainha ou o chefe;
- cores de estado devem ser acompanhadas por ícone ou texto;
- toda sala deve continuar reconhecível em 80 px de largura.

## 11.19 Regras de originalidade

A inspiração cartoon deve resultar em arte própria:

- novos formatos de formiga;
- novos chefes;
- novas poses;
- nova paleta específica do universo;
- novos símbolos;
- novas animações;
- nenhuma cópia de personagem, interface ou sprite de terceiros.

## 11.20 Checklist artístico

- [ ] Cada classe é reconhecível pela silhueta.
- [ ] O jogador entende o papel da formiga sem ler texto.
- [ ] Os chefes são visualmente únicos.
- [ ] O interior do formigueiro parece vivo.
- [ ] A Rainha é o ponto visual central.
- [ ] Quitina é visualmente rara.
- [ ] Cartas têm raridade clara.
- [ ] Ataques possuem antecipação e impacto.
- [ ] O mapa não fica visualmente poluído.
- [ ] A interface não parece separada do mundo.
- [ ] Sprites continuam nítidos em mobile.
- [ ] A arte é original e apenas inspirada em linguagem cartoon de ação.

---

# PARTE 12 — POLÍTICA OFICIAL DE SPRITES PROVISÓRIOS

## 12.1 Regra de produção

Todos os sprites usados durante o desenvolvimento devem ser considerados **provisórios**. A equipe do projeto irá criar e enviar os sprites oficiais somente depois que as mecânicas, telas, sistemas, balanceamento e fluxo completo do jogo estiverem finalizados.

A IA deve implementar o jogo sem depender da arte final.

## 12.2 O que a IA deve fazer

- usar placeholders próprios e simples;
- preservar dimensões, pivôs e hitboxes;
- manter nomes lógicos estáveis;
- criar atlas provisórios quando necessário;
- usar formas geométricas, silhuetas e cores de função;
- separar completamente lógica e arte;
- permitir substituir os arquivos sem alterar o motor;
- não embutir regras de gameplay dentro de sprites;
- não assumir que o sprite provisório será a arte final;
- documentar o tamanho e o ponto de ancoragem de cada placeholder.

## 12.3 O que a IA não deve fazer

- não tratar os sprites atuais como definitivos;
- não bloquear uma mecânica por falta de arte oficial;
- não criar dependência de um nome visual específico;
- não alterar a lógica quando a equipe trocar uma imagem;
- não usar imagens com marca d’água na entrega;
- não copiar arte de terceiros;
- não gerar a arte final em nome da equipe;
- não substituir placeholders por arte definitiva sem autorização.

## 12.4 Tipos de placeholder

### Formas simples

Usar círculos, retângulos, polígonos e silhuetas pixeladas para testar colisão e leitura.

### Silhuetas por função

```text
Operária: laranja
Coletora: laranja + marcador verde
Exploradora: verde
Soldado: vermelho
Defensora: vinho/chumbo
Tóxica: verde ácido
Gigante: marrom escuro e grande
Rainha: dourado/marrom
Inimigos: cores distintas por espécie
Chefes: cor forte exclusiva por mapa
```

### Placeholder de interface

Usar ícones geométricos ou emojis somente durante o desenvolvimento. A posição, tamanho e interação devem ser preservados quando os ícones oficiais forem enviados.

## 12.5 Contrato de cada sprite

Cada sprite provisório e oficial deve respeitar um contrato:

```ts
{
  id: string;
  path: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  hitbox: { x: number; y: number; width: number; height: number };
  frames: number;
  frameDuration: number;
  scale: number;
  role: string;
}
```

O motor usa `id`, dimensões, âncora e hitbox; a imagem pode ser trocada sem reescrever a mecânica.

## 12.6 Organização provisória

```text
src/assets/placeholders/
├── ants/
│   ├── worker-placeholder.png
│   ├── collector-placeholder.png
│   ├── scout-placeholder.png
│   ├── soldier-placeholder.png
│   ├── defender-placeholder.png
│   ├── toxic-placeholder.png
│   ├── giant-placeholder.png
│   └── queen-placeholder.png
├── enemies/
├── bosses/
├── interior/
├── resources/
└── ui/
```

A arte oficial deverá ser colocada futuramente em:

```text
src/assets/official/
```

## 12.7 Troca pela equipe

Quando a equipe enviar os sprites oficiais:

1. conferir formato e transparência;
2. conferir dimensões;
3. conferir orientação;
4. conferir número de frames;
5. conferir pivô;
6. conferir hitbox;
7. substituir o caminho no registry;
8. testar animação;
9. testar colisão;
10. testar mobile;
11. gerar nova build.

Nenhum sistema de gameplay deve ser refeito apenas porque o desenho mudou.

## 12.8 Dimensões provisórias

- Operária: 32×32 px;
- Coletora: 32×32 px;
- Exploradora: 32×32 px;
- Soldado: 44×44 px;
- Defensora: 40×40 px;
- Tóxica: 32×32 px;
- Gigante: 80×80 px;
- Rainha: 96×96 px;
- inimigos pequenos: 32×32 px;
- inimigos médios: 48×48 px;
- chefes: 96–160 px;
- recursos: 24–40 px;
- ícones: 24–48 px.

Essas dimensões são referências de gameplay, não exigências para a arte final.

## 12.9 Prioridade

Durante o desenvolvimento, a prioridade é:

```text
mecânica > hitbox > legibilidade > animação provisória > arte final
```

A equipe fará a arte oficial ao final. O projeto deve estar completamente jogável e testável antes da substituição dos sprites.

---

# PARTE 13 — ORDEM FINAL DE PRODUÇÃO

1. Criar arquitetura e estado.
2. Recriar tela inicial.
3. Recriar mapa, câmera e HUD.
4. Recriar interior do formigueiro com as posições especificadas.
5. Integrar sprites e animações.
6. Implementar coleta e transporte.
7. Implementar ondas, combate e chefes.
8. Implementar Rainha, fome e produção.
9. Implementar ninho, ruína e reparo.
10. Implementar cemitério e loja.
11. Substituir melhorias antigas pelo sistema Roguelike.
12. Implementar XP, cartas, raridades, sinergias, evoluções e baús.
13. Implementar meta-progressão.
14. Integrar save e migrações.
15. Testar desktop, mobile, WebView e offline.
16. Gerar HTML final e APK.

Este documento é a especificação definitiva visual, técnica e de design do Jogo Formigueiro.
