import { getQueryError } from '@/data/query-state';
import { useMemo } from 'react';
import { useContacts } from '@/features/contacts';
import {
  useCurrentUser,
  usePipelines,
  useStages,
  useUsers,
  useWorkspace,
} from '@/features/workspace';
import type { Contact, Pipeline, Stage, User, Workspace } from '@/types/domain';
import type { ImportSettings } from '../utils/import-plan';

export interface ImportRefs {
  contacts: Contact[];
  stages: Stage[];
  users: User[];
  workspace: Workspace;
  pipeline: Pipeline;
  currentUser: User;
}

/** Everything validation and the defaults need, or `undefined` while loading. */
export function useImportRefs() {
  const contacts = useContacts();
  const stages = useStages();
  const users = useUsers();
  const workspace = useWorkspace();
  const pipelines = usePipelines();
  const currentUser = useCurrentUser();

  const refs = useMemo<ImportRefs | undefined>(() => {
    const pipeline = pipelines.data?.find((row) => row.isDefault) ?? pipelines.data?.[0];
    if (
      !contacts.data ||
      !stages.data ||
      !users.data ||
      !workspace.data ||
      !pipeline ||
      !currentUser.data
    )
      return undefined;
    return {
      contacts: contacts.data,
      stages: stages.data,
      users: users.data,
      workspace: workspace.data,
      pipeline,
      currentUser: currentUser.data,
    };
  }, [contacts.data, stages.data, users.data, workspace.data, pipelines.data, currentUser.data]);

  const queries = [contacts, stages, users, workspace, pipelines, currentUser];
  return {
    refs,
    isPending: queries.some((query) => query.isPending),
    error: getQueryError(queries),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

/** The defaults the settings step starts from. */
export function defaultSettings(refs: ImportRefs, tomorrow: string): ImportSettings {
  const stages = refs.stages
    .filter((stage) => stage.pipelineId === refs.pipeline.id)
    .sort((a, b) => a.order - b.order);
  const stage = stages.find((row) => row.kind === 'open') ?? stages[0];
  const sources = refs.workspace.leadSources;
  return {
    pipelineId: refs.pipeline.id,
    stageId: stage?.id ?? '',
    source: sources.find((row) => row.toLowerCase() === 'import') ?? sources[0] ?? 'Import',
    ownerId: refs.currentUser.id,
    priority: 'medium',
    followUp: { enabled: false, dueAt: tomorrow },
    duplicates: 'attach',
  };
}
