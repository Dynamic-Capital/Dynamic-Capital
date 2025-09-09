import test from 'node:test'
import assert from 'node:assert/strict'

if (typeof Deno !== 'undefined') {
  test('skip in deno', () => {})
} else {
  test('ApiDemoPage renders API message', async () => {
    const { JSDOM } = await import('jsdom')
    const React = (await import('react')).default
    const ReactDOM = await import('react-dom/client')
    const { act } = await import('react-dom/test-utils')
    Object.assign(globalThis, { React })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: 'Hello from the API' }), { status: 200 })

    const dom = new JSDOM('<!doctype html><div id="root"></div>')
    // @ts-ignore
    globalThis.window = dom.window
    // @ts-ignore
    globalThis.document = dom.window.document
    Object.defineProperty(globalThis, 'navigator', {
      // @ts-ignore
      value: dom.window.navigator,
      configurable: true,
    })

    const { default: ApiDemoPage } = await import('../../../app/api-demo/page.tsx')
    const root = ReactDOM.createRoot(dom.window.document.getElementById('root')!)

    await act(async () => {
      root.render(React.createElement(ApiDemoPage))
      await Promise.resolve()
    })

    await new Promise((r) => setTimeout(r, 0))
    assert.match(dom.window.document.body.textContent ?? '', /Hello from the API/)
  })
}
