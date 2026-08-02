import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

// sonner toast'ı mock'la — testler DOM/gerçek toast gerektirmesin.
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}))

// console.log'u sustur (fonksiyon hata nesnesini logluyor).
vi.spyOn(console, 'log').mockImplementation(() => {})

import { handleServerError } from '../src/lib/handle-server-error'

afterEach(() => {
  toastError.mockClear()
})

describe('handleServerError', () => {
  it('bilinmeyen hata için varsayılan mesajı gösterir', () => {
    handleServerError(new Error('boom'))
    expect(toastError).toHaveBeenCalledWith('Something went wrong!')
  })

  it('204 durum kodu için "Content not found." gösterir', () => {
    handleServerError({ status: 204 })
    expect(toastError).toHaveBeenCalledWith('Content not found.')
  })

  it('AxiosError için response.data.title mesajını kullanır', () => {
    const err = new AxiosError('req failed')
    // @ts-expect-error minimal response şekli test için yeterli
    err.response = { data: { title: 'Yetkisiz erişim' } }
    handleServerError(err)
    expect(toastError).toHaveBeenCalledWith('Yetkisiz erişim')
  })
})
