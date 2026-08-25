// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

import type { Context } from '../src/context-types.ts'
import { api } from '../src/client/api.ts'
import { BrowserView } from '../src/client/BrowserView.tsx'
import {
  allLeaves,
  createSidebarStore,
  openTabInActivePane,
  type SidebarTab,
} from '../src/client/state.ts'

const CTX = {} as Context

function currentTab(store: ReturnType<typeof createSidebarStore>, id: string): SidebarTab {
  const state = store.getSnapshot().state!
  const tab = allLeaves(state.splits)
    .concat(allLeaves(state.bottomSplits))
    .flatMap(leaf => leaf.tabs)
    .find(candidate => candidate.id === id)
  expect(tab).toBeDefined()
  return tab!
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  expect(setter).toBeDefined()
  act(() => {
    setter!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function click(target: Element): void {
  act(() => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
  })
}

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('BrowserView history persistence', () => {
  it('persists back/forward destinations into the tab path and title', () => {
    vi.spyOn(api, 'browserProbe').mockResolvedValue({ reachable: false })

    const store = createSidebarStore()
    store.setSession('s1')
    const tab: SidebarTab = {
      id: 'browser:1',
      type: 'browser',
      title: 'a.example',
      path: 'https://a.example/',
    }
    store.reduce(state => openTabInActivePane(state, tab))

    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(createElement(BrowserView, {
        ctx: CTX,
        store,
        scope: { sessionId: 's1', cwd: '/p' },
        tab,
        visible: true,
      }))
    })

    try {
      const input = container.querySelector('input') as HTMLInputElement
      expect(input).not.toBeNull()
      setInputValue(input, 'https://b.example/')
      const go = input.nextElementSibling
      expect(go).not.toBeNull()
      click(go!)
      expect(currentTab(store, tab.id)).toMatchObject({ path: 'https://b.example/', title: 'b.example' })

      const buttons = container.querySelectorAll('button')
      const back = buttons[0]
      const forward = buttons[1]
      expect(back).toBeDefined()
      expect(forward).toBeDefined()

      click(back!)
      expect(currentTab(store, tab.id)).toMatchObject({ path: 'https://a.example/', title: 'a.example' })

      click(forward!)
      expect(currentTab(store, tab.id)).toMatchObject({ path: 'https://b.example/', title: 'b.example' })
    } finally {
      act(() => { root.unmount() })
      container.remove()
    }
  })
})
