import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { observe } from 'react-native-observable-list';
import TrackableItem from './TrackableItem';

const ObservableFlatList = observe(FlatList);

const outerData = Array.from({ length: 300 }).map(() => ({}));
const innerData = Array.from({ length: 20 }).map(() => ({}));

export default function App() {
  return (
    <ObservableFlatList
      style={styles.container}
      data={outerData}
      ListHeaderComponent={<View style={styles.header} />}
      renderItem={({ index: outerIndex }) => {
        if (outerIndex % 10) return <TrackableItem label={`${outerIndex}`} />;
        return (
          <ObservableFlatList
            key={outerIndex}
            data={innerData}
            horizontal
            renderItem={({ index: innerIndex }) => {
              return (
                <TrackableItem
                  width={100}
                  label={`${outerIndex}-${innerIndex}`}
                />
              );
            }}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: { height: 200, backgroundColor: 'green' },
});
