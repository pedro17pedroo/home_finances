import { logger } from "../../core/utils/logger.js";
import { ReceiptOCRService } from "./receipt-ocr.service.js";

export interface ExtractedReceiptData {
  amount?: number;
  category?: string;
  merchant?: string;
  date?: string;
  confidence: number;
  rawText: string;
}

export class ReceiptAIService {
  private static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  /**
   * Extrair dados de recibo usando IA (OpenAI GPT-4 Vision)
   */
  static async extractReceiptData(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<ExtractedReceiptData> {
    try {
      if (!this.OPENAI_API_KEY) {
        logger.warn('OpenAI API key não configurada, usando extração básica');
        return this.basicTextExtraction('');
      }

      // Converter imagem para base64
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      // Prompt otimizado para recibos angolanos
      const prompt = `
Analise esta imagem de recibo/fatura e extraia as seguintes informações em formato JSON:

{
  "amount": número (valor total da compra),
  "category": string (categoria da despesa: alimentacao, transporte, saude, educacao, lazer, moradia, outros),
  "merchant": string (nome do estabelecimento/loja),
  "date": string (data no formato YYYY-MM-DD),
  "confidence": número (0-1, confiança na extração),
  "items": array (lista de itens comprados, se visível)
}

Regras:
- Se não conseguir identificar algum campo, use null
- Para categoria, escolha a mais apropriada baseada nos itens/estabelecimento
- Valores em Kwanza (AOA) ou outras moedas, converta para número
- Se houver múltiplos valores, use o total final
- Confiança alta (0.8+) apenas se os dados estiverem muito claros
- Responda APENAS com o JSON, sem texto adicional

Contexto: Este é um recibo de Angola, pode conter texto em português.
`;

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Resposta vazia da OpenAI API');
      }

      // Parse do JSON retornado
      const extractedData = JSON.parse(content);
      
      logger.info('Dados extraídos do recibo via IA:', extractedData);

      return {
        amount: extractedData.amount || undefined,
        category: this.normalizeCategory(extractedData.category),
        merchant: extractedData.merchant || undefined,
        date: extractedData.date || undefined,
        confidence: extractedData.confidence || 0.5,
        rawText: content
      };

    } catch (error) {
      logger.error('Erro na extração de dados via IA:', error);
      
      // Fallback para OCR básico
      logger.info('Usando OCR básico como fallback');
      const ocrData = await ReceiptOCRService.extractReceiptData(imageBuffer, mimeType);
      
      return {
        amount: ocrData.amount,
        category: ocrData.category,
        merchant: ocrData.merchant,
        date: ocrData.date,
        confidence: ocrData.confidence,
        rawText: ocrData.rawText
      };
    }
  }

  /**
   * Extração básica usando padrões regex (fallback)
   */
  private static basicTextExtraction(text: string): ExtractedReceiptData {
    // Padrões para valores monetários
    const amountPatterns = [
      /(?:total|valor|preço|price)[\s:]*([0-9.,]+)/i,
      /([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)\s*(?:kz|kwanza|aoa|€|$)/i,
      /([0-9]+[.,][0-9]{2})\s*$/m
    ];

    let amount: number | undefined;
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].replace(/[.,]/g, '');
        amount = parseFloat(value) / 100; // Assumir centavos
        break;
      }
    }

    return {
      amount,
      category: 'outros',
      confidence: 0.3,
      rawText: text
    };
  }

  /**
   * Normalizar categoria para valores aceitos
   */
  private static normalizeCategory(category?: string): string {
    if (!category) return 'outros';

    const categoryMap: Record<string, string> = {
      'food': 'alimentacao',
      'restaurant': 'alimentacao',
      'grocery': 'alimentacao',
      'supermarket': 'alimentacao',
      'alimentacao': 'alimentacao',
      'comida': 'alimentacao',
      
      'transport': 'transporte',
      'taxi': 'transporte',
      'fuel': 'transporte',
      'gas': 'transporte',
      'transporte': 'transporte',
      
      'health': 'saude',
      'pharmacy': 'saude',
      'hospital': 'saude',
      'medical': 'saude',
      'saude': 'saude',
      
      'education': 'educacao',
      'school': 'educacao',
      'university': 'educacao',
      'educacao': 'educacao',
      
      'entertainment': 'lazer',
      'cinema': 'lazer',
      'bar': 'lazer',
      'lazer': 'lazer',
      
      'housing': 'moradia',
      'rent': 'moradia',
      'utilities': 'moradia',
      'moradia': 'moradia'
    };

    const normalized = category.toLowerCase();
    return categoryMap[normalized] || 'outros';
  }

  /**
   * Gerar sugestão de descrição baseada nos dados extraídos
   */
  static generateDescription(data: ExtractedReceiptData): string {
    const parts: string[] = [];
    
    if (data.merchant) {
      parts.push(data.merchant);
    }
    
    if (data.date) {
      parts.push(`em ${data.date}`);
    }
    
    parts.push('(via IA)');
    
    return parts.join(' ');
  }

  /**
   * Verificar se a extração tem confiança suficiente para auto-registro
   */
  static isHighConfidence(data: ExtractedReceiptData): boolean {
    return data.confidence >= 0.8 && 
           data.amount !== undefined && 
           data.amount > 0;
  }

  /**
   * Formatar dados extraídos para mensagem WhatsApp
   */
  static formatExtractionMessage(data: ExtractedReceiptData): string {
    const lines: string[] = ['🤖 *IA analisou o recibo:*\n'];
    
    if (data.amount) {
      lines.push(`💰 Valor: ${this.formatCurrency(data.amount)}`);
    }
    
    if (data.category) {
      lines.push(`🏷️ Categoria: ${data.category}`);
    }
    
    if (data.merchant) {
      lines.push(`🏪 Estabelecimento: ${data.merchant}`);
    }
    
    if (data.date) {
      lines.push(`📅 Data: ${data.date}`);
    }
    
    lines.push(`🎯 Confiança: ${Math.round(data.confidence * 100)}%`);
    
    return lines.join('\n');
  }

  /**
   * Formatar valor monetário
   */
  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value);
  }
}