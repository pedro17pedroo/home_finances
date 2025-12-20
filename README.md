# 💰 FinanceControl

Sistema de controle financeiro pessoal moderno e escalável, desenvolvido com arquitetura separada para deploy independente.

## 🚀 Início Rápido

### Backend (API)
```bash
cd backend
npm install
cp .env.example .env  # Configure as variáveis
npm run dev           # Porta 5001
```

### Frontend (Interface)
```bash
cd frontend
npm install
cp .env.example .env  # Configure as variáveis
npm run dev           # Porta 3000
```

### Acessar o Sistema
- **Interface**: http://localhost:3000
- **API**: http://localhost:5001/api
- **Health Check**: http://localhost:5001/api/health

## 📁 Estrutura do Projeto

```
financecontrol/
├── backend/          # 🔧 API Node.js + Express + TypeScript
│   ├── src/
│   │   ├── api/      # Controllers, routes, middlewares
│   │   ├── core/     # Config, database, utils
│   │   └── domain/   # Services, repositories
│   ├── uploads/      # 📁 Arquivos de usuário
│   └── package.json  # Dependências independentes
│
├── frontend/         # 🎨 React + TypeScript + Vite
│   ├── src/
│   │   ├── features/ # Módulos organizados
│   │   └── shared/   # Componentes e utils
│   └── package.json  # Dependências independentes
```

## ✨ Funcionalidades

- 🔐 **Autenticação** - Login seguro com JWT
- 🏦 **Contas** - Gestão de contas bancárias
- 💸 **Transações** - Receitas e despesas
- 🔄 **Transferências** - Entre contas
- 🎯 **Metas de Poupança** - Planejamento financeiro
- 📊 **Relatórios** - Análise financeira

## 🛠️ Tecnologias

### Backend
- Node.js + Express + TypeScript
- Drizzle ORM + PostgreSQL
- JWT + Zod + Winston

### Frontend
- React 18 + TypeScript + Vite
- TanStack Query + Wouter
- Tailwind CSS + Radix UI

## 📖 Documentação Completa

Para informações detalhadas sobre a arquitetura, funcionalidades e implementação, consulte:

**[📋 README_NOVA_ARQUITETURA.md](./README_NOVA_ARQUITETURA.md)**

## 🎯 Deploy

Cada projeto pode ser deployado independentemente:

- **Backend**: Qualquer VPS com Node.js
- **Frontend**: CDN ou servidor estático
- **Banco**: PostgreSQL separado

---

**Status**: ✅ Sistema completo e funcional  
**Arquitetura**: Moderna, escalável e independente  
**Pronto para**: Desenvolvimento e produção