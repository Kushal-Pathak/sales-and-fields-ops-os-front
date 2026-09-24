import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoles, useUsers } from '@/features/workspace';
import type { User } from '@/types/domain';
import { useCreateMember, useUpdateMember } from '../hooks/use-team-mutations';
import { nextUserColor } from '../utils/team-model';

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, edits this member instead of adding one. */
  member?: User | undefined;
  onSaved?: (userId: string) => void;
}

/** Add ("invite") or edit a member. Without auth, adding creates the record directly. */
export function MemberFormDialog({ open, onOpenChange, member, onSaved }: MemberFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit member' : 'Invite member'}</DialogTitle>
          <DialogDescription>
            {member
              ? 'Update contact details or change the role.'
              : 'The member is added right away; sign-in invitations arrive with authentication.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <MemberForm
            member={member}
            onCancel={() => onOpenChange(false)}
            onSaved={(id) => {
              onOpenChange(false);
              onSaved?.(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberForm({
  member,
  onCancel,
  onSaved,
}: {
  member: User | undefined;
  onCancel: () => void;
  onSaved: (userId: string) => void;
}) {
  const roles = useRoles().data ?? [];
  const users = useUsers().data ?? [];
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();

  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [roleId, setRoleId] = useState(
    member?.roleId ?? roles.find((r) => r.name === 'Sales')?.id ?? roles[0]?.id ?? '',
  );
  const [errors, setErrors] = useState<{ name?: string; email?: string; roleId?: string }>({});

  const isPending = createMember.isPending || updateMember.isPending;
  const saveError = createMember.error ?? updateMember.error;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) next.name = 'Enter the member’s name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      next.email = 'Enter a valid email address.';
    else if (users.some((u) => u.id !== member?.id && u.email.toLowerCase() === trimmedEmail))
      next.email = 'A member with this email already exists.';
    if (!roleId) next.roleId = 'Choose a role.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const trimmedPhone = phone.trim();
    if (member) {
      updateMember.mutate(
        {
          id: member.id,
          patch: {
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone || undefined,
            roleId,
          },
        },
        { onSuccess: (saved) => onSaved(saved.id) },
      );
      return;
    }
    createMember.mutate(
      {
        name: trimmedName,
        email: trimmedEmail,
        ...(trimmedPhone && { phone: trimmedPhone }),
        roleId,
        active: true,
        color: nextUserColor(users),
      },
      { onSuccess: (saved) => onSaved(saved.id) },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FieldGroup className="gap-3">
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="member-name">Name</FieldLabel>
          <Input
            id="member-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={errors.name ? true : undefined}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="member-email">Email</FieldLabel>
          <Input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="member-phone">Phone</FieldLabel>
            <Input
              id="member-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field data-invalid={errors.roleId ? true : undefined}>
            <FieldLabel htmlFor="member-role">Role</FieldLabel>
            <Select
              value={roleId}
              onValueChange={(value) => value && setRoleId(value)}
              items={roles.map((role) => ({ value: role.id, label: role.name }))}
            >
              <SelectTrigger id="member-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.roleId}</FieldError>
          </Field>
        </div>
      </FieldGroup>
      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          The member could not be saved. Try again.
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {member ? 'Save changes' : 'Add member'}
        </Button>
      </DialogFooter>
    </form>
  );
}
