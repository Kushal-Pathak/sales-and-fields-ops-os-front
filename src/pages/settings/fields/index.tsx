import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { SettingsNav } from '@/components/layout/settings-nav';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DeleteFieldDialog,
  ENTITY_LABEL,
  FIELD_ENTITIES,
  FieldDrawer,
  FieldList,
  NEW_FIELD_ID,
} from '@/features/custom-fields';
import { useDrawerParam } from '@/hooks/use-drawer-param';
import type { FieldEntity } from '@/types/domain';

/** `/settings/fields`: custom fields per record type, with the field drawer via `?field=`. */
export function FieldsSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const entityParam = searchParams.get('entity');
  const entity: FieldEntity = (FIELD_ENTITIES as string[]).includes(entityParam ?? '')
    ? (entityParam as FieldEntity)
    : 'lead';
  const drawer = useDrawerParam('field');
  const [deleting, setDeleting] = useState<string | null>(null);

  const setEntity = (next: string) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'lead') params.delete('entity');
        else params.set('entity', next);
        params.delete('field');
        return params;
      },
      { replace: true },
    );
  };

  return (
    <>
      <PageHeader
        title="Custom fields"
        actions={
          <Button size="sm" onClick={() => drawer.open(NEW_FIELD_ID)}>
            <PlusIcon /> Add field
          </Button>
        }
      >
        <SettingsNav />
      </PageHeader>
      <PageBody className="flex flex-col gap-4 p-4">
        <Tabs value={entity} onValueChange={setEntity}>
          <TabsList className="h-auto gap-0.5 bg-transparent p-0">
            {FIELD_ENTITIES.map((item) => (
              <TabsTrigger
                key={item}
                value={item}
                className="h-7 px-2.5 data-active:bg-accent data-active:shadow-none"
              >
                {ENTITY_LABEL[item]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <FieldList
          key={entity}
          entity={entity}
          onEdit={drawer.open}
          onDelete={setDeleting}
          onCreate={() => drawer.open(NEW_FIELD_ID)}
        />
        <FieldDrawer
          entity={entity}
          fieldId={drawer.id}
          onClose={drawer.close}
          onDelete={setDeleting}
        />
        <DeleteFieldDialog
          fieldId={deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            drawer.close();
          }}
        />
      </PageBody>
    </>
  );
}
