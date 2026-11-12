import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { iconData, IconName } from './iconData';
import useAppTheme from '../../../hooks/useAppTheme';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const Icon: React.FC<IconProps> = ({ name, size, color, style }) => {
  const { colors } = useAppTheme();
  const definition = iconData[name];
  const width = size ?? definition.width;
  const height = size ? (size * definition.height) / definition.width : definition.height;

  return (
    <SvgXml
      xml={definition.xml}
      width={width}
      height={height}
      color={color ?? colors.ink}
      style={style}
      importantForAccessibility="no"
    />
  );
};

export type { IconName };
export default Icon;
