import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DRAWER_WIDTH, getDrawerWidth, setDrawerWidth } from '@/data/preferences';
import {
  DrawerBody,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from './drawer-panel';

function DetailPanel({ open = true, onOpenChange = () => {} }) {
  return (
    <DrawerPanel open={open} onOpenChange={onOpenChange}>
      <DrawerHeader>
        <DrawerTitle>Lead details</DrawerTitle>
        <DrawerDescription>Contact and next action</DrawerDescription>
      </DrawerHeader>
      <DrawerBody>Details</DrawerBody>
    </DrawerPanel>
  );
}

function mockPointerCapture(handle: HTMLElement) {
  const captured = new Set<number>();
  const setPointerCapture = vi.fn((id: number) => captured.add(id));
  Object.defineProperties(handle, {
    setPointerCapture: { value: setPointerCapture },
    hasPointerCapture: { value: (id: number) => captured.has(id) },
    releasePointerCapture: { value: (id: number) => captured.delete(id) },
  });
  return setPointerCapture;
}

describe('DrawerPanel resizing', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1600);
    setDrawerWidth(DEFAULT_DRAWER_WIDTH);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('drags the left edge, captures the pointer, and saves only the finished width', async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    const panel = screen.getByRole('dialog', { name: 'Lead details' });
    const handle = screen.getByRole('separator', { name: 'Resize detail panel' });
    const capture = mockPointerCapture(handle);
    expect(handle).toHaveAttribute('aria-controls', panel.id);

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { clientX: 800 } },
      { target: handle, coords: { clientX: 640 } },
    ]);
    expect(capture).toHaveBeenCalledOnce();
    expect(handle).toHaveAttribute('aria-valuenow', '624');
    expect(panel.style.getPropertyValue('--drawer-width')).toBe('624px');
    expect(getDrawerWidth()).toBe(DEFAULT_DRAWER_WIDTH);

    await user.pointer({ keys: '[/MouseLeft]', target: handle });
    expect(getDrawerWidth()).toBe(624);
    expect(panel).not.toHaveClass('select-none');
  });

  it('supports keyboard resizing, limits, and resetting without closing the drawer', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DetailPanel onOpenChange={onOpenChange} />);
    const handle = screen.getByRole('separator', { name: 'Resize detail panel' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus());
    handle.focus();
    await user.keyboard('{ArrowLeft}');
    expect(getDrawerWidth()).toBe(488);
    expect(handle).toHaveFocus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(getDrawerWidth()).toBe(440);
    await user.keyboard('{Home}{ArrowRight}');
    expect(getDrawerWidth()).toBe(360);
    await user.keyboard('{End}{ArrowLeft}');
    expect(getDrawerWidth()).toBe(960);
    await user.keyboard('{Enter}');
    expect(getDrawerWidth()).toBe(DEFAULT_DRAWER_WIDTH);
    expect(handle).toHaveFocus();
    expect(onOpenChange).not.toHaveBeenCalled();

    await user.keyboard('{ArrowLeft}');
    mockPointerCapture(handle);
    await user.dblClick(handle);
    expect(getDrawerWidth()).toBe(DEFAULT_DRAWER_WIDTH);
  });

  it('fits a shrinking viewport without overwriting the saved desktop preference', () => {
    setDrawerWidth(960);
    render(<DetailPanel />);
    const handle = screen.getByRole('separator', { name: 'Resize detail panel' });
    expect(handle).toHaveAttribute('aria-valuenow', '960');

    vi.stubGlobal('innerWidth', 1024);
    fireEvent(window, new Event('resize'));
    expect(handle).toHaveAttribute('aria-valuemax', '819');
    expect(handle).toHaveAttribute('aria-valuenow', '819');

    vi.stubGlobal('innerWidth', 375);
    fireEvent(window, new Event('resize'));
    expect(handle).toHaveAttribute('aria-valuenow', '375');
    expect(handle).toHaveClass('hidden', 'lg:block');
    expect(getDrawerWidth()).toBe(960);

    vi.stubGlobal('innerWidth', 1600);
    fireEvent(window, new Event('resize'));
    expect(handle).toHaveAttribute('aria-valuenow', '960');
  });

  it('remembers a completed resize after closing and reopening', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DetailPanel />);
    const handle = screen.getByRole('separator', { name: 'Resize detail panel' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus());
    handle.focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    rerender(<DetailPanel open={false} />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    rerender(<DetailPanel />);
    expect(screen.getByRole('separator', { name: 'Resize detail panel' })).toHaveAttribute(
      'aria-valuenow',
      '512',
    );
  });

  it('discards an unfinished drag when the drawer closes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DetailPanel />);
    const handle = screen.getByRole('separator', { name: 'Resize detail panel' });
    mockPointerCapture(handle);
    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { clientX: 800 } },
      { target: handle, coords: { clientX: 640 } },
    ]);
    rerender(<DetailPanel open={false} />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    rerender(<DetailPanel />);
    expect(screen.getByRole('separator', { name: 'Resize detail panel' })).toHaveAttribute(
      'aria-valuenow',
      String(DEFAULT_DRAWER_WIDTH),
    );
  });

  it('cancels a pointer gesture without saving its preview width', async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    const handle = screen.getByRole('separator', { name: 'Resize detail panel' });
    const capture = mockPointerCapture(handle);
    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { clientX: 800 } },
      { target: handle, coords: { clientX: 640 } },
    ]);
    const cancel = new Event('pointercancel', { bubbles: true });
    Object.defineProperty(cancel, 'pointerId', { value: capture.mock.calls[0]?.[0] });
    fireEvent(handle, cancel);
    expect(handle).toHaveAttribute('aria-valuenow', String(DEFAULT_DRAWER_WIDTH));
    expect(getDrawerWidth()).toBe(DEFAULT_DRAWER_WIDTH);
  });

  it('still closes with Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DetailPanel onOpenChange={onOpenChange} />);
    screen.getByRole('separator', { name: 'Resize detail panel' }).focus();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ reason: 'escape-key' }),
    );
  });
});
