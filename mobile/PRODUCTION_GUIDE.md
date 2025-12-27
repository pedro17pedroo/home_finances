# Guia de Produção - FinanceControl Mobile

## 📋 Visão Geral

Este guia cobre a preparação e publicação da app mobile nas lojas:
- **Google Play Store** (Android)
- **Apple App Store** (iOS)

## 🔧 Pré-requisitos

### 1. Conta Expo (EAS)
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login
```

### 2. Contas nas Lojas
- **Google Play Console**: $25 (pagamento único)
  - https://play.google.com/console
- **Apple Developer Program**: $99/ano
  - https://developer.apple.com/programs/

---

## ⚙️ Configuração Inicial

### 1. Configurar Projeto EAS
```bash
cd mobile
eas build:configure
```

### 2. Atualizar app.json

Editar `app.json` com os dados corretos:

```json
{
  "expo": {
    "name": "FinanceControl",
    "slug": "financecontrol-mobile",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "ao.financecontrol.mobile",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Permitir acesso à câmara para digitalizar recibos",
        "NSPhotoLibraryUsageDescription": "Permitir acesso às fotos para anexar recibos"
      }
    },
    "android": {
      "package": "ao.financecontrol.mobile",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

### 3. Configurar URL de Produção

Em `src/constants/config.ts`, a URL de produção já está configurada:
```typescript
API_BASE_URL: __DEV__ 
  ? Platform.select({...})  // URLs de desenvolvimento
  : 'https://api.financecontrol.ao/api',  // URL de produção
```

---

## 🤖 Build Android

### 1. Build de Preview (APK para testes)
```bash
eas build --platform android --profile preview
```

### 2. Build de Produção (AAB para Play Store)
```bash
eas build --platform android --profile production
```

### 3. Download do Build
Após o build, o EAS fornece um link para download.

### 4. Publicar na Play Store

#### Primeira vez:
1. Aceder ao [Google Play Console](https://play.google.com/console)
2. Criar nova aplicação
3. Preencher informações da loja:
   - Nome: FinanceControl
   - Descrição curta e longa
   - Screenshots (mínimo 2)
   - Ícone 512x512
   - Feature graphic 1024x500
4. Upload do AAB em "Produção" > "Criar nova versão"
5. Preencher classificação de conteúdo
6. Configurar preço (Grátis)
7. Submeter para revisão

#### Atualizações:
```bash
# Build
eas build --platform android --profile production

# Submit automático (requer configuração)
eas submit --platform android
```

---

## 🍎 Build iOS

### 1. Configurar Credenciais Apple
```bash
eas credentials
```
Selecionar iOS e seguir instruções para:
- Distribution Certificate
- Provisioning Profile

### 2. Build de Preview (Simulator)
```bash
eas build --platform ios --profile preview
```

### 3. Build de Produção
```bash
eas build --platform ios --profile production
```

### 4. Publicar na App Store

#### Primeira vez:
1. Aceder ao [App Store Connect](https://appstoreconnect.apple.com)
2. Criar nova app
3. Preencher informações:
   - Nome: FinanceControl
   - Descrição
   - Screenshots para cada tamanho de ecrã
   - Ícone 1024x1024
   - Palavras-chave
   - URL de suporte
   - Política de privacidade
4. Upload via EAS ou Transporter
5. Submeter para revisão

#### Submit Automático:
```bash
eas submit --platform ios
```

---

## 📱 Assets Necessários

### Ícones
- `icon.png` - 1024x1024 (iOS e Android)
- `adaptive-icon.png` - 1024x1024 (Android adaptive)

### Splash Screen
- `splash.png` - 1284x2778 (recomendado)

### Screenshots (Play Store)
- Telefone: 1080x1920 ou 1440x2560
- Tablet 7": 1200x1920
- Tablet 10": 1600x2560

### Screenshots (App Store)
- iPhone 6.7": 1290x2796
- iPhone 6.5": 1284x2778
- iPhone 5.5": 1242x2208
- iPad Pro 12.9": 2048x2732

### Feature Graphic (Play Store)
- 1024x500

---

## 🔄 Versionamento

### Incrementar Versão
Antes de cada release, atualizar em `app.json`:

```json
{
  "expo": {
    "version": "1.1.0",  // Versão semântica
    "ios": {
      "buildNumber": "2"  // Incrementar a cada build
    },
    "android": {
      "versionCode": 2  // Incrementar a cada build
    }
  }
}
```

### Script de Versão
```bash
# Criar script para facilitar
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

---

## 🔐 Variáveis de Ambiente

Para builds de produção, usar EAS Secrets:

```bash
# Definir secret
eas secret:create --name API_URL --value "https://api.financecontrol.ao/api"

# Listar secrets
eas secret:list
```

---

## 📊 Checklist de Publicação

### Android
- [ ] Ícone 512x512
- [ ] Feature graphic 1024x500
- [ ] Mínimo 2 screenshots
- [ ] Descrição curta (80 caracteres)
- [ ] Descrição completa (4000 caracteres)
- [ ] Classificação de conteúdo preenchida
- [ ] Política de privacidade URL
- [ ] AAB assinado e enviado

### iOS
- [ ] Ícone 1024x1024
- [ ] Screenshots para todos os tamanhos
- [ ] Descrição
- [ ] Palavras-chave
- [ ] URL de suporte
- [ ] Política de privacidade URL
- [ ] Build enviado via EAS/Transporter
- [ ] Informações de contacto

---

## 🐛 Troubleshooting

### Erro de Credenciais iOS
```bash
eas credentials --platform ios
# Selecionar "Remove" e recriar
```

### Build Falhou
```bash
# Ver logs detalhados
eas build:view

# Limpar cache
cd mobile
rm -rf node_modules
npm install
eas build --clear-cache
```

### App Rejeitada
- Verificar guidelines da loja
- Corrigir problemas indicados
- Resubmeter

---

## 📞 Comandos Úteis

```bash
# Build Android APK (testes)
eas build -p android --profile preview

# Build Android AAB (produção)
eas build -p android --profile production

# Build iOS (produção)
eas build -p ios --profile production

# Submit Android
eas submit -p android

# Submit iOS
eas submit -p ios

# Ver builds
eas build:list

# Cancelar build
eas build:cancel
```

---

## 🔗 Links Úteis

- [Expo EAS Docs](https://docs.expo.dev/eas/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
