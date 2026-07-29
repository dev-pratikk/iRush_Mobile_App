module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@lib': './lib',
            '@components': './components',
            '@types': './types',
            '@mocks': './mocks',
            '@theme': './theme',
            '@services': './services',
            '@hooks': './hooks',
            '@context': './context',
            '@constants': './constants',
          },
        },
      ],
    ],
  };
};
