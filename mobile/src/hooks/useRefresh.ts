import { useState, useCallback } from 'react';

export const useRefresh = (onRefresh: () => Promise<void>) => {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return { refreshing, refresh };
};