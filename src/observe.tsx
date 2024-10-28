import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import {
  type CellRendererProps,
  type ListRenderItem,
  type ViewToken,
} from 'react-native';
import {
  addCallback,
  addClean,
  consumeCallbacks,
  consumeCleans,
  removeCallback,
  removeClean,
  useStore,
  type Store,
} from './store';
import type { Callback, Clean } from './types';

const ConfigurationContext = createContext<{ enabled?: boolean }>({
  enabled: true,
});

const CallbacksContext = createContext<{
  addInViewPortCallback: (key: any, callback: Callback) => void;
  removeInViewPortCallback: (key: any, clean: Clean) => void;
  addIsFirstCallback: (key: any, callback: Callback) => void;
  removeIsFirstCallback: (key: any, clean: Clean) => void;
}>({
  addInViewPortCallback: () => {},
  removeInViewPortCallback: () => {},
  addIsFirstCallback: () => {},
  removeIsFirstCallback: () => {},
});

const ItemContext = createContext<{
  key: any;
  isInViewPort: (key: any) => boolean | undefined;
}>({
  key: undefined,
  isInViewPort: () => undefined,
});

const isFunction = (f: any) => typeof f === 'function';

export const useInViewPort = (callback: Callback, deps?: any[]) => {
  const { key } = useContext(ItemContext);
  const { addInViewPortCallback, removeInViewPortCallback } =
    useContext(CallbacksContext);

  const finalDeps = Array.isArray(deps) ? deps : [];

  useEffect(() => {
    if (!key) return; // If it is not an item of observable list.
    addInViewPortCallback(key, callback);
    return () => {
      removeInViewPortCallback(key, callback);
    };
    // The callback depends on deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, addInViewPortCallback, removeInViewPortCallback, ...finalDeps]);
};

export const useIsFirst = (callback: Callback, deps?: any[]) => {
  const { key } = useContext(ItemContext);
  const { addIsFirstCallback, removeIsFirstCallback } =
    useContext(CallbacksContext);

  const finalDeps = Array.isArray(deps) ? deps : [];

  useEffect(() => {
    if (!key) return; // If it is not an item of observable list.
    addIsFirstCallback(key, callback);
    return () => {
      removeIsFirstCallback(key, callback);
    };
    // The callback depends on deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, addIsFirstCallback, removeIsFirstCallback, ...finalDeps]);
};

export function observe<L extends React.ComponentType<any>>(List: L) {
  return React.forwardRef<L, any>(function (
    { onViewableItemsChanged, keyExtractor, renderItem, $$enabled, ...props },
    ref
  ) {
    const { isInViewPort, key } = useContext(ItemContext);

    const firstKey = useRef<any>();
    const viewableKeys = useRef<Set<any>>(new Set()).current;

    // traverse to root recursively.
    const isInViewPortRecursively = useCallback(
      (itemKey: any) => {
        const isInParentViewPort = isInViewPort(key);
        const inViewPort = viewableKeys.has(itemKey);
        if (isInParentViewPort === undefined) {
          return inViewPort;
        }
        return inViewPort && isInParentViewPort;
      },
      [isInViewPort, key, viewableKeys]
    );

    const inViewPortStore = useStore();
    const isFirstStore = useStore();

    const addCallbackOrClean = useCallback(
      (store: Store, itemKey: any, callback: Callback) => {
        if (isInViewPortRecursively(itemKey)) {
          const clean = callback();
          addClean(store, itemKey, callback, clean);
        } else {
          addCallback(store, itemKey, callback);
        }
      },
      [isInViewPortRecursively]
    );

    const removeCallbackTasks = useRef<(() => void)[]>();

    const reserveRemoveCallbackAndClean = useCallback(
      (store: Store, itemKey: any, callback: Callback) => {
        const task = () => {
          removeCallback(store, itemKey, callback);
          removeClean(store, itemKey, callback);
        };
        if (!removeCallbackTasks.current) {
          removeCallbackTasks.current = [];
        }
        removeCallbackTasks.current.push(task);
      },
      []
    );

    const { enabled: parentEnabled } = useContext(ConfigurationContext);
    const enabled = parentEnabled && $$enabled !== false ? true : false;
    const enabledRef = useRef(enabled); //  This is because `FlashList` does not detect changes in `onViewableItemsChanged`.
    useEffect(() => {
      enabledRef.current = enabled;
    }, [enabled]);

    // When self is an item of an observable list.
    useInViewPort(() => {
      if (!enabled) return;

      viewableKeys.forEach((itemKey) => {
        if (isInViewPortRecursively(itemKey)) {
          consumeCallbacks(itemKey, inViewPortStore);
        }
      });

      return () => {
        viewableKeys.forEach((itemKey) => {
          consumeCleans(itemKey, inViewPortStore);
        });
      };
    }, [enabled]);

    useEffect(() => {
      // true -> false
      if (!enabled) {
        viewableKeys.forEach((itemKey) => {
          consumeCleans(itemKey, inViewPortStore);
        });
      }

      return () => {
        // false -> true
        if (!enabled) {
          // consume callback
          viewableKeys.forEach((itemKey) => {
            if (isInViewPortRecursively(itemKey)) {
              consumeCallbacks(itemKey, inViewPortStore);
            }
          });
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    const ListComponent = List as any;

    return (
      <ConfigurationContext.Provider value={{ enabled }}>
        <CallbacksContext.Provider
          value={{
            addInViewPortCallback: useCallback(
              (itemKey: any, callback: Callback) =>
                addCallbackOrClean(inViewPortStore, itemKey, callback),
              [addCallbackOrClean, inViewPortStore]
            ),
            removeInViewPortCallback: useCallback(
              (itemKey: any, callback: Callback) =>
                reserveRemoveCallbackAndClean(
                  inViewPortStore,
                  itemKey,
                  callback
                ),
              [reserveRemoveCallbackAndClean, inViewPortStore]
            ),
            addIsFirstCallback: useCallback(
              (itemKey: any, callback: Callback) =>
                addCallbackOrClean(isFirstStore, itemKey, callback),
              [addCallbackOrClean, isFirstStore]
            ),
            removeIsFirstCallback: useCallback(
              (itemKey: any, callback: Callback) =>
                reserveRemoveCallbackAndClean(isFirstStore, itemKey, callback),
              [reserveRemoveCallbackAndClean, isFirstStore]
            ),
          }}
        >
          <ListComponent
            {...props}
            ref={ref}
            keyExtractor={keyExtractor}
            onViewableItemsChanged={useCallback(
              ({
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
                    const itemKey = isFunction(keyExtractor)
                      ? keyExtractor(item)
                      : item;

                    const isNew = !viewableKeys.has(itemKey);
                    if (isNew) {
                      viewableKeys.add(itemKey);

                      if (enabledRef.current) {
                        if (isInViewPortRecursively(itemKey)) {
                          consumeCallbacks(itemKey, inViewPortStore);
                        }
                      }
                    }

                    willHideKeys.delete(itemKey);
                  }
                }

                willHideKeys.forEach((itemKey) => {
                  viewableKeys.delete(itemKey);

                  if (enabledRef.current) {
                    consumeCleans(itemKey, inViewPortStore);
                  }
                });

                const first = viewableItems[0]?.item;
                const firstItemKey = isFunction(keyExtractor)
                  ? keyExtractor(first)
                  : first;

                if (enabledRef.current && firstItemKey !== firstKey.current) {
                  const prevKey = firstKey.current;

                  if (prevKey !== undefined) {
                    consumeCleans(prevKey, isFirstStore);
                  }

                  firstKey.current = firstItemKey;

                  if (isInViewPortRecursively(firstItemKey)) {
                    consumeCallbacks(firstItemKey, isFirstStore);
                  }
                }

                // reserved from removeCallbackAndClean
                if (removeCallbackTasks.current) {
                  for (let i = 0; i < removeCallbackTasks.current.length; i++) {
                    removeCallbackTasks.current[i]?.();
                  }
                }
                removeCallbackTasks.current = undefined;

                onViewableItemsChanged?.({ changed, viewableItems });
              },
              [
                isInViewPortRecursively,
                keyExtractor,
                onViewableItemsChanged,
                // ref
                inViewPortStore,
                isFirstStore,
                viewableKeys,
              ]
            )}
            renderItem={useCallback(
              (itemProps: any) => {
                const itemKey = isFunction(keyExtractor)
                  ? keyExtractor(itemProps.item)
                  : itemProps.item;

                return (
                  <ItemContext.Provider
                    value={{
                      key: itemKey,
                      isInViewPort: isInViewPortRecursively,
                    }}
                  >
                    {renderItem(itemProps)}
                  </ItemContext.Provider>
                );
              },
              [isInViewPortRecursively, keyExtractor, renderItem]
            )}
          />
        </CallbacksContext.Provider>
      </ConfigurationContext.Provider>
    );
  }) as unknown as <ItemT>(
    props: Omit<
      React.ComponentProps<L>,
      | 'ref'
      | 'data'
      | 'renderItem'
      | 'getItemLayout'
      | 'onViewableItemsChanged'
      | 'keyExtractor'
      | 'CellRendererComponent'
      | 'getItemType'
    > & {
      ref?: any;
      $$enabled?: boolean;
      data: ItemT[];
      renderItem: ListRenderItem<ItemT>;
      getItemLayout?:
        | ((
            data: ArrayLike<ItemT> | null | undefined,
            index: number
          ) => { length: number; offset: number; index: number })
        | undefined;
      onViewableItemsChanged?:
        | ((info: {
            viewableItems: Array<ViewToken<ItemT>>;
            changed: Array<ViewToken<ItemT>>;
          }) => void)
        | null
        | undefined;
      keyExtractor?: ((item: ItemT, index: number) => string) | undefined;
      CellRendererComponent?:
        | React.ComponentType<CellRendererProps<ItemT>>
        | null
        | undefined;
      getItemType?: (
        item: ItemT,
        index: number,
        extraData?: any
      ) => string | number | undefined;
    }
  ) => React.ReactElement;
}
