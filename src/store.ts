import { useRef } from 'react';
import type { Callback, Clean } from './types';

type CallbacksMap = Map<any, Set<any>>;
type CleansMap = Map<any, Map<Callback, Clean | undefined>>;

export interface Store {
  callbacksMap: { current?: CallbacksMap };
  cleansMap: { current?: CleansMap };
}

export const useStore = (): Store => {
  return useRef({
    callbacksMap: { current: undefined },
    cleansMap: { current: undefined },
  }).current;
};

export const consumeCallbacks = (
  itemKey: any,
  store: {
    callbacksMap: { current?: CallbacksMap };
    cleansMap: { current?: CleansMap };
  }
) => {
  if (!store.callbacksMap.current) return;

  const callbacks = store.callbacksMap.current?.get(itemKey);

  if (!callbacks) return;

  callbacks.forEach((callback) => {
    const clean = callback();
    if (!store.cleansMap.current) {
      store.cleansMap.current = new Map();
    }
    let cleansWithCallback = store.cleansMap.current.get(itemKey);
    if (!cleansWithCallback) {
      cleansWithCallback = new Map();
      store.cleansMap.current.set(itemKey, cleansWithCallback);
    }
    cleansWithCallback.set(callback, clean);
    callbacks.delete(callback);
  });

  if (callbacks.size === 0) {
    store.callbacksMap.current?.delete(itemKey);
    if (store.callbacksMap.current.size === 0) {
      store.callbacksMap.current = undefined;
    }
  }
};

export const consumeCleans = (
  itemKey: any,
  store: {
    callbacksMap: { current?: CallbacksMap };
    cleansMap: { current?: CleansMap };
  }
) => {
  if (!store.cleansMap.current) return;

  const cleansWithCallback = store.cleansMap.current.get(itemKey);

  if (!cleansWithCallback) return;

  cleansWithCallback.forEach((clean, callback) => {
    if (typeof clean === 'function') {
      clean();
    }

    // give back again
    if (!store.callbacksMap.current) {
      store.callbacksMap.current = new Map();
    }
    let callbacks = store.callbacksMap.current.get(itemKey);
    if (!callbacks) {
      callbacks = new Set();
      store.callbacksMap.current.set(itemKey, callbacks);
    }
    callbacks.add(callback);
  });

  store.cleansMap.current.delete(itemKey);
  if (store.cleansMap.current.size === 0) {
    store.cleansMap.current = undefined;
  }
};
