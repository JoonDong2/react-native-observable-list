import React, { useCallback } from 'react';
import { useInViewPort } from '../../src/observe';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  label: string | number;
  width?: number;
}

const TrackableItem = ({ label, width }: Props) => {
  useInViewPort(
    useCallback(() => {
      console.log(`id: ${label} is visible`);

      return () => {
        console.log(`id: ${label} was hidden`);
      };
    }, [label])
  );
  return (
    <View style={[styles.container, { width }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 100,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: 'yellow',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'black',
  },
});

export default TrackableItem;
