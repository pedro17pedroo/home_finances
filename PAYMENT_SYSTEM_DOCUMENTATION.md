# Sistema de Pagamentos - Documentação Completa

## 1. Como funciona o Stripe atual

### Fluxo do Stripe
```
1. Usuario seleciona plano → 2. Stripe Checkout → 3. Webhook notifica → 4. Ativa assinatura
```

### Componentes Stripe:
- **Checkout Sessions**: Páginas de pagamento seguras hospedadas pelo Stripe
- **Webhooks**: Notificações automáticas sobre mudanças no status de pagamento
- **Subscriptions**: Gerenciamento automático de assinaturas recorrentes
- **Customer Portal**: Interface para usuários gerenciarem suas assinaturas

### Código atual:
```typescript
// Criar sessão de checkout
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [...],
  mode: 'subscription',
  success_url: '/dashboard?success=true',
  cancel_url: '/pricing',
});
```

## 2. Sistema de Múltiplos Métodos de Pagamento

### Nova Arquitetura
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Payment Method │    │  Payment Trans  │    │  Payment Conf   │
│   (Config)      │    │   (Tracking)    │    │ (Verification)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Tabelas do Sistema:

#### 1. **payment_methods** - Configuração de métodos
```sql
- id, name, displayName, isActive
- instructions (texto de instruções)
- processingTime ("Imediato", "1-3 dias")
- fees ("Sem taxas", "2% do valor")
- config (JSON com configurações específicas)
```

#### 2. **payment_transactions** - Rastreamento de pagamentos
```sql
- userId, planId, paymentMethodId
- amount, finalAmount, discountAmount
- status (pending, completed, failed, cancelled)
- paymentReference (referência externa)
- stripeSessionId (para Stripe)
- expiresAt (para pagamentos pendentes)
```

#### 3. **payment_confirmations** - Verificação manual
```sql
- transactionId, userId
- paymentProof (comprovante em base64)
- bankReference, phoneNumber
- status (pending, approved, rejected)
- verifiedBy (admin que aprovou)
```

## 3. Métodos de Pagamento Angolanos

### 3.1 Multicaixa Express
```json
{
  "name": "multicaixa",
  "displayName": "Multicaixa Express",
  "processingTime": "Imediato",
  "fees": "Sem taxas",
  "instructions": "1. Abra o app Multicaixa Express...",
  "config": {
    "merchant_id": "seu_merchant_id",
    "terminal_id": "seu_terminal_id",
    "callback_url": "https://seudominio.com/callback/multicaixa"
  }
}
```

### 3.2 Unitel Money
```json
{
  "name": "unitel_money",
  "displayName": "Unitel Money",
  "processingTime": "Imediato",
  "fees": "1% do valor",
  "instructions": "1. Marque *130#...",
  "config": {
    "merchant_code": "seu_codigo_merchant",
    "callback_url": "https://seudominio.com/callback/unitel"
  }
}
```

### 3.3 AfriMoney
```json
{
  "name": "afrimoney",
  "displayName": "AfriMoney",
  "processingTime": "Imediato",
  "fees": "0.5% do valor",
  "instructions": "1. Abra o app AfriMoney...",
  "config": {
    "merchant_id": "seu_merchant_id",
    "api_key": "sua_api_key"
  }
}
```

### 3.4 Transferência Bancária Manual
```json
{
  "name": "bank_transfer",
  "displayName": "Transferência Bancária",
  "processingTime": "1-3 dias úteis",
  "fees": "Sem taxas",
  "instructions": "Transfira para:\nBanco: BAI\nTitular: SUA EMPRESA\nConta: 123456789\nIBAN: AO06000000123456789",
  "config": {
    "banks": [
      {
        "name": "BAI",
        "account": "123456789",
        "iban": "AO06000000123456789"
      },
      {
        "name": "BFA",
        "account": "987654321",
        "iban": "AO06000000987654321"
      }
    ]
  }
}
```

## 4. Fluxo de Pagamento Unificado

### Para Métodos Automáticos (Stripe, APIs)
```
1. Usuario escolhe método → 2. Cria transação → 3. Redireciona para API → 4. Webhook confirma → 5. Ativa assinatura
```

### Para Métodos Manuais (Transferência, Mobile Money)
```
1. Usuario escolhe método → 2. Cria transação → 3. Exibe instruções → 4. Usuario envia comprovante → 5. Admin aprova → 6. Ativa assinatura
```

## 5. Implementação por Fases

### Fase 1: Preparação (✅ Concluída)
- [x] Criação das tabelas de pagamento
- [x] Schema de múltiplos métodos
- [x] Admin panel para configurar métodos

### Fase 2: Integração Manual (Em Andamento)
- [ ] Interface de seleção de métodos
- [ ] Página de instruções de pagamento
- [ ] Upload de comprovantes
- [ ] Painel admin para aprovar pagamentos

### Fase 3: APIs Angolanas (Futuro)
- [ ] Integração com Multicaixa Express API
- [ ] Integração com Unitel Money API
- [ ] Integração com AfriMoney API
- [ ] Webhooks para confirmação automática

### Fase 4: Melhorias (Futuro)
- [ ] Notificações por SMS/WhatsApp
- [ ] Pagamentos recorrentes manuais
- [ ] Relatórios de pagamentos
- [ ] Detecção de fraudes

## 6. Código de Exemplo

### Seleção de Método de Pagamento
```typescript
// Componente de seleção de método
const PaymentMethodSelector = ({ planType, onMethodSelect }) => {
  const { data: methods } = useQuery({
    queryKey: ["/api/payment-methods"],
  });

  return (
    <div className="grid gap-4">
      {methods?.map(method => (
        <PaymentMethodCard
          key={method.id}
          method={method}
          onSelect={() => onMethodSelect(method)}
        />
      ))}
    </div>
  );
};
```

### Processamento de Pagamento
```typescript
// Endpoint para iniciar pagamento
app.post("/api/payments/initiate", async (req, res) => {
  const { paymentMethodId, planType, couponCode } = req.body;
  
  // Criar transação
  const transaction = await db.insert(paymentTransactions).values({
    userId,
    planId,
    paymentMethodId,
    amount: finalAmount,
    status: 'pending',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
  });

  // Processar baseado no método
  if (method.name === 'stripe') {
    // Lógica Stripe existente
  } else if (method.name === 'multicaixa') {
    // Chamar API Multicaixa
  } else {
    // Método manual - retornar instruções
    return res.json({
      type: 'manual',
      instructions: method.instructions,
      transactionId: transaction.id
    });
  }
});
```

## 7. Vantagens do Sistema

### Flexibilidade
- Suporte a qualquer método de pagamento
- Configuração via admin panel
- Não depende de integrações complexas

### Escalabilidade
- Fácil adição de novos métodos
- Código reutilizável
- Tracking unificado

### Confiabilidade
- Fallback para métodos manuais
- Aprovação manual quando necessário
- Auditoria completa de pagamentos

## 8. Próximos Passos

1. **Implementar interface de seleção de métodos**
2. **Criar página de instruções de pagamento**
3. **Desenvolver sistema de upload de comprovantes**
4. **Construir painel admin para aprovação**
5. **Integrar APIs dos métodos angolanos**
6. **Testar fluxo completo**

Este sistema permite começar com métodos manuais e evoluir gradualmente para integrações automáticas, mantendo sempre a compatibilidade com o mercado angolano.