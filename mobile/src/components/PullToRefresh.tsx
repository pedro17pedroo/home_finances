import React from 'react';
import { ScrollView, RefreshControl, ScrollViewProps } from 'react-native';
import { useRefresh } from '../hooks/useRefresh';

interface PullToRefreshProps extends ScrollViewProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  ...scrollViewProps
}) => {
  const { refreshing, refresh } = useRefresh(onRefresh);

  return (
    <ScrollView
      {...scrollViewProps}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={['#007bff']} // Android
          tintColor="#007bff" // iOS
        />
      }
    >
      {children}
    </ScrollView>
  );
};