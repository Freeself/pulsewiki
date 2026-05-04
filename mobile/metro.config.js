const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force tRPC and superjson to resolve from root node_modules
// so types are shared between mobile and root.
// Block react-native from resolving in root node_modules to avoid version conflicts.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native' || moduleName.startsWith('react-native/')) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'dummy.ts') },
      moduleName,
      platform,
    );
  }
  if (moduleName.startsWith('@trpc/') || moduleName === 'superjson') {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(monorepoRoot, 'dummy.ts') },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
