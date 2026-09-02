import { describe, expect, it } from 'vitest'

import { PAGE_WINDOW, pageCount, pageWindow } from './pagination'

describe('pageWindow', () => {
  it('전체가 창보다 적으면 있는 만큼만 낸다', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
  })

  it('가운데에서는 현재 페이지를 중앙에 둔다', () => {
    expect(pageWindow(10, 20)).toEqual([8, 9, 10, 11, 12])
  })

  it('앞쪽에서는 1 아래로 내려가지 않는다', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(2, 20)).toEqual([1, 2, 3, 4, 5])
  })

  it('뒤쪽에서도 버튼 수를 유지한다 — 마지막에서 한 개만 남지 않는다', () => {
    expect(pageWindow(20, 20)).toEqual([16, 17, 18, 19, 20])
    expect(pageWindow(19, 20)).toEqual([16, 17, 18, 19, 20])
  })

  it('어디서든 창 크기를 넘지 않는다', () => {
    for (let page = 1; page <= 30; page++) {
      expect(pageWindow(page, 30)).toHaveLength(PAGE_WINDOW)
    }
  })

  it('페이지가 없으면 빈 배열', () => {
    expect(pageWindow(1, 0)).toEqual([])
  })
})

describe('pageCount', () => {
  it('나머지가 있으면 한 페이지 더', () => {
    expect(pageCount(31, 15)).toBe(3)
    expect(pageCount(30, 15)).toBe(2)
  })

  it('0건이어도 1페이지다 — 빈 목록에도 화면이 있다', () => {
    expect(pageCount(0, 15)).toBe(1)
  })
})
