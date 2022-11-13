type TrunkNode<V, D extends boolean> = D extends true
  ? TrieMap<symbol, V>
  : Map<symbol, V>;
type TreeNode<K, V, D extends boolean> = D extends true
  ? TrieMap<K | symbol, TreeNode<K, V, D> | V>
  : Map<K | symbol, TreeNode<K, V, D> | V>;

interface MapOptions {
  deep: boolean; // default is true
}

const dataSymbol = Symbol();
const protectedSetSymbol = Symbol();
const protectedDeleteSymbol = Symbol();

export class IterableKeyedMap<IterableElement, Value>
  implements Map<Iterable<IterableElement>, Value>
{
  #size = 0;
  #shallowRoot: TreeNode<IterableElement, Value, false> | undefined;
  #deepRoot: TreeNode<IterableElement, Value, true> | undefined;
  #map = new Map<
    TreeNode<IterableElement, Value, boolean>,
    [Iterable<IterableElement>, Value]
  >();
  #deep: boolean;
  constructor(
    initialEntries: Iterable<
      [key: Iterable<IterableElement>, value: Value]
    > = [],
    { deep = true }: MapOptions = {
      deep: true,
    }
  ) {
    this.#deep = deep;
    if (deep) {
      this.#deepRoot = new TrieMap();
    } else {
      this.#shallowRoot = new Map();
    }
    for (const [key, value] of initialEntries) {
      this.set(key, value);
    }
  }
  get #root() {
    return this.#deepRoot ?? this.#shallowRoot;
  }
  [protectedSetSymbol](
    key: Iterable<IterableElement>,
    value: Value
  ): TreeNode<IterableElement, Value, boolean> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let map = this.#root!;
    for (const item of key) {
      let nextMap = map.get(item);
      if (!nextMap) {
        if (this.#deep) {
          nextMap = new TrieMap();
          map.set(item, nextMap);
        } else {
          nextMap = new Map();
          map.set(item, nextMap);
        }
      }
      map = nextMap as TreeNode<IterableElement, Value, boolean>;
    }
    if (!map.has(dataSymbol)) {
      ++this.#size;
    }
    map.set(dataSymbol, value);
    this.#map.set(map, [key, value]);
    return map;
  }
  set(key: Iterable<IterableElement>, value: Value): this {
    this[protectedSetSymbol](key, value);
    return this;
  }
  has(key: Iterable<IterableElement>): boolean {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let map = this.#root!;
    for (const item of key) {
      const nextMap = map.get(item);
      if (nextMap) {
        map = nextMap as TreeNode<IterableElement, Value, boolean>;
      } else {
        return false;
      }
    }
    return map.has(dataSymbol);
  }
  get(key: Iterable<IterableElement>): Value | undefined {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let map = this.#root!;
    for (const item of key) {
      const nextMap = map.get(item);
      if (!nextMap) {
        return undefined;
      }
      map = nextMap as TreeNode<IterableElement, Value, boolean>;
    }
    return (map as TrunkNode<Value, boolean>).get(dataSymbol);
  }
  [protectedDeleteSymbol](
    key: Iterable<IterableElement>
  ): TreeNode<IterableElement, Value, boolean> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let map = this.#root!;
    const stack: {
      parent: TreeNode<IterableElement, Value, boolean>;
      child: TreeNode<IterableElement, Value, boolean>;
      item: IterableElement;
    }[] = [];
    for (const item of key) {
      const nextMap = map.get(item) as TreeNode<
        IterableElement,
        Value,
        boolean
      >;
      if (nextMap) {
        stack.unshift({ parent: map, child: nextMap, item });
        map = nextMap;
      } else {
        return undefined;
      }
    }
    const hadPreviousValue = map.delete(dataSymbol);
    if (hadPreviousValue) {
      --this.#size;
      this.#map.delete(map);
      for (const { parent, child, item } of stack) {
        if (child.size === 0) {
          parent.delete(item);
        }
      }
      return map;
    }
    return undefined;
  }
  delete(key: Iterable<IterableElement>): boolean {
    const map = this[protectedDeleteSymbol](key);
    if (map) {
      return true;
    }
    return false;
  }
  clear(): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.#root!.clear();
    this.#map.clear();
    this.#size = 0;
  }
  get size(): number {
    return this.#size;
  }
  entries(): IterableIterator<[Iterable<IterableElement>, Value]> {
    return this.#map.values();
  }
  *keys(): IterableIterator<Iterable<IterableElement>> {
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
    callbackfn: (
      value: Value,
      key: Iterable<IterableElement>,
      map: Map<Iterable<IterableElement>, Value>
    ) => void,
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
    return "IterableKeyedMap";
  }
}

export class TrieMap<Key, Value> implements Map<Key, Value> {
  #vanillaMap = new Map<Key, Value>();
  #iterableKeyedMap: IterableKeyedMap<unknown, Value> | undefined;
  #map = new Map<TreeNode<unknown, Value, boolean> | Key, [Key, Value]>();
  #deep: boolean;
  constructor(
    initialEntries: Iterable<[key: Key, value: Value]> = [],
    { deep = true }: MapOptions = { deep: true }
  ) {
    this.#deep = deep;
    for (const [key, value] of initialEntries) {
      this.set(key, value);
    }
  }
  set(key: Key, value: Value): this {
    if (isReferenceIterable(key)) {
      if (!this.#iterableKeyedMap) {
        if (this.#deep) {
          this.#iterableKeyedMap = new IterableKeyedMap();
        } else {
          this.#iterableKeyedMap = new IterableKeyedMap(undefined, {
            deep: false,
          });
        }
      }
      const map = this.#iterableKeyedMap[protectedSetSymbol](key, value);
      this.#map.set(map, [key, value]);
    } else {
      this.#vanillaMap.set(key, value);
      this.#map.set(key, [key, value]);
    }
    return this;
  }
  has(key: Key): boolean {
    if (isReferenceIterable(key)) {
      if (!this.#iterableKeyedMap) {
        return false;
      }
      return this.#iterableKeyedMap.has(key);
    }
    return this.#vanillaMap.has(key);
  }
  get(key: Key): Value | undefined {
    if (isReferenceIterable(key)) {
      if (!this.#iterableKeyedMap) {
        return undefined;
      }
      return this.#iterableKeyedMap.get(key);
    }
    return this.#vanillaMap.get(key);
  }
  delete(key: Key): boolean {
    if (isReferenceIterable(key)) {
      if (!this.#iterableKeyedMap) {
        return false;
      }
      const map = this.#iterableKeyedMap[protectedDeleteSymbol](key);
      if (map) {
        this.#map.delete(map);
        return true;
      }
      return false;
    }
    this.#map.delete(key);
    return this.#vanillaMap.delete(key);
  }
  clear(): void {
    if (this.#iterableKeyedMap) {
      this.#iterableKeyedMap.clear();
    }
    this.#vanillaMap.clear();
    this.#map.clear();
  }
  get size(): number {
    if (!this.#iterableKeyedMap) {
      return this.#vanillaMap.size;
    }
    return this.#iterableKeyedMap.size + this.#vanillaMap.size;
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
