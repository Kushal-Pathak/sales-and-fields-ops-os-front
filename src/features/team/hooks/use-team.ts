import { getQueryError } from '@/data/query-state';
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { db, queryKeys } from '@/data';
import { useModule } from '@/features/auth';
import { useRoles, useStages, useUsers } from '@/features/workspace';
import {
  filterMembers,
  joinMembers,
  parseTeamFilters,
  serializeTeamFilters,
  type MemberRow,
  type TeamFilters,
} from '../utils/team-model';

/** Members joined with roles and workload counts, plus the URL filters. */
export function useTeam() {
  const users = useUsers();
  const roles = useRoles();
  const stages = useStages();
  const leads = useQuery({
    queryKey: queryKeys.leads.list(),
    queryFn: ({ signal }) => db.leads.list({ signal }),
  });
  // Workload by task is optional: with Tasks closed to the viewer it is not fetched or waited for.
  const tasksAccess = useModule('tasks');
  const tasksOpen = tasksAccess.status === 'allowed';
  const tasks = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: ({ signal }) => db.tasks.list({ signal }),
    enabled: tasksOpen,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseTeamFilters(searchParams), [searchParams]);
  const update = useCallback(
    (patch: Partial<TeamFilters>) =>
      setSearchParams(
        (prev) => serializeTeamFilters({ ...parseTeamFilters(prev), ...patch }, prev),
        { replace: true },
      ),
    [setSearchParams],
  );

  const rows = useMemo<MemberRow[] | undefined>(() => {
    if (!users.data || !roles.data || !stages.data || !leads.data) return undefined;
    if (tasksAccess.status === 'loading' || (tasksOpen && !tasks.data)) return undefined;
    return joinMembers({
      users: users.data,
      roles: roles.data,
      stages: stages.data,
      leads: leads.data,
      tasks: tasksOpen ? (tasks.data ?? null) : null,
    });
  }, [users.data, roles.data, stages.data, leads.data, tasks.data, tasksAccess.status, tasksOpen]);

  const visible = useMemo(() => (rows ? filterMembers(rows, filters) : undefined), [rows, filters]);

  const queries = tasksOpen ? [users, roles, stages, leads, tasks] : [users, roles, stages, leads];
  return {
    rows,
    visible,
    filters,
    update,
    isActive: Boolean(filters.q || filters.roleId || filters.status),
    isPending: queries.some((query) => query.isPending) || tasksAccess.status === 'loading',
    error: getQueryError(queries),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
