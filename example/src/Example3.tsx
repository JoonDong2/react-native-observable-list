import { StyleSheet, View } from 'react-native';
import { observe } from 'react-native-observable-list';
import TrackableItem from './TrackableItem';
import { FlashList } from '@shopify/flash-list';

const ObservableFlatList = observe(FlashList);

const outerData = Array.from({ length: 300 }).map(() => ({}));
const innerData = Array.from({ length: 20 }).map(() => ({}));

const Example3 = () => {
  return (
    <ObservableFlatList
      estimatedItemSize={110}
      data={outerData}
      ListHeaderComponent={<View style={styles.header} />}
      getItemType={(_, index) => {
        if (index % 10) return 'a';
        return 'b';
      }}
      renderItem={({ index: outerIndex }) => {
        if (outerIndex % 10) return <TrackableItem label={`${outerIndex}`} />;
        return (
          <ObservableFlatList
            key={`inner-list-${outerIndex}`} // do not recycle !!
            data={innerData}
            estimatedItemSize={110}
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
};

const styles = StyleSheet.create({
  header: { height: 200, backgroundColor: 'green' },
});

export default Example3;
