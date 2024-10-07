# react-native-observable-list

It provides item tracking functionality for lists that offer an `onViewableItemsChanged` callback with the type `({viewableItems: ViewToken[]}) => void` and a `renderItem` property with the type `({item: ItemT, index: number}) => React.ReactElement`.

- Nesting ([Example1](#example1))

- FlashList ([Example3](#example3))

- Other Containers ([Example2](#example2))

## demo

![demo](./demo.gif)

## Installation

```sh
npm install react-native-observable-list
```

## Usage

```js
import { FlatList } from 'react-native';
import { observe, useInViewPort } from 'react-native-observable-list';

const ObservableFlatList = observe(FlatList);

const data = Array.from({ length: 100 });

const Item = ({ id }) => {
  useInViewPort(() => {
    console.log(`id: ${id} is visible.`);

    return () => {
      console.log(`id: ${id} has been hidden.`);
    };
  });
  return <View style={{ height: 100 }} />;
};

const App = () => {
  return <ObservableFlatList data={data} renderItem={() => <Item />} />;
};
```

## Examples

install dependencis

```
yarn install
```

run on expo android

```
yarn example android
```

run on expo ios

```
yarn example ios
```

## [Example1](./example/src/Example1.tsx) (Nesting)

It supports both reverse and forward nesting.

## [Example2](./example/src/Example2.tsx) (react-native-reanimated-carousel)

it can also be used with containers that do not have the onViewableItemsChanged and renderItem props.

```js
import { observe } from 'react-native-observable-list';
import Carousel, {
  type TCarouselProps,
} from 'react-native-reanimated-carousel';

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
```

## [Example3](./example/src/Example3.tsx) (FlashList)

It can also be used with FlashList, which offers a similar interface to FlatList.

In this case, you have to use a key in the internal list to prevent recycling.

```js
import { observe } from 'react-native-observable-list';
import { FlashList } from '@shopify/flash-list';

const ObservableFlatList = observe(FlashList);

const Example3 = () => {
  return (
    <ObservableFlatList
      // ...
      renderItem={({ index: outerIndex }) => {
        return (
          <ObservableFlatList
            key={`inner-list-${outerIndex}`} // do not recycle !!
            // ...
          />
        );
      }}
    />
  );
};
```

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
