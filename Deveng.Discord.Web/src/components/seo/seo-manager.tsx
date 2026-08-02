import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'
import i18n from '@/i18n'
import { resolveSeoMeta } from '@/lib/seo/seo-registry'

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', 'canonical')
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', href)
}

function replaceJsonLd(jsonLd: Record<string, unknown>[]) {
  document.head
    .querySelectorAll<HTMLScriptElement>('script[data-deveng-seo="json-ld"]')
    .forEach((tag) => tag.remove())

  for (const graph of jsonLd) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.devengSeo = 'json-ld'
    script.textContent = JSON.stringify(graph)
    document.head.appendChild(script)
  }
}

export function SeoManager() {
  const location = useLocation()

  useEffect(() => {
    const syncLang = () => {
      document.documentElement.lang = (i18n.language || 'en').split('-')[0] || 'en'
    }
    syncLang()
    i18n.on('languageChanged', syncLang)

    const meta = resolveSeoMeta(location.pathname)

    document.title = meta.title

    upsertMeta('name', 'title', meta.title)
    upsertMeta('name', 'description', meta.description)
    upsertMeta('name', 'robots', meta.robots)
    upsertMeta('name', 'theme-color', meta.themeColor)
    upsertCanonical(meta.canonicalUrl)

    upsertMeta('property', 'og:type', meta.ogType)
    upsertMeta('property', 'og:site_name', meta.siteName)
    upsertMeta('property', 'og:url', meta.canonicalUrl)
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:image', meta.ogImage.url)
    upsertMeta('property', 'og:image:width', String(meta.ogImage.width))
    upsertMeta('property', 'og:image:height', String(meta.ogImage.height))
    upsertMeta('property', 'og:image:alt', meta.ogImage.alt)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:url', meta.canonicalUrl)
    upsertMeta('name', 'twitter:title', meta.title)
    upsertMeta('name', 'twitter:description', meta.description)
    upsertMeta('name', 'twitter:image', meta.ogImage.url)

    replaceJsonLd(meta.jsonLd)

    return () => {
      i18n.off('languageChanged', syncLang)
    }
  }, [location.pathname])

  return null
}
