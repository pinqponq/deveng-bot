import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SettingsSplitLayoutProps {
  title: string
  description?: string
  listTitle: string
  listDescription?: string
  createLabel?: string
  onCreate?: () => void
  listContent: React.ReactNode
  detailTitle: string
  detailDescription?: string
  detailContent: React.ReactNode
  rightActions?: React.ReactNode
}

export function SettingsSplitLayout({
  title,
  description,
  listTitle,
  listDescription,
  createLabel = 'Yeni Oluştur',
  onCreate,
  listContent,
  detailTitle,
  detailDescription,
  detailContent,
  rightActions,
}: SettingsSplitLayoutProps) {
  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
          {description && <p className='text-sm text-muted-foreground'>{description}</p>}
        </div>
        {rightActions && <div className='flex items-center gap-2'>{rightActions}</div>}
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]'>
        <Card className='h-fit'>
          <CardHeader className='pb-3'>
            <div className='space-y-1'>
              <CardTitle className='text-base'>{listTitle}</CardTitle>
              {listDescription && <CardDescription>{listDescription}</CardDescription>}
            </div>
            {onCreate && (
              <Button onClick={onCreate} className='mt-2'>
                {createLabel}
              </Button>
            )}
          </CardHeader>
          <CardContent>{listContent}</CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base'>{detailTitle}</CardTitle>
            {detailDescription && <CardDescription>{detailDescription}</CardDescription>}
          </CardHeader>
          <CardContent>{detailContent}</CardContent>
        </Card>
      </div>
    </div>
  )
}
