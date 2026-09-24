import { useParams } from 'react-router';
import { QuotePrint } from '@/features/quotes';

/** `/quotes/:id/print`: the printable quote, rendered outside the app shell. */
export function QuotePrintPage() {
  const { id = '' } = useParams();
  return <QuotePrint quoteId={id} />;
}
