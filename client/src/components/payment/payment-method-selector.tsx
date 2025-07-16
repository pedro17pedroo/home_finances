import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Clock, 
  AlertCircle,
  CheckCircle,
  DollarSign
} from "lucide-react";
import type { PaymentMethod } from "@shared/schema";

interface PaymentMethodSelectorProps {
  planType: string;
  onMethodSelect: (method: PaymentMethod) => void;
  selectedMethodId?: number;
}

const getMethodIcon = (methodName: string) => {
  switch (methodName) {
    case 'stripe':
      return CreditCard;
    case 'multicaixa':
    case 'unitel_money':
    case 'afrimoney':
      return Smartphone;
    case 'bank_transfer':
      return Building2;
    default:
      return DollarSign;
  }
};

const getMethodColor = (methodName: string) => {
  switch (methodName) {
    case 'stripe':
      return 'bg-blue-50 border-blue-200';
    case 'multicaixa':
      return 'bg-green-50 border-green-200';
    case 'unitel_money':
      return 'bg-red-50 border-red-200';
    case 'afrimoney':
      return 'bg-purple-50 border-purple-200';
    case 'bank_transfer':
      return 'bg-gray-50 border-gray-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

export default function PaymentMethodSelector({ 
  planType, 
  onMethodSelect, 
  selectedMethodId 
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const { data: methods, isLoading } = useQuery({
    queryKey: ["/api/payment-methods"],
    throwOnError: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeMethods = methods?.filter((method: PaymentMethod) => method.isActive) || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Escolha o método de pagamento</h3>
        <p className="text-sm text-muted-foreground">
          Selecione como deseja pagar pelo plano {planType}
        </p>
      </div>

      <RadioGroup
        value={selectedMethodId?.toString()}
        onValueChange={(value) => {
          const method = activeMethods.find(m => m.id === parseInt(value));
          if (method) {
            setSelectedMethod(method);
            onMethodSelect(method);
          }
        }}
        className="space-y-4"
      >
        {activeMethods.map((method: PaymentMethod) => {
          const Icon = getMethodIcon(method.name);
          const colorClass = getMethodColor(method.name);
          
          return (
            <div key={method.id} className="relative">
              <RadioGroupItem 
                value={method.id.toString()} 
                id={method.id.toString()}
                className="peer sr-only"
              />
              <Label
                htmlFor={method.id.toString()}
                className={`flex cursor-pointer rounded-lg border-2 p-4 hover:border-primary peer-checked:border-primary ${colorClass}`}
              >
                <Card className="flex-1 border-none shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-full">
                          <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{method.displayName}</CardTitle>
                          <CardDescription className="text-sm">
                            {method.name === 'stripe' && 'Cartão de crédito/débito'}
                            {method.name === 'multicaixa' && 'Pagamento via Multicaixa Express'}
                            {method.name === 'unitel_money' && 'Pagamento via Unitel Money'}
                            {method.name === 'afrimoney' && 'Pagamento via AfriMoney'}
                            {method.name === 'bank_transfer' && 'Transferência bancária'}
                          </CardDescription>
                        </div>
                      </div>
                      {selectedMethodId === method.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{method.processingTime || 'Tempo variável'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{method.fees || 'Consulte taxas'}</span>
                      </div>
                    </div>
                    
                    {method.name !== 'stripe' && (
                      <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-xs text-amber-700">
                            <p className="font-medium">Verificação manual necessária</p>
                            <p>Você precisará enviar comprovante de pagamento</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {activeMethods.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum método disponível</h3>
            <p className="text-sm text-muted-foreground">
              Não há métodos de pagamento ativos no momento. 
              Entre em contato com o suporte.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Todos os pagamentos são processados de forma segura</p>
        <p>• Você receberá confirmação por email após o pagamento</p>
        <p>• Entre em contato conosco em caso de problemas</p>
      </div>
    </div>
  );
}