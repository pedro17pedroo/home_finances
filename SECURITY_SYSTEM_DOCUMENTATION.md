# Sistema de Segurança e Bloqueio de IPs

## Visão Geral
O sistema implementa um sistema robusto de segurança com monitoramento em tempo real, bloqueio automático de IPs e logs de auditoria completos.

## 📊 Estrutura da Base de Dados

### Tabela `security_logs`
```sql
- id: Identificador único
- eventType: Tipo de evento ('failed_login', 'brute_force', 'suspicious_activity', 'ip_blocked', 'password_attempt', 'account_locked')
- severity: Nível de severidade ('low', 'medium', 'high', 'critical')
- description: Descrição do evento
- ipAddress: Endereço IP do evento
- location: Localização geográfica (opcional)
- userAgent: User Agent do browser
- details: Detalhes adicionais em JSON
- isResolved: Se o evento foi resolvido
- resolvedAt: Data de resolução
- resolvedBy: Admin que resolveu
- createdAt: Data de criação
```

### Tabela `blocked_ips`
```sql
- id: Identificador único
- ipAddress: Endereço IP bloqueado (único)
- reason: Motivo do bloqueio
- blockedBy: ID do admin que bloqueou (opcional para bloqueios automáticos)
- expiresAt: Data de expiração do bloqueio (opcional)
- isActive: Se o bloqueio está ativo
- createdAt: Data de criação
- updatedAt: Data de atualização
```

## 🔒 Como Funciona o Bloqueio de IPs

### 1. Detecção Automática de Ataques
O sistema monitora tentativas de login e bloqueia IPs automaticamente quando:

**Arquivo: `server/security-logger.ts`**
```typescript
// Rastreamento de tentativas falhadas por IP
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

export const trackFailedLogin = async (ipAddress: string, userAgent?: string, email?: string) => {
  // Reset do contador se última tentativa foi há mais de 1 hora
  if (now.getTime() - current.lastAttempt.getTime() > 60 * 60 * 1000) {
    current.count = 0;
  }
  
  current.count++;
  
  // Severidade aumenta com o número de tentativas
  severity: current.count > 10 ? 'high' : current.count > 5 ? 'medium' : 'low'
  
  // Bloqueio automático após 15 tentativas em 1 hora
  if (current.count >= 15) {
    await blockIP(ipAddress, 'Ataque de força bruta detectado', null);
  }
}
```

### 2. Aplicação do Bloqueio no Sistema de Autenticação
**Arquivo: `server/auth.ts`**
```typescript
export const loginUser = async (req: Request, res: Response) => {
  const clientIP = req.ip || req.connection.remoteAddress || '';
  
  // Verificação se IP está bloqueado ANTES de processar login
  if (await isIPBlocked(clientIP)) {
    await logSecurityEvent({
      eventType: 'suspicious_activity',
      severity: 'high',
      description: `Tentativa de login de IP bloqueado: ${clientIP}`,
      ipAddress: clientIP,
      userAgent,
      details: { email: emailOrPhone }
    });
    return res.status(403).json({ message: 'Acesso negado' });
  }
  
  // Se credenciais inválidas, registra tentativa falhada
  if (!user || !isValidPassword) {
    await trackFailedLogin(clientIP, userAgent, emailOrPhone);
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }
}
```

## 🎯 Tipos de Eventos de Segurança

### 1. **failed_login** (Severidade: low/medium/high)
- Tentativa de login com credenciais inválidas
- Severidade aumenta com número de tentativas do mesmo IP

### 2. **brute_force** (Severidade: critical)
- 15+ tentativas de login em 1 hora do mesmo IP
- Resulta em bloqueio automático do IP

### 3. **suspicious_activity** (Severidade: high)
- Tentativas de acesso de IPs já bloqueados
- Atividades suspeitas detectadas

### 4. **ip_blocked** (Severidade: high)
- Registro quando um IP é bloqueado
- Inclui motivo e duração do bloqueio

### 5. **password_attempt** (Severidade: medium)
- Tentativas de alteração de senha suspeitas

### 6. **account_locked** (Severidade: high)
- Quando uma conta é bloqueada por atividade suspeita

## 🔧 Configurações de Bloqueio

### Bloqueio Automático
```typescript
// Tempo de reset do contador: 1 hora
if (now.getTime() - current.lastAttempt.getTime() > 60 * 60 * 1000) {
  current.count = 0;
}

// Limite para bloqueio automático: 15 tentativas
if (current.count >= 15) {
  await blockIP(ipAddress, 'Ataque de força bruta detectado', null);
}

// Duração do bloqueio: 24 horas
expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
```

### Escalation de Severidade
```typescript
// Severidade baseada no número de tentativas
severity: current.count > 10 ? 'high' : current.count > 5 ? 'medium' : 'low'
```

## 📈 Interface de Monitorização

### Dashboard de Segurança (`/admin/security-logs`)
**Métricas Principais:**
1. **Tentativas de Login Falhadas** - Últimas 24 horas
2. **IPs Bloqueados** - Total ativo
3. **Ataques Detectados** - Últimas 24 horas  
4. **Score de Segurança** - Calculado automaticamente

**Filtros Disponíveis:**
- Pesquisa por IP, User Agent ou evento
- Filtro por severidade (low, medium, high, critical)
- Filtro por tipo de evento
- Paginação de resultados

### Ações Administrativas
1. **Bloqueio Manual de IPs** - Admins podem bloquear IPs específicos
2. **Visualização de Detalhes** - Informações completas de cada evento
3. **Resolução de Eventos** - Marcar eventos como resolvidos
4. **Estatísticas em Tempo Real** - Atualizações automáticas

## 🔄 Fluxo de Segurança Completo

### 1. Tentativa de Login
```
Usuario tenta login → Verificar se IP está bloqueado → Se bloqueado: Negar acesso
                                                    → Se não bloqueado: Continuar
```

### 2. Credenciais Inválidas
```
Credenciais inválidas → Registrar evento 'failed_login' → Incrementar contador IP
                                                        → Se >= 15: Bloquear IP automaticamente
```

### 3. Bloqueio Automático
```
15+ tentativas → Evento 'brute_force' → Bloquear IP por 24h → Evento 'ip_blocked'
```

### 4. Monitorização Admin
```
Eventos registrados → Dashboard atualizado → Alertas de segurança → Ação admin se necessário
```

## 🛡️ Medidas de Segurança Implementadas

### Proteção contra Força Bruta
- ✅ Limite de tentativas por IP (15/hora)
- ✅ Bloqueio automático por 24 horas
- ✅ Reset automático de contadores após 1 hora

### Logs de Auditoria
- ✅ Todos os eventos de segurança registrados
- ✅ Detalhes completos (IP, User Agent, timestamp)
- ✅ Severidade automática baseada no risco

### Monitorização em Tempo Real
- ✅ Dashboard administrativo com métricas
- ✅ Alertas automáticos para eventos críticos
- ✅ Estatísticas de segurança atualizadas

### Gestão Administrativa
- ✅ Bloqueio manual de IPs suspeitos
- ✅ Resolução de eventos de segurança
- ✅ Logs de todas as ações administrativas

## 📊 Estatísticas de Segurança

O sistema calcula automaticamente:
```typescript
securityScore: Math.max(0, 100 - (failedLogins.length * 2) - (criticalEvents.length * 10))
```

**Score de Segurança:**
- 100: Excelente (sem eventos suspeitos)
- 80-99: Bom (poucos eventos de baixo risco)
- 60-79: Médio (alguns eventos de risco)
- <60: Crítico (muitos eventos de alto risco)

## 🔍 Como Verificar Status de Segurança

### Via Interface Admin
1. Aceder `/admin/security-logs`
2. Ver métricas principais no topo
3. Filtrar eventos por tipo/severidade
4. Analisar padrões de ataques

### Via Logs do Sistema
```bash
# Ver eventos de segurança recentes
grep "Security event logged" server/logs

# Ver bloqueios de IP
grep "IP.*foi bloqueado" server/logs
```

## 🚨 Alertas e Notificações

O sistema gera alertas automáticos para:
- Ataques de força bruta detectados
- Novos IPs bloqueados  
- Eventos de severidade crítica
- Tentativas de acesso a IPs já bloqueados

Todos os eventos são registrados com timestamp, IP de origem, User Agent e detalhes específicos para análise forense completa.