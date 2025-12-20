# 📱 FinanceControl Mobile

Aplicativo móvel nativo para iOS e Android do sistema FinanceControl, desenvolvido com React Native e Expo.

## 🚀 Tecnologias

- **React Native** - Framework para desenvolvimento mobile
- **Expo** - Plataforma de desenvolvimento
- **TypeScript** - Tipagem estática
- **React Navigation** - Navegação entre telas
- **React Query** - Gerenciamento de estado e cache
- **Axios** - Cliente HTTP
- **React Hook Form** - Formulários
- **Zod** - Validação de dados
- **Expo Vector Icons** - Ícones
- **React Native Paper** - Componentes UI

## 📁 Estrutura do Projeto

```
mobile/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   └── ui/             # Componentes de interface
│   ├── screens/            # Telas da aplicação
│   │   ├── auth/           # Telas de autenticação
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── accounts/       # Gestão de contas
│   │   └── transactions/   # Transações
│   ├── navigation/         # Configuração de navegação
│   ├── services/           # Serviços e APIs
│   ├── contexts/           # Contextos React
│   ├── hooks/              # Custom hooks
│   ├── types/              # Tipos TypeScript
│   ├── utils/              # Utilitários
│   └── constants/          # Constantes e configurações
├── App.tsx                 # Componente principal
└── package.json           # Dependências
```

## 🎨 Design System

### Cores
- **Primary:** #2563eb (Azul)
- **Success:** #10b981 (Verde)
- **Warning:** #f59e0b (Amarelo)
- **Error:** #ef4444 (Vermelho)
- **Background:** #f8fafc (Cinza claro)
- **Surface:** #ffffff (Branco)

### Componentes UI
- **Button** - Botões com variantes (primary, secondary, outline)
- **Input** - Campos de entrada com validação
- **Card** - Cartões com sombra e padding
- **Loading** - Indicadores de carregamento

## 📱 Funcionalidades Implementadas

### ✅ Autenticação
- [x] Tela de login moderna com gradiente
- [x] Validação de formulários
- [x] Gerenciamento de estado de autenticação
- [x] Armazenamento seguro de tokens

### ✅ Dashboard
- [x] Resumo financeiro
- [x] Saldo total das contas
- [x] Receitas e despesas mensais
- [x] Ações rápidas
- [x] Estatísticas gerais
- [x] Pull-to-refresh

### ✅ Contas
- [x] Lista de contas bancárias
- [x] Saldo individual por conta
- [x] Ícones por tipo de conta
- [x] Ações rápidas (transferir, histórico)
- [x] Saldo total consolidado

### ✅ Transações
- [x] Lista de transações
- [x] Filtros por tipo (receitas/despesas)
- [x] Resumo mensal
- [x] Ícones por categoria
- [x] Formatação de valores
- [x] Datas formatadas

### 🚧 Em Desenvolvimento
- [ ] Tela de cadastro
- [ ] Formulários de nova transação
- [ ] Relatórios com gráficos
- [ ] Perfil do usuário
- [ ] Configurações
- [ ] Notificações push
- [ ] Modo offline

## 🛠️ Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Expo CLI
- Android Studio (para Android)
- Xcode (para iOS)

### Instalação
```bash
cd mobile
npm install
```

### Execução
```bash
# Iniciar o servidor de desenvolvimento
npm start

# Executar no Android
npm run android

# Executar no iOS
npm run ios

# Executar na web
npm run web
```

### Configuração da API
Edite o arquivo `src/constants/config.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:5001/api'  // Desenvolvimento
    : 'https://api.financecontrol.ao/api',  // Produção
  TIMEOUT: 10000,
};
```

## 📱 Telas Implementadas

### 🔐 Login
- Interface moderna com gradiente
- Campos de email/telefone e senha
- Validação em tempo real
- Loading states
- Tratamento de erros

### 🏠 Dashboard
- Saldo total destacado
- Cards de receitas e despesas
- Ações rápidas (4 botões)
- Estatísticas (contas, transações, empréstimos, dívidas)
- Pull-to-refresh

### 🏦 Contas
- Lista de contas com ícones
- Saldo individual e total
- Informações do banco
- Botões de ação por conta
- Botão para adicionar nova conta

### 💰 Transações
- Lista cronológica
- Filtros por tipo
- Resumo mensal colorido
- Ícones por categoria
- Formatação de moeda angolana (AOA)
- Botões para nova receita/despesa

## 🎯 Próximas Funcionalidades

### Fase 1: Formulários
- [ ] Tela de cadastro de usuário
- [ ] Formulário de nova conta
- [ ] Formulário de nova transação
- [ ] Formulário de transferência

### Fase 2: Funcionalidades Avançadas
- [ ] Empréstimos e dívidas
- [ ] Metas de poupança
- [ ] Relatórios com gráficos
- [ ] Exportação de dados

### Fase 3: UX/UI
- [ ] Modo escuro
- [ ] Animações
- [ ] Gestos (swipe, pull-to-refresh)
- [ ] Feedback háptico

### Fase 4: Recursos Nativos
- [ ] Notificações push
- [ ] Biometria (Face ID/Touch ID)
- [ ] Câmera para comprovantes
- [ ] Compartilhamento

## 🔧 Configuração de Desenvolvimento

### VS Code Extensions Recomendadas
- React Native Tools
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Prettier
- ESLint

### Debugging
```bash
# Logs do React Native
npx react-native log-android
npx react-native log-ios

# Flipper (debugging avançado)
# Instalar Flipper Desktop
```

## 📦 Build e Deploy

### Android
```bash
# Build APK
expo build:android

# Build AAB (Google Play)
expo build:android -t app-bundle
```

### iOS
```bash
# Build IPA
expo build:ios

# Simulator
expo build:ios -t simulator
```

### Expo Application Services (EAS)
```bash
# Instalar EAS CLI
npm install -g @expo/eas-cli

# Configurar
eas build:configure

# Build
eas build --platform all
```

## 🧪 Testes

```bash
# Testes unitários (quando implementados)
npm test

# Testes E2E com Detox (quando implementados)
npm run test:e2e
```

## 📊 Performance

### Otimizações Implementadas
- ✅ React Query para cache de dados
- ✅ Lazy loading de componentes
- ✅ Otimização de imagens
- ✅ Debounce em buscas
- ✅ Memoização de componentes

### Métricas Alvo
- **Tempo de inicialização:** < 3s
- **Navegação:** < 200ms
- **API calls:** < 1s
- **Tamanho do bundle:** < 50MB

## 🔒 Segurança

- ✅ Armazenamento seguro de tokens (AsyncStorage)
- ✅ Interceptors para refresh de tokens
- ✅ Validação de entrada com Zod
- ✅ HTTPS obrigatório em produção
- 🚧 Biometria (planejado)
- 🚧 Certificate pinning (planejado)

## 📞 Suporte

- 📧 Email: mobile@financecontrol.ao
- 📱 WhatsApp: +244 900 000 000
- 🌐 Website: https://financecontrol.ao

---

**Status:** 🚧 Em Desenvolvimento Ativo
**Versão:** 1.0.0-beta
**Plataformas:** iOS 12+, Android 6+