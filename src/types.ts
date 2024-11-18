import type { ViewToken } from 'react-native';

export type Clean = () => void;
export type Callback = () => Clean | undefined | void;
export type OnViewableItemsChanged = (info: {
  viewableItems: Array<ViewToken<any>>;
  changed: Array<ViewToken<any>>;
}) => void;
