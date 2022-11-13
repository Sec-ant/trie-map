export interface MapOptions {
  deep: boolean; // default is true
}

const dataSymbol = Symbol();

export class TrieMap<Key, Value> implements Map<Key, Value> {
  #root: Map<unknown, unknown> | TrieMap<unknown, unknown> | undefined;
  #map = new Map<
    TrieMap<unknown, unknown> | Map<unknown, unknown> | Key,
    [Key, Value]
  >();
  #deep: boolean;
  constructor(
    initialEntries: Iterable<[Key, Value]> = [],
    { deep = true }: MapOptions = { deep: true }
  ) {
    this.#deep = deep;
    for (const [key, value] of initialEntries) {
      this.set(key, value);
    }
  }
  set(key: Key, value: Value): this {
    if (isReferenceIterable(key)) {
      if (!this.#root) {
        if (this.#deep) {
          this.#root = new TrieMap();
        } else {
          this.#root = new Map();
        }
      }
      let map = this.#root;
      for (const item of key) {
        let nextMap = map.get(item) as typeof map | undefined;
        if (!nextMap) {
          if (this.#deep) {
            nextMap = new TrieMap();
            map.set(item, nextMap);
          } else {
            nextMap = new Map();
            map.set(item, nextMap);
          }
        }
        map = nextMap;
      }
      map.set(dataSymbol, value);
      this.#map.set(map, [key, value]);
    } else {
      this.#map.set(key, [key, value]);
    }
    return this;
  }
  has(key: Key): boolean {
    if (isReferenceIterable(key)) {
      if (!this.#root) {
        return false;
      }
      let map = this.#root;
      for (const item of key) {
        const nextMap = map.get(item) as typeof map | undefined;
        if (nextMap) {
          map = nextMap;
        } else {
          return false;
        }
      }
      return map.has(key);
    }
    return this.#map.has(key);
  }
  get(key: Key): Value | undefined {
    if (isReferenceIterable(key)) {
      if (!this.#root) {
        return undefined;
      }
      let map = this.#root;
      for (const item of key) {
        const nextMap = map.get(item) as typeof map | undefined;
        if (!nextMap) {
          return undefined;
        }
        map = nextMap;
      }
      return map.get(dataSymbol) as Value | undefined;
    }
    return this.#map.get(key)?.[1];
  }
  delete(key: Key): boolean {
    if (isReferenceIterable(key)) {
      if (!this.#root) {
        return false;
      }
      let map = this.#root;
      const stack: {
        parent: typeof map;
        child: typeof map;
        item: unknown;
      }[] = [];
      for (const item of key) {
        const nextMap = map.get(item) as typeof map | undefined;
        if (nextMap) {
          stack.unshift({ parent: map, child: nextMap, item });
          map = nextMap;
        } else {
          return false;
        }
      }
      const hadPreviousValue = map.delete(dataSymbol);
      if (hadPreviousValue) {
        this.#map.delete(map);
        for (const { parent, child, item } of stack) {
          if (child.size === 0) {
            parent.delete(item);
          }
        }
        return true;
      }
    }
    return this.#map.delete(key);
  }
  clear(): void {
    if (this.#root) {
      this.#root.clear();
    }
    this.#map.clear();
  }
  get size(): number {
    return this.#map.size;
  }
  entries(): IterableIterator<[Key, Value]> {
    return this.#map.values();
  }
  *keys(): IterableIterator<Key> {
    for (const [key] of this.entries()) {
      yield key;
    }
  }
  *values(): IterableIterator<Value> {
    for (const [, value] of this.entries()) {
      yield value;
    }
  }
  forEach(
    callbackfn: (value: Value, key: Key, map: Map<Key, Value>) => void,
    thisArg?: unknown
  ): void {
    for (const [key, value] of this.entries()) {
      callbackfn.call(thisArg, value, key, this);
    }
  }
  *[Symbol.iterator]() {
    for (const entry of this.entries()) {
      yield entry;
    }
  }
  get [Symbol.toStringTag]() {
    return "TrieMap";
  }
}

function isReferenceIterable(
  item: unknown
): item is Iterable<unknown> & object {
  return typeof item === "object" && item !== null && Symbol.iterator in item;
}
