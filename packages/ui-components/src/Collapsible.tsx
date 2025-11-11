import type React from 'react';
import { type PropsWithChildren, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type CollapsibleProps = PropsWithChildren & {
    title: string;
    /** Optional icon component */
    icon?: React.ReactNode;
    /** Initially open state */
    defaultOpen?: boolean;
};

/**
 * Collapsible Component
 *
 * An accordion-style component that can expand and collapse content.
 * Universal component that works on both web and mobile.
 *
 * @example
 * ```tsx
 * <Collapsible title="Show More">
 *   <Text>Hidden content here</Text>
 * </Collapsible>
 * ```
 */
export function Collapsible({ children, title, icon, defaultOpen = false }: CollapsibleProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <View>
            <TouchableOpacity
                style={styles.heading}
                onPress={() => setIsOpen((value) => !value)}
                activeOpacity={0.8}
            >
                {icon && <View style={styles.icon}>{icon}</View>}
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.chevron}>{isOpen ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {isOpen && <View style={styles.content}>{children}</View>}
        </View>
    );
}

const styles = StyleSheet.create({
    heading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 12,
    },
    icon: {
        marginRight: 8,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    chevron: {
        fontSize: 12,
        color: '#666',
    },
    content: {
        marginTop: 6,
        marginLeft: 24,
        paddingBottom: 12,
    },
});
