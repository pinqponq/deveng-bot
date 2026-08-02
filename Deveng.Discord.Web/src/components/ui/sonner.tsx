import { Toaster as Sonner, ToasterProps } from 'sonner'
import { useTheme } from '@/context/theme-provider'

export function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme()

  // Sonner only supports 'light' and 'dark', so map 'black' to 'dark'
  const sonnerTheme = resolvedTheme === 'black' ? 'dark' : resolvedTheme

  return (
    <Sonner
      theme={sonnerTheme as ToasterProps['theme']}
      className='toaster group [&_div[data-content]]:w-full'
      {...props}
    />
  )
}
