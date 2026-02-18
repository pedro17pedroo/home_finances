# Design: Upload e Processamento de Recibos com OCR/IA

## Visão Geral da Solução

Sistema que permite upload/captura de recibos (fotos ou PDFs), processa automaticamente usando OCR/IA para extrair informações, e apresenta dados para confirmação antes de registrar a transação.

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend Web (React)          │  Mobile (React Native)     │
│  - ReceiptUploadButton         │  - ReceiptCaptureButton    │
│  - ReceiptUploadModal          │  - CameraScreen            │
│  - ReceiptConfirmationForm     │  - GalleryPicker           │
│  - ReceiptViewer               │  - ConfirmationScreen      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CAMADA DE API                           │
├─────────────────────────────────────────────────────────────┤
│  POST   /api/receipts/process    - Processar recibo         │
│  GET    /api/receipts/:id/view   - Visualizar recibo        │
│  GET    /api/receipts/:id/download - Baixar recibo          │
│  GET    /api/receipts/:id/info   - Info do recibo           │
│  GET    /api/receipts/           - Listar com recibos       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   CAMADA DE SERVIÇOS                         │
├─────────────────────────────────────────────────────────────┤
│  ReceiptProcessingService                                    │
│  ├─ processReceipt()                                         │
│  ├─ validateFile()                                           │
│  ├─ saveFile()                                               │
│  └─ generateSuggestions()                                    │
│                                                               │
│  ReceiptAIService (já existe)                                │
│  ├─ extractReceiptData()                                     │
│  ├─ normalizeCategory()                                      │
│  └─ generateDescription()                                    │
│                                                               │
│  ReceiptOCRService (já existe)                               │
│  ├─ extractReceiptData()                                     │
│  ├─ parseReceiptText()                                       │
│  └─ inferCategory()                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  CAMADA DE PERSISTÊNCIA                      │
├─────────────────────────────────────────────────────────────┤
│  TransactionRepository                                       │
│  - Salvar transação com receiptPath                          │
│                                                               │
│  FileSystem                                                  │
│  - uploads/receipts/receipt_{userId}_{timestamp}.{ext}      │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Detalhados

### 1. Backend - Novo Endpoint de Processamento

#### 1.1 Controller: `ReceiptsController.processReceipt()`

**Responsabilidades:**
- Receber arquivo (multipart ou base64)
- Validar tipo e tamanho
- Chamar serviço de processamento
- Retornar dados extraídos

**Assinatura:**
```typescript
static async processReceipt(req: Request, res: Response, next: NextFunction): Promise<void>
```

**Request:**
```typescript
// Multipart form-data
{
  file: File, // Arquivo do recibo
  useAI?: boolean // true = OpenAI, false = OCR básico
}

// OU Base64
{
  image: string, // base64 string
  mimeType: string, // image/jpeg, image/png, application/pdf
  useAI?: boolean
}
```

**Response:**
```typescript
{
  status: "success",
  data: {
    extractedData: {
      amount: number,
      category: string,
      merchant: string,
      date: string, // YYYY-MM-DD
      confidence: number, // 0-1
      items?: string[]
    },
    receiptPath: string, // Caminho relativo
    receiptUrl: string, // URL completa para visualização
    suggestions: {
      description: string,
      accountId?: number
    }
  }
}
```

**Validações:**
- Tipo de arquivo: JPG, PNG, PDF
- Tamanho máximo: 5MB
- Usuário autenticado
- Rate limiting: 10 uploads/minuto

#### 1.2 Service: `ReceiptProcessingService`

**Novo serviço para orquestrar o processamento:**

```typescript
export class ReceiptProcessingService {
  /**
   * Processar recibo completo
   */
  static async processReceipt(
    file: Buffer,
    mimeType: string,
    userId: number,
    useAI: boolean = false
  ): Promise<ProcessedReceiptData> {
    // 1. Validar arquivo
    this.validateFile(file, mimeType);
    
    // 2. Salvar arquivo
    const receiptPath = await this.saveFile(file, mimeType, userId);
    
    // 3. Extrair dados (AI ou OCR)
    const extractedData = useAI && process.env.OPENAI_API_KEY
      ? await ReceiptAIService.extractReceiptData(file, mimeType)
      : await ReceiptOCRService.extractReceiptData(file, mimeType);
    
    // 4. Gerar sugestões
    const suggestions = this.generateSuggestions(extractedData, userId);
    
    // 5. Retornar resultado
    return {
      extractedData,
      receiptPath,
      receiptUrl: `/api/receipts/view/${receiptPath}`,
      suggestions
    };
  }

  /**
   * Validar arquivo
   */
  private static validateFile(file: Buffer, mimeType: string): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(mimeType)) {
      throw new ValidationError('Tipo de arquivo não suportado');
    }

    if (file.length > maxSize) {
      throw new ValidationError('Arquivo muito grande (máximo 5MB)');
    }
  }

  /**
   * Salvar arquivo no sistema
   */
  private static async saveFile(
    file: Buffer,
    mimeType: string,
    userId: number
  ): Promise<string> {
    const ext = mimeType.split('/')[1];
    const timestamp = Date.now();
    const filename = `receipt_${userId}_${timestamp}.${ext}`;
    const uploadPath = process.env.RECEIPT_UPLOAD_PATH || 'uploads/receipts';
    const fullPath = path.join(uploadPath, filename);

    // Criar diretório se não existir
    await fs.mkdir(uploadPath, { recursive: true });

    // Salvar arquivo
    await fs.writeFile(fullPath, file);

    return filename;
  }

  /**
   * Gerar sugestões baseadas nos dados extraídos
   */
  private static async generateSuggestions(
    data: ExtractedReceiptData,
    userId: number
  ): Promise<Suggestions> {
    // Descrição sugerida
    const description = data.merchant
      ? `${data.merchant}${data.date ? ` em ${data.date}` : ''}`
      : 'Despesa via recibo';

    // Sugerir conta baseada em histórico (futuro)
    // Por agora, retornar conta padrão do usuário
    const accounts = await AccountRepository.findByUserId(userId);
    const defaultAccount = accounts.find(a => a.type === 'corrente') || accounts[0];

    return {
      description,
      accountId: defaultAccount?.id
    };
  }
}
```

#### 1.3 Rotas

```typescript
// backend/src/api/routes/receipts.ts

// Adicionar nova rota
router.post("/process", 
  authenticate, 
  upload.single('file'), // Multer middleware
  ReceiptsController.processReceipt
);
```

#### 1.4 Middleware de Upload

```typescript
// backend/src/api/middlewares/upload.ts

import multer from 'multer';

const storage = multer.memoryStorage(); // Armazenar em memória para processar

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'));
    }
  }
});

export default upload;
```

### 2. Frontend Web - Componentes React

#### 2.1 ReceiptUploadButton

**Localização:** `frontend/src/features/transactions/components/ReceiptUploadButton.tsx`

**Props:**
```typescript
interface ReceiptUploadButtonProps {
  onReceiptProcessed: (data: ProcessedReceiptData) => void;
  disabled?: boolean;
}
```

**Funcionalidade:**
- Botão com ícone de câmera/upload
- Abre modal ao clicar
- Desabilitado durante processamento

#### 2.2 ReceiptUploadModal

**Localização:** `frontend/src/features/transactions/components/ReceiptUploadModal.tsx`

**Estado:**
```typescript
interface ModalState {
  isOpen: boolean;
  activeTab: 'camera' | 'upload' | 'drag';
  file: File | null;
  preview: string | null;
  isProcessing: boolean;
  error: string | null;
}
```

**Funcionalidade:**
- 3 tabs: Câmera (webcam), Upload, Arrastar
- Preview da imagem/PDF
- Botão "Processar Recibo"
- Loading state com spinner
- Mensagens de erro

**Bibliotecas:**
- `react-webcam` - Captura de webcam
- `react-dropzone` - Drag & drop
- `react-pdf` - Preview de PDF

#### 2.3 ReceiptConfirmationForm

**Localização:** `frontend/src/features/transactions/components/ReceiptConfirmationForm.tsx`

**Props:**
```typescript
interface ReceiptConfirmationFormProps {
  extractedData: ExtractedReceiptData;
  receiptUrl: string;
  suggestions: Suggestions;
  onConfirm: (data: TransactionFormData) => void;
  onCancel: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Dados Extraídos do Recibo                              │
│  Confiança: 85% ████████░░                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │                  │  │  Valor: 9.120,00 AOA     │   │
│  │   [Preview do    │  │  Categoria: Alimentação  │   │
│  │    Recibo]       │  │  Descrição: Supermercado │   │
│  │                  │  │  Data: 18/12/2024        │   │
│  │   [Zoom] [Download]  │  Conta: Conta Corrente   │   │
│  │                  │  │                          │   │
│  └──────────────────┘  │  [Editar campos acima]   │   │
│                         │                          │   │
│                         │  [Cancelar] [Confirmar]  │   │
│                         └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Validações:**
- Valor > 0
- Categoria selecionada
- Data válida
- Conta selecionada

#### 2.4 ReceiptViewer

**Localização:** `frontend/src/features/transactions/components/ReceiptViewer.tsx`

**Props:**
```typescript
interface ReceiptViewerProps {
  transactionId: number;
  receiptUrl: string;
  mimeType: string;
  originalName: string;
}
```

**Funcionalidade:**
- Modal com preview
- Zoom para imagens
- Visualizador de PDF integrado
- Botão de download
- Fechar modal

### 3. Mobile - Telas React Native

#### 3.1 ReceiptCaptureButton

**Localização:** `mobile/src/components/ReceiptCaptureButton.tsx`

**Props:**
```typescript
interface ReceiptCaptureButtonProps {
  onReceiptProcessed: (data: ProcessedReceiptData) => void;
  disabled?: boolean;
}
```

**Funcionalidade:**
- Botão flutuante ou inline
- Abre action sheet: "Tirar Foto" | "Galeria" | "Cancelar"
- Solicita permissões se necessário

#### 3.2 CameraScreen

**Localização:** `mobile/src/screens/receipts/CameraScreen.tsx`

**Funcionalidade:**
- Câmera em tela cheia
- Botão de captura
- Flash toggle
- Voltar
- Após captura: preview com crop

**Bibliotecas:**
- `expo-camera` - Câmera nativa
- `react-native-image-crop-picker` - Crop

#### 3.3 ReceiptConfirmationScreen

**Localização:** `mobile/src/screens/receipts/ReceiptConfirmationScreen.tsx`

**Layout:**
```
┌─────────────────────────────────┐
│  ← Confirmar Recibo             │
├─────────────────────────────────┤
│                                  │
│  ┌────────────────────────────┐ │
│  │   [Thumbnail do Recibo]    │ │
│  │   Confiança: 85%           │ │
│  └────────────────────────────┘ │
│                                  │
│  Valor                           │
│  ┌────────────────────────────┐ │
│  │ 9.120,00 AOA              │ │
│  └────────────────────────────┘ │
│                                  │
│  Categoria                       │
│  ┌────────────────────────────┐ │
│  │ Alimentação ▼             │ │
│  └────────────────────────────┘ │
│                                  │
│  Descrição                       │
│  ┌────────────────────────────┐ │
│  │ Supermercado Exemplo      │ │
│  └────────────────────────────┘ │
│                                  │
│  Data                            │
│  ┌────────────────────────────┐ │
│  │ 18/12/2024 📅             │ │
│  └────────────────────────────┘ │
│                                  │
│  Conta                           │
│  ┌────────────────────────────┐ │
│  │ Conta Corrente ▼          │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │   Confirmar e Registrar    │ │
│  └────────────────────────────┘ │
│                                  │
└─────────────────────────────────┘
```

#### 3.4 ReceiptViewerScreen

**Localização:** `mobile/src/screens/receipts/ReceiptViewerScreen.tsx`

**Funcionalidade:**
- Visualização de imagem com zoom/pan
- Visualizador de PDF
- Botão de compartilhar
- Botão de download
- Voltar

**Bibliotecas:**
- `react-native-image-zoom-viewer` - Zoom de imagens
- `react-native-pdf` - Visualizador de PDF

## Fluxo de Dados

### Fluxo de Upload (Web)

```typescript
// 1. Usuário seleciona arquivo
const handleFileSelect = (file: File) => {
  setFile(file);
  setPreview(URL.createObjectURL(file));
};

// 2. Usuário clica em "Processar"
const handleProcess = async () => {
  setIsProcessing(true);
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('useAI', 'true'); // ou false
    
    const response = await api.post('/receipts/process', formData);
    
    // 3. Recebe dados extraídos
    const { extractedData, receiptPath, suggestions } = response.data.data;
    
    // 4. Mostra formulário de confirmação
    setConfirmationData({
      ...extractedData,
      ...suggestions,
      receiptPath
    });
    
  } catch (error) {
    setError(error.message);
  } finally {
    setIsProcessing(false);
  }
};

// 5. Usuário confirma/edita e salva
const handleConfirm = async (formData: TransactionFormData) => {
  await api.post('/transactions', {
    ...formData,
    receiptPath: confirmationData.receiptPath
  });
  
  // Sucesso!
  toast.success('Transação registrada com sucesso!');
  navigate('/transactions');
};
```

### Fluxo de Captura (Mobile)

```typescript
// 1. Usuário tira foto
const handleCapture = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permissão necessária', 'Precisamos acessar sua câmera');
    return;
  }
  
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  
  if (!result.canceled) {
    processReceipt(result.assets[0]);
  }
};

// 2. Processar recibo
const processReceipt = async (image: ImageInfo) => {
  setIsProcessing(true);
  
  try {
    // Converter para base64
    const base64 = await FileSystem.readAsStringAsync(image.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const response = await api.post('/receipts/process', {
      image: base64,
      mimeType: 'image/jpeg',
      useAI: true
    });
    
    // 3. Navegar para tela de confirmação
    navigation.navigate('ReceiptConfirmation', {
      extractedData: response.data.data.extractedData,
      receiptPath: response.data.data.receiptPath,
      suggestions: response.data.data.suggestions
    });
    
  } catch (error) {
    Alert.alert('Erro', error.message);
  } finally {
    setIsProcessing(false);
  }
};
```

## Tratamento de Erros

### Backend

```typescript
// Erros específicos
class ReceiptProcessingError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400);
    this.details = details;
  }
}

// Tratamento no controller
try {
  const result = await ReceiptProcessingService.processReceipt(...);
  res.json({ status: 'success', data: result });
} catch (error) {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
  
  if (error instanceof ReceiptProcessingError) {
    return res.status(400).json({
      status: 'error',
      message: 'Erro ao processar recibo',
      details: error.details
    });
  }
  
  // Erro genérico
  logger.error('Erro inesperado:', error);
  res.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor'
  });
}
```

### Frontend

```typescript
// Mensagens de erro amigáveis
const ERROR_MESSAGES = {
  'FILE_TOO_LARGE': 'Arquivo muito grande. Máximo 5MB.',
  'INVALID_TYPE': 'Tipo de arquivo não suportado. Use JPG, PNG ou PDF.',
  'PROCESSING_FAILED': 'Não conseguimos processar o recibo. Tente novamente.',
  'LOW_CONFIDENCE': 'Não conseguimos extrair os dados com confiança. Verifique manualmente.',
  'NETWORK_ERROR': 'Erro de conexão. Verifique sua internet.',
};

// Tratamento
const handleError = (error: any) => {
  const errorCode = error.response?.data?.code || 'UNKNOWN';
  const message = ERROR_MESSAGES[errorCode] || 'Erro desconhecido';
  
  toast.error(message);
  
  // Log para debug
  console.error('Receipt processing error:', error);
};
```

## Performance e Otimizações

### 1. Compressão de Imagens

```typescript
// Antes de enviar, comprimir imagens grandes
import sharp from 'sharp';

const compressImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
};
```

### 2. Cache de Resultados

```typescript
// Cache de processamento (evitar reprocessar mesmo arquivo)
const cacheKey = `receipt:${userId}:${fileHash}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await processReceipt(...);
await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hora
```

### 3. Processamento Assíncrono (Futuro)

```typescript
// Para processamento pesado, usar fila
import Bull from 'bull';

const receiptQueue = new Bull('receipt-processing');

receiptQueue.process(async (job) => {
  const { file, userId } = job.data;
  const result = await ReceiptProcessingService.processReceipt(file, userId);
  
  // Notificar usuário via WebSocket
  io.to(userId).emit('receipt:processed', result);
});
```

## Segurança

### 1. Validação de Arquivos

```typescript
// Verificar magic bytes (não confiar apenas em extensão)
import fileType from 'file-type';

const validateFileType = async (buffer: Buffer): Promise<boolean> => {
  const type = await fileType.fromBuffer(buffer);
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  return type && allowed.includes(type.mime);
};
```

### 2. Sanitização de Nomes

```typescript
// Evitar path traversal
import sanitize from 'sanitize-filename';

const sanitizeFilename = (filename: string): string => {
  return sanitize(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
};
```

### 3. Rate Limiting

```typescript
// Limitar uploads por usuário
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 uploads
  message: 'Muitos uploads. Tente novamente em 1 minuto.'
});

router.post('/process', uploadLimiter, ...);
```

## Testes

### 1. Testes Unitários

```typescript
describe('ReceiptProcessingService', () => {
  describe('validateFile', () => {
    it('deve aceitar JPG válido', () => {
      const buffer = fs.readFileSync('test/fixtures/receipt.jpg');
      expect(() => validateFile(buffer, 'image/jpeg')).not.toThrow();
    });
    
    it('deve rejeitar arquivo muito grande', () => {
      const buffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      expect(() => validateFile(buffer, 'image/jpeg')).toThrow('muito grande');
    });
  });
  
  describe('processReceipt', () => {
    it('deve extrair dados de recibo válido', async () => {
      const buffer = fs.readFileSync('test/fixtures/receipt.jpg');
      const result = await processReceipt(buffer, 'image/jpeg', 1, false);
      
      expect(result.extractedData.amount).toBeGreaterThan(0);
      expect(result.extractedData.category).toBeDefined();
    });
  });
});
```

### 2. Testes de Integração

```typescript
describe('POST /api/receipts/process', () => {
  it('deve processar recibo com sucesso', async () => {
    const response = await request(app)
      .post('/api/receipts/process')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', 'test/fixtures/receipt.jpg')
      .expect(200);
    
    expect(response.body.status).toBe('success');
    expect(response.body.data.extractedData).toBeDefined();
  });
  
  it('deve rejeitar arquivo inválido', async () => {
    const response = await request(app)
      .post('/api/receipts/process')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', 'test/fixtures/invalid.txt')
      .expect(400);
    
    expect(response.body.status).toBe('error');
  });
});
```

## Monitoramento

### Métricas a Coletar

```typescript
// Prometheus metrics
const receiptProcessingDuration = new Histogram({
  name: 'receipt_processing_duration_seconds',
  help: 'Tempo de processamento de recibos',
  labelNames: ['method'] // 'ocr' ou 'ai'
});

const receiptProcessingErrors = new Counter({
  name: 'receipt_processing_errors_total',
  help: 'Total de erros no processamento',
  labelNames: ['error_type']
});

const receiptConfidence = new Histogram({
  name: 'receipt_extraction_confidence',
  help: 'Confiança na extração de dados',
  buckets: [0.3, 0.5, 0.7, 0.8, 0.9, 1.0]
});
```

## Configuração

### Variáveis de Ambiente

```bash
# .env
OPENAI_API_KEY=sk-...
RECEIPT_UPLOAD_PATH=uploads/receipts
RECEIPT_MAX_SIZE=5242880
RECEIPT_ALLOWED_TYPES=image/jpeg,image/png,application/pdf
RECEIPT_COMPRESSION_QUALITY=85
RECEIPT_MAX_DIMENSION=1920
```

## Dependências

### Backend
```json
{
  "multer": "^1.4.5-lts.1",
  "sharp": "^0.33.0",
  "file-type": "^18.0.0",
  "sanitize-filename": "^1.6.3"
}
```

### Frontend Web
```json
{
  "react-dropzone": "^14.2.3",
  "react-webcam": "^7.2.0",
  "react-pdf": "^7.5.1"
}
```

### Mobile
```json
{
  "expo-camera": "~14.1.3",
  "expo-image-picker": "~14.7.1",
  "react-native-image-crop-picker": "^0.40.0",
  "react-native-image-zoom-viewer": "^3.0.1",
  "react-native-pdf": "^6.7.3"
}
```

## Considerações de Implementação

1. **Começar pelo backend** - Endpoint de processamento primeiro
2. **Testar com recibos reais** - Coletar amostras angolanas
3. **Implementar web antes de mobile** - Mais fácil de debugar
4. **Usar OCR básico inicialmente** - Validar fluxo sem custos
5. **Adicionar OpenAI depois** - Quando validado
6. **Monitorar custos** - Se usar OpenAI
7. **Coletar feedback** - Ajustar precisão baseado em uso real

---

**Próximo passo:** Criar `tasks.md` com tarefas de implementação detalhadas.
