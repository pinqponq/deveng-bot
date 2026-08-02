export type IndexingPolicy = 'index,follow' | 'noindex,nofollow'

export type JsonLdObject = Record<string, unknown>

export type SeoImage = {
  url: string
  width: number
  height: number
  alt: string
}

export type SeoRouteConfig = {
  path: string
  pageName: string
  descriptionCandidates: string[]
  canonicalPath?: string
  robots?: IndexingPolicy
  ogType?: 'website' | 'article'
  ogImage?: string
  jsonLd?: JsonLdObject[]
}

export type SeoMeta = {
  title: string
  description: string
  canonicalUrl: string
  robots: IndexingPolicy
  ogType: 'website' | 'article'
  ogImage: SeoImage
  siteName: string
  themeColor: string
  jsonLd: JsonLdObject[]
}
