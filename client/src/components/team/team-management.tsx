import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Mail, Trash2, Crown, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";

interface TeamMember {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

interface TeamInvitation {
  id: number;
  email: string;
  role: string;
  invitedBy: number;
  expiresAt: string;
  createdAt: string;
}

export default function TeamManagement() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<TeamInvitation[]>({
    queryKey: ["/api/team/invitations"],
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => 
      apiRequest("POST", "/api/team/invite", data),
    onSuccess: () => {
      toast({
        title: "Convite enviado",
        description: "O convite foi enviado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team/invitations"] });
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest("DELETE", `/api/team/members/${userId}`),
    onSuccess: () => {
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido da equipe.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: number) => 
      apiRequest("DELETE", `/api/team/invitations/${invitationId}`),
    onSuccess: () => {
      toast({
        title: "Convite cancelado",
        description: "O convite foi cancelado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team/invitations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail || !inviteRole) {
      toast({
        title: "Erro de validação",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Administrador';
      default:
        return 'Membro';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (membersLoading || invitationsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestão de Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 mt-1"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestão de Equipe
          </CardTitle>
          <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Membro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Função</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? "Enviando..." : "Enviar Convite"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Membros ({members?.length || 0})</TabsTrigger>
            <TabsTrigger value="invitations">Convites ({invitations?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="members" className="space-y-4">
            {!members || members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum membro</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comece convidando membros para sua equipe.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {getRoleIcon(member.role)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {getRoleLabel(member.role)}
                      </Badge>
                      {member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUserMutation.mutate(member.id)}
                          disabled={removeUserMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="invitations" className="space-y-4">
            {!invitations || invitations.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum convite pendente</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Todos os convites foram aceitos ou não há convites pendentes.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{invitation.email}</p>
                        <p className="text-sm text-gray-500">
                          Convite enviado em {formatDate(invitation.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadgeColor(invitation.role)}>
                        {getRoleLabel(invitation.role)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                        disabled={cancelInvitationMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}