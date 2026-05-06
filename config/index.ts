import {
  defineConfig,
  type UserConfigExport
} from '@tarojs/cli/dist/util/defineConfig.js'

import devConfig from './dev.ts'
import prodConfig from './prod.ts'

const baseConfig: UserConfigExport<'webpack5'> = {
  projectName: 'family-menu-miniapp',
  date: '2026-4-14',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist-weapp',
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false
    }
  },
  cache: {
    enable: false
  },
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [
      { from: 'assets', to: 'dist-weapp/assets' }
    ],
    options: {}
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static'
  }
}

export default defineConfig(async (merge) => {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }

  return merge({}, baseConfig, prodConfig)
})
