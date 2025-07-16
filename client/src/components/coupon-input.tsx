import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CouponInputProps {
  planType: string;
  onCouponApplied?: (discount: any) => void;
  onCouponRemoved?: () => void;
}

interface CouponValidationResult {
  valid: boolean;
  campaign: {
    id: number;
    name: string;
    discountType: string;
    discountValue: string;
    couponCode: string;
  };
  discount: {
    amount: number;
    percentage: number;
    originalPrice: number;
    finalPrice: number;
  };
}

export default function CouponInput({ planType, onCouponApplied, onCouponRemoved }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const { toast } = useToast();

  const validateCouponMutation = useMutation({
    mutationFn: (code: string) =>
      apiRequest("POST", "/api/campaigns/validate-coupon", { couponCode: code, planType }),
    onSuccess: (data: CouponValidationResult) => {
      setAppliedCoupon(data);
      onCouponApplied?.(data.discount);
      toast({
        title: "Cupom aplicado com sucesso!",
        description: `Desconto de ${data.discount.amount.toFixed(2)} Kz aplicado`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cupom inválido",
        description: error.message || "Não foi possível aplicar o cupom",
        variant: "destructive",
      });
    },
  });

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    validateCouponMutation.mutate(couponCode.trim());
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    onCouponRemoved?.();
    toast({
      title: "Cupom removido",
      description: "O desconto foi removido do seu pedido",
    });
  };

  if (appliedCoupon) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Cupom Aplicado
          </CardTitle>
          <CardDescription className="text-green-700">
            {appliedCoupon.campaign.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                Código: {appliedCoupon.campaign.couponCode}
              </p>
              <p className="text-sm text-green-700">
                {appliedCoupon.campaign.discountType === 'percentage' 
                  ? `${appliedCoupon.discount.percentage}% de desconto`
                  : `${appliedCoupon.discount.amount.toFixed(2)} Kz de desconto`
                }
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              -{appliedCoupon.discount.amount.toFixed(2)} Kz
            </Badge>
          </div>
          
          <div className="border-t pt-3">
            <div className="flex justify-between text-sm">
              <span>Preço original:</span>
              <span>{appliedCoupon.discount.originalPrice.toFixed(2)} Kz</span>
            </div>
            <div className="flex justify-between text-sm text-green-700">
              <span>Desconto:</span>
              <span>-{appliedCoupon.discount.amount.toFixed(2)} Kz</span>
            </div>
            <div className="flex justify-between font-medium text-green-800">
              <span>Preço final:</span>
              <span>{appliedCoupon.discount.finalPrice.toFixed(2)} Kz</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRemoveCoupon}
            className="w-full"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Remover Cupom
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Cupom de Desconto
        </CardTitle>
        <CardDescription>
          Tem um cupom de desconto? Insira o código abaixo para aplicá-lo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="couponCode">Código do Cupom</Label>
          <div className="flex gap-2">
            <Input
              id="couponCode"
              placeholder="Digite o código do cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={validateCouponMutation.isPending}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
            />
            <Button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || validateCouponMutation.isPending}
            >
              {validateCouponMutation.isPending ? "Validando..." : "Aplicar"}
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>• Os cupons são válidos apenas para o plano selecionado</p>
          <p>• Alguns cupons podem ter data de expiração</p>
        </div>
      </CardContent>
    </Card>
  );
}