import { describe, expect, it } from 'vitest'
import { cn, getPageNumbers } from '../src/lib/utils'

describe('cn', () => {
  it('sınıfları birleştirir ve çakışan tailwind sınıflarını çözer', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', false && 'hidden', 'font-bold')).toBe(
      'text-red-500 font-bold'
    )
  })
})

describe('getPageNumbers', () => {
  it('5 veya daha az sayfada hepsini gösterir', () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(2, 3)).toEqual([1, 2, 3])
  })

  it('başa yakınken sonu üç nokta ile kısaltır', () => {
    expect(getPageNumbers(2, 10)).toEqual([1, 2, 3, 4, '...', 10])
  })

  it('sona yakınken başı üç nokta ile kısaltır', () => {
    expect(getPageNumbers(9, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })

  it('ortadayken her iki tarafı üç nokta ile kısaltır', () => {
    expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10])
  })
})
