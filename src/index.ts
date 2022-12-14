export interface TrieMapOptions {
  deep?: boolean; // default is true
  ordered?: boolean; // default is true
}

const dataSymbol = Symbol();

export class TrieMap<Key, Value> implements Map<Key, Value> {
  #root: Map<unknown, unknown> | TrieMap<unknown, unknown> | undefined;
  #map = new Map<
    TrieMap<unknown, unknown> | Map<unknown, unknown> | Key,
    Key | Value
  >();
  #deep: boolean;
  #ordered: boolean;
  #size = 0;
  constructor(
    initialEntries: Iterable<[Key, Value]> = [],
    { deep = true, ordered = true }: TrieMapOptions = {
      deep: true,
      ordered: true,
    }
  ) {
    this.#deep = deep;
    this.#ordered = ordered;
    for (const [key, value] of initialEntries) {
      this.set(key, value);
    }
  }
  set(key: Key, value: Value): this {
    if (isIterableReference(key)) {
      if (!this.#root) {
        this.#root = this.#deep ? new TrieMap() : new Map();
      }
      let map = this.#root;
      for (const item of key) {
        let nextMap = map.get(item) as typeof map | undefined;
        if (!nextMap) {
          nextMap = this.#deep ? new TrieMap() : new Map();
          map.set(item, nextMap);
        }
        map = nextMap;
      }
      map.set(dataSymbol, value);
      this.#ordered ? this.#map.set(map, key) : ++this.#size;
    } else {
      this.#map.set(key, value);
    }
    return this;
  }
  has(key: Key): boolean {
    if (isIterableReference(key)) {
      if (!this.#root) {
        return false;
      }
      let map = this.#root;
      for (const item of key) {
        const nextMap = map.get(item) as typeof map | undefined;
        if (!nextMap) {
          return false;
        }
        map = nextMap;
      }
      return map.has(key);
    }
    return this.#map.has(key);
  }
  get(key: Key): Value | undefined {
    if (isIterableReference(key)) {
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
    return this.#map.get(key) as Value | undefined;
  }
  delete(key: Key): boolean {
    if (isIterableReference(key)) {
      if (!this.#root) {
        return false;
      }
      let map = this.#root;
      const stack = [map];
      for (const item of key) {
        const nextMap = map.get(item) as typeof map | undefined;
        if (!nextMap) {
          return false;
        }
        map = nextMap;
        stack.unshift(map);
      }
      const hadPreviousValue = map.delete(dataSymbol);
      if (hadPreviousValue) {
        this.#ordered ? this.#map.delete(map) : --this.#size;
        let child: typeof map | undefined;
        for (const map of stack) {
          child && map.delete(child);
          if (map.size) {
            break;
          }
          child = map;
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
    this.#size = 0;
  }
  get size(): number {
    return this.#map.size;
  }
  *entries(): IterableIterator<[Key, Value]> {
    for (const [key, value] of this.#map.entries()) {
      yield (
        isIterableReference(key) ? [value, key.get(dataSymbol)] : [key, value]
      ) as [Key, Value];
    }
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

function isIterableReference(
  item: unknown
): item is Iterable<unknown> & object {
  return typeof item === "object" && item !== null && Symbol.iterator in item;
}
