import { getQueryError } from '@/data/query-state';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useStages, useUsers, useWorkspace } from '@/features/workspace';
import type { Automation, User } from '@/types/domain';
import { describeActions, describeTrigger, type LabelRefs } from '../utils/automation-labels';

export interface AutomationRow {
  automation: Automation;
  creator: User | undefined;
  triggerText: string;
  actionsText: string;
}

/** Every rule with its creator and plain-words descriptions, newest first. */
export function useAutomations() {
  const automations = useQuery({
    queryKey: queryKeys.automations.list(),
    queryFn: ({ signal }) => db.automations.list({ signal }),
  });
  const stages = useStages();
  const users = useUsers();
  const workspace = useWorkspace();

  const refs = useMemo<LabelRefs | undefined>(() => {
    if (!stages.data || !users.data || !workspace.data) return undefined;
    return {
      stages: stages.data,
      users: users.data,
      quickReplies: workspace.data.quickReplies ?? [],
    };
  }, [stages.data, users.data, workspace.data]);

  const rows = useMemo<AutomationRow[] | undefined>(() => {
    if (!automations.data || !refs) return undefined;
    return [...automations.data]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((automation) => ({
        automation,
        creator: refs.users.find((user) => user.id === automation.createdById),
        triggerText: describeTrigger(automation.trigger, refs),
        actionsText: describeActions(automation.actions, refs),
      }));
  }, [automations.data, refs]);

  const queries = [automations, stages, users, workspace];
  return {
    rows,
    refs,
    isPending: queries.some((query) => query.isPending),
    error: getQueryError(queries),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

/** The last runs of one rule, newest first. */
export function useAutomationRuns(automationId: string | null, limit = 10) {
  return useQuery({
    queryKey: queryKeys.automationRuns.list(),
    queryFn: ({ signal }) => db.automationRuns.list({ signal }),
    enabled: automationId !== null,
    select: (rows) =>
      rows
        .filter((row) => row.automationId === automationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
  });
}
