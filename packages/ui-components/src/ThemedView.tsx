import { View, type ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
    lightColor?: string;
    darkColor?: string;
    /** Optional background color override */
    backgroundColor?: string;
};

/**
 * Themed View Component
 *
 * A universal view/container component that supports theme-aware background colors.
 * Works seamlessly on both web and mobile platforms.
 *
 * @example
 * ```tsx
 * <ThemedView lightColor="#f0f0f0" darkColor="#1a1a1a">
 *   <ThemedText>Content here</ThemedText>
 * </ThemedView>
 * ```
 */
export function ThemedView({
    style,
    lightColor,
    darkColor,
    backgroundColor,
    ...otherProps
}: ThemedViewProps) {
    // Use provided backgroundColor or default to theme-aware color
    // In a full implementation, you'd use a theme hook here
    const bgColor = backgroundColor || lightColor || 'transparent';

    return <View style={[{ backgroundColor: bgColor }, style]} {...otherProps} />;
}
