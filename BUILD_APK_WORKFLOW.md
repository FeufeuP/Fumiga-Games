# 📱 GitHub Actions Workflow para Build de APK Android

Como o GitHub App não possui permissão direta para editar a pasta `.github/workflows/` no repositório remoto, você pode criar o arquivo diretamente na aba **Actions** ou **Add file** do GitHub.

### 📝 Conteúdo do arquivo `.github/workflows/build-apk.yml`

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
          node-version: 20
          cache: 'npm'

      - name: Setup Java JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Install dependencies
        run: npm ci

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

### 🚀 Como ativar no GitHub:
1. No seu repositório no GitHub, clique em **Add file** > **Create new file**.
2. No nome do arquivo, digite: `.github/workflows/build-apk.yml`
3. Cole o código YAML acima e clique em **Commit changes**.
4. Vá para a aba **Actions** do GitHub para acompanhar o build automatizado e baixar o APK atualizado!
