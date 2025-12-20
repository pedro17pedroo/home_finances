import { logger } from "../../core/utils/logger.js";

export interface SimpleReceiptData {
  amount?: number;
  category?: string;
  merchant?: string;
  date?: string;
  confidence: number;
  rawText: string;
}

export class SimpleReceiptAIService {
  private static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  /**
   * Extrair dados de recibo usando IA (versão simplificada)
   */
  static async extractReceiptData(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<SimpleReceiptData> {
    try {
      if (!this.OPENAI_API_KEY) {
        logger.warn('OpenAI API key não configurada, usando extração básica');
        return this.basicExtraction();
      }

      // Converter imagem para base64
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      // Prompt simplificado
      const prompt = `
Analise esta imagem de recibo e extraia:
- amount: valor total (número)
- category: alimentacao, transporte, saude, educacao, lazer, moradia, outros
- merchant: nome do estabelecimento
- date: data (YYYY-MM-DD)

Responda apenas com JSON válido:
{"amount": 1000, "category": "alimentacao", "merchant": "Loja", "date": "2024-12-18", "confidence": 0.9}
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
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Resposta vazia da OpenAI API');
      }

      // Parse do JSON
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
      return this.basicExtraction();
    }
  }

  /**
   * Extração básica (fallback)
   */
  private static basicExtraction(): SimpleReceiptData {
    return {
      confidence: 0.1,
      rawText: 'Erro na extração - usando modo básico'
    };
  }

  /**
   * Normalizar categoria
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
      'transporte': 'transporte',
      
      'health': 'saude',
      'pharmacy': 'saude',
      'hospital': 'saude',
      'saude': 'saude',
      
      'education': 'educacao',
      'school': 'educacao',
      'educacao': 'educacao',
      
      'entertainment': 'lazer',
      'cinema': 'lazer',
      'lazer': 'lazer',
      
      'housing': 'moradia',
      'rent': 'moradia',
      'moradia': 'moradia'
    };

    const normalized = category.toLowerCase();
    return categoryMap[normalized] || 'outros';
  }

  /**
   * Verificar se tem alta confiança
   */
  static isHighConfidence(data: SimpleReceiptData): boolean {
    return data.confidence >= 0.8 && 
           data.amount !== undefined && 
           data.amount > 0;
  }

  /**
   * Formatar mensagem de extração
   */
  static formatExtractionMessage(data: SimpleReceiptData): string {
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
   * Gerar descrição
   */
  static generateDescription(data: SimpleReceiptData): string {
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
   * Formatar moeda
   */
  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value);
  }
}