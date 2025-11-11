module.exports = (api) => {
    api.cache(true);
    const plugins = [];

    // react-native-reanimated/plugin must be listed last
    plugins.push('react-native-reanimated/plugin');

    return {
        presets: ['babel-preset-expo'],
        plugins,
    };
};
