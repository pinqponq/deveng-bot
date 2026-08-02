import { toast } from 'sonner'
import i18n from '@/i18n'

export function showSubmittedData(
  data: unknown,
  title: string = i18n.t('tasks:youSubmittedValues')
) {
  toast.message(title, {
    description: (
      // w-[340px]
      <pre className='mt-2 w-full overflow-x-auto rounded-md bg-slate-950 p-4'>
        <code className='text-white'>{JSON.stringify(data, null, 2)}</code>
      </pre>
    ),
  })
}
