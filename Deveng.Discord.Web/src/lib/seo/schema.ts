import { PUBLIC_COMMAND_GROUPS } from '@/features/public/commands-content'
import { PUBLIC_DOC_GUIDES } from '@/features/public/docs-content'
import { LANDING_FEATURES, LANDING_FEATURE_SEO_EN } from '@/features/public/landing-content'
import { type JsonLdObject } from './seo-types'
import { SEO_PRODUCT_NAME, SEO_SITE_NAME } from './seo-utils'

type SchemaContext = {
  url: string
  image: string
  description: string
}

export function createSoftwareApplicationSchema({
  url,
  image,
  description,
}: SchemaContext): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SEO_PRODUCT_NAME,
    alternateName: 'Deveng Discord Bot',
    applicationCategory: 'BotApplication',
    operatingSystem: 'Discord',
    url,
    image,
    description,
    featureList: LANDING_FEATURES.map((feature) => LANDING_FEATURE_SEO_EN[feature.slug].title),
    publisher: {
      '@type': 'Organization',
      name: SEO_SITE_NAME,
      url,
    },
  }
}

export function createFaqPageSchema(
  questions: Array<{ question: string; answer: string }>,
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function createCommandsSchema(url: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Deveng Bot commands',
    url,
    hasDefinedTerm: PUBLIC_COMMAND_GROUPS.flatMap((group) =>
      group.commands.map((command) => ({
        '@type': 'DefinedTerm',
        name: command.name,
        description: command.description,
        inDefinedTermSet: group.title,
      })),
    ),
  }
}

export function createDocsHowToSchemas(): JsonLdObject[] {
  return PUBLIC_DOC_GUIDES.map((guide) => ({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: guide.title,
    description: guide.summary,
    step: guide.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text: step,
    })),
  }))
}
