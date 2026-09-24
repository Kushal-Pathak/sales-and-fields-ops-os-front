import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ParsedTable } from '@/lib/csv';
import { mappingIssues, sampleValue, type Mapping } from '../utils/column-mapping';
import { IMPORT_FIELDS, type ImportFieldKey } from '../utils/import-fields';

interface MapStepProps {
  table: ParsedTable;
  mapping: Mapping;
  onChange: (mapping: Mapping) => void;
}

const NONE = 'none';

/** Step 2: choose which file column feeds each Pilot CRM field. */
export function MapStep({ table, mapping, onChange }: MapStepProps) {
  const issues = mappingIssues(mapping);
  const columns = table.headers.map((header, index) => ({
    value: String(index),
    label: header || `Column ${index + 1}`,
  }));
  const items = [{ value: NONE, label: '— Do not import —' }, ...columns];

  const set = (key: ImportFieldKey, value: string | null) =>
    onChange({ ...mapping, [key]: value === null || value === NONE ? null : Number(value) });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Map columns</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Match the columns in your file to Pilot CRM fields. We guessed from the headers; fix
          anything that looks wrong.
        </p>
      </div>

      <Table containerClassName="rounded-lg border">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 w-[200px] px-3 text-xs font-semibold text-muted-foreground">
              Pilot CRM field
            </TableHead>
            <TableHead className="h-8 w-[220px] px-3 text-xs font-semibold text-muted-foreground">
              File column
            </TableHead>
            <TableHead className="h-8 px-3 text-xs font-semibold text-muted-foreground">
              Sample
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {IMPORT_FIELDS.map((field) => {
            const column = mapping[field.key];
            return (
              <TableRow key={field.key} className="border-border-faint hover:bg-transparent">
                <TableCell className="px-3 py-1.5 align-top">
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-medium">
                      {field.label}
                      {field.required && (
                        <span className="ml-0.5 text-destructive" aria-label="required">
                          *
                        </span>
                      )}
                    </span>
                    {field.hint && (
                      <span className="text-xs text-foreground-faint">{field.hint}</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-1.5 align-top">
                  <Select
                    value={column === null ? NONE : String(column)}
                    onValueChange={(value) => set(field.key, value)}
                    items={items}
                  >
                    <SelectTrigger aria-label={`Column for ${field.label}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="max-w-[220px] truncate px-3 py-1.5 align-top text-sm text-foreground-secondary">
                  {sampleValue(table.rows, column) || (
                    <span className="text-foreground-faint">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {issues.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-destructive">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-foreground-faint">
          * Required. Rows without a value in a required field are skipped.
        </p>
      )}
    </div>
  );
}
