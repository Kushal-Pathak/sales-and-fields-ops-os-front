import {
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  DEFAULT_DRAWER_WIDTH,
  getDrawerWidth,
  MAX_DRAWER_WIDTH,
  MIN_DRAWER_WIDTH,
  setDrawerWidth,
  subscribeDrawerWidth,
} from '@/data/preferences';

const DESKTOP_BREAKPOINT = 1024;
const KEYBOARD_STEP = 24;

export function drawerWidthBounds(viewportWidth: number) {
  const max =
    viewportWidth < DESKTOP_BREAKPOINT
      ? viewportWidth
      : Math.min(MAX_DRAWER_WIDTH, Math.floor(viewportWidth * 0.8));
  return { min: Math.min(MIN_DRAWER_WIDTH, max), max };
}

export function clampDrawerWidth(width: number, viewportWidth: number): number {
  if (viewportWidth < DESKTOP_BREAKPOINT) return viewportWidth;
  const { min, max } = drawerWidthBounds(viewportWidth);
  return Math.round(Math.min(max, Math.max(min, width)));
}

function subscribeViewport(listener: () => void) {
  window.addEventListener('resize', listener);
  return () => window.removeEventListener('resize', listener);
}

const getViewportWidth = () => window.innerWidth;
const getServerViewportWidth = () => DESKTOP_BREAKPOINT;
const getServerDrawerWidth = () => DEFAULT_DRAWER_WIDTH;

interface ResizeDrag {
  pointerId: number;
  startX: number;
  startWidth: number;
  lastWidth: number;
}

/** Pointer capture confines a resize gesture to the drawer's left-edge handle. */
export function useDrawerWidth() {
  const preferredWidth = useSyncExternalStore(
    subscribeDrawerWidth,
    getDrawerWidth,
    getServerDrawerWidth,
  );
  const viewportWidth = useSyncExternalStore(
    subscribeViewport,
    getViewportWidth,
    getServerViewportWidth,
  );
  const [draftWidth, setDraftWidth] = useState<number | null>(null);
  const drag = useRef<ResizeDrag | null>(null);
  const width = clampDrawerWidth(draftWidth ?? preferredWidth, viewportWidth);
  const bounds = drawerWidthBounds(viewportWidth);

  function resizeTo(nextWidth: number) {
    setDrawerWidth(clampDrawerWidth(nextWidth, viewportWidth));
  }

  function resetWidth() {
    resizeTo(DEFAULT_DRAWER_WIDTH);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || drag.current || viewportWidth < DESKTOP_BREAKPOINT) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
      lastWidth: width,
    };
    setDraftWidth(width);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.lastWidth = clampDrawerWidth(
      current.startWidth + current.startX - event.clientX,
      viewportWidth,
    );
    setDraftWidth(current.lastWidth);
  }

  function releasePointer(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    setDrawerWidth(current.lastWidth);
    setDraftWidth(null);
    releasePointer(event);
  }

  function cancelDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setDraftWidth(null);
    releasePointer(event);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = KEYBOARD_STEP * (event.shiftKey ? 2 : 1);
    switch (event.key) {
      case 'ArrowLeft':
        resizeTo(width + step);
        break;
      case 'ArrowRight':
        resizeTo(width - step);
        break;
      case 'Home':
        resizeTo(bounds.min);
        break;
      case 'End':
        resizeTo(bounds.max);
        break;
      case 'Enter':
        resetWidth();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return {
    width,
    ...bounds,
    isResizing: draftWidth !== null,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: cancelDrag,
      onLostPointerCapture: finishDrag,
      onKeyDown,
      onDoubleClick: resetWidth,
    },
  };
}
