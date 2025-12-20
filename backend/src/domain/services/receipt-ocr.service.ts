import { logger } from "../../core/utils/logger.js";

export interface OCRReceiptData {
  amount?: number;
  category?: string;
  merchant?: string;
  date?: string;
  confidence: number;
  rawText: string;
}

export class ReceiptOCRService {
  /**
   * Extrair texto de recibo usando OCR básico (fallback gratuito)
   */
  static async extractReceiptData(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<OCRReceiptData> {
    try {
      // Para implementação básica, vamos usar padrões regex em texto simulado
      // Em produção, você pode integrar com Tesseract.js ou Google Vision API
      
      logger.info('Processando recibo com OCR básico');
      
      // Simular extração de texto (em produção, usar Tesseract ou similar)
      const extractedText = await this.simulateOCRExtraction(imageBuffer);
      
      return this.parseReceiptText(extractedText);
      
    } catch (error) {
      logger.error('Erro na extração OCR:', error);
      
      return {
        confidence: 0.1,
        rawText: 'Erro na extração'
      };
    }
  }

  /**
   * Simular extração OCR (substituir por Tesseract.js em produção)
   */
  private static async simulateOCRExtraction(imageBuffer: Buffer): Promise<string> {
    // Em produção, usar:
    // import Tesseract from 'tesseract.js';
    // const { data: { text } } = await Tesseract.recognize(imageBuffer, 'por');
    // return text;
    
    // Por agora, retornar texto simulado para demonstração
    return `
      SUPERMERCADO EXEMPLO
      Rua da Liberdade, 123
      Luanda, Angola
      
      Data: 18/12/2024
      Hora: 14:30
      
      PRODUTOS:
      Arroz 5kg        2.500,00 AOA
      Óleo de palma    1.200,00 AOA  
      Frango 2kg       3.800,00 AOA
      Pão              500,00 AOA
      
      SUBTOTAL:        8.000,00 AOA
      IVA (14%):       1.120,00 AOA
      TOTAL:           9.120,00 AOA
      
      Obrigado pela preferência!
    `;
  }

  /**
   * Analisar texto extraído para encontrar dados relevantes
   */
  private static parseReceiptText(text: string): OCRReceiptData {
    const lowerText = text.toLowerCase();
    
    // Padrões para valores monetários angolanos
    const amountPatterns = [
      /total[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)\s*(?:kz|kwanza|aoa)/i,
      /([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)\s*(?:kz|kwanza|aoa)(?:\s*$|\s*\n)/i,
      /total[:\s]*([0-9]+[.,][0-9]{2})/i
    ];

    // Padrões para datas
    const datePatterns = [
      /data[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
      /([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/
    ];

    // Padrões para estabelecimentos
    const merchantPatterns = [
      /^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)$/m,
      /(supermercado|farmácia|restaurante|loja|mercado|posto|hospital|clínica)[\s]+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/i
    ];

    let amount: number | undefined;
    let date: string | undefined;
    let merchant: string | undefined;
    let category = 'outros';
    let confidence = 0.3;

    // Extrair valor
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const valueStr = match[1].replace(/[.,]/g, '');
        amount = parseFloat(valueStr) / 100; // Converter centavos para valor decimal
        confidence += 0.3;
        break;
      }
    }

    // Extrair data
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        date = this.normalizeDate(match[1]);
        confidence += 0.2;
        break;
      }
    }

    // Extrair estabelecimento
    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match) {
        merchant = match[1] || match[2];
        merchant = merchant.trim().substring(0, 50); // Limitar tamanho
        confidence += 0.2;
        break;
      }
    }

    // Determinar categoria baseada no conteúdo
    category = this.inferCategory(text);
    if (category !== 'outros') {
      confidence += 0.2;
    }

    // Limitar confiança máxima para OCR básico
    confidence = Math.min(confidence, 0.7);

    return {
      amount,
      category,
      merchant,
      date,
      confidence,
      rawText: text
    };
  }

  /**
   * Inferir categoria baseada no conteúdo do recibo
   */
  private static inferCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Palavras-chave para categorias
    const categoryKeywords = {
      'alimentacao': [
        'supermercado', 'mercado', 'padaria', 'açougue', 'restaurante',
        'arroz', 'feijão', 'óleo', 'açúcar', 'farinha', 'pão', 'carne',
        'frango', 'peixe', 'leite', 'ovos', 'frutas', 'verduras'
      ],
      'saude': [
        'farmácia', 'hospital', 'clínica', 'médico', 'dentista',
        'medicamento', 'remédio', 'consulta', 'exame'
      ],
      'transporte': [
        'posto', 'combustível', 'gasolina', 'gasóleo', 'taxi',
        'autocarro', 'transporte', 'viagem'
      ],
      'educacao': [
        'escola', 'universidade', 'colégio', 'livro', 'material escolar',
        'propina', 'mensalidade'
      ],
      'lazer': [
        'cinema', 'teatro', 'bar', 'discoteca', 'festa', 'jogo'
      ]
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return category;
        }
      }
    }

    return 'outros';
  }

  /**
   * Normalizar formato de data
   */
  private static normalizeDate(dateStr: string): string {
    try {
      // Converter formatos DD/MM/YYYY ou DD-MM-YYYY para YYYY-MM-DD
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        
        // Converter ano de 2 dígitos para 4 dígitos
        if (year.length === 2) {
          const currentYear = new Date().getFullYear();
          const currentCentury = Math.floor(currentYear / 100) * 100;
          year = (currentCentury + parseInt(year)).toString();
        }
        
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      logger.warn('Erro ao normalizar data:', error);
    }
    
    return dateStr;
  }

  /**
   * Formatar dados extraídos para mensagem WhatsApp
   */
  static formatExtractionMessage(data: OCRReceiptData): string {
    const lines: string[] = ['🔍 *OCR analisou o recibo:*\n'];
    
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
   * Verificar se a extração tem confiança suficiente
   */
  static isHighConfidence(data: OCRReceiptData): boolean {
    return data.confidence >= 0.6 && 
           data.amount !== undefined && 
           data.amount > 0;
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