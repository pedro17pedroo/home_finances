import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Transfer, Account } from "@shared/schema";
import { ArrowRight, Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TransferHistoryProps {
  limit?: number;
}

export default function TransferHistory({ limit = 10 }: TransferHistoryProps) {
  const { data: transfers = [], isLoading } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Histórico de Transferências
          </CardTitle>
          <CardDescription>Carregando transferências...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getAccountName = (accountId: number) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.name} (${account.bank})` : 'Conta não encontrada';
  };

  const displayTransfers = transfers.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Histórico de Transferências
        </CardTitle>
        <CardDescription>
          {transfers.length === 0 
            ? "Nenhuma transferência realizada ainda" 
            : `${transfers.length} transferência${transfers.length > 1 ? 's' : ''} realizada${transfers.length > 1 ? 's' : ''}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma transferência realizada ainda</p>
            <p className="text-sm">Use o botão "Transferir" para movimentar dinheiro entre contas</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-4">
              {displayTransfers.map((transfer) => (
                <div key={transfer.id} className="flex items-start space-x-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <ArrowRight className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {getAccountName(transfer.fromAccountId)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {getAccountName(transfer.toAccountId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-blue-600">
                          {formatCurrency(parseFloat(transfer.amount))}
                        </Badge>
                      </div>
                    </div>
                    
                    {transfer.description && (
                      <p className="text-sm text-gray-600 mt-1">{transfer.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(transfer.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>Transferência</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}