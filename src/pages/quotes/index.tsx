import { PlusIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { QuoteDrawer, QuotesTable, QuotesToolbar, useQuotesList } from '@/features/quotes';
import { useDrawerParam } from '@/hooks/use-drawer-param';

/** `/quotes`: the quotes table with URL-driven views and filters, and the quote drawer. */
export function QuotesPage() {
  const list = useQuotesList();
  const drawer = useDrawerParam('quote');
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Quotes"
        count={list.rows && `${list.rows.length} quote${list.rows.length === 1 ? '' : 's'}`}
        actions={
          <Button size="sm" nativeButton={false} render={<Link to="/quotes/new" />}>
            <PlusIcon /> New quote
          </Button>
        }
      >
        <QuotesToolbar
          filters={list.filters}
          counts={list.counts}
          isActive={list.isActive}
          onChange={list.update}
          onClear={list.clear}
        />
      </PageHeader>
      <PageBody className="flex flex-col">
        <QuotesTable
          rows={list.visible}
          isPending={list.isPending}
          error={list.error}
          isFiltered={list.isActive || list.filters.view !== 'all'}
          onOpen={drawer.open}
          onCreate={() => navigate('/quotes/new')}
          onClearFilters={() => list.update({ view: 'all', q: '', createdById: null })}
          onRetry={() => void list.refetch()}
        />
      </PageBody>
      <QuoteDrawer quoteId={drawer.id} onClose={drawer.close} />
    </>
  );
}
