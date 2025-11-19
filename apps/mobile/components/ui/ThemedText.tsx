import { StyleSheet, Text, type TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  /** Optional theme color override */
  color?: string;
};

/**
 * Themed Text Component
 *
 * A universal text component that supports theme-aware colors and predefined text styles.
 * Can be used on both web and mobile platforms.
 *
 * @example
 * ```tsx
 * <ThemedText type="title">Hello World</ThemedText>
 * <ThemedText type="link" color="#007AFF">Click me</ThemedText>
 * ```
 */
export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  color,
  ...rest
}: ThemedTextProps) {
  // Use provided color or default to theme-aware color
  // In a full implementation, you'd use a theme hook here
  const textColor = color || lightColor || '#000000';

  return (
    <Text
      style={[
        { color: textColor },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
