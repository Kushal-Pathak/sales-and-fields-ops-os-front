import { useParams } from 'react-router';
import { QuoteBuilder } from '@/features/quotes';

/** `/quotes/:id/edit`: the builder over an existing draft. */
export function EditQuotePage() {
  const { id = '' } = useParams();
  return <QuoteBuilder quoteId={id} />;
}
