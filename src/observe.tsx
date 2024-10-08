import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { type ViewToken } from 'react-native';

type Clean = () => void;
type Callback = () => Clean | undefined | void;

const CallbacksContext = createContext<{
  addCallback: (key: any, callback: Callback) => void;
  removeCallback: (key: any, clean: Clean) => void;
}>({
  addCallback: () => {},
  removeCallback: () => {},
});

const ItemContext = createContext<{
  key: any;
  isInViewPort: () => boolean | undefined;
}>({
  key: undefined,
  isInViewPort: () => undefined,
});

const isFunction = (f: any) => typeof f === 'function';

export const useInViewPort = (callback: Callback) => {
  const { key } = useContext(ItemContext);
  const { addCallback, removeCallback } = useContext(CallbacksContext);

  useEffect(() => {
    if (!key) return; // If it is not an item of observable list.
    addCallback(key, callback);
    return () => {
      removeCallback(key, callback);
    };
  }, [key, addCallback, removeCallback, callback]);
};

export function observe<L extends React.ComponentType<any>>(List: L): L {
  return function ({
    onViewableItemsChanged,
    keyExtractor,
    renderItem,
    ...props
  }: any) {
    const viewableKeys = useRef<Set<any>>(new Set()).current;
    const callbacksMap = useRef<Map<any, Set<any>> | undefined>(undefined);
    const cleansMap = useRef<Map<any, Set<any>> | undefined>(undefined);

    const addCallback = useCallback(
      (key: any, callback: Callback) => {
        if (!callbacksMap.current) {
          callbacksMap.current = new Map();
        }
        let callbacks = callbacksMap.current.get(key);
        if (!callbacks) {
          callbacks = new Set<Callback>();
          callbacksMap.current.set(key, callbacks);
        }
        callbacks.add(callback);
      },
      [callbacksMap]
    );

    const removeCallback = useCallback(
      (key: any, callback: Callback) => {
        if (!callbacksMap.current) return;
        const callbacks = callbacksMap.current.get(key);
        callbacks?.delete(callback);
        if (callbacks?.size === 0) {
          callbacksMap.current.delete(key);
          if (callbacksMap.current.size === 0) {
            callbacksMap.current = undefined;
          }
        }
      },
      [callbacksMap]
    );

    const { isInViewPort } = useContext(ItemContext);

    // 자신이 ObservableList인 경우
    useInViewPort(() => {
      viewableKeys.forEach((key) => {
        const callbacks = callbacksMap.current?.get(key);
        if (callbacks) {
          callbacks.forEach((callback) => {
            const clean = callback();
            if (clean) {
              if (!cleansMap.current) {
                cleansMap.current = new Map();
              }
              let cleans = cleansMap.current.get(key);
              if (!cleans) {
                cleans = new Set();
                cleansMap.current.set(key, cleans);
              }
              cleans.add(clean);
            }
          });
        }
      });

      return () => {
        viewableKeys.forEach((key) => {
          const cleans = cleansMap.current?.get(key);
          cleans?.forEach((clean) => clean());
          cleansMap.current?.delete(key);
        });
      };
    });

    return (
      <CallbacksContext.Provider value={{ addCallback, removeCallback }}>
        <List
          {...props}
          keyExtractor={keyExtractor}
          onViewableItemsChanged={({
            changed,
            viewableItems,
          }: {
            changed: ViewToken[];
            viewableItems: ViewToken[];
          }) => {
            const willHideKeys = new Set(viewableKeys);

            for (let i = 0; i < viewableItems.length; i++) {
              const viewableItem = viewableItems[i];
              if (!viewableItem) {
                continue;
              }

              const { item, isViewable } = viewableItem;

              if (isViewable) {
                const key =
                  typeof keyExtractor === 'function'
                    ? keyExtractor(item)
                    : item;

                const isNew = !viewableKeys.has(key);
                if (isNew) {
                  viewableKeys.add(key);

                  const callbacks = callbacksMap.current?.get(key);
                  callbacks?.forEach((callback) => {
                    const inViewPort = isInViewPort();
                    // undefined: This is root observable list.
                    // true/false: This is inner observable list.
                    // If FlatList is an inner list, it will notify viewableItems based on itself even if it is outside the viewport of the outer list, so if it is outside the viewport of the outer list (false), execution will be blocked.
                    if (inViewPort !== false) {
                      const clean = callback();
                      if (clean) {
                        if (!cleansMap.current) {
                          cleansMap.current = new Map();
                        }
                        let cleans = cleansMap.current.get(key);
                        if (!cleans) {
                          cleans = new Set<Clean>();
                          cleansMap.current.set(key, cleans);
                        }
                        cleans.add(clean);
                      }
                    }
                  });
                }

                willHideKeys.delete(key);
              }
            }

            willHideKeys.forEach((key) => {
              viewableKeys.delete(key);

              if (!cleansMap.current) {
                cleansMap.current = new Map();
              }
              const cleans = cleansMap.current!.get(key);
              cleans?.forEach((clean) => clean());
              cleansMap.current!.delete(key);
              if (cleansMap.current!.size === 0) {
                cleansMap.current = undefined;
              }
            });

            onViewableItemsChanged?.({ changed, viewableItems });
          }}
          renderItem={(itemProps: any) => {
            const key = isFunction(keyExtractor)
              ? keyExtractor(itemProps.item)
              : itemProps.item;

            // traverse to root recursively.
            const _isInViewPort = () => {
              const isInParentViewPort = isInViewPort();
              const inViewPort = viewableKeys.has(key);
              if (isInParentViewPort === undefined) {
                return inViewPort;
              }
              return inViewPort && isInParentViewPort;
            };
            return (
              <ItemContext.Provider
                value={{ key, isInViewPort: _isInViewPort }}
              >
                {renderItem(itemProps)}
              </ItemContext.Provider>
            );
          }}
        />
      </CallbacksContext.Provider>
    );
  } as L;
}
