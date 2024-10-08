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

const ConfigurationContext = createContext<{ enabled?: boolean }>({
  enabled: true,
});

const CallbacksContext = createContext<{
  addCallback: (key: any, callback: Callback) => void;
  removeCallback: (key: any, clean: Clean) => void;
}>({
  addCallback: () => {},
  removeCallback: () => {},
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
  const { addCallback, removeCallback } = useContext(CallbacksContext);

  const finalDeps = Array.isArray(deps) ? deps : [callback];

  useEffect(() => {
    if (!key) return; // If it is not an item of observable list.
    addCallback(key, callback);
    return () => {
      removeCallback(key, callback);
    };
    // The callback depends on deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, addCallback, removeCallback, ...finalDeps]);
};

export function observe<L extends React.ComponentType<any>>(List: L) {
  return React.forwardRef<L, any>(function (
    { onViewableItemsChanged, keyExtractor, renderItem, $$enabled, ...props },
    ref
  ) {
    const { isInViewPort, key } = useContext(ItemContext);

    const viewableKeys = useRef<Set<any>>(new Set()).current;

    // callbacks -> callbacksMap ------−>  callback()
    //                   ↑ callback            ↓
    //                clean() ← cleansMap <- clean
    const callbacksMap = useRef<Map<any, Set<any>> | undefined>(undefined);
    const cleansMap = useRef<
      Map<any, Map<Callback, Clean | undefined>> | undefined
    >(undefined);

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

    const addCallback = useCallback(
      (key: any, callback: Callback) => {
        if (isInViewPortRecursively(key)) {
          const clean = callback();
          if (clean) {
            if (!cleansMap.current) {
              cleansMap.current = new Map();
            }
            let cleansWithCallback = cleansMap.current.get(key);
            if (!cleansWithCallback) {
              cleansWithCallback = new Map();
              cleansMap.current.set(key, cleansWithCallback);
            }
            cleansWithCallback.set(callback, clean);
          }
        } else {
          if (!callbacksMap.current) {
            callbacksMap.current = new Map();
          }
          let callbacks = callbacksMap.current.get(key);
          if (!callbacks) {
            callbacks = new Set<Callback>();
            callbacksMap.current.set(key, callbacks);
          }
          callbacks.add(callback);
        }
      },
      [isInViewPortRecursively]
    );

    const removeCallback = useCallback((key: any, callback: Callback) => {
      if (callbacksMap.current) {
        const callbacks = callbacksMap.current.get(key);
        callbacks?.delete(callback);
        if (callbacks?.size === 0) {
          callbacksMap.current.delete(key);
          if (callbacksMap.current.size === 0) {
            callbacksMap.current = undefined;
          }
        }
      }
      if (cleansMap.current) {
        const cleansWithCallback = cleansMap.current.get(key);
        cleansWithCallback?.delete(callback);
        if (cleansWithCallback?.size === 0) {
          cleansMap.current.delete(key);
          if (cleansMap.current.size === 0) {
            cleansMap.current = undefined;
          }
        }
      }
    }, []);

    const { enabled: parentEnabled } = useContext(ConfigurationContext);
    const enabled = parentEnabled && $$enabled !== false ? true : false;
    const enabledRef = useRef(enabled); //  This is because `FlashList` does not detect changes in `onViewableItemsChanged`.
    useEffect(() => {
      enabledRef.current = enabled;
    }, [enabled]);

    // When self is an item of an observable list.
    useInViewPort(() => {
      if (!enabled) return;

      viewableKeys.forEach((key) => {
        const callbacks = callbacksMap.current?.get(key);
        if (callbacks) {
          callbacks.forEach((callback) => {
            const clean = callback();
            if (!cleansMap.current) {
              cleansMap.current = new Map();
            }
            let cleansWithCallback = cleansMap.current.get(key);
            if (!cleansWithCallback) {
              cleansWithCallback = new Map();
              cleansMap.current.set(key, cleansWithCallback);
            }
            cleansWithCallback.set(callback, clean);
            callbacks.delete(callback);
          });
          callbacksMap.current?.delete(key);
          if (callbacksMap.current?.size === 0) {
            callbacksMap.current = undefined;
          }
        }
      });

      return () => {
        viewableKeys.forEach((key) => {
          const cleansWithCallback = cleansMap.current?.get(key);
          if (cleansWithCallback) {
            cleansWithCallback.forEach((clean, callback) => {
              if (typeof clean === 'function') {
                clean();
              }

              // give back again
              if (!callbacksMap.current) {
                callbacksMap.current = new Map();
              }
              let callbacks = callbacksMap.current.get(key);
              if (!callbacks) {
                callbacks = new Set();
                callbacksMap.current.set(key, callbacks);
              }
              callbacks.add(callback);
            });
            cleansMap.current?.delete(key);
            if (cleansMap.current?.size === 0) {
              cleansMap.current = undefined;
            }
          }
        });
      };
    }, [enabled]);

    useEffect(() => {
      // true -> false
      if (!enabled) {
        // give back all cleans
        viewableKeys.forEach((key) => {
          const cleansWithCallback = cleansMap.current?.get(key);
          cleansWithCallback?.forEach((clean, callback) => {
            if (typeof clean === 'function') {
              clean();
            }

            if (!callbacksMap.current) {
              callbacksMap.current = new Map();
            }
            let callbacks = callbacksMap.current.get(key);
            if (!callbacks) {
              callbacks = new Set();
              callbacksMap.current.set(key, callbacks);
            }
            callbacks.add(callback);
          });
          cleansMap.current?.delete(key);
          if (callbacksMap.current?.size === 0) {
            callbacksMap.current = undefined;
          }
        });
      }

      return () => {
        // false -> true
        if (!enabled) {
          // consume callback
          viewableKeys.forEach((key) => {
            const callbacks = callbacksMap.current?.get(key);
            callbacks?.forEach((callback) => {
              const inViewPort = isInViewPortRecursively(key);
              if (inViewPort) {
                const clean = callback();
                if (!cleansMap.current) {
                  cleansMap.current = new Map();
                }
                let cleansWithCallback = cleansMap.current.get(key);
                if (!cleansWithCallback) {
                  cleansWithCallback = new Map();
                  cleansMap.current.set(key, cleansWithCallback);
                }
                cleansWithCallback.set(callback, clean);
                callbacks.delete(callback);
              }
            });
            if (callbacks?.size === 0) {
              callbacksMap.current?.delete(key);
              if (callbacksMap.current?.size === 0) {
                callbacksMap.current = undefined;
              }
            }
          });
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    const ListComponent = List as any;

    return (
      <ConfigurationContext.Provider value={{ enabled }}>
        <CallbacksContext.Provider value={{ addCallback, removeCallback }}>
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
                    const itemKey =
                      typeof keyExtractor === 'function'
                        ? keyExtractor(item)
                        : item;

                    const isNew = !viewableKeys.has(itemKey);
                    if (isNew) {
                      viewableKeys.add(itemKey);

                      if (enabledRef.current) {
                        const callbacks = callbacksMap.current?.get(itemKey);
                        callbacks?.forEach((callback) => {
                          const inViewPort = isInViewPortRecursively(itemKey);
                          if (inViewPort) {
                            const clean = callback();
                            if (!cleansMap.current) {
                              cleansMap.current = new Map();
                            }
                            let cleansWithCallback =
                              cleansMap.current.get(itemKey);
                            if (!cleansWithCallback) {
                              cleansWithCallback = new Map();
                              cleansMap.current.set(
                                itemKey,
                                cleansWithCallback
                              );
                            }
                            cleansWithCallback.set(callback, clean);
                            callbacks.delete(callback);
                          }
                        });
                        if (callbacks?.size === 0) {
                          callbacksMap.current?.delete(itemKey);
                          if (callbacksMap.current?.size === 0) {
                            callbacksMap.current = undefined;
                          }
                        }
                      }
                    }

                    willHideKeys.delete(itemKey);
                  }
                }

                willHideKeys.forEach((key) => {
                  viewableKeys.delete(key);

                  if (enabledRef.current) {
                    if (!cleansMap.current) {
                      cleansMap.current = new Map();
                    }
                    const cleansWithCallback = cleansMap.current.get(key);

                    cleansWithCallback?.forEach((clean, callback) => {
                      if (typeof clean === 'function') {
                        clean();
                      }

                      // give back again
                      if (!callbacksMap.current) {
                        callbacksMap.current = new Map();
                      }
                      let callbacks = callbacksMap.current.get(key);
                      if (!callbacks) {
                        callbacks = new Set();
                        callbacksMap.current.set(key, callbacks);
                      }
                      callbacks.add(callback);
                    });
                    cleansMap.current.delete(key);
                    if (cleansMap.current.size === 0) {
                      cleansMap.current = undefined;
                    }
                  }
                });

                onViewableItemsChanged?.({ changed, viewableItems });
              },
              [
                isInViewPortRecursively,
                keyExtractor,
                onViewableItemsChanged,
                viewableKeys,
              ]
            )}
            renderItem={useCallback(
              (itemProps: any) => {
                const key = isFunction(keyExtractor)
                  ? keyExtractor(itemProps.item)
                  : itemProps.item;

                return (
                  <ItemContext.Provider
                    value={{ key, isInViewPort: isInViewPortRecursively }}
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
  }) as unknown as React.ComponentType<
    React.ComponentProps<L> & { $$enabled?: boolean; ref?: any }
  >;
}
