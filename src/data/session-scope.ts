import { SessionChangedError } from './errors';

let controller = new AbortController();

/** Captured by a write when its hook mounts; later steps keep this same identity. */
export function getDataSessionSignal(): AbortSignal {
  return controller.signal;
}

/** Stops old reads/writes locally. A server may already have committed an in-flight write. */
export function beginDataSession(): AbortSignal {
  controller.abort(new SessionChangedError());
  controller = new AbortController();
  return controller.signal;
}
