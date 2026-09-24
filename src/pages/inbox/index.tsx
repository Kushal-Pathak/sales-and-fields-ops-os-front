import { useState } from 'react';
import { Inbox, NewMessageDialog } from '@/features/inbox';
import { useDrawerParam } from '@/hooks/use-drawer-param';

/** `/inbox`: full-height three-panel inbox; the open thread is `?c=<id>`. */
export function InboxPage() {
  const selected = useDrawerParam('c');
  const [composing, setComposing] = useState(false);

  return (
    <>
      <Inbox
        selectedId={selected.id}
        onSelect={selected.open}
        onClose={selected.close}
        onCompose={() => setComposing(true)}
      />
      <NewMessageDialog open={composing} onOpenChange={setComposing} onStarted={selected.open} />
    </>
  );
}
