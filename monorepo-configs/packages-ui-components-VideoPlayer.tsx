/**
 * Universal VideoPlayer Component
 * 
 * This component demonstrates how to create a truly universal component
 * that works on both web and mobile platforms.
 * 
 * Platform-specific implementations are handled using .web.tsx and .native.tsx files,
 * or by checking the platform at runtime.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

export interface VideoPlayerProps {
    /** Video source URL */
    source: string;
    /** Whether the video should autoplay */
    autoPlay?: boolean;
    /** Whether the video should loop */
    loop?: boolean;
    /** Whether to show controls */
    controls?: boolean;
    /** Callback when video ends */
    onEnd?: () => void;
    /** Callback when video is ready */
    onReady?: () => void;
    /** Additional styles */
    style?: any;
}

/**
 * VideoPlayer Component
 * 
 * Usage:
 * ```tsx
 * <VideoPlayer
 *   source="https://example.com/video.mp4"
 *   autoPlay
 *   controls
 *   onEnd={() => console.log('Video ended')}
 * />
 * ```
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    source,
    autoPlay = false,
    loop = false,
    controls = true,
    onEnd,
    onReady,
    style,
}) => {
    // For this example, we'll create a simple stub
    // In production, you would use:
    // - react-player for web
    // - expo-av or react-native-video for mobile

    if (Platform.OS === 'web') {
        // Web implementation using HTML5 video
        return (
            <View style={[styles.container, style]}>
                <video
                    src={source}
                    autoPlay={autoPlay}
                    loop={loop}
                    controls={controls}
                    onEnded={onEnd}
                    onLoadedData={onReady}
                    style={styles.video}
                />
            </View>
        );
    }

    // Mobile implementation (stub - replace with actual implementation)
    return (
        <View style={[styles.container, style]}>
            {/* 
        In production, use expo-av or react-native-video:
        
        <Video
          source={{ uri: source }}
          shouldPlay={autoPlay}
          isLooping={loop}
          useNativeControls={controls}
          onPlaybackStatusUpdate={(status) => {
            if (status.didJustFinish && onEnd) {
              onEnd();
            }
          }}
          style={styles.video}
        />
      */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
});
