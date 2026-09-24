import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { db, queryKeys } from '@/data';
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
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const tasks = useQuery({ queryKey: queryKeys.tasks.list(), queryFn: () => db.tasks.list() });

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
    if (!users.data || !roles.data || !stages.data || !leads.data || !tasks.data) return undefined;
    return joinMembers({
      users: users.data,
      roles: roles.data,
      stages: stages.data,
      leads: leads.data,
      tasks: tasks.data,
    });
  }, [users.data, roles.data, stages.data, leads.data, tasks.data]);

  const visible = useMemo(() => (rows ? filterMembers(rows, filters) : undefined), [rows, filters]);

  const queries = [users, roles, stages, leads, tasks];
  return {
    rows,
    visible,
    filters,
    update,
    isActive: Boolean(filters.q || filters.roleId || filters.status),
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
