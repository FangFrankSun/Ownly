import { type ComponentProps, forwardRef } from 'react';
import { Pressable, type View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

type AnimatedPressableProps = ComponentProps<typeof Pressable> & {
  /** Scale factor when pressed. Default 0.975 gives a subtle "tap" feel. */
  pressScale?: number;
  /** Opacity when pressed. Default 0.9 gives a gentle dim. */
  pressOpacity?: number;
};

/**
 * Drop-in replacement for Pressable that adds a subtle spring scale
 * and opacity animation on press/release. Feels light and responsive
 * on both web and native without blocking the gesture.
 */
export const AnimatedPressable = forwardRef<View, AnimatedPressableProps>(
  function AnimatedPressable(
    { pressScale = 0.975, pressOpacity = 0.9, onPressIn, onPressOut, style, ...rest },
    ref
  ) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    return (
      <ReanimatedPressable
        ref={ref}
        onPressIn={(event) => {
          scale.value = withSpring(pressScale, { damping: 20, stiffness: 420, mass: 0.42 });
          opacity.value = withTiming(pressOpacity, { duration: 70 });
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.value = withSpring(1, { damping: 18, stiffness: 360, mass: 0.45 });
          opacity.value = withTiming(1, { duration: 120 });
          onPressOut?.(event);
        }}
        style={[animatedStyle, style]}
        {...rest}
      />
    );
  },
);
