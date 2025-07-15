# Database Seeding Instructions

## Seeding Plans

Para popular a base de dados com os planos padrão do sistema, pode usar uma das seguintes opções:

### Opção 1: Usando o script tsx diretamente
```bash
tsx server/seeds/index.ts
```

### Opção 2: Usando o script executável
```bash
node seed-plans.js
```

### Opção 3: Seeding individual de planos
```bash
tsx server/seeds/plans.ts
```

## Estrutura dos Planos

O sistema inclui 3 planos padrão:

1. **Plano Básico** (14.500 Kz)
   - Até 5 contas bancárias
   - Controle de receitas e despesas
   - Relatórios básicos
   - Suporte por email

2. **Plano Premium** (29.500 Kz)
   - Contas ilimitadas
   - Transações ilimitadas
   - Relatórios avançados
   - Metas de poupança
   - Gestão de empréstimos
   - Suporte prioritário

3. **Plano Enterprise** (74.500 Kz)
   - Tudo do Premium
   - Gestão de equipas
   - Relatórios personalizados
   - API access
   - Suporte dedicado
   - Integração com bancos

## Funcionalidades do Seed

- **Verificação automática**: O script verifica se os planos já existem antes de os criar
- **Tratamento de erros**: Inclui tratamento adequado de erros
- **Logs informativos**: Mostra o progresso da operação
- **Segurança**: Não duplica dados se já existirem

## Quando usar

Execute o seed quando:
- Configurar um novo ambiente
- A tabela de planos estiver vazia
- Precisar de repor os planos padrão
- Após uma migração da base de dados