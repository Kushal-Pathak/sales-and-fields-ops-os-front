import { describe, expect, it } from 'vitest';
import { clampDrawerWidth, drawerWidthBounds } from './use-drawer-width';

describe('drawer width bounds', () => {
  it('keeps desktop drawers within their limits and leaves part of the list visible', () => {
    expect(drawerWidthBounds(1920)).toEqual({ min: 360, max: 960 });
    expect(drawerWidthBounds(1024)).toEqual({ min: 360, max: 819 });
    expect(clampDrawerWidth(100, 1920)).toBe(360);
    expect(clampDrawerWidth(1200, 1920)).toBe(960);
    expect(clampDrawerWidth(960, 1024)).toBe(819);
    expect(clampDrawerWidth(464, 1920)).toBe(464);
  });

  it.each([375, 640, 800, 1023])('uses full width below desktop at %i pixels', (viewport) => {
    expect(clampDrawerWidth(464, viewport)).toBe(viewport);
    expect(clampDrawerWidth(960, viewport)).toBe(viewport);
  });
});
