import { useMemo } from 'react';
import { ErrorState } from '@/components/common/empty-state';
import { WizardFrame } from '@/components/layout/step-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { addDays } from '@/lib/dates';
import { defaultSettings, useImportRefs } from '../hooks/use-import-refs';
import { IMPORT_STEPS, useImportWizard } from '../hooks/use-import-wizard';
import { useRunImport } from '../hooks/use-run-import';
import { mappingIssues } from '../utils/column-mapping';
import { buildImportPlan } from '../utils/import-plan';
import { summarize, validateRows } from '../utils/import-validation';
import { CheckStep } from './check-step';
import { MapStep } from './map-step';
import { ResultStep } from './result-step';
import { SettingsStep } from './settings-step';
import { UploadStep } from './upload-step';

const CONTENT_WIDTH = [
  'max-w-[720px]',
  'max-w-[760px]',
  'max-w-[720px]',
  'max-w-[560px]',
  'max-w-[520px]',
];

/** The lead import wizard: Upload → Map columns → Check → Settings → Import. */
export function ImportWizard() {
  const { refs, isPending, error, refetch } = useImportRefs();
  const { state, dispatch } = useImportWizard();
  const runner = useRunImport();

  const settings = useMemo(() => {
    if (state.settings) return state.settings;
    if (!refs) return null;
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(9, 0, 0, 0);
    return defaultSettings(refs, tomorrow.toISOString());
  }, [state.settings, refs]);

  const rows = useMemo(() => {
    if (!state.table || !refs) return [];
    return validateRows(state.table.rows, state.mapping, {
      contacts: refs.contacts,
      stages: refs.stages,
      users: refs.users,
      sources: refs.workspace.leadSources,
    });
  }, [state.table, state.mapping, refs]);
  const summary = useMemo(() => summarize(rows), [rows]);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isPending || !refs || !settings) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full max-w-lg" />
      </div>
    );
  }

  const canContinue = [
    state.table !== null && state.table.rows.length > 0,
    state.table !== null && mappingIssues(state.mapping).length === 0,
    summary.ready > 0,
    true,
    false,
  ][state.step];

  const startImport = () => {
    const plan = buildImportPlan(rows, settings);
    runner.run({ plan, settings, actorId: refs.currentUser.id });
    dispatch({ type: 'next' });
  };

  const importMore = () => {
    runner.reset();
    dispatch({ type: 'reset' });
  };

  return (
    <WizardFrame
      steps={IMPORT_STEPS}
      current={state.step}
      contentClassName={CONTENT_WIDTH[state.step]}
      showNav={state.step < IMPORT_STEPS.length - 1}
      backDisabled={state.step === 0}
      continueDisabled={!canContinue}
      continueLabel={state.step === 3 ? 'Start import' : 'Continue'}
      onBack={() => dispatch({ type: 'back' })}
      onContinue={() => (state.step === 3 ? startImport() : dispatch({ type: 'next' }))}
    >
      {state.step === 0 && (
        <UploadStep
          table={state.table}
          fileName={state.fileName}
          onLoad={(table, fileName) => dispatch({ type: 'load', table, fileName })}
          onClear={() => dispatch({ type: 'clear' })}
        />
      )}
      {state.step === 1 && state.table && (
        <MapStep
          table={state.table}
          mapping={state.mapping}
          onChange={(mapping) => dispatch({ type: 'mapping', mapping })}
        />
      )}
      {state.step === 2 && state.table && (
        <CheckStep
          headers={state.table.headers}
          rows={rows}
          duplicates={settings.duplicates}
          onDuplicatesChange={(duplicates) =>
            dispatch({ type: 'settings', settings: { ...settings, duplicates } })
          }
        />
      )}
      {state.step === 3 && (
        <SettingsStep
          refs={refs}
          settings={settings}
          fileName={state.fileName ?? 'Pasted rows'}
          summary={summary}
          onChange={(next) => dispatch({ type: 'settings', settings: next })}
        />
      )}
      {state.step === 4 && (
        <ResultStep
          headers={state.table?.headers ?? []}
          progress={runner.progress}
          result={runner.result}
          error={runner.error}
          source={settings.source}
          onImportMore={importMore}
        />
      )}
    </WizardFrame>
  );
}
