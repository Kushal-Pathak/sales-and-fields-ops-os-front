import { Card } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toDateInput } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import type { Priority } from '@/types/domain';
import type { ImportRefs } from '../hooks/use-import-refs';
import { DUPLICATE_POLICIES, type ImportSettings } from '../utils/import-plan';
import type { ValidationSummary } from '../utils/import-validation';

interface SettingsStepProps {
  refs: ImportRefs;
  settings: ImportSettings;
  fileName: string;
  summary: ValidationSummary;
  onChange: (settings: ImportSettings) => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

/** Step 4: defaults applied where the file says nothing, plus the review before importing. */
export function SettingsStep({ refs, settings, fileName, summary, onChange }: SettingsStepProps) {
  const stages = refs.stages
    .filter((stage) => stage.pipelineId === settings.pipelineId)
    .sort((a, b) => a.order - b.order);
  const users = refs.users.filter((user) => user.active);
  const locale = refs.workspace.locale;
  const patch = (next: Partial<ImportSettings>) => onChange({ ...settings, ...next });
  const stageName = stages.find((stage) => stage.id === settings.stageId)?.name ?? '—';
  const ownerName = users.find((user) => user.id === settings.ownerId)?.name ?? '—';
  const policy = DUPLICATE_POLICIES.find((row) => row.value === settings.duplicates)?.label;
  const importing = summary.ready;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defaults for the {importing} lead{importing === 1 ? '' : 's'} being imported. A row's own
          stage, source, owner or priority wins when the file has one.
        </p>
      </div>

      <FieldGroup className="gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="import-stage">Stage</FieldLabel>
            <Select
              value={settings.stageId}
              onValueChange={(value) => value && patch({ stageId: value })}
              items={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
            >
              <SelectTrigger id="import-stage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="import-source">Source</FieldLabel>
            <Select
              value={settings.source}
              onValueChange={(value) => value && patch({ source: value })}
              items={refs.workspace.leadSources.map((source) => ({ value: source, label: source }))}
            >
              <SelectTrigger id="import-source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {refs.workspace.leadSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="import-owner">Owner</FieldLabel>
            <Select
              value={settings.ownerId}
              onValueChange={(value) => value && patch({ ownerId: value })}
              items={users.map((user) => ({ value: user.id, label: user.name }))}
            >
              <SelectTrigger id="import-owner" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="import-priority">Priority</FieldLabel>
            <Select
              value={settings.priority}
              onValueChange={(value) => value && patch({ priority: value as Priority })}
              items={PRIORITIES}
            >
              <SelectTrigger id="import-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex items-center gap-3 rounded-lg border p-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium">Create a follow-up task</span>
            <span className="text-xs text-muted-foreground">
              A call task for each imported lead, assigned to its owner.
            </span>
          </span>
          {settings.followUp.enabled && (
            <Input
              type="date"
              aria-label="Follow-up due date"
              className="w-40"
              value={toDateInput(settings.followUp.dueAt)}
              onChange={(event) =>
                patch({
                  followUp: {
                    enabled: true,
                    dueAt: new Date(`${event.target.value}T09:00:00`).toISOString(),
                  },
                })
              }
            />
          )}
          <Switch
            aria-label="Create a follow-up task"
            checked={settings.followUp.enabled}
            onCheckedChange={(enabled) => patch({ followUp: { ...settings.followUp, enabled } })}
          />
        </div>
      </FieldGroup>

      <Card size="sm" className="gap-3">
        <div className="px-3">
          <h2 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            Review
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <Row label="File">{fileName}</Row>
            <Row label="Rows found">{summary.total}</Row>
            <Row label="Ready to import">
              <span className="text-success">{summary.ready}</span>
            </Row>
            <Row label="Already in Pilot CRM">
              <span className="text-warning">{summary.duplicates}</span>
              {summary.duplicates > 0 && <span className="text-muted-foreground"> · {policy}</span>}
            </Row>
            <Row label="Skipped (errors)">
              <span className="text-destructive">{summary.errors}</span>
            </Row>
          </dl>
        </div>
        <div className="border-t px-3 pt-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <Row label="Stage">{stageName}</Row>
            <Row label="Source">{settings.source}</Row>
            <Row label="Owner">{ownerName}</Row>
            <Row label="Priority">
              {PRIORITIES.find((item) => item.value === settings.priority)?.label}
            </Row>
            <Row label="Follow-up task">
              {settings.followUp.enabled
                ? `Yes, due ${formatDate(settings.followUp.dueAt, 'date', locale)}`
                : 'No'}
            </Row>
          </dl>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{children}</dd>
    </>
  );
}
