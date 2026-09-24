import { useSearchParams } from 'react-router';
import { QuoteBuilder } from '@/features/quotes';

/** `/quotes/new`: the builder for a new quote; `?lead=<id>` preselects the lead. */
export function NewQuotePage() {
  const [searchParams] = useSearchParams();
  return <QuoteBuilder defaultLeadId={searchParams.get('lead')} />;
}
