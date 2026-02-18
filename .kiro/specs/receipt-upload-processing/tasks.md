# Tasks: Upload e Processamento de Recibos com OCR/IA

## Fase 1: Backend - Endpoint de Processamento

### 1.1 Criar Serviço de Processamento
- [ ] Criar `backend/src/domain/services/receipt-processing.service.ts`
  - [ ] Método `processReceipt()` - orquestrar processamento completo
  - [ ] Método `validateFile()` - validar tipo e tamanho
  - [ ] Método `saveFile()` - salvar arquivo no sistema
  - [ ] Método `generateSuggestions()` - gerar sugestões de descrição/conta
  - [ ] Tratamento de erros específicos
  - [ ] Logging detalhado

### 1.2 Criar Controller de Processamento
- [ ] Adicionar método `processReceipt()` em `backend/src/api/controllers/receipts.controller.ts`
  - [ ] Receber arquivo (multipart ou base64)
  - [ ] Validar autenticação
  - [ ] Chamar serviço de processamento
  - [ ] Retornar dados extraídos
  - [ ] Tratamento de erros

### 1.3 Configurar Middleware de Upload
- [ ] Criar `backend/src/api/middlewares/upload.ts`
  - [ ] Configurar multer com memoryStorage
  - [ ] Validar tipo de arquivo
  - [ ] Validar tamanho (5MB)
  - [ ] Tratamento de erros

### 1.4 Adicionar Rota de Processamento
- [ ] Atualizar `backend/src/api/routes/receipts.ts`
  - [ ] Adicionar `POST /api/receipts/process`
  - [ ] Aplicar middleware de autenticação
  - [ ] Aplicar middleware de upload
  - [ ] Aplicar rate limiting (10 req/min)

### 1.5 Instalar Dependências
- [ ] Instalar `multer` para upload de arquivos
- [ ] Instalar `sharp` para compressão de imagens (opcional)
- [ ] Instalar `file-type` para validação de magic bytes
- [ ] Instalar `sanitize-filename` para sanitização

### 1.6 Testes Backend
- [ ] Criar testes unitários para `ReceiptProcessingService`
  - [ ] Teste de validação de arquivo
  - [ ] Teste de salvamento de arquivo
  - [ ] Teste de geração de sugestões
- [ ] Criar testes de integração para endpoint
  - [ ] Teste de upload com sucesso
  - [ ] Teste de arquivo inválido
  - [ ] Teste de arquivo muito grande
  - [ ] Teste sem autenticação

## Fase 2: Frontend Web - Interface de Upload

### 2.1 Criar Componente de Botão de Upload
- [ ] Criar `frontend/src/features/transactions/components/ReceiptUploadButton.tsx`
  - [ ] Botão com ícone de câmera/upload
  - [ ] Abrir modal ao clicar
  - [ ] Estado de desabilitado durante processamento

### 2.2 Criar Modal de Upload
- [ ] Criar `frontend/src/features/transactions/components/ReceiptUploadModal.tsx`
  - [ ] 3 tabs: Câmera, Upload, Arrastar
  - [ ] Tab Câmera: integração com `react-webcam`
  - [ ] Tab Upload: input de arquivo
  - [ ] Tab Arrastar: integração com `react-dropzone`
  - [ ] Preview da imagem/PDF
  - [ ] Botão "Processar Recibo"
  - [ ] Loading state com spinner
  - [ ] Mensagens de erro

### 2.3 Criar Formulário de Confirmação
- [ ] Criar `frontend/src/features/transactions/components/ReceiptConfirmationForm.tsx`
  - [ ] Layout com preview do recibo + formulário
  - [ ] Campos editáveis: valor, categoria, descrição, data, conta
  - [ ] Indicador de confiança visual
  - [ ] Validações de campos obrigatórios
  - [ ] Botão "Confirmar e Registrar"
  - [ ] Botão "Cancelar"

### 2.4 Criar Visualizador de Recibos
- [ ] Criar `frontend/src/features/transactions/components/ReceiptViewer.tsx`
  - [ ] Modal com preview
  - [ ] Zoom para imagens
  - [ ] Visualizador de PDF (react-pdf)
  - [ ] Botão de download
  - [ ] Botão de fechar

### 2.5 Integrar com Formulário de Transação
- [ ] Atualizar `frontend/src/features/transactions/pages/TransactionFormPage.tsx`
  - [ ] Adicionar `ReceiptUploadButton`
  - [ ] Gerenciar estado do recibo
  - [ ] Passar dados extraídos para formulário
  - [ ] Incluir `receiptPath` ao salvar transação

### 2.6 Adicionar Ícone de Recibo na Lista
- [ ] Atualizar `frontend/src/features/transactions/components/TransactionList.tsx`
  - [ ] Mostrar ícone de recibo em transações que têm anexo
  - [ ] Ao clicar, abrir `ReceiptViewer`

### 2.7 Instalar Dependências Frontend
- [ ] Instalar `react-dropzone` para drag & drop
- [ ] Instalar `react-webcam` para captura de webcam
- [ ] Instalar `react-pdf` para visualização de PDF
- [ ] Instalar `react-image-crop` para crop (opcional)

### 2.8 Testes Frontend
- [ ] Criar testes para `ReceiptUploadButton`
- [ ] Criar testes para `ReceiptUploadModal`
- [ ] Criar testes para `ReceiptConfirmationForm`
- [ ] Criar testes de integração do fluxo completo

## Fase 3: Mobile - Interface de Captura

### 3.1 Criar Botão de Captura
- [ ] Criar `mobile/src/components/ReceiptCaptureButton.tsx`
  - [ ] Botão com ícone de câmera
  - [ ] Action sheet: "Tirar Foto" | "Galeria" | "Cancelar"
  - [ ] Solicitar permissões se necessário

### 3.2 Criar Tela de Câmera
- [ ] Criar `mobile/src/screens/receipts/CameraScreen.tsx`
  - [ ] Câmera em tela cheia (expo-camera)
  - [ ] Botão de captura
  - [ ] Toggle de flash
  - [ ] Botão voltar
  - [ ] Após captura: preview com crop

### 3.3 Criar Tela de Processamento
- [ ] Criar `mobile/src/screens/receipts/ProcessingScreen.tsx`
  - [ ] Loading com animação
  - [ ] Mensagem "Analisando recibo..."
  - [ ] Botão cancelar (opcional)

### 3.4 Criar Tela de Confirmação
- [ ] Criar `mobile/src/screens/receipts/ReceiptConfirmationScreen.tsx`
  - [ ] Thumbnail do recibo
  - [ ] Indicador de confiança
  - [ ] Formulário editável: valor, categoria, descrição, data, conta
  - [ ] Validações
  - [ ] Botão "Confirmar e Registrar"
  - [ ] Botão voltar

### 3.5 Criar Tela de Visualização
- [ ] Criar `mobile/src/screens/receipts/ReceiptViewerScreen.tsx`
  - [ ] Visualização de imagem com zoom/pan
  - [ ] Visualizador de PDF
  - [ ] Botão de compartilhar
  - [ ] Botão de download
  - [ ] Botão voltar

### 3.6 Integrar com Formulário de Transação
- [ ] Atualizar `mobile/src/screens/forms/TransactionFormScreen.tsx`
  - [ ] Adicionar `ReceiptCaptureButton`
  - [ ] Gerenciar estado do recibo
  - [ ] Navegar para tela de confirmação após processamento
  - [ ] Incluir `receiptPath` ao salvar

### 3.7 Adicionar Ícone na Lista de Transações
- [ ] Atualizar `mobile/src/screens/transactions/TransactionsScreen.tsx`
  - [ ] Mostrar ícone de recibo em transações que têm anexo
  - [ ] Ao clicar, navegar para `ReceiptViewerScreen`

### 3.8 Configurar Permissões
- [ ] Atualizar `mobile/app.json`
  - [ ] Adicionar permissões de câmera (iOS e Android)
  - [ ] Adicionar permissões de galeria
  - [ ] Adicionar descrições de uso

### 3.9 Instalar Dependências Mobile
- [ ] Instalar `expo-camera` para câmera nativa
- [ ] Instalar `expo-image-picker` para galeria
- [ ] Instalar `react-native-image-crop-picker` para crop
- [ ] Instalar `react-native-image-zoom-viewer` para zoom
- [ ] Instalar `react-native-pdf` para visualização de PDF

### 3.10 Testes Mobile
- [ ] Criar testes para `ReceiptCaptureButton`
- [ ] Criar testes para `CameraScreen`
- [ ] Criar testes para `ReceiptConfirmationScreen`
- [ ] Testar em iOS e Android

## Fase 4: Melhorias e Otimizações

### 4.1 Compressão de Imagens
- [ ] Implementar compressão automática no backend
  - [ ] Usar `sharp` para redimensionar
  - [ ] Qualidade configurável via env
  - [ ] Máximo 1920px de largura/altura

### 4.2 Cache de Resultados
- [ ] Implementar cache de processamento
  - [ ] Usar hash do arquivo como chave
  - [ ] TTL de 1 hora
  - [ ] Evitar reprocessar mesmo arquivo

### 4.3 Validação de Magic Bytes
- [ ] Implementar validação de tipo real
  - [ ] Usar `file-type` para verificar magic bytes
  - [ ] Não confiar apenas em extensão

### 4.4 Rate Limiting
- [ ] Implementar rate limiting no endpoint
  - [ ] 10 uploads por minuto por usuário
  - [ ] Mensagem de erro clara

### 4.5 Monitoramento
- [ ] Adicionar métricas Prometheus
  - [ ] Tempo de processamento
  - [ ] Taxa de erro
  - [ ] Confiança média
  - [ ] Uso de OCR vs AI

### 4.6 Logging
- [ ] Adicionar logs estruturados
  - [ ] Log de início de processamento
  - [ ] Log de resultado (sucesso/erro)
  - [ ] Log de confiança
  - [ ] Log de método usado (OCR/AI)

## Fase 5: Testes e Validação

### 5.1 Testes com Recibos Reais
- [ ] Coletar 20+ recibos angolanos reais
  - [ ] Supermercados
  - [ ] Restaurantes
  - [ ] Postos de combustível
  - [ ] Farmácias
  - [ ] Outros estabelecimentos

### 5.2 Validar Precisão
- [ ] Testar OCR básico
  - [ ] Medir taxa de acerto de valor
  - [ ] Medir taxa de acerto de categoria
  - [ ] Medir taxa de acerto de data
- [ ] Testar OpenAI (se configurado)
  - [ ] Comparar com OCR básico
  - [ ] Medir melhoria de precisão

### 5.3 Testes de Performance
- [ ] Medir tempo de processamento
  - [ ] OCR básico: < 3 segundos
  - [ ] OpenAI: < 10 segundos
- [ ] Testar com arquivos grandes (5MB)
- [ ] Testar com múltiplos uploads simultâneos

### 5.4 Testes de Usabilidade
- [ ] Testar fluxo completo no web
- [ ] Testar fluxo completo no mobile
- [ ] Coletar feedback de usuários
- [ ] Ajustar UX baseado em feedback

### 5.5 Testes de Segurança
- [ ] Testar upload de arquivo malicioso
- [ ] Testar path traversal
- [ ] Testar rate limiting
- [ ] Testar autenticação

## Fase 6: Documentação

### 6.1 Documentação de Usuário
- [ ] Criar guia "Como usar recibos"
  - [ ] Web: como fazer upload
  - [ ] Mobile: como tirar foto
  - [ ] Como confirmar dados
  - [ ] Como visualizar recibos

### 6.2 Documentação Técnica
- [ ] Documentar endpoint `/api/receipts/process`
  - [ ] Request format
  - [ ] Response format
  - [ ] Códigos de erro
- [ ] Documentar variáveis de ambiente
- [ ] Documentar dependências

### 6.3 Troubleshooting
- [ ] Criar guia de problemas comuns
  - [ ] "Arquivo muito grande"
  - [ ] "Tipo não suportado"
  - [ ] "Erro ao processar"
  - [ ] "Baixa confiança"

## Fase 7: Deploy e Monitoramento

### 7.1 Configuração de Produção
- [ ] Configurar variáveis de ambiente
  - [ ] `OPENAI_API_KEY` (opcional)
  - [ ] `RECEIPT_UPLOAD_PATH`
  - [ ] `RECEIPT_MAX_SIZE`
- [ ] Criar diretório de uploads
- [ ] Configurar permissões de arquivo

### 7.2 Deploy Backend
- [ ] Deploy do novo endpoint
- [ ] Verificar logs
- [ ] Testar em produção

### 7.3 Deploy Frontend
- [ ] Build e deploy do web
- [ ] Verificar funcionamento

### 7.4 Deploy Mobile
- [ ] Build para iOS (TestFlight)
- [ ] Build para Android (Play Store)
- [ ] Testar em dispositivos reais

### 7.5 Monitoramento Inicial
- [ ] Monitorar taxa de uso
- [ ] Monitorar taxa de erro
- [ ] Monitorar custos (se OpenAI)
- [ ] Coletar feedback inicial

## Notas de Implementação

### Prioridades
1. **Alta:** Fase 1 (Backend) - Base para tudo
2. **Alta:** Fase 2 (Frontend Web) - Mais fácil de testar
3. **Média:** Fase 3 (Mobile) - Reutiliza lógica do web
4. **Baixa:** Fase 4 (Otimizações) - Pode ser feito depois
5. **Baixa:** Fase 5-7 (Testes, Docs, Deploy) - Contínuo

### Dependências
- Fase 2 depende de Fase 1
- Fase 3 depende de Fase 1
- Fase 4-7 dependem de Fase 1-3

### Estimativas
- Fase 1: 1-2 dias
- Fase 2: 2-3 dias
- Fase 3: 3-4 dias
- Fase 4: 1 dia
- Fase 5: 1-2 dias
- Fase 6: 1 dia
- Fase 7: 1 dia

**Total: 10-16 dias de desenvolvimento**

### Riscos
- OpenAI API pode estar indisponível → Usar OCR básico como fallback
- Recibos angolanos podem ter formatos únicos → Coletar amostras e ajustar
- Performance pode ser lenta → Implementar cache e compressão
- Custos da OpenAI podem ser altos → Monitorar e limitar uso

---

**Status:** Pronto para implementação  
**Próximo passo:** Começar pela Fase 1 (Backend)
