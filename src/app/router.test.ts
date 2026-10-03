import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';
import { isRouteHandle } from '@/types/route-handle';
import { adminNav, mainNav, visibleNav } from './navigation';
import { routes } from './router';

/** Every route with a path, with its full path, flattened through layout routes. */
function flatten(list: RouteObject[], base = ''): { path: string; route: RouteObject }[] {
  return list.flatMap((route) => {
    const path = route.path ? `${base}/${route.path}`.replace(/\/+/g, '/') : base;
    return [...(route.path ? [{ path, route }] : []), ...flatten(route.children ?? [], path)];
  });
}

const all = flatten(routes);
/** Routes that are not a page of any module. */
const OUTSIDE_MODULES = new Set(['/', '/sign-in', '/*', '/design-system']);

describe('route table', () => {
  it('declares a module on every page, including create, edit, import and print routes', () => {
    const pages = all.filter(({ path }) => !OUTSIDE_MODULES.has(path));
    expect(pages.length).toBeGreaterThan(15);
    for (const { path, route } of pages) {
      const handle: unknown = route.handle;
      expect(isRouteHandle(handle) && handle.module, `${path} has no module`).toBeTruthy();
    }
    const modules = Object.fromEntries(
      pages.map(({ path, route }) => [path, (route.handle as { module: string }).module]),
    );
    expect(modules['/quotes/new']).toBe('quotes');
    expect(modules['/quotes/:id/edit']).toBe('quotes');
    expect(modules['/quotes/:id/print']).toBe('quotes');
    expect(modules['/leads/import']).toBe('leads');
    expect(modules['/leads/pipeline']).toBe('leads');
    expect(modules['/settings/modules']).toBe('settings');
  });

  it('has a route with the same module for every sidebar entry', () => {
    for (const item of [...mainNav, adminNav].flatMap((group) => group.items)) {
      const match = all.find(({ path }) => path === item.to);
      expect(match, `${item.to} has no route`).toBeDefined();
      expect((match?.route.handle as { module?: string }).module).toBe(item.module);
    }
  });
});

describe('visibleNav', () => {
  it('keeps only entries of open modules and drops groups left empty', () => {
    const groups = visibleNav(mainNav, (module) => module === 'leads' || module === 'tasks');
    expect(groups.map((group) => group.label)).toEqual(['Sales', 'Work']);
    expect(groups.flatMap((group) => group.items.map((item) => item.to))).toEqual([
      '/leads',
      '/leads/pipeline',
      '/tasks',
    ]);
    expect(visibleNav([adminNav], () => false)).toEqual([]);
  });
});
