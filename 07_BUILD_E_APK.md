# 07 — Build e APK Android

Como gerar, assinar e verificar o APK do Formigueiro. Fase 8 do plano.

---

## 1. Gerar o APK (um comando)

```bash
./scripts/build-apk.sh
```

O script executa, em ordem, e **aborta em qualquer falha**:

| # | Etapa | Por que é um portão |
|---|---|---|
| 1 | `tsc --noEmit` | Nenhum APK sai de código que não compila. |
| 2 | `vitest run` | 175 testes. Regressão não vira release. |
| 3 | `npm run build` | Vite + service worker, caminhos relativos. |
| 4 | `cap sync android` | Copia `dist/` para `android/app/src/main/assets/public/`. |
| 5 | `gradlew assembleRelease` | Compila e assina. |

Saída: **`entregas/Formigueiro-1.0.apk`**, já verificado com `apksigner`.

### Requisitos de ambiente

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=$HOME/android-sdk
```

- **JDK 21.** O JDK 11 **não roda o `sdkmanager`** (`UnsupportedClassVersionError`,
  class file 61.0). Neste ambiente `openjdk-17-jdk-headless` não existe no apt;
  o 21 é compatível com Gradle 8.11 + SDK 35.
- SDK: `platforms;android-35`, `build-tools;35.0.0`, `platform-tools`.
- `android/local.properties` com `sdk.dir` — o script reescreve isso sozinho.

---

## 2. A keystore — leia antes de perder

```
android-keys/formigueiro-release.keystore
```

| Campo | Valor |
|---|---|
| Alias | `formigueiro` |
| Senha (store e chave) | `FormigueiroRelease2026` |
| Algoritmo | RSA 2048 / SHA256withRSA |
| Validade | até **2056-08-21** |
| SHA-256 | `14:4D:78:1D:F5:A9:A7:F1:C7:AA:90:E8:26:B8:8E:15:34:2A:BD:E4:00:5C:18:E1:13:49:50:34:03:BD:E2:B3` |
| SHA-1 | `34:4F:FF:48:D4:58:D8:3C:0F:DD:82:42:22:59:CC:2F:D1:AC:8F:C7` |

> ### ⚠️ Perder este arquivo é irreversível
> O Android identifica um app pela dupla **package name + assinatura**. Sem esta
> keystore específica não existe "gerar de novo": qualquer chave nova produz um
> app que o sistema considera **outro** app. Consequências práticas:
> - Quem tem o jogo instalado **não consegue atualizar** — só desinstalar e
>   reinstalar.
> - Desinstalar **apaga o `localStorage`**, e com ele todo o save e a
>   meta-progressão do jogador.
>
> **Guarde uma cópia fora deste projeto**, junto com a senha. Não existe suporte,
> recuperação ou reemissão.

As credenciais ficam em `android/keystore.properties`, que está **fora do git**
(veja o bloco "Fase 8" no `.gitignore`). Sem esse arquivo o release ainda
compila — sai **não assinado** — em vez de quebrar quem clonar o repositório.

### Recriar `android/keystore.properties`

```properties
storeFile=../android-keys/formigueiro-release.keystore
storePassword=FormigueiroRelease2026
keyAlias=formigueiro
keyPassword=FormigueiroRelease2026
```

---

## 3. Verificar um APK

```bash
$ANDROID_HOME/build-tools/35.0.0/apksigner verify --print-certs \
  entregas/Formigueiro-1.0.apk
```

Esperado: `Verifies`, com **v1, v2 e v3 todos `true`** e o SHA-256 igual ao da
tabela acima. Os três esquemas cobrem desde Android 6 (v1) até verificação
rápida e rotação de chave nos aparelhos novos (v2/v3).

Conferir identidade e conteúdo:

```bash
$ANDROID_HOME/build-tools/35.0.0/aapt2 dump badging entregas/Formigueiro-1.0.apk | head -3
unzip -l entregas/Formigueiro-1.0.apk | grep assets/public
```

---

## 4. Decisões de build

**`base: './'` no Vite.** Em `file://` e `android_asset` um caminho absoluto
(`/assets/index.js`) aponta para a raiz do sistema de arquivos e não resolve.
Tudo é relativo.

**`androidScheme: 'https'`.** A WebView serve o app de `https://localhost` em
vez de `file://`. Isso evita **origem opaca**, que faria o Android descartar o
`localStorage` entre atualizações — o risco 5 do dossiê, aqui em forma de
"o jogador perde o save ao atualizar".

**Service worker com guarda de protocolo.** O `registerSW.js` do
`vite-plugin-pwa` não checa o protocolo e lança erro em `file://`. Usamos
`injectRegister: null` e registramos manualmente em `src/main.tsx`, só quando o
protocolo é `http(s)`. No APK o offline é nativo — os assets estão dentro do
pacote — então o SW só importa no navegador. **Não reverter.**

**`minifyEnabled false`.** O jogo é JavaScript em `assets/`; o ProGuard não
encolheria isso e só arriscaria a reflexão do Capacitor.

**Regras de backup.** Incluem `file`, `database` e `sharedpref`; **excluem cache
e service worker**. Restaurar um cache antigo por cima de um save novo era outro
caminho para o risco 5.

**`hardwareAccelerated="true"`.** Sem isso o Canvas 2D cai para renderização por
software e o jogo não sustenta 60 FPS.

**Kotlin fixado em 1.9.24.** Desde o Kotlin 1.8 as classes `-jdk7`/`-jdk8` foram
fundidas no stdlib; dependências transitivas traziam 1.8.22 e 1.6.21 juntas e o
build falhava com `Duplicate class kotlin.*`. Resolvido com
`resolutionStrategy.force` nos três artefatos. **Não remover.**

**Lint `FullBackupContent`.** Não se pode `<exclude>` um caminho que não esteja
dentro de algo incluído. Como `app_webview/` fica no domínio `file`, é preciso
`<include domain="file" path="."/>` antes dos excludes, senão o release quebra.

---

## 5. Responsividade — verificada no APK

Duas auditorias rodam sobre os arquivos **extraídos do APK**, em `file://`, que é
como a WebView os serve:

```bash
unzip -q entregas/Formigueiro-1.0.apk 'assets/public/*' -d /tmp/apkcheck
node scripts/apk-webview.mjs    # o jogo abre, desenha e não gera erro
node scripts/hud-overlap.mjs    # toque roubado, alvo pequeno, item fora da tela
```

`hud-overlap.mjs` testa **quem responde ao toque** no centro de cada botão, em 5
telas — não apenas se os retângulos colidem. Foi assim que apareceu o bug de
dois botões de comprar formiga mortos no celular, que a comparação de retângulos
não pegava porque botões com ícone SVG não são nós-folha.

### Viewport adaptativa

A área lógica acompanha a proporção da tela **preservando a área visível** (±3%,
travado em `tests/viewport.test.ts`). Ninguém vê mais mundo — e leva vantagem —
por usar outro aparelho.

| Tela | Antes | Depois |
|---|---|---|
| Celular em pé (390×780) | 38% | **89%** |
| Celular deitado (780×390) | 67% | **100%** |
| Desktop (1280×800) | 68% | 68% |

Escala inteira e `imageSmoothing` desligado continuam valendo: o jogo **adapta,
não distorce**.

---

## 6. "App não seguro" / Play Protect ao instalar

Ao instalar o APK fora da Play Store o Android mostra um aviso do Play
Protect. **Isso é esperado e não indica problema no arquivo.** O Play Protect
sinaliza todo APK que não veio da loja e cuja assinatura ele nunca viu — ou
seja, qualquer app distribuído fora da Play Store, inclusive este.

**Como instalar assim mesmo:** toque em **Mais detalhes → Instalar mesmo
assim**. Se você tocar em "Entendi", a instalação é cancelada. Dependendo da
versão, o aparelho pede o PIN ou a digital para confirmar. Também é preciso
permitir "instalar apps desconhecidos" para o app de onde veio o arquivo
(navegador, gerenciador de arquivos ou WhatsApp).

Auditoria feita neste APK para descartar causas evitáveis de alerta:

| Verificação | Resultado |
|---|---|
| Assinatura v1 + v2 + v3 | `Verifies` |
| `zipalign -c 4` | alinhado |
| `android:debuggable` | ausente |
| `android:testOnly` | ausente (bloquearia a instalação normal) |
| `targetSdk` | 35 — atual; um alvo antigo geraria aviso extra |
| Permissões | `INTERNET` + a permissão interna do próprio app |
| Permissões sensíveis (SMS, acessibilidade, notificações) | **nenhuma** |
| Chamadas de rede no bundle | **nenhuma** |
| `provider` exportado | não |

As permissões sensíveis são o que realmente faz o Play Protect **bloquear**
uma instalação — e este app não pede nenhuma. A permissão `INTERNET` vem do
próprio Capacitor; o jogo é offline e não faz nenhuma chamada externa.

O aviso só desaparece de vez publicando na Play Store, onde a assinatura passa
a ser conhecida. Para distribuição direta, ele é inevitável.

---

## 7. Instalar

```bash
adb install -r entregas/Formigueiro-1.0.apk
```

Fora da loja, o aparelho precisa permitir "instalar de fontes desconhecidas".
`-r` reinstala por cima preservando os dados — o que só funciona porque a
assinatura é a mesma. Veja o aviso da seção 2.
