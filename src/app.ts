import './app.scss'

import { useLaunch } from '@tarojs/taro'
import { createElement, Fragment, type PropsWithChildren } from 'react'

import { initializeAuth } from './utils/auth'
import { patchDeprecatedSystemInfoApis } from './utils/system-info'

patchDeprecatedSystemInfoApis()

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    void initializeAuth()
  })

  return createElement(
    Fragment,
    null,
    children
  )
}

export default App
