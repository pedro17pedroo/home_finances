# Mobile - Ajuste de Layout da Tela de Criar Recorrência

## Problema Identificado

A tela de criar transação recorrente não estava seguindo o padrão de layout das outras telas do aplicativo:
- Usava `COLORS` diretamente em vez de `colors` do `useTheme()`
- Header não seguia o padrão (faltava estrutura correta)
- Não usava `useToast()` para mensagens
- Faltavam campos importantes (intervalo, data fim, máx ocorrências, notificações)
- Layout dos cards não seguia o padrão
- Botões não estavam no padrão correto

## Alterações Realizadas

### 1. **Imports e Hooks** ✅
```typescript
// ANTES
import { COLORS, SPACING } from '../../constants/config';
import { ActivityIndicator } from 'react-native';

// DEPOIS
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SPACING } from '../../constants/config';
```

### 2. **State Management** ✅
Adicionados novos campos ao formulário:
```typescript
const [formData, setFormData] = useState({
  type: 'despesa' as 'receita' | 'despesa',
  description: '',
  amount: '',
  categoryId: '',
  accountId: '',
  frequency: 'monthly',
  interval: '1',              // ✅ NOVO
  startDate: '',
  endDate: '',                // ✅ NOVO
  maxOccurrences: '',         // ✅ NOVO
  notifyBeforeDays: '1',      // ✅ NOVO
});
const [notificationChannels, setNotificationChannels] = useState<('app' | 'email' | 'sms')[]>(['app']); // ✅ NOVO
```

### 3. **Header Padrão** ✅
```typescript
// ANTES
<View style={styles.header}>
  <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
  </TouchableOpacity>
  <Text style={styles.title}>Nova Transação Recorrente</Text>
  <View style={{ width: 40 }} />
</View>

// DEPOIS
<View style={styles.header}>
  <TouchableOpacity
    style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
    onPress={() => navigation.goBack()}
  >
    <Ionicons name="arrow-back" size={24} color={colors.text} />
  </TouchableOpacity>
  <View style={styles.headerTitle}>
    <Text style={[styles.title, { color: colors.text }]}>Nova Recorrência</Text>
  </View>
  <View style={styles.placeholder} />
</View>
```

### 4. **Cards com Tema Dinâmico** ✅
```typescript
// ANTES
<Card style={styles.card}>
  <Text style={styles.cardTitle}>Tipo de Transação</Text>
  ...
</Card>

// DEPOIS
<View style={[styles.card, { backgroundColor: colors.card }]}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Tipo de Transação</Text>
  ...
</View>
```

### 5. **Botões de Tipo com Tema** ✅
```typescript
// ANTES
style={[styles.typeButton, formData.type === 'receita' && { backgroundColor: `${COLORS.success}20` }]}

// DEPOIS
style={[
  styles.typeButton,
  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  formData.type === 'receita' && {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
]}
```

### 6. **Novos Campos Adicionados** ✅

#### Campo Intervalo
```typescript
<View style={[styles.card, { backgroundColor: colors.card }]}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Intervalo</Text>
  <Input
    placeholder="1"
    value={formData.interval}
    onChangeText={(v) => handleInputChange('interval', v.replace(/[^\d]/g, ''))}
    keyboardType="numeric"
  />
  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
    Repetir a cada {formData.interval || '1'} {formData.frequency === 'daily' ? 'dia(s)' : ...}
  </Text>
</View>
```

#### Campo Data de Término
```typescript
<View style={[styles.card, { backgroundColor: colors.card }]}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Data de Término (Opcional)</Text>
  <Input
    placeholder="DD/MM/AAAA"
    value={formData.endDate}
    onChangeText={(v) => handleInputChange('endDate', formatDateInput(v))}
    keyboardType="numeric"
  />
</View>
```

#### Campo Máximo de Ocorrências
```typescript
<View style={[styles.card, { backgroundColor: colors.card }]}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Máximo de Ocorrências (Opcional)</Text>
  <Input
    placeholder="Ex: 12"
    value={formData.maxOccurrences}
    onChangeText={(v) => handleInputChange('maxOccurrences', v.replace(/[^\d]/g, ''))}
    keyboardType="numeric"
  />
</View>
```

#### Campo Notificar Quantos Dias Antes
```typescript
<View style={[styles.card, { backgroundColor: colors.card }]}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Notificar quantos dias antes?</Text>
  <View style={styles.notifyDaysGrid}>
    {notifyDaysOptions.map((option) => (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.notifyDayButton,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
          formData.notifyBeforeDays === option.value && {
            backgroundColor: colors.primary + '15',
            borderColor: colors.primary,
          },
        ]}
        onPress={() => handleInputChange('notifyBeforeDays', option.value)}
      >
        <Text style={[styles.notifyDayText, { color: colors.textSecondary }]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>
```

#### Canais de Notificação
```typescript
<View style={[styles.card, { backgroundColor: colors.card }]}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Canais de Notificação</Text>
  <View style={styles.channelsContainer}>
    <TouchableOpacity
      style={[
        styles.channelButton,
        { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
        notificationChannels.includes('app') && {
          backgroundColor: colors.primary + '15',
          borderColor: colors.primary,
        },
      ]}
      onPress={() => toggleNotificationChannel('app')}
    >
      <Ionicons
        name={notificationChannels.includes('app') ? 'checkbox' : 'square-outline'}
        size={20}
        color={notificationChannels.includes('app') ? colors.primary : colors.textSecondary}
      />
      <Text style={[styles.channelText, { color: colors.text }]}>App</Text>
    </TouchableOpacity>
    {/* Email e SMS similares */}
  </View>
</View>
```

### 7. **Mensagens com Toast** ✅
```typescript
// ANTES
Alert.alert('Sucesso', 'Transação recorrente criada!', [
  { text: 'OK', onPress: () => navigation.goBack() },
]);

// DEPOIS
showSuccess('Transação recorrente criada com sucesso!');
navigation.goBack();
```

### 8. **Loading State** ✅
```typescript
// ANTES
if (dataLoading) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    </SafeAreaView>
  );
}

// DEPOIS
if (dataLoading) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LoadingSpinner />
    </SafeAreaView>
  );
}
```

### 9. **Botões de Ação** ✅
```typescript
// ANTES
<View style={styles.buttonContainer}>
  <Button title="Cancelar" onPress={() => navigation.goBack()} variant="outline" />
  <Button title={loading ? "Criando..." : "Criar"} onPress={handleSubmit} variant="primary" loading={loading} disabled={loading} />
</View>

// DEPOIS
<View style={styles.buttonContainer}>
  <Button
    title="Cancelar"
    onPress={() => navigation.goBack()}
    variant="outline"
    style={{ flex: 1 }}
  />
  <Button
    title="Salvar"
    onPress={handleSubmit}
    variant="primary"
    loading={loading}
    disabled={loading}
    style={{ flex: 1 }}
  />
</View>
```

### 10. **Payload Completo no Submit** ✅
```typescript
const payload: any = {
  type: formData.type,
  description: formData.description,
  amount,
  categoryId: parseInt(formData.categoryId),
  accountId: parseInt(formData.accountId),
  frequency: formData.frequency,
  interval: parseInt(formData.interval) || 1,              // ✅ NOVO
  startDate: parseDate(formData.startDate),
  notifyBeforeDays: parseInt(formData.notifyBeforeDays) || 1,  // ✅ NOVO
  notificationChannels,                                    // ✅ NOVO
};

if (formData.endDate.trim()) {
  payload.endDate = parseDate(formData.endDate);          // ✅ NOVO
}

if (formData.maxOccurrences.trim()) {
  payload.maxOccurrences = parseInt(formData.maxOccurrences); // ✅ NOVO
}
```

## Melhorias de UX

1. **Texto de ajuda no intervalo**: Mostra "Repetir a cada X dia(s)/semana(s)/mês(es)/ano(s)"
2. **Opções de notificação**: Botões para 1, 2, 3 ou 7 dias antes
3. **Canais de notificação**: Checkboxes visuais para App, Email e SMS
4. **Campos opcionais claramente marcados**: "Data de Término (Opcional)", "Máximo de Ocorrências (Opcional)"
5. **Título mais curto**: "Nova Recorrência" em vez de "Nova Transação Recorrente"

## Padrões Seguidos

✅ SafeAreaView com backgroundColor dinâmica
✅ Header com botão voltar, título centralizado e placeholder
✅ useTheme() para cores dinâmicas (suporte a tema claro/escuro)
✅ useToast() para mensagens de sucesso/erro
✅ LoadingSpinner componente padrão
✅ Cards com backgroundColor e elevation
✅ Botões com estados ativos usando cores do tema
✅ ScrollView com contentContainerStyle
✅ Espaçamento usando constantes SPACING
✅ Inputs com placeholder e formatação
✅ Validação de formulário antes do submit

## Resultado

A tela agora está **100% alinhada** com o padrão de layout usado em todas as outras telas do aplicativo (Loans, Debts, Accounts, etc.), com:
- ✅ Tema dinâmico funcionando
- ✅ Todos os campos necessários
- ✅ Layout consistente
- ✅ UX melhorada
- ✅ Código limpo e organizado

A tela está pronta para produção! 🎉
