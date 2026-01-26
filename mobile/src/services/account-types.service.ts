import api from './api';

export interface AccountType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const accountTypesService = {
  /**
   * Lista todos os tipos de conta ativos
   */
  getAll: async (): Promise<AccountType[]> => {
    const response = await api.get('/account-types');
    // Backend retorna { status: 'success', data: [...] }
    return response.data.data || response.data;
  },

  /**
   * Busca um tipo de conta por código
   */
  getByCode: async (code: string): Promise<AccountType> => {
    const response = await api.get(`/account-types/${code}`);
    return response.data.data || response.data;
  },
};
