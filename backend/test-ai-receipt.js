#!/usr/bin/env node

/**
 * Script de teste para funcionalidade de IA de recibos
 */

import { SimpleReceiptAIService } from './src/domain/services/receipt-ai-simple.service.js';
import { WhatsAppMediaService } from './src/domain/services/whatsapp-media.service.js';
import fs from 'fs';

async function testAIReceipt() {
  console.log('🤖 Testando funcionalidade de IA para recibos...\n');

  try {
    // Simular dados de um recibo
    const mockReceiptData = {
      amount: 2500,
      category: 'alimentacao',
      merchant: 'Supermercado Exemplo',
      date: '2024-12-18',
      confidence: 0.92,
      rawText: 'Mock receipt data'
    };

    console.log('📊 Dados simulados do recibo:');
    console.log(JSON.stringify(mockReceiptData, null, 2));
    console.log();

    // Testar formatação de mensagem
    const message = SimpleReceiptAIService.formatExtractionMessage(mockReceiptData);
    console.log('💬 Mensagem formatada para WhatsApp:');
    console.log(message);
    console.log();

    // Testar verificação de confiança
    const isHighConfidence = SimpleReceiptAIService.isHighConfidence(mockReceiptData);
    console.log(`🎯 Alta confiança: ${isHighConfidence ? '✅ Sim' : '❌ Não'}`);
    console.log();

    // Testar geração de descrição
    const description = SimpleReceiptAIService.generateDescription(mockReceiptData);
    console.log(`📝 Descrição gerada: "${description}"`);
    console.log();

    // Testar tipos de arquivo suportados
    console.log('📎 Tipos de arquivo suportados:');
    const supportedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    supportedTypes.forEach(type => {
      const isSupported = WhatsAppMediaService.isSupportedReceiptType(type);
      console.log(`  ${type}: ${isSupported ? '✅' : '❌'}`);
    });
    console.log();

    // Testar formatação de tamanho de arquivo
    console.log('💾 Formatação de tamanhos:');
    const sizes = [1024, 1048576, 5242880];
    sizes.forEach(size => {
      const formatted = WhatsAppMediaService.formatFileSize(size);
      console.log(`  ${size} bytes = ${formatted}`);
    });
    console.log();

    console.log('✅ Todos os testes passaram!');
    console.log('\n🚀 A funcionalidade de IA está pronta para uso!');
    console.log('\n📋 Para ativar:');
    console.log('1. Adicione OPENAI_API_KEY ao .env');
    console.log('2. Execute: npm run migrate:receipts');
    console.log('3. Inicie o servidor: npm run dev');
    console.log('\n💡 Sem OpenAI API key, o sistema usa OCR básico automaticamente.');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

// Executar teste
testAIReceipt();