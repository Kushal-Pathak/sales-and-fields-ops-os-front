import { useState, type FormEvent } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DrawerBody,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from '@/components/layout/drawer-panel';
import { useRoles, useUsers } from '@/features/workspace';
import type { Permission, Role } from '@/types/domain';
import { useCreateRole, useDeleteRole, useUpdateRole } from '../hooks/use-team-mutations';
import { PERMISSIONS, roleUsage } from '../utils/team-model';

export const NEW_ROLE_ID = 'new';

interface RoleDrawerProps {
  /** `?role=` value: a role id, `new`, or `null` when closed. */
  roleId: string | null;
  onClose: () => void;
}

/** Create or edit a role: its name and which permissions it grants. */
export function RoleDrawer({ roleId, onClose }: RoleDrawerProps) {
  const roles = useRoles().data;
  const role = roleId && roleId !== NEW_ROLE_ID ? roles?.find((r) => r.id === roleId) : undefined;
  const ready = roleId === NEW_ROLE_ID || role !== undefined;

  return (
    <DrawerPanel open={roleId !== null} onOpenChange={(open) => !open && onClose()}>
      {roleId !== null && roles && ready && (
        <RoleForm key={roleId} role={role} roles={roles} onClose={onClose} />
      )}
      {roleId !== null && roles && !ready && (
        <>
          <DrawerHeader>
            <DrawerTitle>Role not found</DrawerTitle>
            <DrawerDescription>It may have been deleted.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </DrawerFooter>
        </>
      )}
    </DrawerPanel>
  );
}

function RoleForm({
  role,
  roles,
  onClose,
}: {
  role: Role | undefined;
  roles: Role[];
  onClose: () => void;
}) {
  const users = useUsers().data ?? [];
  const members = role ? (roleUsage(roles, users).get(role.id) ?? 0) : 0;
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const [name, setName] = useState(role?.name ?? '');
  const [granted, setGranted] = useState<Set<Permission>>(new Set(role?.permissions ?? []));
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isPending = createRole.isPending || updateRole.isPending;

  const toggle = (key: Permission, on: boolean) =>
    setGranted((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter a role name.');
    if (roles.some((r) => r.id !== role?.id && r.name.toLowerCase() === trimmed.toLowerCase()))
      return setError('A role with this name already exists.');
    setError(null);
    const permissions = PERMISSIONS.map((p) => p.key).filter((key) => granted.has(key));
    if (role)
      updateRole.mutate(
        { id: role.id, patch: { name: trimmed, permissions } },
        { onSuccess: onClose },
      );
    else createRole.mutate({ name: trimmed, permissions }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit} noValidate className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <DrawerTitle>{role ? 'Edit role' : 'New role'}</DrawerTitle>
        <DrawerDescription>
          {role
            ? `${members} member${members === 1 ? ' has' : 's have'} this role; changes apply to all of them.`
            : 'Choose a name and what members with this role can do.'}
        </DrawerDescription>
      </DrawerHeader>

      <DrawerBody>
        <FieldGroup className="gap-5">
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="role-name">Role name</FieldLabel>
            <Input
              id="role-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
            <FieldError>{error}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Permissions</FieldLabel>
            <ul className="flex flex-col">
              {PERMISSIONS.map((permission) => (
                <li
                  key={permission.key}
                  className="flex items-center gap-3 border-b border-border-faint py-2.5 last:border-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{permission.label}</span>
                    <span className="text-xs text-muted-foreground">{permission.hint}</span>
                  </span>
                  <Switch
                    aria-label={permission.label}
                    checked={granted.has(permission.key)}
                    onCheckedChange={(checked) => toggle(permission.key, checked)}
                  />
                </li>
              ))}
            </ul>
          </Field>
        </FieldGroup>
        {(createRole.isError || updateRole.isError) && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            The role could not be saved. Try again.
          </p>
        )}
      </DrawerBody>

      <DrawerFooter>
        {role && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={members > 0}
            title={members > 0 ? 'Move its members to another role first' : undefined}
            onClick={() => setDeleting(true)}
          >
            Delete role
          </Button>
        )}
        <span className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {role ? 'Save changes' : 'Add role'}
        </Button>
      </DrawerFooter>

      {role && (
        <AlertDialog open={deleting} onOpenChange={setDeleting}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{role.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                No member has this role. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteRole.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleteRole.isPending}
                onClick={() =>
                  deleteRole.mutate(role.id, {
                    onSuccess: () => {
                      setDeleting(false);
                      onClose();
                    },
                  })
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </form>
  );
}
