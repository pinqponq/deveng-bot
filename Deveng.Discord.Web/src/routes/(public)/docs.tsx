import { createFileRoute } from '@tanstack/react-router'
import { PUBLIC_DOC_GUIDES } from '@/features/public/docs-content'
import { PublicPageShell } from '@/features/public/public-page-shell'

export const Route = createFileRoute('/(public)/docs')({
  component: DocsPage,
})

function DocsPage() {
  return (
    <PublicPageShell>
      <article className='space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-3xl font-bold tracking-tight'>Deveng Bot Dokümantasyonu</h1>
          <p className='text-muted-foreground leading-relaxed'>
            Botu sunucuya ekleme, güvenlik ayarları, ticket paneli ve reaction role
            kurulumu için doğrudan rehberler.
          </p>
        </header>

        {PUBLIC_DOC_GUIDES.map((guide) => (
          <section key={guide.slug} aria-labelledby={`${guide.slug}-heading`} className='space-y-3'>
            <h2 id={`${guide.slug}-heading`} className='text-xl font-semibold'>
              {guide.title}
            </h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>{guide.summary}</p>
            <ol className='list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground'>
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        ))}
      </article>
    </PublicPageShell>
  )
}
