const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve react-native-worklets as empty module on web platform
// and resolve zustand to CJS version to avoid import.meta errors
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'react-native-worklets') {
      return { type: 'empty' };
    }
    // Force zustand and its submodules to use CJS versions to avoid import.meta errors
    if (moduleName === 'zustand') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'node_modules/zustand/index.js'),
      };
    }
    if (moduleName === 'zustand/vanilla') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'node_modules/zustand/vanilla.js'),
      };
    }
    if (moduleName === 'zustand/react') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'node_modules/zustand/index.js'),
      };
    }
    if (moduleName === 'zustand/shallow') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'node_modules/zustand/shallow.js'),
      };
    }
    if (moduleName === 'zustand/middleware') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
      };
    }
    if (moduleName === 'zustand/traditional') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'node_modules/zustand/traditional.js'),
      };
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
