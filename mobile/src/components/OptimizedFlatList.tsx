import React, { memo } from 'react';
import { FlatList, FlatListProps } from 'react-native';

interface OptimizedFlatListProps<T> extends FlatListProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
}

function OptimizedFlatListComponent<T>({
  data,
  renderItem,
  keyExtractor,
  ...props
}: OptimizedFlatListProps<T>) {
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Otimizações de performance
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
      getItemLayout={props.getItemLayout}
      // Evita re-renders desnecessários
      extraData={data}
      {...props}
    />
  );
}

export const OptimizedFlatList = memo(OptimizedFlatListComponent) as <T>(
  props: OptimizedFlatListProps<T>
) => React.ReactElement;