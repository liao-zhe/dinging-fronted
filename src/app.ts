import './app.scss'

import { createElement, Fragment } from 'react'

import { patchDeprecatedSystemInfoApis } from './utils/system-info'

patchDeprecatedSystemInfoApis()

function App({ children }) {
  return createElement(
    Fragment,
    null,
    children
  )
}

export default App
