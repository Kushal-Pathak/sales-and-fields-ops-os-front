import { DownloadIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { serializeCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import { DUPLICATE_POLICIES, type DuplicatePolicy } from '../utils/import-plan';
import { hasError, summarize, type ParsedRow } from '../utils/import-validation';

interface CheckStepProps {
  headers: string[];
  rows: ParsedRow[];
  duplicates: DuplicatePolicy;
  onDuplicatesChange: (policy: DuplicatePolicy) => void;
}

/** Step 3: what will import, what will not, and how to treat rows already in Pilot CRM. */
export function CheckStep({ headers, rows, duplicates, onDuplicatesChange }: CheckStepProps) {
  const summary = summarize(rows);
  const flagged = rows.filter((row) => row.issues.length > 0);
  const errorRows = rows.filter(hasError);
  const errorsHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    serializeCsv(
      [...headers, 'Issue'],
      errorRows.map((row) => [...row.raw, row.issues.map((issue) => issue.message).join('; ')]),
    ),
  )}`;

  const tiles = [
    { label: 'Rows found', value: summary.total, tone: '' },
    { label: 'Ready to import', value: summary.ready, tone: 'text-success' },
    { label: 'Already in Pilot CRM', value: summary.duplicates, tone: 'text-warning' },
    { label: 'Rows with errors', value: summary.errors, tone: 'text-destructive' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Check the rows</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rows with errors are skipped. Rows with warnings import with the default values.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} size="sm" className="gap-1">
            <p className="px-3 text-xs text-muted-foreground">{tile.label}</p>
            <p className={cn('px-3 text-2xl font-bold tabular-nums', tile.value > 0 && tile.tone)}>
              {tile.value}
            </p>
          </Card>
        ))}
      </div>

      {flagged.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
              Issues · {flagged.length}
            </h2>
            {errorRows.length > 0 && (
              <a
                href={errorsHref}
                download="rows-with-errors.csv"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                <DownloadIcon className="size-3" /> Download rows with errors
              </a>
            )}
          </div>
          <Table containerClassName="max-h-72 overflow-y-auto rounded-lg border">
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:bg-background">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 w-14 px-3 text-xs font-semibold text-muted-foreground">
                  Row
                </TableHead>
                <TableHead className="h-8 px-3 text-xs font-semibold text-muted-foreground">
                  Issue
                </TableHead>
                <TableHead className="h-8 w-28 px-3 text-xs font-semibold text-muted-foreground">
                  Outcome
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flagged.map((row) => {
                const skipped = hasError(row);
                return (
                  <TableRow key={row.line} className="border-border-faint hover:bg-transparent">
                    <TableCell className="px-3 py-1.5 align-top font-mono text-xs">
                      {row.line}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 align-top text-sm">
                      <span className="block truncate text-xs text-foreground-faint">
                        {row.contact.name || '(no name)'}
                      </span>
                      {row.issues.map((issue) => (
                        <span
                          key={issue.message}
                          className={cn(
                            'block',
                            issue.level === 'error'
                              ? 'text-destructive'
                              : 'text-foreground-secondary',
                          )}
                        >
                          {issue.message}
                        </span>
                      ))}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-3 py-1.5 align-top text-xs font-semibold',
                        skipped ? 'text-destructive' : 'text-success',
                      )}
                    >
                      {skipped ? 'Skipped' : 'Imported'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
          Rows already in Pilot CRM · {summary.duplicates}
        </h2>
        <p className="text-sm text-muted-foreground">
          A row matches an existing contact when its email or phone number is the same.
          {summary.duplicates === 0 && ' None of your rows do.'}
        </p>
        <RadioGroup
          aria-label="Duplicate handling"
          value={duplicates}
          onValueChange={(value) => onDuplicatesChange(value as DuplicatePolicy)}
          className="gap-0 rounded-lg border"
        >
          {DUPLICATE_POLICIES.map((policy) => (
            <label
              key={policy.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 border-b border-border-faint p-3 last:border-0 hover:bg-muted/50',
                duplicates === policy.value && 'bg-surface-2/60',
              )}
            >
              <RadioGroupItem value={policy.value} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{policy.label}</span>
                <span className="text-xs text-muted-foreground">{policy.hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </section>
    </div>
  );
}
