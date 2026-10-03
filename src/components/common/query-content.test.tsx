import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { QueryContent } from './query-content';

describe('QueryContent', () => {
  it('preserves cached rows and offers retry during a transient refresh failure', async () => {
    const retry = vi.fn();
    const { rerender } = render(
      <QueryContent error={new Error('offline')} hasData title="Tasks unavailable" onRetry={retry}>
        <p>Saved task</p>
      </QueryContent>,
    );
    expect(screen.getByText('Saved task')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing previously loaded data');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(
      <QueryContent error={null} hasData title="Tasks unavailable">
        <p>Saved task</p>
      </QueryContent>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Saved task')).toBeInTheDocument();
  });

  it('uses the full error state when no data has loaded', () => {
    render(
      <QueryContent error={new Error('offline')} hasData={false} title="Tasks unavailable">
        <p>Tasks</p>
      </QueryContent>,
    );
    expect(screen.getByRole('heading', { name: 'Tasks unavailable' })).toBeInTheDocument();
    expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
  });

  it('blocks cached content when permission has been revoked', () => {
    render(
      <QueryContent error={new ApiError(403, {})} hasData title="No access">
        <p>Private task</p>
      </QueryContent>,
    );
    expect(screen.getByRole('heading', { name: 'No access' })).toBeInTheDocument();
    expect(screen.queryByText('Private task')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
