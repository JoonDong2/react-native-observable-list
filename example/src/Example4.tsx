/* eslint-disable react-native/no-inline-styles */
import { useRef, useState, type PropsWithChildren } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { observe, useIsFirst } from 'react-native-observable-list';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const ObservableFlatList = observe(FlatList);

const Item = ({ color, height = 500 }: { color: string; height?: number }) => {
  return <View style={{ backgroundColor: color, height }} />;
};

const IsFirst = ({
  children,
  onFirst,
}: PropsWithChildren<{ onFirst: () => void }>) => {
  useIsFirst(() => {
    onFirst();
  }, []);
  return children;
};

const Tab = ({
  onPress,
  first,
  style,
}: {
  onPress: (index: number) => void;
  first?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  return (
    <>
      <ScrollView
        horizontal
        style={[
          {
            height: 50,
            backgroundColor: 'lightgray',
            width: '100%',
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {data
          .filter((color) => color !== 'tab' && color !== 'blue')
          .map((color, index) => {
            return (
              <Pressable
                key={color}
                onPress={() => onPress(index)}
                style={{
                  height: 50,
                  padding: 10,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor:
                    color === first || (!first && index === 0)
                      ? 'gray'
                      : undefined,
                }}
              >
                <Text style={{ color: 'black' }}>{color}</Text>
              </Pressable>
            );
          })}
      </ScrollView>
    </>
  );
};

const data = ['blue', 'tab', 'yellow', 'green', 'orange'];

const Example4 = () => {
  const flatlist = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const [first, setFirst] = useState<string | undefined>(undefined);
  return (
    <>
      <View
        style={{
          height: 50 + insets.top,
          paddingTop: insets.top,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text>Header</Text>
      </View>
      <ObservableFlatList
        ref={flatlist}
        data={data}
        contentContainerStyle={{ paddingBottom: 500 }}
        stickyHeaderIndices={[1]}
        renderItem={({ item: color }) => {
          // contents header
          if (color === 'blue') {
            return <Item color={color} />;
          }
          if (color === 'tab') {
            return (
              <Tab
                first={first}
                onPress={(index) => {
                  flatlist.current?.scrollToIndex({
                    index: index + 2,
                    animated: true,
                  });
                }}
              />
            );
          }
          // contents
          return (
            <IsFirst
              onFirst={() => {
                setFirst(color);
              }}
            >
              <Item color={color} />
            </IsFirst>
          );
        }}
      />
    </>
  );
};

export default () => {
  return (
    <SafeAreaProvider>
      <Example4 />
    </SafeAreaProvider>
  );
};
