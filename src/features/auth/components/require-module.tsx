import type { ReactNode } from 'react';
import { CompassIcon, LockIcon } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import type { ModuleId } from '@/types/domain';
import { useModule } from '../hooks/use-module';
import { MODULES } from '../utils/modules';
import type { AccessDenial } from '../utils/resolve-access';

/**
 * Renders its children only when `module` is open to the signed-in user. A module the
 * workspace does not have looks like a page that does not exist; a module the user's
 * role cannot open says so.
 */
export function RequireModule({ module, children }: { module: ModuleId; children: ReactNode }) {
  const state = useModule(module);
  if (state.status === 'allowed') return <>{children}</>;
  if (state.status === 'loading') return null;
  return <ModuleDenied module={module} reason={state.reason} />;
}

function ModuleDenied({ module, reason }: { module: ModuleId; reason: AccessDenial }) {
  const home = (
    <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/" />}>
      Back to home
    </Button>
  );
  if (reason === 'forbidden') {
    return (
      <EmptyState
        icon={LockIcon}
        title={`You don’t have access to ${MODULES[module].label}`}
        hint="Your role does not include it. Ask a workspace admin if you need it."
        action={home}
      />
    );
  }
  return (
    <EmptyState
      icon={CompassIcon}
      title="Page not found"
      hint="The page you are looking for does not exist."
      action={home}
    />
  );
}
