import { useState, type ChangeEvent, type DragEvent } from 'react';
import { DownloadIcon, FileSpreadsheetIcon, UploadIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { parseDelimited, type ParsedTable } from '@/lib/csv';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import { SAMPLE_CSV } from '../utils/sample-csv';

interface UploadStepProps {
  table: ParsedTable | null;
  fileName: string | null;
  onLoad: (table: ParsedTable, fileName: string) => void;
  onClear: () => void;
}

const PREVIEW_ROWS = 8;
const SAMPLE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`;

/** Step 1: load rows from a CSV/TSV file or from pasted text, then preview them. */
export function UploadStep({ table, fileName, onLoad, onClear }: UploadStepProps) {
  const [pasted, setPasted] = useState('');
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = (text: string, name: string) => {
    const parsed = parseDelimited(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setProblem('No rows found. The first line must be the column headers.');
      return;
    }
    setProblem(null);
    onLoad(parsed, name);
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    load(await file.text(), file.name);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files[0]);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    void readFile(event.target.files?.[0]);
    event.target.value = '';
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Import leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring a spreadsheet of contacts and leads into {env.appName}. The first row must hold the
          column names; every row needs a contact name.
        </p>
      </div>

      {table ? (
        <div className="flex items-center gap-3 rounded-xl border p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
            <FileSpreadsheetIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{fileName}</p>
            <p className="text-xs text-foreground-faint">
              {table.rows.length} row{table.rows.length === 1 ? '' : 's'} · {table.headers.length}{' '}
              column{table.headers.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Remove file" onClick={onClear}>
            <XIcon />
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="file">
          <TabsList className="h-auto gap-0.5 bg-transparent p-0">
            <TabsTrigger
              value="file"
              className="h-7 px-2.5 data-active:bg-accent data-active:shadow-none"
            >
              Upload a file
            </TabsTrigger>
            <TabsTrigger
              value="paste"
              className="h-7 px-2.5 data-active:bg-accent data-active:shadow-none"
            >
              Paste rows
            </TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="mt-3">
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-strong p-6 text-center transition-colors hover:border-input hover:bg-muted',
                dragging && 'border-input bg-muted',
              )}
            >
              <UploadIcon className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                Drop a CSV or TSV file here, or click to choose
              </span>
              <span className="text-xs text-foreground-faint">
                Comma, tab or semicolon separated. Export from Excel or Google Sheets as CSV.
              </span>
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                aria-label="Choose a file"
                className="sr-only"
                onChange={onPick}
              />
            </label>
          </TabsContent>
          <TabsContent value="paste" className="mt-3 flex flex-col gap-2">
            <Textarea
              aria-label="Pasted rows"
              rows={8}
              placeholder={'Name\tEmail\tPhone\nAda Lovelace\tada@example.com\t+1 555 0100'}
              className="font-mono text-xs"
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!pasted.trim()}
                onClick={() => load(pasted, 'Pasted rows')}
              >
                Use these rows
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}

      {table ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            Preview
          </h2>
          <Table containerClassName="rounded-lg border" className="min-w-[600px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 w-10 px-2 text-center text-xs text-foreground-faint">
                  #
                </TableHead>
                {table.headers.map((header, index) => (
                  <TableHead
                    key={index}
                    className="h-8 px-2 text-xs font-semibold text-muted-foreground"
                  >
                    {header || `Column ${index + 1}`}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.slice(0, PREVIEW_ROWS).map((row, rowIndex) => (
                <TableRow key={rowIndex} className="border-border-faint hover:bg-transparent">
                  <TableCell className="px-2 py-1.5 text-center text-xs text-foreground-faint">
                    {rowIndex + 1}
                  </TableCell>
                  {row.map((value, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      className="max-w-[160px] truncate px-2 py-1.5 text-sm"
                    >
                      {value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {table.rows.length > PREVIEW_ROWS && (
            <p className="text-xs text-foreground-faint">
              Showing the first {PREVIEW_ROWS} of {table.rows.length} rows.
            </p>
          )}
        </div>
      ) : (
        <a
          href={SAMPLE_HREF}
          download="import-sample.csv"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <DownloadIcon className="size-3.5" /> Download a sample CSV
        </a>
      )}
    </div>
  );
}
