# Especificação: Upload e Processamento de Recibos com OCR/IA

## Visão Geral

Permitir que usuários façam upload de fotos ou PDFs de recibos/faturas/comprovativos, e o sistema automaticamente extraia as informações (valor, categoria, data, estabelecimento) usando OCR e IA, apresentando os dados para confirmação antes de registrar a despesa.

## Contexto

O sistema já possui:
- ✅ Serviços de OCR básico (`ReceiptOCRService`)
- ✅ Serviços de IA com OpenAI (`ReceiptAIService`, `SimpleReceiptAIService`)
- ✅ Armazenamento de recibos no banco de dados
- ✅ API para visualização de recibos
- ✅ Integração com WhatsApp para processar recibos

**Falta implementar:**
- ❌ Interface web para upload/captura
- ❌ Interface mobile para upload/captura
- ❌ Endpoint de processamento de recibos
- ❌ Fluxo de confirmação dos dados extraídos

## Objetivos

1. Facilitar o registro de despesas através de fotos de recibos
2. Reduzir erros de digitação manual
3. Acelerar o processo de registro de transações
4. Melhorar a experiência do usuário
5. Manter histórico visual das despesas (recibos anexados)

## User Stories

### US1: Upload de Recibo no Frontend Web
**Como** usuário do sistema web  
**Quero** fazer upload de uma foto ou PDF de recibo ao registrar uma despesa  
**Para que** o sistema extraia automaticamente as informações e eu não precise digitar manualmente

**Critérios de Aceitação:**
1.1. Botão "Adicionar Recibo" visível no formulário de nova transação  
1.2. Ao clicar, abre modal com 3 opções: "Tirar Foto" (webcam), "Upload", "Arrastar Arquivo"  
1.3. Aceita formatos: JPG, PNG, PDF  
1.4. Tamanho máximo: 5MB  
1.5. Mostra preview da imagem/PDF antes de processar  
1.6. Botão "Processar Recibo" inicia a análise  
1.7. Loading state durante processamento (3-10 segundos)  
1.8. Mensagem de erro se formato inválido ou tamanho excedido  

### US2: Captura de Foto com Câmera no Mobile
**Como** usuário do app mobile  
**Quero** tirar foto de um recibo com a câmera do celular  
**Para que** possa registrar despesas rapidamente no momento da compra

**Critérios de Aceitação:**
2.1. Botão "Adicionar Recibo" no formulário de nova transação  
2.2. Ao clicar, mostra opções: "Tirar Foto" e "Galeria"  
2.3. "Tirar Foto" abre câmera nativa  
2.4. Após captura, permite crop/ajuste da imagem  
2.5. Preview da foto antes de enviar  
2.6. Botão "Usar Esta Foto" confirma e inicia processamento  
2.7. Permissões de câmera solicitadas corretamente  
2.8. Funciona em iOS e Android  

### US3: Seleção de Imagem da Galeria no Mobile
**Como** usuário do app mobile  
**Quero** selecionar uma foto de recibo da galeria  
**Para que** possa registrar despesas de recibos que já fotografei anteriormente

**Critérios de Aceitação:**
3.1. Opção "Galeria" disponível no modal de upload  
3.2. Abre galeria de fotos do dispositivo  
3.3. Permite selecionar apenas 1 imagem por vez  
3.4. Mostra preview da imagem selecionada  
3.5. Permite crop/ajuste antes de processar  
3.6. Permissões de galeria solicitadas corretamente  
3.7. Funciona em iOS e Android  

### US4: Processamento e Extração de Dados
**Como** sistema  
**Quero** processar o recibo enviado e extrair informações relevantes  
**Para que** possa pré-preencher o formulário de transação

**Critérios de Aceitação:**
4.1. Endpoint `POST /api/receipts/process` criado  
4.2. Aceita imagem em base64 ou multipart/form-data  
4.3. Valida tipo de arquivo e tamanho  
4.4. Usa OpenAI GPT-4 Vision se `OPENAI_API_KEY` configurada  
4.5. Fallback para OCR básico se API não disponível  
4.6. Extrai: valor, categoria, estabelecimento, data  
4.7. Salva arquivo em `uploads/receipts/`  
4.8. Retorna dados extraídos + confiança + caminho do arquivo  
4.9. Tempo de resposta < 15 segundos  
4.10. Log de erros detalhado  

### US5: Confirmação e Ajuste dos Dados Extraídos
**Como** usuário  
**Quero** ver os dados extraídos do recibo e poder ajustá-los  
**Para que** possa corrigir erros antes de registrar a transação

**Critérios de Aceitação:**
5.1. Após processamento, mostra tela de confirmação  
5.2. Exibe dados extraídos em formulário editável:
   - Valor (campo numérico)
   - Categoria (dropdown com categorias do sistema)
   - Descrição (sugerida: "Estabelecimento em Data")
   - Data (date picker)
   - Conta (dropdown com contas do usuário)  
5.3. Mostra indicador de confiança (0-100%)  
5.4. Preview do recibo ao lado (web) ou acima (mobile)  
5.5. Botão "Confirmar e Registrar" salva transação  
5.6. Botão "Cancelar" descarta dados e recibo  
5.7. Campos obrigatórios validados antes de salvar  
5.8. Mensagem de sucesso após registro  

### US6: Mapeamento Inteligente de Categorias
**Como** sistema  
**Quero** mapear automaticamente a categoria correta baseada no conteúdo do recibo  
**Para que** o usuário não precise sempre selecionar manualmente

**Critérios de Aceitação:**
6.1. Identifica palavras-chave no texto extraído  
6.2. Mapeia para categorias existentes:
   - Supermercado, padaria, restaurante → alimentacao
   - Posto, combustível, taxi → transporte
   - Farmácia, hospital, clínica → saude
   - Escola, universidade, livros → educacao
   - Cinema, bar, festa → lazer
   - Aluguel, água, luz → moradia  
6.3. Categoria padrão "outros" se não identificar  
6.4. Permite usuário alterar categoria sugerida  
6.5. Aprende com correções do usuário (futuro)  

### US7: Visualização de Recibos Anexados
**Como** usuário  
**Quero** visualizar os recibos anexados às minhas transações  
**Para que** possa consultar comprovantes quando necessário

**Critérios de Aceitação:**
7.1. Ícone de recibo visível em transações que têm anexo  
7.2. Ao clicar, abre modal com preview do recibo  
7.3. Opções: "Ampliar", "Baixar", "Fechar"  
7.4. PDFs abrem em visualizador apropriado  
7.5. Imagens com zoom e pan  
7.6. Funciona em web e mobile  
7.7. Loading state durante carregamento  

### US8: Lista de Transações com Recibos
**Como** usuário  
**Quero** ver uma lista de todas as transações que têm recibos anexados  
**Para que** possa acessar rapidamente meus comprovantes

**Critérios de Aceitação:**
8.1. Filtro "Com Recibo" na lista de transações  
8.2. Endpoint `GET /api/receipts/` retorna transações com recibos  
8.3. Mostra thumbnail do recibo (se imagem)  
8.4. Mostra ícone de PDF (se PDF)  
8.5. Ordenação por data (mais recente primeiro)  
8.6. Paginação (50 itens por página)  
8.7. Busca por estabelecimento/descrição  

## Requisitos Não-Funcionais

### Performance
- Processamento de recibo: < 15 segundos
- Upload de arquivo: < 5 segundos
- Visualização de recibo: < 2 segundos
- Interface responsiva (60 FPS)

### Segurança
- Validação de tipo de arquivo no backend
- Sanitização de nomes de arquivo
- Autenticação obrigatória em todos os endpoints
- Recibos acessíveis apenas pelo dono
- Armazenamento seguro de arquivos

### Usabilidade
- Interface intuitiva e clara
- Feedback visual em todas as ações
- Mensagens de erro compreensíveis
- Suporte a português (Angola)
- Acessibilidade (WCAG 2.1 AA)

### Escalabilidade
- Suporte a 1000+ uploads/dia
- Armazenamento eficiente de arquivos
- Cache de resultados de processamento
- Compressão automática de imagens grandes

### Compatibilidade
- Web: Chrome, Firefox, Safari, Edge (últimas 2 versões)
- Mobile: iOS 13+, Android 8+
- Formatos: JPG, PNG, PDF
- Tamanho máximo: 5MB por arquivo

## Dependências Técnicas

### Backend
- `multer` - Upload de arquivos
- `sharp` (opcional) - Compressão de imagens
- OpenAI API (opcional) - Análise com IA

### Frontend Web
- `react-dropzone` - Drag & drop
- `react-webcam` - Captura de webcam
- `react-image-crop` - Crop de imagens

### Mobile
- `expo-image-picker` - Câmera e galeria
- `expo-camera` - Câmera nativa
- `react-native-image-crop-picker` - Crop

## Configuração Necessária

### Variáveis de Ambiente
```bash
# OpenAI (opcional - fallback para OCR básico)
OPENAI_API_KEY=sk-...

# Upload
RECEIPT_UPLOAD_PATH=uploads/receipts
RECEIPT_MAX_SIZE=5242880
RECEIPT_ALLOWED_TYPES=image/jpeg,image/png,application/pdf
```

### Permissões Mobile
```xml
<!-- iOS (Info.plist) -->
<key>NSCameraUsageDescription</key>
<string>Precisamos acessar sua câmera para fotografar recibos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Precisamos acessar sua galeria para selecionar recibos</string>

<!-- Android (AndroidManifest.xml) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## Fluxo de Dados

```
Usuário → Upload/Captura → Backend (Validação) → 
OCR/IA (Extração) → Salvar Arquivo → Retornar Dados → 
Usuário Confirma → Registrar Transação → Sucesso
```

## Métricas de Sucesso

- Taxa de uso: 30%+ das transações com recibo
- Precisão de extração: 70%+ (OCR) ou 85%+ (IA)
- Tempo médio de registro: < 30 segundos
- Taxa de erro: < 5%
- Satisfação do usuário: 4+/5

## Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| API OpenAI indisponível | Alto | Baixo | Fallback para OCR básico |
| Recibos ilegíveis | Médio | Médio | Permitir edição manual completa |
| Custo alto da API | Médio | Médio | Monitorar uso, limitar requisições |
| Problemas de permissão mobile | Alto | Baixo | Mensagens claras, guia de configuração |
| Arquivos muito grandes | Baixo | Médio | Validação e compressão automática |

## Fases de Implementação

### Fase 1: Backend (1-2 dias)
- Endpoint de upload e processamento
- Validações e segurança
- Testes com recibos reais

### Fase 2: Frontend Web (2-3 dias)
- Componentes de upload
- Modal de confirmação
- Visualização de recibos

### Fase 3: Mobile (3-4 dias)
- Telas de captura
- Integração com câmera/galeria
- Fluxo de confirmação

### Fase 4: Testes e Ajustes (1-2 dias)
- Testes com usuários reais
- Ajustes de UX
- Otimizações de performance

## Documentação Necessária

- Guia do usuário (como usar a funcionalidade)
- Documentação da API (endpoints)
- Guia de configuração (variáveis de ambiente)
- Troubleshooting (problemas comuns)

## Considerações Futuras

- Processamento em lote (múltiplos recibos)
- OCR offline (Tesseract.js)
- Modelo de IA próprio (treinado)
- Reconhecimento de estabelecimentos recorrentes
- Detecção de duplicatas
- Exportação de recibos em PDF
- Backup automático na nuvem

---

**Status:** Pronto para implementação  
**Prioridade:** Alta  
**Estimativa:** 7-11 dias de desenvolvimento  
**Dependências:** Nenhuma (backend já preparado)
