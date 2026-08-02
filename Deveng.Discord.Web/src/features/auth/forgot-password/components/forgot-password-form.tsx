import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { sleep, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    email: z.email({
      error: (iss) => (iss.input === '' ? t('auth:pleaseEnterEmail') : undefined),
    }),
  })

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const formSchema = getFormSchema(t)

  const form = useForm<z.infer<ReturnType<typeof getFormSchema>>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  function onSubmit(data: z.infer<ReturnType<typeof getFormSchema>>) {
    setIsLoading(true)
    // eslint-disable-next-line no-console
    console.log(data)

    toast.promise(sleep(2000), {
      loading: t('auth:sendingEmail'),
      success: () => {
        setIsLoading(false)
        form.reset()
        navigate({ to: '/otp' })
        return t('auth:emailSentTo', { email: data.email })
      },
      error: t('common:error'),
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth:email')}</FormLabel>
              <FormControl>
                <Input placeholder={t('auth:emailPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {t('common:continue')}
          {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
        </Button>
      </form>
    </Form>
  )
}
