import { XIcon } from 'lucide-react';
import { FilterChip, SearchField } from '@/components/common/list-toolbar';
import { Button } from '@/components/ui/button';
import { useRoles } from '@/features/workspace';
import type { TeamFilters } from '../utils/team-model';

interface TeamToolbarProps {
  filters: TeamFilters;
  isActive: boolean;
  onChange: (patch: Partial<TeamFilters>) => void;
}

export function TeamToolbar({ filters, isActive, onChange }: TeamToolbarProps) {
  const roles = useRoles().data ?? [];
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <SearchField
        value={filters.q}
        onChange={(q) => onChange({ q })}
        placeholder="Search members"
      />
      <FilterChip
        label="Role"
        anyLabel="any"
        value={filters.roleId}
        items={roles.map((role) => ({ value: role.id, label: role.name }))}
        onChange={(roleId) => onChange({ roleId })}
      />
      <FilterChip
        label="Status"
        anyLabel="all"
        value={filters.status}
        items={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ]}
        onChange={(status) => onChange({ status: status as TeamFilters['status'] })}
      />
      {isActive && (
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={() => onChange({ q: '', roleId: null, status: null })}
        >
          <XIcon /> Clear
        </Button>
      )}
    </div>
  );
}
