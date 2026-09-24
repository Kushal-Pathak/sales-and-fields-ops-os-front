import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Pipeline } from '@/types/domain';
import { useUpdatePipeline } from '../hooks/use-pipeline-mutations';

/** Inline rename of the pipeline, saved on submit. */
export function PipelineNameForm({ pipeline }: { pipeline: Pipeline }) {
  const [name, setName] = useState(pipeline.name);
  const update = useUpdatePipeline();
  const dirty = name.trim() !== pipeline.name && name.trim() !== '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (dirty) update.mutate({ id: pipeline.id, patch: { name: name.trim() } });
  };

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pipeline-name">Pipeline name</Label>
        <Input
          id="pipeline-name"
          className="w-72"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <Button type="submit" variant="outline" disabled={!dirty || update.isPending}>
        Save
      </Button>
      {update.isError && (
        <span className="text-sm text-destructive">The name could not be saved.</span>
      )}
    </form>
  );
}
