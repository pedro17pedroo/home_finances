# 🤖 WhatsApp Bot Integration - FinanceControl

## 📋 Visão Geral

O FinanceControl agora inclui integração completa com WhatsApp, permitindo que os usuários gerenciem suas finanças diretamente pelo WhatsApp usando comandos simples e naturais.

## 🚀 Funcionalidades Implementadas

### ✅ Comandos Disponíveis

#### 📊 Consultas
- `saldo` ou `contas` - Ver saldo de todas as contas
- `movimentos` ou `transacoes` ou `extrato` - Últimas 10 transações
- `emprestimos` ou `loans` - Ver empréstimos pendentes
- `dividas` ou `debts` - Ver dívidas pendentes
- `metas` ou `poupanca` - Ver metas de poupança
- `relatorio` ou `resumo` - Resumo financeiro completo

#### 💰 Transações
- `receita 1000 salario` - Registrar receita de 1000 AOA na categoria "salario"
- `entrada 500 freelance` - Registrar entrada de 500 AOA na categoria "freelance"
- `despesa 500 alimentacao` - Registrar despesa de 500 AOA na categoria "alimentacao"
- `gasto 200 transporte` - Registrar gasto de 200 AOA na categoria "transporte"
- `saida 300 lazer` - Registrar saída de 300 AOA na categoria "lazer"

#### ℹ️ Ajuda
- `menu` ou `ajuda` ou `/start` - Ver menu principal com todos os comandos

### 🔐 Autenticação

#### Usuários Não Registrados
- Recebem mensagem de boas-vindas com instruções para registro
- Comando `registrar` ou `cadastrar` inicia processo de registro (em desenvolvimento)

#### Usuários Registrados
- Identificados automaticamente pelo número de telefone
- Acesso completo a todas as funcionalidades

## 🛠️ Implementação Técnica

### 📁 Arquivos Principais

#### Backend
```
backend/src/
├── domain/services/whatsapp-bot.service.ts    # Lógica principal do bot
├── api/controllers/whatsapp.controller.ts     # Controlador HTTP
└── api/routes/whatsapp.ts                     # Rotas da API
```

#### Endpoints da API
```
GET  /api/whatsapp/webhook                     # Verificação do webhook
POST /api/whatsapp/webhook                     # Receber mensagens
POST /api/whatsapp/send        (protegido)     # Enviar mensagens
GET  /api/whatsapp/status      (protegido)     # Status do bot
POST /api/whatsapp/simulate    (protegido)     # Simular mensagens
```

### 🔧 Configuração

#### Variáveis de Ambiente
```bash
# WhatsApp Bot
WHATSAPP_VERIFY_TOKEN=financecontrol_webhook_token
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
```

#### Webhook URL
```
https://seu-dominio.com/api/whatsapp/webhook
```

## 📱 Exemplos de Uso

### 💬 Conversa Típica

**Usuário:** `saldo`
**Bot:** 
```
🏦 Suas Contas

💳 Conta Corrente BAI
   150.000,00 AOA

🏛️ Conta Poupança BFA
   500.000,00 AOA

💰 Total Geral: 650.000,00 AOA
```

**Usuário:** `receita 50000 salario`
**Bot:**
```
✅ Receita Registrada!

📈 50.000,00 AOA
🏷️ salario
💳 Conta Corrente BAI

💡 Digite saldo para ver o novo saldo.
```

**Usuário:** `despesa 15000 alimentacao`
**Bot:**
```
✅ Despesa Registrada!

📉 15.000,00 AOA
🏷️ alimentacao
💳 Conta Corrente BAI
💰 Novo saldo: 185.000,00 AOA
```

**Usuário:** `relatorio`
**Bot:**
```
📋 Resumo Financeiro

💰 Saldo Total: 685.000,00 AOA

📊 Este Mês:
📈 Receitas: 50.000,00 AOA
📉 Despesas: 15.000,00 AOA
💵 Saldo: 35.000,00 AOA

💰 Empréstimos: 100.000,00 AOA (2)
💳 Dívidas: 50.000,00 AOA (1)
```

## 🔒 Segurança

### 🛡️ Medidas Implementadas
- Autenticação por número de telefone
- Validação de webhook com token
- Sanitização de entrada de dados
- Rate limiting (recomendado para produção)
- Logs de segurança

### 🚨 Validações
- Verificação de saldo antes de despesas
- Validação de formato de comandos
- Verificação de propriedade de contas
- Limites de plano respeitados

## 🚀 Configuração para Produção

### 1. WhatsApp Business API
```bash
# Registrar aplicação no Facebook Developers
# Configurar WhatsApp Business API
# Obter tokens de acesso
# Configurar webhook
```

### 2. Webhook Configuration
```bash
# URL do webhook
https://api.financecontrol.ao/api/whatsapp/webhook

# Método: POST
# Verificação: GET com parâmetros hub.*
```

### 3. Variáveis de Ambiente
```bash
WHATSAPP_VERIFY_TOKEN=seu-token-seguro-aqui
WHATSAPP_ACCESS_TOKEN=seu-access-token-do-facebook
WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=seu-business-account-id
```

## 🧪 Testes

### 🔧 Teste Local
```bash
# Verificar webhook
curl -X GET "http://localhost:5001/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=financecontrol_webhook_token&hub.challenge=test123"

# Simular mensagem (usuário não registrado)
curl -X POST "http://localhost:5001/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{"from": "244912345678", "body": "menu"}'

# Simular mensagem (usuário registrado)
curl -X POST "http://localhost:5001/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{"from": "244923456789", "body": "saldo"}'
```

### 📊 Status do Bot
```bash
# Verificar status (requer autenticação)
curl -X GET "http://localhost:5001/api/whatsapp/status" \
  -H "Authorization: Bearer seu-jwt-token"
```

## 🔄 Próximos Passos

### 🚧 Melhorias Planejadas
1. **Registro via WhatsApp** - Processo completo de cadastro
2. **Comandos Avançados** - Filtros por data, categorias específicas
3. **Notificações Proativas** - Alertas automáticos
4. **Suporte a Mídia** - Envio de comprovantes por foto
5. **Comandos de Voz** - Reconhecimento de áudio
6. **Multi-idioma** - Suporte a português e inglês

### 🔧 Integrações Futuras
- **WhatsApp Business API** - Integração oficial
- **Chatbot AI** - Processamento de linguagem natural
- **Analytics** - Métricas de uso do bot
- **Templates** - Mensagens estruturadas

## 📞 Suporte

Para configuração e suporte:
- 📧 Email: suporte@financecontrol.ao
- 📱 WhatsApp: +244 900 000 000
- 🌐 Website: https://financecontrol.ao

---

**Status:** ✅ Implementado e Funcional
**Versão:** 1.0.0
**Data:** Dezembro 2024