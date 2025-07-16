import { db } from "../db";
import { paymentMethods } from "@shared/schema";

export async function seedPaymentMethods() {
  console.log("Seeding payment methods...");
  
  const methods = [
    {
      name: "stripe",
      displayName: "Cartão de Crédito/Débito",
      isActive: true,
      instructions: "Pagamento seguro via Stripe. Aceita cartões Visa, Mastercard e American Express.",
      processingTime: "Imediato",
      fees: "Sem taxas adicionais",
      icon: "credit-card",
      displayOrder: 1,
      config: {
        enabled: true,
        currencies: ["AOA", "USD"],
        payment_method_types: ["card"]
      }
    },
    {
      name: "multicaixa",
      displayName: "Multicaixa Express",
      isActive: true,
      instructions: `Para pagar via Multicaixa Express:

1. Abra o aplicativo Multicaixa Express no seu telefone
2. Selecione "Pagamentos" > "Empresas/Serviços"
3. Procure por "CONTROLE FINANCEIRO" ou use o código: 12345
4. Insira o valor: {{amount}} Kz
5. Use a referência: {{reference}}
6. Confirme o pagamento
7. Tire uma foto do comprovante e envie aqui

Suporte: +244 923 000 000`,
      processingTime: "Imediato",
      fees: "Sem taxas adicionais",
      icon: "smartphone",
      displayOrder: 2,
      config: {
        merchant_id: "FINANCIAL_CONTROL_001",
        terminal_id: "TERM_001",
        callback_url: "/api/callbacks/multicaixa"
      }
    },
    {
      name: "unitel_money",
      displayName: "Unitel Money",
      isActive: true,
      instructions: `Para pagar via Unitel Money:

1. Marque *130# no seu telefone Unitel
2. Selecione "Pagamentos" > "Empresas"
3. Procure por "CONTROLE FINANCEIRO" 
4. Insira o valor: {{amount}} Kz
5. Use a referência: {{reference}}
6. Confirme com seu PIN
7. Tire uma foto do SMS de confirmação e envie aqui

Suporte: +244 912 000 000`,
      processingTime: "Imediato",
      fees: "1% do valor (mínimo 100 Kz)",
      icon: "smartphone",
      displayOrder: 3,
      config: {
        merchant_code: "FINCTRL001",
        callback_url: "/api/callbacks/unitel"
      }
    },
    {
      name: "afrimoney",
      displayName: "AfriMoney",
      isActive: true,
      instructions: `Para pagar via AfriMoney:

1. Abra o aplicativo AfriMoney
2. Selecione "Transferir" > "Para Empresa"
3. Procure por "CONTROLE FINANCEIRO DOMÉSTICO"
4. Insira o valor: {{amount}} Kz
5. Use a referência: {{reference}}
6. Confirme com sua senha
7. Tire uma foto do comprovante e envie aqui

Suporte: +244 933 000 000`,
      processingTime: "Imediato",
      fees: "0.5% do valor (mínimo 50 Kz)",
      icon: "smartphone",
      displayOrder: 4,
      config: {
        merchant_id: "AFRI_FINCTRL_001",
        api_key: "sk_live_afrimoney_key"
      }
    },
    {
      name: "bank_transfer",
      displayName: "Transferência Bancária",
      isActive: true,
      instructions: `Para pagar via transferência bancária:

OPÇÃO 1 - BAI (Banco Angolano de Investimentos):
Titular: CONTROLE FINANCEIRO DOMÉSTICO LDA
Conta: 40.000.000.123.456.789.10
IBAN: AO06 0040 0000 0012 3456 7891 0
Swift: BAICAOLU

OPÇÃO 2 - BFA (Banco de Fomento Angola):
Titular: CONTROLE FINANCEIRO DOMÉSTICO LDA
Conta: 00.123.456.789.10
IBAN: AO06 0006 0000 0012 3456 7891 0
Swift: BFOCAOLU

OPÇÃO 3 - BIC (Banco BIC):
Titular: CONTROLE FINANCEIRO DOMÉSTICO LDA
Conta: 11.01.30.123456789
IBAN: AO06 0064 0000 0012 3456 7891 0
Swift: BICBAOLU

IMPORTANTE:
- Valor: {{amount}} Kz
- Referência: {{reference}}
- Tire uma foto do comprovante de transferência
- Envie o comprovante aqui para confirmar o pagamento

Processamento: 1-3 dias úteis após confirmação
Suporte: +244 922 000 000`,
      processingTime: "1-3 dias úteis",
      fees: "Sem taxas (sujeito às taxas do seu banco)",
      icon: "building",
      displayOrder: 5,
      config: {
        banks: [
          {
            name: "BAI",
            account_holder: "CONTROLE FINANCEIRO DOMÉSTICO LDA",
            account_number: "40.000.000.123.456.789.10",
            iban: "AO06 0040 0000 0012 3456 7891 0",
            swift: "BAICAOLU"
          },
          {
            name: "BFA",
            account_holder: "CONTROLE FINANCEIRO DOMÉSTICO LDA",
            account_number: "00.123.456.789.10",
            iban: "AO06 0006 0000 0012 3456 7891 0",
            swift: "BFOCAOLU"
          },
          {
            name: "BIC",
            account_holder: "CONTROLE FINANCEIRO DOMÉSTICO LDA",
            account_number: "11.01.30.123456789",
            iban: "AO06 0064 0000 0012 3456 7891 0",
            swift: "BICBAOLU"
          }
        ]
      }
    }
  ];

  try {
    // Check if payment methods already exist
    const existingMethods = await db.select().from(paymentMethods);
    
    if (existingMethods.length === 0) {
      // Insert all methods
      await db.insert(paymentMethods).values(methods);
      console.log(`✅ Inserted ${methods.length} payment methods`);
    } else {
      console.log(`ℹ️  Found ${existingMethods.length} existing payment methods, skipping seed`);
      
      // Update existing methods if needed
      for (const method of methods) {
        const existing = existingMethods.find(m => m.name === method.name);
        if (!existing) {
          await db.insert(paymentMethods).values([method]);
          console.log(`✅ Added missing payment method: ${method.displayName}`);
        }
      }
    }
    
    console.log("✅ Payment methods seeding completed");
  } catch (error) {
    console.error("❌ Error seeding payment methods:", error);
    throw error;
  }
}