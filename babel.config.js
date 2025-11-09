module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  // react-native-reanimated/plugin must be listed last
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
