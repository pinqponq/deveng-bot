import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Upload,
  RefreshCw,
  Paperclip,
  ChevronDown,
  ArrowRight,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react'

export function UIShowcase() {
  return (
    <div className='relative h-full w-full overflow-hidden p-8'>
      <div className='relative grid h-full grid-cols-2 gap-4'>
        {/* Upload File Card - Top Left */}
        <Card className='relative z-10 flex flex-col gap-3 p-4'>
          <div className='flex items-center gap-2'>
            <div className='flex size-10 items-center justify-center rounded-lg bg-primary/10'>
              <Upload className='size-5 text-primary' />
            </div>
          </div>
          <div className='space-y-2'>
            <p className='text-sm font-medium'>Upload File</p>
            <p className='text-muted-foreground text-xs'>
              Drag and drop or SVG, PNG, JPG or GIF up to 5 MB
            </p>
          </div>
          <Button size='sm' className='w-full'>
            Upload File
          </Button>
          <p className='text-muted-foreground text-center text-xs'>
            or drag and drop your file here
          </p>
        </Card>

        {/* Design Systems Card - Top Right */}
        <Card className='relative z-10 flex flex-col items-center justify-center gap-3 p-6'>
          <div className='relative size-24'>
            <div className='absolute inset-0 rounded-full bg-orange-500/20 blur-xl' />
            <div className='absolute inset-2 rounded-full bg-orange-500/30 blur-lg' />
            <div className='absolute inset-4 rounded-full bg-orange-500/40' />
          </div>
          <div className='space-y-1 text-center'>
            <p className='text-sm font-semibold'>Design Systems</p>
            <p className='text-muted-foreground text-xs'>
              Explore the fundamentals
            </p>
          </div>
          <RefreshCw className='absolute bottom-2 end-2 size-4 text-orange-500' />
        </Card>

        {/* Chat Interface Card - Middle */}
        <Card className='relative z-10 col-span-2 flex flex-col gap-3 p-4'>
          <div className='flex items-center justify-between'>
            <div className='space-y-1'>
              <p className='text-sm font-semibold'>AI is free this weekend!</p>
              <p className='text-muted-foreground text-xs'>Ship Now!</p>
            </div>
          </div>
          <div className='relative'>
            <Input
              placeholder='What can I do for you?'
              className='pr-20'
            />
            <div className='absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1'>
              <Paperclip className='text-muted-foreground size-4' />
              <ArrowRight className='text-muted-foreground size-4' />
            </div>
          </div>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-xs'>
                AI Claude 4.5 Sonnet
              </span>
              <ChevronDown className='text-muted-foreground size-3' />
            </div>
          </div>
        </Card>

        {/* Progress Card - Bottom Left */}
        <Card className='relative z-10 flex flex-col gap-2 p-4'>
          <p className='text-sm font-semibold'>Searching the web...</p>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-xs'>2</span>
              <span className='text-muted-foreground text-xs'>
                Scanning web pages...
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-xs'>3</span>
              <span className='text-muted-foreground text-xs'>
                Visiting 5 websites...
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-xs'>4</span>
              <span className='text-muted-foreground text-xs'>
                Analyzing content...
              </span>
            </div>
          </div>
        </Card>

        {/* Music Player Card - Bottom Right */}
        <Card className='relative z-10 flex flex-col gap-3 p-4'>
          <div className='flex items-center gap-2'>
            <div className='flex -space-x-2'>
              <div className='size-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600' />
              <div className='size-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-semibold'>Glow</p>
              <p className='text-muted-foreground text-xs'>Echo</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <div className='flex-1 space-y-1'>
              <div className='h-1 w-full rounded-full bg-muted'>
                <div className='h-1 w-[5%] rounded-full bg-red-500' />
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground text-xs'>0:02</span>
                <span className='text-muted-foreground text-xs'>0:45</span>
              </div>
            </div>
          </div>
          <div className='flex items-center justify-center gap-2'>
            <Button variant='ghost' size='icon' className='size-8'>
              <SkipBack className='size-4' />
            </Button>
            <Button variant='ghost' size='icon' className='size-8'>
              <Play className='size-4' />
            </Button>
            <Button variant='ghost' size='icon' className='size-8'>
              <SkipForward className='size-4' />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

