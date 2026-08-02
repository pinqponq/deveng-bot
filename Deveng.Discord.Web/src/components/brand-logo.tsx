import { cn } from '@/lib/utils'
import { BRAND_LOGO_SRC, BRAND_NAME } from '@/lib/brand'

type BrandLogoProps = {
  className?: string
  imgClassName?: string
}

export function BrandLogo({ className, imgClassName }: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <img
        src={BRAND_LOGO_SRC}
        alt={BRAND_NAME}
        className={cn('h-8 w-auto object-contain', imgClassName)}
        width={272}
        height={80}
        decoding='async'
      />
    </span>
  )
}
