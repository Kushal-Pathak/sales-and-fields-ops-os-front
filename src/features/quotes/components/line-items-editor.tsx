import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWorkspace } from '@/features/workspace';
import { currencySymbol, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { lineAmount, type DraftItem, type ItemErrors } from '../utils/quote-draft';

interface LineItemsEditorProps {
  items: DraftItem[];
  errors: Record<string, ItemErrors>;
  currency: string;
  onChange: (id: string, patch: Partial<DraftItem>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

const HEAD_CLASS = 'h-8 px-2 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-2 py-1 align-top';

/** Editable line items: every cell is an input; the last column is the computed amount. */
export function LineItemsEditor({
  items,
  errors,
  currency,
  onChange,
  onAdd,
  onRemove,
}: LineItemsEditorProps) {
  const locale = useWorkspace().data?.locale;
  const symbol = currencySymbol(currency, locale);

  return (
    <Table containerClassName="overflow-x-auto rounded-lg border" className="min-w-[720px]">
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className={cn(HEAD_CLASS, 'w-8 text-center')}>#</TableHead>
          <TableHead className={HEAD_CLASS}>Description</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-24')}>Unit</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-20 text-right')}>Qty</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-32 text-right')}>Unit price ({symbol})</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-20 text-right')}>Disc %</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-28 text-right')}>Amount</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-9')}>
            <span className="sr-only">Remove</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => {
          const line = index + 1;
          const itemErrors = errors[item.id] ?? {};
          return (
            <TableRow key={item.id} className="border-border-faint hover:bg-transparent">
              <TableCell
                className={cn(CELL_CLASS, 'pt-2.5 text-center text-xs text-foreground-faint')}
              >
                {line}
              </TableCell>
              <TableCell className={CELL_CLASS}>
                <Cell error={itemErrors.description}>
                  <Input
                    aria-label={`Description, line ${line}`}
                    placeholder="What is being quoted"
                    value={item.description}
                    onChange={(event) => onChange(item.id, { description: event.target.value })}
                    aria-invalid={itemErrors.description ? true : undefined}
                  />
                </Cell>
              </TableCell>
              <TableCell className={CELL_CLASS}>
                <Input
                  aria-label={`Unit, line ${line}`}
                  placeholder="hour"
                  value={item.unit}
                  onChange={(event) => onChange(item.id, { unit: event.target.value })}
                />
              </TableCell>
              <TableCell className={CELL_CLASS}>
                <Cell error={itemErrors.quantity}>
                  <Input
                    aria-label={`Quantity, line ${line}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    className="text-right tabular-nums"
                    value={item.quantity}
                    onChange={(event) => onChange(item.id, { quantity: event.target.value })}
                    aria-invalid={itemErrors.quantity ? true : undefined}
                  />
                </Cell>
              </TableCell>
              <TableCell className={CELL_CLASS}>
                <Cell error={itemErrors.unitPrice}>
                  <Input
                    aria-label={`Unit price, line ${line}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    className="text-right tabular-nums"
                    value={item.unitPrice}
                    onChange={(event) => onChange(item.id, { unitPrice: event.target.value })}
                    aria-invalid={itemErrors.unitPrice ? true : undefined}
                  />
                </Cell>
              </TableCell>
              <TableCell className={CELL_CLASS}>
                <Cell error={itemErrors.discountPct}>
                  <Input
                    aria-label={`Discount percent, line ${line}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="any"
                    placeholder="0"
                    className="text-right tabular-nums"
                    value={item.discountPct}
                    onChange={(event) => onChange(item.id, { discountPct: event.target.value })}
                    aria-invalid={itemErrors.discountPct ? true : undefined}
                  />
                </Cell>
              </TableCell>
              <TableCell
                className={cn(CELL_CLASS, 'pt-2.5 text-right text-sm font-semibold tabular-nums')}
              >
                {formatMoney(lineAmount(item), { currency, locale })}
              </TableCell>
              <TableCell className={CELL_CLASS}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove line ${line}`}
                  className="text-foreground-faint hover:text-destructive"
                  disabled={items.length === 1}
                  onClick={() => onRemove(item.id)}
                >
                  <XIcon />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        <TableRow className="border-0 hover:bg-muted">
          <TableCell colSpan={8} className="p-0">
            <button
              type="button"
              onClick={onAdd}
              className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-foreground-faint hover:text-foreground"
            >
              <PlusIcon className="size-3.5" /> Add line item
            </button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function Cell({ error, children }: { error: string | undefined; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      {children}
      {error && <span className="text-2xs text-destructive">{error}</span>}
    </div>
  );
}
