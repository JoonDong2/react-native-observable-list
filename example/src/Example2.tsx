import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { observe } from 'react-native-observable-list';
import Carousel, {
  type TCarouselProps,
} from 'react-native-reanimated-carousel';
import TrackableItem from './TrackableItem';

const { width, height } = Dimensions.get('screen');

function ViewableCarousel<T>(
  props: TCarouselProps<T> & {
    onViewableItemsChanged?: ({
      changed,
      viewableItems,
    }: {
      changed: ViewToken[];
      viewableItems: ViewToken[];
    }) => void;
  }
) {
  return (
    <Carousel
      {...props}
      onProgressChange={(offsetProgress: number, absoluteProgress: number) => {
        const index = Math.floor(absoluteProgress);
        const item = props.data[index];
        props.onViewableItemsChanged?.({
          changed: [],
          viewableItems: [{ item, index, isViewable: true, key: undefined }],
        });
        props.onProgressChange?.(offsetProgress, absoluteProgress);
      }}
    />
  );
}

const ObservableCarousel = observe(ViewableCarousel);

const ObservableFlatList = observe(FlatList);

const pages = Array.from({ length: 10 }).map(() => ({}));
const outerData = Array.from({ length: 300 }).map(() => ({}));
const innerData = Array.from({ length: 20 }).map(() => ({}));

const Example2 = () => {
  return (
    <ObservableCarousel
      data={pages}
      width={width}
      height={height}
      panGestureHandlerProps={{
        activeOffsetX: [-10, 10],
      }}
      style={styles.container}
      renderItem={({ index: pageIndex }) => {
        return (
          <ObservableFlatList
            data={outerData}
            ListHeaderComponent={<View style={styles.header} />}
            renderItem={({ index: outerIndex }) => {
              if (outerIndex % 10)
                return <TrackableItem label={`${pageIndex}-${outerIndex}`} />;
              return (
                <ObservableFlatList
                  data={innerData}
                  horizontal
                  nestedScrollEnabled
                  renderItem={({ index: innerIndex }) => {
                    return (
                      <TrackableItem
                        width={100}
                        label={`${pageIndex}-${outerIndex}-${innerIndex}`}
                      />
                    );
                  }}
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
  container: {
    width,
    flex: 1,
  },
  header: { height: 200, backgroundColor: 'green' },
});

export default Example2;
