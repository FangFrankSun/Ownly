// Shared cross-platform icon bridge for tab/navigation icons.

import type { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';
import { AppIcon } from '@/components/ui/app-icon';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof AppIcon>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'square.grid.2x2.fill': 'dashboard',
  'paperplane.fill': 'send',
  'checkmark.circle.fill': 'check-circle',
  calendar: 'calendar-month',
  'figure.run': 'directions-run',
  'leaf.fill': 'eco',
  'gearshape.fill': 'settings',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <AppIcon color={color} size={size} name={MAPPING[name]} style={style} />;
}
