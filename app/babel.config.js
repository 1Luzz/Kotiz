module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@hooks': './src/hooks',
            '@lib': './src/lib',
            '@types': './src/types',
            '@constants': './src/constants',
          },
        },
      ],
      // Transform import.meta for web platform compatibility
      // zustand and other ESM packages use import.meta.env.MODE
      'babel-plugin-transform-import-meta',
    ],
  };
};
