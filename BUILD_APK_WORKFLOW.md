# 📱 GitHub Actions Workflow para Build de APK Android

Como o GitHub App não possui permissão direta para editar a pasta `.github/workflows/` no repositório remoto, você pode criar ou editar o arquivo diretamente no GitHub.

### 📝 Conteúdo atualizado do arquivo `.github/workflows/build-apk.yml`

```yaml
name: Build Android APK

on:
  push:
    branches:
      - main
      - 'arena/*'
  pull_request:
    branches:
      - main
  workflow_dispatch:

jobs:
  build:
    name: Build APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Setup Java JDK
        uses: actions/setup-java@v5
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Install dependencies
        run: |
          npm ci || npm install
          npm install @capacitor/core @capacitor/cli @capacitor/android --no-save

      - name: Run tests and web build
        run: |
          npm test
          npm run build

      - name: Add and Sync Capacitor Android
        run: |
          npx cap add android || true
          npx cap sync android

      - name: Make gradlew executable
        run: chmod +x android/gradlew

      - name: Build Android APK
        run: |
          cd android
          ./gradlew assembleDebug

      - name: Prepare APK artifact
        run: |
          mkdir -p bin
          cp android/app/build/outputs/apk/debug/app-debug.apk bin/Formigueiro-v0.1.0-debug.apk

      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: Formigueiro-APK
          path: bin/Formigueiro-v0.1.0-debug.apk
          retention-days: 30
```

---

### 🚀 O que já foi feito para corrigir o erro:
1. **Pull Request #2 Mesclado no `main`:** Todo o código atualizado, as dependências do Capacitor e o arquivo `capacitor.config.ts` foram unificados na branch `main`.
2. **Atualização do YAML:** Usamos Node.js 22 e `actions/setup-java@v5` para evitar avisos de descontinuação, e garantimos que as dependências do Capacitor estejam instaladas antes do sync.
