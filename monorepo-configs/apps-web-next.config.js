/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // Configure transpilation for workspace packages
    // This is CRITICAL for pnpm workspaces to work correctly
    transpilePackages: [
        '@flip-feeds/firebase-config',
        '@flip-feeds/shared-logic',
        '@flip-feeds/ui-components',
        'react-native',
        'react-native-web',
    ],

    // Webpack configuration for React Native Web compatibility
    webpack: (config) => {
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            // Transform all react-native imports to react-native-web
            'react-native$': 'react-native-web',
        };

        config.resolve.extensions = [
            '.web.js',
            '.web.jsx',
            '.web.ts',
            '.web.tsx',
            ...config.resolve.extensions,
        ];

        return config;
    },

    // Output configuration
    output: 'export', // For static export (Firebase Hosting)
    // output: 'standalone', // Use this for SSR deployments

    // Image optimization (disable for static export)
    images: {
        unoptimized: true,
    },

    // Environment variables that should be exposed to the browser
    env: {
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },

    // Experimental features
    experimental: {
        // Enable optimizations
        optimizeCss: true,
    },
};

module.exports = nextConfig;
