import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type TermsPrivacyType = 'terms' | 'privacy'

type TermsPrivacyModalContextValue = {
  current: TermsPrivacyType | null
  openTerms: () => void
  openPrivacy: () => void
  close: () => void
}

const TermsPrivacyModalContext = createContext<
  TermsPrivacyModalContextValue | undefined
>(undefined)

export function TermsPrivacyModalProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<TermsPrivacyType | null>(null)

  const openTerms = useCallback(() => setCurrent('terms'), [])
  const openPrivacy = useCallback(() => setCurrent('privacy'), [])
  const close = useCallback(() => setCurrent(null), [])

  const value = useMemo(
    () => ({ current, openTerms, openPrivacy, close }),
    [current]
  )

  return (
    <TermsPrivacyModalContext.Provider value={value}>
      {children}
    </TermsPrivacyModalContext.Provider>
  )
}

export function useTermsPrivacyModal() {
  const ctx = useContext(TermsPrivacyModalContext)
  if (ctx === undefined) {
    throw new Error(
      'useTermsPrivacyModal must be used within TermsPrivacyModalProvider'
    )
  }
  return ctx
}
