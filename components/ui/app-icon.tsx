import createIconSet from '@expo/vector-icons/createIconSet';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const materialGlyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialIcons.json') as Record<
  string,
  number
>;
const materialCommunityGlyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json') as Record<
  string,
  number
>;

const LocalMaterialIcons = createIconSet(
  materialGlyphMap,
  'material',
  require('../../assets/fonts/MaterialIcons.ttf')
);
const LocalMaterialCommunityIcons = createIconSet(
  materialCommunityGlyphMap,
  'material-community',
  require('../../assets/fonts/MaterialCommunityIcons.ttf')
);

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
      <LocalMaterialCommunityIcons
        color={color}
        name={name}
        size={size}
        style={style}
      />
    );
  }

  return <LocalMaterialIcons color={color} name={name} size={size} style={style} />;
}
