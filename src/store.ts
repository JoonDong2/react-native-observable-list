import { useRef } from 'react';
import type { Callback, Clean } from './types';

type CallbacksMap = Map<any, Set<any>>;
type CleansMap = Map<any, Map<Callback, Clean | undefined | void>>;

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

export const addCallback = (store: Store, itemKey: any, callback: Callback) => {
  if (!store.callbacksMap.current) {
    store.callbacksMap.current = new Map();
  }
  let callbacks = store.callbacksMap.current.get(itemKey);
  if (!callbacks) {
    callbacks = new Set<Callback>();
    store.callbacksMap.current.set(itemKey, callbacks);
  }
  callbacks.add(callback);
};

export const removeCallback = (
  store: Store,
  itemKey: any,
  callback: Callback
) => {
  if (!store.callbacksMap.current) return;
  const callbacks = store.callbacksMap.current.get(itemKey);
  callbacks?.delete(callback);
  if (callbacks?.size === 0) {
    store.callbacksMap.current.delete(itemKey);
    if (store.callbacksMap.current.size === 0) {
      store.callbacksMap.current = undefined;
    }
  }
};

const removeCallbacks = (store: Store, itemKey: any) => {
  if (!store.callbacksMap.current) return;
  store.callbacksMap.current.delete(itemKey);
  if (store.callbacksMap.current.size === 0) {
    store.callbacksMap.current = undefined;
  }
};

export const addClean = (
  store: Store,
  itemKey: any,
  callback: Callback,
  clean: Clean | undefined | void
) => {
  if (!store.cleansMap.current) {
    store.cleansMap.current = new Map();
  }
  let cleansWithCallback = store.cleansMap.current.get(itemKey);
  if (!cleansWithCallback) {
    cleansWithCallback = new Map();
    store.cleansMap.current.set(itemKey, cleansWithCallback);
  }
  cleansWithCallback.set(callback, clean);
};

export const removeClean = (store: Store, itemKey: any, callback: Callback) => {
  if (!store.cleansMap.current) return;
  const cleansWithCallback = store.cleansMap.current.get(itemKey);
  cleansWithCallback?.delete(callback);
  if (cleansWithCallback?.size === 0) {
    store.cleansMap.current.delete(itemKey);
    if (store.cleansMap.current.size === 0) {
      store.cleansMap.current = undefined;
    }
  }
};

const removeCleans = (store: Store, itemKey: any) => {
  if (!store.cleansMap.current) return;
  store.cleansMap.current.delete(itemKey);
  if (store.cleansMap.current.size === 0) {
    store.cleansMap.current = undefined;
  }
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
    addClean(store, itemKey, callback, clean);
  });

  removeCallbacks(store, itemKey);
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
    addCallback(store, itemKey, callback);
  });

  removeCleans(store, itemKey);
};
