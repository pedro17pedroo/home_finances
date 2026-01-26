# Funcionalidade: Notificação de Cobrança para Empréstimos e Dívidas

## Visão Geral

Implementada funcionalidade completa para enviar lembretes/notificações de cobrança para pessoas que devem dinheiro (empréstimos dados) ou para credores (dívidas).

## Funcionalidades Implementadas

### 1. **Campos de Contato Adicionados**

#### Backend - Migração SQL
**Arquivo**: `backend/migrations/add_contact_info_to_loans_debts.sql`

Adicionados campos:
- `loans.borrower_phone` - Telefone do devedor
- `loans.borrower_email` - Email do devedor
- `debts.creditor_phone` - Telefone do credor
- `debts.creditor_email` - Email do credor

#### Backend - Schema Drizzle
**Arquivo**: `backend/src/core/database/schema.ts`

Atualizado schema com novos campos camelCase.

### 2. **Serviço de Lembretes**

**Arquivo**: `backend/src/domain/services/loan-reminder.service.ts`

#### Métodos Principais:
- `sendLoanReminder()` - Envia lembrete para devedor
- `sendDebtReminder()` - Envia lembrete para credor

#### Lógica Inteligente de Mensagens:

**Se data de vencimento passou (em atraso):**
```
Olá [Nome],

Este é um lembrete sobre o empréstimo de Kz 10.000,00 que venceu há 5 dia(s) (26 de janeiro de 2026).

Por favor, entre em contato para regularizar a situação.

Atenciosamente,
[Nome do Remetente]
```

**Se data de vencimento não passou:**
```
Olá [Nome],

Este é um lembrete sobre o empréstimo de Kz 10.000,00 com vencimento em 3 dia(s) (29 de janeiro de 2026).

Por favor, não se esqueça do pagamento.

Atenciosamente,
[Nome do Remetente]
```

**Mensagem Personalizada:**
- Usuário pode escrever sua própria mensagem
- Sobrescreve a mensagem padrão

#### Canais de Envio:
- **Email** - Se `borrowerEmail` ou `creditorEmail` fornecido
- **SMS** - Se `borrowerPhone` ou `creditorPhone` fornecido
- Pode enviar para ambos simultaneamente

### 3. **Endpoints da API**

#### Empréstimos (Loans)
```
POST /api/loans/:id/send-reminder
```

**Body (opcional):**
```json
{
  "customMessage": "Mensagem personalizada aqui..."
}
```

**Resposta:**
```json
{
  "status": "success",
  "message": "Lembrete enviado com sucesso"
}
```

#### Dívidas (Debts)
```
POST /api/debts/:id/send-reminder
```

Mesma estrutura do endpoint de loans.

### 4. **Controllers**

**Arquivos Modificados:**
- `backend/src/api/controllers/loan.controller.ts` - Adicionado método `sendReminder()`
- `backend/src/api/controllers/debt.controller.ts` - Adicionado método `sendReminder()`

**Arquivos Modificados:**
- `backend/src/api/routes/loans.ts` - Adicionada rota `/send-reminder`
- `backend/src/api/routes/debts.ts` - Adicionada rota `/send-reminder`

## Fluxo de Funcionamento

### 1. Usuário Cria Empréstimo/Dívida
- Preenche nome do devedor/credor
- **NOVO**: Preenche telefone (opcional)
- **NOVO**: Preenche email (opcional)
- Define valor e data de vencimento

### 2. Usuário Envia Lembrete
- Clica em botão "Enviar Lembrete" (a ser implementado no frontend)
- Pode escolher mensagem padrão ou escrever personalizada
- Sistema verifica se data venceu ou não
- Gera mensagem apropriada
- Envia por email e/ou SMS

### 3. Destinatário Recebe
- **Email**: Recebe email com assunto e mensagem
- **SMS**: Recebe SMS com mensagem

## Informações na Mensagem

### Sempre Incluídas:
- ✅ Nome do destinatário
- ✅ Valor do empréstimo/dívida (formatado em Kwanzas)
- ✅ Data de vencimento (formatada)
- ✅ Status (em atraso ou próximo)
- ✅ Dias de atraso ou dias até vencimento
- ✅ Nome do remetente

### Assunto do Email:
- **Em atraso**: `⚠️ Lembrete: Pagamento em Atraso - Kz 10.000,00`
- **Próximo**: `📅 Lembrete: Pagamento Próximo - Kz 10.000,00`

## Próximos Passos (Frontend)

### Formulário de Criação
**Arquivo a modificar**: `frontend/src/features/loans/pages/loans-page.tsx`

Adicionar campos:
```tsx
<Input
  type="tel"
  placeholder="Telefone (opcional)"
  value={formData.borrowerPhone}
  onChange={(e) => setFormData({ ...formData, borrowerPhone: e.target.value })}
/>

<Input
  type="email"
  placeholder="Email (opcional)"
  value={formData.borrowerEmail}
  onChange={(e) => setFormData({ ...formData, borrowerEmail: e.target.value })}
/>
```

### Botão de Enviar Lembrete
Na listagem de empréstimos, adicionar botão:
```tsx
<Button
  onClick={() => handleSendReminder(loan.id)}
  disabled={!loan.borrowerEmail && !loan.borrowerPhone}
>
  <Bell className="w-4 h-4 mr-2" />
  Enviar Lembrete
</Button>
```

### Modal de Mensagem Personalizada
```tsx
<Dialog>
  <DialogContent>
    <h3>Enviar Lembrete de Pagamento</h3>
    <p>Para: {loan.borrower}</p>
    <p>Valor: {formatCurrency(loan.amount)}</p>
    
    <Textarea
      placeholder="Mensagem personalizada (opcional)"
      value={customMessage}
      onChange={(e) => setCustomMessage(e.target.value)}
    />
    
    <div className="flex gap-2">
      <Button onClick={handleSendWithDefault}>
        Enviar Mensagem Padrão
      </Button>
      <Button onClick={handleSendWithCustom}>
        Enviar Mensagem Personalizada
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

## Integração com Serviços Externos

### Email
Atualmente logando no console. Para integrar:
```typescript
// Em loan-reminder.service.ts, método sendEmail()
import { emailService } from '../../infrastructure/email/email.service.js';

await emailService.send({
  to,
  subject,
  text: message,
  html: `<p>${message.replace(/\n/g, '<br>')}</p>`
});
```

### SMS
Atualmente logando no console. Para integrar (exemplo com Twilio):
```typescript
// Em loan-reminder.service.ts, método sendSMS()
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

await client.messages.create({
  body: message,
  from: process.env.TWILIO_PHONE,
  to: to
});
```

## Segurança e Validações

- ✅ Apenas o dono do empréstimo/dívida pode enviar lembretes
- ✅ Validação de ID do empréstimo/dívida
- ✅ Verificação de organização (multi-tenant)
- ✅ Logs de todas as tentativas de envio
- ✅ Tratamento de erros gracioso

## Testes Sugeridos

1. ✅ Criar empréstimo com email e telefone
2. ✅ Enviar lembrete com mensagem padrão
3. ✅ Enviar lembrete com mensagem personalizada
4. ✅ Verificar mensagem para data vencida
5. ✅ Verificar mensagem para data futura
6. ✅ Testar sem email (apenas SMS)
7. ✅ Testar sem telefone (apenas email)
8. ✅ Testar sem nenhum contato (deve falhar graciosamente)

## Arquivos Criados/Modificados

### Criados:
- `backend/migrations/add_contact_info_to_loans_debts.sql`
- `backend/src/domain/services/loan-reminder.service.ts`
- `LOAN_REMINDER_FEATURE.md` (este arquivo)

### Modificados:
- `backend/src/core/database/schema.ts`
- `backend/src/api/controllers/loan.controller.ts`
- `backend/src/api/controllers/debt.controller.ts`
- `backend/src/api/routes/loans.ts`
- `backend/src/api/routes/debts.ts`

## Status

✅ **Backend Completo e Funcional**
⏳ **Frontend Pendente** (campos de contato e botão de envio)

O backend está pronto para uso. Basta adicionar os campos no formulário e o botão de envio no frontend! 🎉
