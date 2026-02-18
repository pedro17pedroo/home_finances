# Análise: Sistema de OCR e IA para Processamento de Recibos

## Status Atual do Projeto

### ✅ O QUE JÁ EXISTE (Backend)

#### 1. Serviços de Processamento
O projeto já possui **3 serviços completos** para processamento de recibos:

**a) `ReceiptOCRService` (receipt-ocr.service.ts)**
- Extração básica usando regex patterns
- Não requer API externa (gratuito)
- Identifica: valor, data, estabelecimento, categoria
- Confiança máxima: 70%
- Suporta texto em português (Angola)
- Inferência de categoria baseada em palavras-chave

**b) `ReceiptAIService` (receipt-ai.service.ts)**
- Usa OpenAI GPT-4 Vision API
- Análise avançada de imagens
- Extrai: valor, categoria, estabelecimento, data, itens
- Confiança até 90%+
- Fallback automático para OCR básico se API falhar
- Prompt otimizado para recibos angolanos

**c) `SimpleReceiptAIService` (receipt-ai-simple.service.ts)**
- Versão simplificada do AI Service
- Menor consumo de tokens
- Resposta mais rápida
- Mesma funcionalidade core

#### 2. Armazenamento de Recibos
- Schema de banco de dados já suporta recibos:
  - `receiptPath`: caminho do arquivo
  - `receiptMimeType`: tipo do arquivo (image/*, application/pdf)
  - `receiptOriginalName`: nome original
  - `receiptFileSize`: tamanho do arquivo
- Pasta de uploads configurada: `uploads/receipts/`

#### 3. API de Recibos (receipts.controller.ts)
Endpoints já implementados:
- `GET /api/receipts/:transactionId/view` - Visualizar recibo
- `GET /api/receipts/:transactionId/download` - Baixar recibo
- `GET /api/receipts/:transactionId/info` - Info do recibo
- `GET /api/receipts/` - Listar transações com recibos

#### 4. Integração WhatsApp
- Sistema já processa recibos enviados via WhatsApp
- Usa os serviços de OCR/AI automaticamente
- Cria transações baseadas nos dados extraídos

### ❌ O QUE FALTA IMPLEMENTAR

#### 1. Frontend Web (React)
**Não existe interface para:**
- Upload de recibos ao criar/editar transação
- Captura de foto via webcam
- Preview do recibo antes de enviar
- Visualização dos dados extraídos para confirmação
- Ajuste manual dos dados extraídos
- Visualização de recibos anexados

#### 2. Mobile (React Native)
**Não existe interface para:**
- Upload de recibos da galeria
- Captura de foto com câmera
- Preview e crop da imagem
- Visualização dos dados extraídos
- Confirmação e ajuste dos dados
- Visualização de recibos anexados

#### 3. Backend - Endpoint de Upload
**Falta criar:**
- Endpoint para upload direto de recibos
- Processamento síncrono/assíncrono
- Retorno dos dados extraídos para confirmação
- Validação de tipos de arquivo
- Limite de tamanho de arquivo

## Arquitetura Proposta

### Fluxo de Processamento

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO (Web/Mobile)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. CAPTURA/UPLOAD                                           │
│  - Tirar foto (câmera)                                       │
│  - Selecionar da galeria                                     │
│  - Upload de PDF                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ENVIO PARA BACKEND                                       │
│  POST /api/receipts/process                                  │
│  - Imagem/PDF em base64 ou multipart                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. PROCESSAMENTO (Backend)                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ A. Validação                                         │   │
│  │ - Tipo de arquivo (image/*, application/pdf)        │   │
│  │ - Tamanho máximo (5MB)                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ B. Extração de Dados                                 │   │
│  │                                                       │   │
│  │ Opção 1: OpenAI GPT-4 Vision (se configurado)       │   │
│  │ - Alta precisão (80-95%)                             │   │
│  │ - Custo por requisição                               │   │
│  │                                                       │   │
│  │ Opção 2: OCR Básico (fallback)                       │   │
│  │ - Precisão média (30-70%)                            │   │
│  │ - Gratuito                                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ C. Inferência de Categoria                           │   │
│  │ - Mapear categoria baseada em:                       │   │
│  │   * Estabelecimento                                   │   │
│  │   * Itens comprados                                   │   │
│  │   * Palavras-chave                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ D. Salvar Arquivo                                     │   │
│  │ - uploads/receipts/receipt_{userId}_{timestamp}.ext  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. RETORNO PARA FRONTEND                                    │
│  {                                                            │
│    "extractedData": {                                         │
│      "amount": 9120.00,                                       │
│      "category": "alimentacao",                               │
│      "merchant": "Supermercado Exemplo",                      │
│      "date": "2024-12-18",                                    │
│      "confidence": 0.85                                       │
│    },                                                         │
│    "receiptPath": "receipt_1_1234567890.jpg",                │
│    "suggestions": {                                           │
│      "description": "Supermercado Exemplo em 2024-12-18"     │
│    }                                                          │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. CONFIRMAÇÃO DO USUÁRIO                                   │
│  - Mostrar dados extraídos                                   │
│  - Permitir edição:                                          │
│    * Valor                                                    │
│    * Categoria                                                │
│    * Descrição                                                │
│    * Data                                                     │
│    * Conta                                                    │
│  - Botão "Confirmar e Registrar"                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  6. REGISTRO DA TRANSAÇÃO                                    │
│  POST /api/transactions                                       │
│  - Dados confirmados/editados                                │
│  - Referência ao recibo salvo                                │
└─────────────────────────────────────────────────────────────┘
```

## Especificação Técnica

### Backend - Novo Endpoint

#### POST /api/receipts/process

**Request:**
```typescript
{
  "image": "base64_string" | File (multipart),
  "mimeType": "image/jpeg" | "image/png" | "application/pdf",
  "useAI": boolean // true = OpenAI, false = OCR básico
}
```

**Response:**
```typescript
{
  "status": "success",
  "data": {
    "extractedData": {
      "amount": number,
      "category": string,
      "merchant": string,
      "date": string, // YYYY-MM-DD
      "confidence": number, // 0-1
      "items": string[] // opcional
    },
    "receiptPath": string,
    "receiptUrl": string, // URL para visualização
    "suggestions": {
      "description": string,
      "account": number // ID da conta sugerida
    }
  }
}
```

### Frontend Web - Componentes Necessários

#### 1. ReceiptUploadButton
- Botão para abrir modal de upload
- Ícone de câmera/upload

#### 2. ReceiptUploadModal
- Tabs: "Câmera" | "Upload" | "Arrastar"
- Preview da imagem
- Botão "Processar"
- Loading state durante processamento

#### 3. ReceiptDataConfirmation
- Formulário pré-preenchido com dados extraídos
- Indicador de confiança
- Campos editáveis
- Preview do recibo ao lado
- Botão "Confirmar e Registrar"

#### 4. ReceiptViewer
- Visualização de recibos anexados
- Zoom, download
- Integração com transações

### Mobile - Componentes Necessários

#### 1. ReceiptCaptureScreen
- Botões: "Tirar Foto" | "Galeria"
- Uso de `expo-image-picker`
- Crop e ajuste da imagem
- Preview antes de enviar

#### 2. ReceiptProcessingScreen
- Loading com animação
- Mensagem: "Analisando recibo..."
- Cancelar processamento

#### 3. ReceiptConfirmationScreen
- Dados extraídos em cards
- Formulário de edição
- Preview do recibo (thumbnail)
- Botão "Confirmar"

#### 4. ReceiptViewerScreen
- Visualização de recibos anexados
- Zoom, compartilhar
- Lista de transações com recibos

## Categorias Suportadas

O sistema já mapeia automaticamente para estas categorias:

1. **alimentacao** - Supermercados, restaurantes, padarias
2. **transporte** - Combustível, taxi, transporte público
3. **saude** - Farmácias, hospitais, clínicas
4. **educacao** - Escolas, universidades, livros
5. **lazer** - Cinema, bares, entretenimento
6. **moradia** - Aluguel, contas de casa
7. **outros** - Categoria padrão

## Configuração Necessária

### Variáveis de Ambiente (.env)

```bash
# OpenAI API (opcional - se não configurado, usa OCR básico)
OPENAI_API_KEY=sk-...

# Upload de recibos
RECEIPT_UPLOAD_PATH=uploads/receipts
RECEIPT_MAX_SIZE=5242880 # 5MB em bytes
RECEIPT_ALLOWED_TYPES=image/jpeg,image/png,image/jpg,application/pdf

# WhatsApp (já configurado)
WHATSAPP_MEDIA_UPLOAD_PATH=uploads/receipts
```

## Dependências Necessárias

### Backend
```json
{
  "multer": "^1.4.5-lts.1", // Upload de arquivos
  "sharp": "^0.33.0" // Processamento de imagens (opcional)
}
```

### Frontend Web
```json
{
  "react-dropzone": "^14.2.3", // Drag & drop
  "react-webcam": "^7.2.0" // Captura de webcam
}
```

### Mobile
```json
{
  "expo-image-picker": "~14.7.1", // Câmera e galeria
  "expo-camera": "~14.1.3", // Câmera nativa
  "react-native-image-crop-picker": "^0.40.0" // Crop de imagens
}
```

## Melhorias Futuras

### Fase 1 (Atual)
- ✅ Serviços de OCR e AI implementados
- ✅ Armazenamento de recibos
- ✅ API de visualização
- ❌ Interface web
- ❌ Interface mobile

### Fase 2 (Próxima)
- Processamento em lote (múltiplos recibos)
- OCR offline (Tesseract.js)
- Compressão automática de imagens
- Cache de resultados

### Fase 3 (Futuro)
- Treinamento de modelo próprio
- Reconhecimento de estabelecimentos recorrentes
- Sugestões baseadas em histórico
- Detecção de duplicatas

## Estimativa de Custos

### OpenAI GPT-4 Vision
- Custo: ~$0.01 - $0.03 por imagem
- Para 1000 recibos/mês: ~$10-30/mês
- Precisão: 80-95%

### OCR Básico (Fallback)
- Custo: $0 (gratuito)
- Precisão: 30-70%
- Sempre disponível como backup

## Recomendações

1. **Implementar interface web primeiro** - Mais fácil de testar
2. **Usar OCR básico inicialmente** - Sem custos, validar fluxo
3. **Adicionar OpenAI depois** - Quando validado, melhorar precisão
4. **Mobile em seguida** - Reutilizar lógica do web
5. **Monitorar uso** - Controlar custos da API OpenAI

## Próximos Passos

Para implementar esta funcionalidade, devemos:

1. **Criar spec detalhada** em `.kiro/specs/receipt-upload-processing/`
2. **Implementar endpoint de upload** no backend
3. **Criar componentes web** para upload e confirmação
4. **Criar telas mobile** para captura e confirmação
5. **Testes** com recibos reais angolanos
6. **Documentação** para usuários finais

---

**Conclusão:** O projeto já tem 70% da funcionalidade implementada no backend. Falta apenas criar as interfaces de usuário (web e mobile) e o endpoint de upload/processamento.
