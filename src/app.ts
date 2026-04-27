import './app.scss'

import { createElement, Fragment, type PropsWithChildren } from 'react'

import { patchDeprecatedSystemInfoApis } from './utils/system-info'

patchDeprecatedSystemInfoApis()

function App({ children }: PropsWithChildren) {
  return createElement(
    Fragment,
    null,
    children
  )
}

export default App
