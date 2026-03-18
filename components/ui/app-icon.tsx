import { type ComponentProps } from 'react';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { type OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type AppIconName = string;
type AppIconFamily = 'material' | 'community';

export function AppIcon({
  color,
  family = 'material',
  name,
  size = 24,
  style,
}: {
  color: string | OpaqueColorValue;
  family?: AppIconFamily;
  name: AppIconName;
  size?: number;
  style?: StyleProp<TextStyle>;
}) {
  if (family === 'community') {
    return (
      <MaterialCommunityIcons
        color={color}
        name={name as ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={size}
        style={style}
      />
    );
  }

  return (
    <MaterialIcons
      color={color}
      name={name as ComponentProps<typeof MaterialIcons>['name']}
      size={size}
      style={style}
    />
  );
}
