import { createFileRoute } from '@tanstack/react-router'
import { PUBLIC_COMMAND_GROUPS } from '@/features/public/commands-content'
import { PublicPageShell } from '@/features/public/public-page-shell'

export const Route = createFileRoute('/(public)/commands')({
  component: CommandsPage,
})

function CommandsPage() {
  return (
    <PublicPageShell>
      <article className='space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-3xl font-bold tracking-tight'>Deveng Bot Komutları</h1>
          <p className='text-muted-foreground leading-relaxed'>
            Discord sunucusu yönetimi, moderasyon, ticket, anket, çekiliş, rol ve
            özel komutlar için temel slash komutları.
          </p>
        </header>

        {PUBLIC_COMMAND_GROUPS.map((group) => (
          <section key={group.title} aria-labelledby={`${group.title}-heading`} className='space-y-3'>
            <div className='space-y-1'>
              <h2 id={`${group.title}-heading`} className='text-xl font-semibold'>
                {group.title}
              </h2>
              <p className='text-sm text-muted-foreground'>{group.description}</p>
            </div>
            <dl className='space-y-3'>
              {group.commands.map((command) => (
                <div key={command.name} className='rounded-lg border bg-card/50 p-4'>
                  <dt className='font-mono text-sm font-semibold text-primary'>{command.name}</dt>
                  <dd className='mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground'>
                    <p>{command.description}</p>
                    <p>
                      <span className='font-medium text-foreground'>İzin:</span> {command.permissions}
                    </p>
                    <p>
                      <span className='font-medium text-foreground'>Parametre:</span> {command.parameters}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </article>
    </PublicPageShell>
  )
}
