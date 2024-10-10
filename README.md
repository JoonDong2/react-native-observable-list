# react-native-observable-list

This library was developed as a replacement for the browser's IntersectionObserver API.

It provides item tracking functionality for lists that offer an `onViewableItemsChanged` callback with the type `({viewableItems: ViewToken[]}) => void` and a `renderItem` property with the type `({item: ItemT, index: number}) => React.ReactElement`.

- Nesting ([Example1](#example1-nesting))

- FlashList ([Example3](#example3-flashlist))

- Other Containers ([Example2](#example2-react-native-reanimated-carousel))

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
  // The callback is re-registered whenever deps change.
  // clean is executed when an item leaves the viewport. (not unmount)
  useInViewPort(() => {
    console.log(`id: ${id} is visible.`);

    return () => {
      console.log(`id: ${id} has been hidden.`);
    };
  }, []);
  return <View style={{ height: 100 }} />;
};

const App = () => {
  return <ObservableFlatList data={data} renderItem={() => <Item />} />;
};
```

## Examples

install dependencies

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

It can also be used with containers that do not have the onViewableItemsChanged and renderItem props.

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

## [key](./src/observe.tsx#L197-L200)

The item object is used as the key to store its visibility status by default.

However, if a `keyExtractor` is provided, the return value of that function is used as the key instead.

## Known Issue

### Visibility Judgment Criteria

`FlatList` considers an item component as non-existent if it doesn't occupy space (e.g., `<View />`), even if the component is within the viewport.

On the other hand, `FlashList` considers an item as existent as long as it is within the viewport, even if it doesn't occupy space.

```js
const Item = ({ id }: any) => {
  useInViewPort(() => {
    console.log(`${id} mount !!`);
    return () => {
      console.log(`${id} unmount !!`); // executed on FlatList
    };
  });

  const [hide, setHide] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setHide(true);
    }, 1000);
  }, []);

  if (hide) return <View />;
  return <View style={{ width: 10, height: 10 }} />;
};
```

Therefore, the cleanup function of useInViewPort was not designed to run when unmounted, but depending on the situation, it may still run during unmounting.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
