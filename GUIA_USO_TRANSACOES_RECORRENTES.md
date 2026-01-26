# 📖 Guia de Uso - Transações Recorrentes

## 🎯 Como Acessar

### Frontend Web (http://localhost:3001/)

#### Opção 1: Menu do Usuário (Recomendado)
1. Clique no seu nome/avatar no canto superior direito
2. No menu dropdown, clique em **"Transações Recorrentes"** (logo abaixo de "Convites Recebidos")
3. Você será direcionado para `/transactions/recurring`

#### Opção 2: URL Direta
- Digite diretamente na barra de endereços: `http://localhost:3001/transactions/recurring`

---

## ✨ Como Criar uma Transação Recorrente

### Passo 1: Acessar a Página de Criação

**Opção A**: Na página de listagem
- Clique no botão **"+ Nova Transação Recorrente"** (canto superior direito)

**Opção B**: URL direta
- Acesse: `http://localhost:3001/transactions/recurring/new`

### Passo 2: Preencher o Formulário

#### 📝 Informações Básicas

1. **Tipo** (obrigatório)
   - Receita (ex: salário, aluguel recebido)
   - Despesa (ex: aluguel pago, conta de luz)

2. **Descrição** (obrigatório)
   - Ex: "Salário Mensal", "Aluguel", "Conta de Luz"

3. **Valor** (obrigatório)
   - Digite o valor em AOA (Kwanzas)
   - Ex: 150000.00

4. **Categoria** (obrigatório)
   - Selecione uma categoria existente
   - As categorias são filtradas pelo tipo (receita/despesa)

5. **Conta** (obrigatório)
   - Selecione a conta onde a transação será registrada

#### 🔄 Configuração de Recorrência

6. **Frequência** (obrigatório)
   - **Diária**: Executa todos os dias ou a cada X dias
   - **Semanal**: Executa em um dia específico da semana
   - **Mensal**: Executa em um dia específico do mês
   - **Anual**: Executa em uma data específica do ano

7. **Intervalo** (obrigatório)
   - Define a cada quantos períodos executar
   - Ex: Intervalo 1 = todo mês, Intervalo 2 = a cada 2 meses

8. **Configurações Específicas por Frequência**

   **Se Semanal:**
   - Escolha o dia da semana (Domingo a Sábado)

   **Se Mensal:**
   - Digite o dia do mês (1 a 31)
   - Ex: 5 = dia 5 de cada mês

   **Se Anual:**
   - Digite o mês (1 a 12)
   - Digite o dia (1 a 31)
   - Ex: Mês 12, Dia 25 = 25 de Dezembro

#### 📅 Datas e Limites

9. **Data de Início** (obrigatório)
   - Quando a transação recorrente começa a ser executada

10. **Data de Fim** (opcional)
    - Quando a transação recorrente para de ser executada
    - Deixe vazio para execução ilimitada

11. **Limite de Execuções** (opcional)
    - Número máximo de vezes que a transação será executada
    - Ex: 12 = executar apenas 12 vezes
    - Deixe vazio para execução ilimitada

#### 🔔 Notificações

12. **Notificar quantos dias antes?** (padrão: 1)
    - Sistema enviará notificação X dias antes da execução
    - Ex: 1 = notifica 1 dia antes

13. **Canais de Notificação**
    - ☑️ **App**: Notificação no sistema
    - ☑️ **Email**: Notificação por e-mail
    - ☑️ **SMS**: Notificação por SMS
    - Você pode selecionar múltiplos canais

### Passo 3: Salvar

- Clique em **"Salvar"** para criar a transação recorrente
- Clique em **"Cancelar"** para voltar sem salvar

---

## 📋 Exemplos Práticos

### Exemplo 1: Salário Mensal
```
Tipo: Receita
Descrição: Salário Mensal
Valor: 250000.00 AOA
Categoria: Salário
Conta: Conta Corrente BAI
Frequência: Mensal
Intervalo: 1
Dia do Mês: 25
Data de Início: 25/01/2026
Data de Fim: (vazio - ilimitado)
Notificar: 1 dia antes
Canais: App, Email
```

### Exemplo 2: Aluguel (Despesa)
```
Tipo: Despesa
Descrição: Aluguel do Apartamento
Valor: 80000.00 AOA
Categoria: Moradia
Conta: Conta Corrente BAI
Frequência: Mensal
Intervalo: 1
Dia do Mês: 5
Data de Início: 05/02/2026
Data de Fim: (vazio - ilimitado)
Notificar: 2 dias antes
Canais: App, Email, SMS
```

### Exemplo 3: Conta de Luz (Bimestral)
```
Tipo: Despesa
Descrição: Conta de Luz
Valor: 15000.00 AOA
Categoria: Utilidades
Conta: Conta Corrente
Frequência: Mensal
Intervalo: 2 (a cada 2 meses)
Dia do Mês: 10
Data de Início: 10/02/2026
Limite de Execuções: 6 (1 ano)
Notificar: 3 dias antes
Canais: App
```

### Exemplo 4: Pagamento Semanal
```
Tipo: Despesa
Descrição: Aula de Inglês
Valor: 5000.00 AOA
Categoria: Educação
Conta: Conta Corrente
Frequência: Semanal
Intervalo: 1
Dia da Semana: Segunda-feira
Data de Início: 27/01/2026
Data de Fim: 30/06/2026
Notificar: 1 dia antes
Canais: App
```

---

## 🎛️ Gerenciar Transações Recorrentes

### Visualizar Lista

Na página `/transactions/recurring`, você verá:

- **Cards coloridos** para cada transação
  - Verde = Receita
  - Vermelho = Despesa
- **Informações exibidas**:
  - Descrição
  - Valor
  - Categoria
  - Frequência
  - Próxima execução
  - Número de execuções
  - Status (Ativa/Inativa)

### Ações Disponíveis

#### 1. ⏸️ Desativar / ▶️ Ativar
- Pausa ou retoma a execução automática
- Transações inativas não serão executadas

#### 2. 🔄 Executar Agora
- Executa a transação imediatamente
- Cria uma transação real na conta
- Atualiza o contador de execuções
- Calcula a próxima data de execução

#### 3. 📜 Histórico
- Visualiza todas as execuções anteriores
- Mostra sucessos e falhas
- Exibe data e hora de cada execução

#### 4. ✏️ Editar
- Modifica qualquer configuração
- Mantém o histórico de execuções

#### 5. 🗑️ Excluir
- Remove a transação recorrente
- **Atenção**: Não remove transações já criadas
- Ação irreversível

---

## 🔔 Sistema de Notificações

### Quando Você Receberá Notificações?

1. **Antes da Execução**
   - X dias antes (configurável)
   - Lembra você da transação que será executada

2. **Após Execução Bem-Sucedida**
   - Confirma que a transação foi criada
   - Mostra o novo saldo da conta

3. **Em Caso de Falha**
   - Alerta sobre problemas (ex: saldo insuficiente)
   - Sugere ações corretivas

### Canais de Notificação

- **App**: Notificação no sistema (sempre disponível)
- **Email**: Enviado para o e-mail cadastrado
- **SMS**: Enviado para o telefone cadastrado

---

## ⚙️ Como Funciona a Execução Automática?

### Job Automático

- Executa **diariamente às 00:00** (meia-noite)
- Verifica todas as transações recorrentes ativas
- Identifica quais devem ser executadas hoje
- Cria as transações automaticamente

### Validações

Antes de executar, o sistema verifica:

1. ✅ Transação está ativa?
2. ✅ Chegou a data de execução?
3. ✅ Não atingiu o limite de execuções?
4. ✅ Não passou da data de fim?
5. ✅ Para despesas: há saldo suficiente?

### Em Caso de Falha

- Transação **não é criada**
- Falha é registrada no histórico
- Notificação é enviada ao usuário
- Próxima execução é calculada normalmente

---

## 🎯 Casos de Uso Comuns

### 💰 Receitas Fixas
- Salário mensal
- Aluguel recebido
- Pensão
- Dividendos
- Renda passiva

### 💸 Despesas Fixas
- Aluguel pago
- Condomínio
- Contas de água, luz, internet
- Mensalidade escolar
- Plano de saúde
- Academia
- Streaming (Netflix, Spotify, etc.)
- Seguros

### 📅 Pagamentos Periódicos
- Parcelas de empréstimo
- Parcelas de financiamento
- Contribuições mensais
- Doações regulares

---

## 🔍 Dicas e Boas Práticas

### ✅ Recomendações

1. **Use descrições claras**
   - "Salário - Empresa X" em vez de apenas "Salário"

2. **Configure notificações adequadas**
   - 1-2 dias antes para despesas (tempo para providenciar saldo)
   - 0-1 dia antes para receitas

3. **Revise periodicamente**
   - Verifique se os valores ainda estão corretos
   - Atualize quando houver reajustes

4. **Use limites quando apropriado**
   - Para parcelas: defina o número exato
   - Para contratos temporários: defina data de fim

5. **Mantenha categorias organizadas**
   - Facilita relatórios e análises

### ⚠️ Cuidados

1. **Saldo suficiente**
   - Garanta saldo antes da execução de despesas
   - Sistema não executa se não houver saldo

2. **Datas especiais**
   - Dia 31: nem todos os meses têm
   - Sistema ajusta automaticamente para o último dia do mês

3. **Edições**
   - Mudanças afetam apenas execuções futuras
   - Histórico anterior não é alterado

4. **Exclusão**
   - Não remove transações já criadas
   - Apenas para a criação de novas

---

## 🆘 Solução de Problemas

### Transação não foi executada?

1. Verifique se está **ativa**
2. Confirme a **data de próxima execução**
3. Para despesas: verifique o **saldo da conta**
4. Veja o **histórico** para identificar falhas

### Não recebi notificação?

1. Verifique os **canais selecionados**
2. Confirme seu **e-mail/telefone** no perfil
3. Verifique a **caixa de spam** (para e-mails)

### Quero alterar uma transação já executada?

- Não é possível alterar transações já criadas
- Edite a transação recorrente para afetar futuras execuções
- Edite manualmente as transações já criadas em "Transações"

---

## 📱 Acesso Mobile

O sistema também está disponível no aplicativo mobile:

1. Abra o app FinanceControl
2. Acesse o menu lateral
3. Toque em **"Transações Recorrentes"**
4. Funcionalidades idênticas ao web

---

## 🔗 Links Úteis

- **Listagem**: http://localhost:3001/transactions/recurring
- **Nova Transação**: http://localhost:3001/transactions/recurring/new
- **Editar**: http://localhost:3001/transactions/recurring/:id/edit
- **Histórico**: http://localhost:3001/transactions/recurring/:id/history

---

## 📞 Suporte

Se tiver dúvidas ou problemas:

1. Consulte este guia
2. Verifique a documentação técnica em `RECURRING_TRANSACTIONS_IMPLEMENTATION.md`
3. Entre em contato com o suporte

---

**Última atualização**: 26 de Janeiro de 2026  
**Versão**: 1.0.0
