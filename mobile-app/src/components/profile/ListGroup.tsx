import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

import Card from '../ui/Card';

export interface ListGroupProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ListGroup: React.FC<ListGroupProps> = ({ children, style }) => (
  <Card padding={0} style={[styles.group, style]}>
    {children}
  </Card>
);

const styles = StyleSheet.create({
  group: {
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
});

export default ListGroup;
