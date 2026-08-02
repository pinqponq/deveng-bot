import * as React from 'react'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from './pagination'

type SimpleDataTableProps<TData> = {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  /** Arama kutusunu göster (varsayılan: true) */
  enableSearch?: boolean
  searchPlaceholder?: string
  /** Sonuç yokken gösterilecek metin */
  emptyMessage?: string
  /** Sayfa başına satır (varsayılan: 10) */
  pageSize?: number
  /** Satıra tıklanınca çağrılır; verilince satırlar tıklanabilir görünür */
  onRowClick?: (row: TData) => void
  className?: string
}

/**
 * Hafif, kendine yeten veri tablosu: metin arama + sütun sıralama + sayfalama.
 * Tüm durum local'de tutulur (route search şeması gerektirmez), bu yüzden
 * herhangi bir liste ekranına düşük riskle takılabilir.
 */
export function SimpleDataTable<TData>({
  columns,
  data,
  enableSearch = true,
  searchPlaceholder,
  emptyMessage = 'Kayıt bulunamadı.',
  pageSize = 10,
  onRowClick,
  className,
}: SimpleDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const showPagination = data.length > pageSize

  return (
    <div className={cn('@container/content flex flex-col gap-4', className)}>
      {enableSearch && (
        <div className='relative w-full sm:max-w-xs'>
          <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2' />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder ?? 'Ara...'}
            className='h-9 pl-8'
          />
        </div>
      )}

      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='text-muted-foreground h-24 text-center'
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && <DataTablePagination table={table} />}
    </div>
  )
}
