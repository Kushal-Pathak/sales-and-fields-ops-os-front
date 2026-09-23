/** Thrown by `Collection.get` / `update` / `remove` when the id does not exist. */
export class NotFoundError extends Error {
  readonly collection: string;
  readonly id: string;

  constructor(collection: string, id: string) {
    super(`${collection} "${id}" was not found`);
    this.name = 'NotFoundError';
    this.collection = collection;
    this.id = id;
  }
}
