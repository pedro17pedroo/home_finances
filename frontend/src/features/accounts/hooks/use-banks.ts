import { useQuery } from '@tanstack/react-query';

interface Bank {
  id: number;
  code: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  swiftCode: string | null;
  country: string;
}

async function fetchBanks(): Promise<Bank[]> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/banks`);
  if (!response.ok) {
    throw new Error('Failed to fetch banks');
  }
  const data = await response.json();
  return data.data?.banks || [];
}

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: fetchBanks,
    staleTime: 1000 * 60 * 60, // 1 hour - banks don't change often
  });
}
