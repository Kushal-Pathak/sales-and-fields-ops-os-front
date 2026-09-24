import type { KeyboardCoordinateGetter } from '@dnd-kit/core';

/**
 * Keyboard coordinates for boards whose droppables are side-by-side columns:
 * Left/Right move the lifted item to the neighbouring column instead of a few pixels.
 * Up/Down are ignored because position inside a column is not modelled.
 */
export const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const { collisionRect, droppableContainers, droppableRects } = context;
  if (!collisionRect) return undefined;
  if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return undefined;
  event.preventDefault();

  const columns = droppableContainers
    .getEnabled()
    .map((container) => droppableRects.get(container.id))
    .filter((rect): rect is NonNullable<typeof rect> => rect !== undefined)
    .sort((a, b) => a.left - b.left);
  const centerX = collisionRect.left + collisionRect.width / 2;
  let index = columns.findIndex((rect) => centerX >= rect.left && centerX <= rect.right);
  if (index === -1) index = event.code === 'ArrowRight' ? -1 : columns.length;
  const target = columns[index + (event.code === 'ArrowRight' ? 1 : -1)];
  return target ? { x: target.left + 8, y: collisionRect.top } : undefined;
};

/** Keys for a board: Space lifts and drops, Escape cancels; Enter is left free to "open". */
export const boardKeyboardCodes = { start: ['Space'], cancel: ['Escape'], end: ['Space'] };
