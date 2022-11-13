type TrunkNode<V> = TrieMap<symbol, V>;
type TreeNode<K, V> = TrieMap<K | symbol, TreeNode<K, V> | V>;

const dataSymbol = Symbol("data");
const protectedSetSymbol = Symbol("protected-set");
const protectedDeleteSymbol = Symbol("protected-delete");

export class IterableKeyedMap<IterableElement, Value>
  implements Map<Iterable<IterableElement>, Value>
{
  #size = 0;
  #root: TreeNode<IterableElement, Value>;
  #map = new Map<
    TreeNode<IterableElement, Value>,
    [Iterable<IterableElement>, Value]
  >();
  constructor(
    initialEntries: Iterable<
      [key: Iterable<IterableElement>, value: Value]
    > = []
  ) {
    this.#root = new TrieMap();
    for (const [key, value] of initialEntries) {
      this.set(key, value);
    }
  }
  [protectedSetSymbol](
    key: Iterable<IterableElement>,
    value: Value
  ): TreeNode<IterableElement, Value> {
    let map = this.#root;
    for (const item of key) {
      let nextMap = map.get(item);
      if (!nextMap) {
        nextMap = new TrieMap();
        map.set(item, nextMap);
      }
      map = nextMap as TreeNode<IterableElement, Value>;
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
    let map = this.#root;
    for (const item of key) {
      const nextMap = map.get(item);
      if (nextMap) {
        map = nextMap as TreeNode<IterableElement, Value>;
      } else {
        return false;
      }
    }
    return map.has(dataSymbol);
  }
  get(key: Iterable<IterableElement>): Value | undefined {
    let map = this.#root;
    for (const item of key) {
      const nextMap = map.get(item);
      if (!nextMap) {
        return undefined;
      }
      map = nextMap as TreeNode<IterableElement, Value>;
    }
    return (map as TrunkNode<Value>).get(dataSymbol);
  }
  [protectedDeleteSymbol](
    key: Iterable<IterableElement>
  ): TreeNode<IterableElement, Value> | undefined {
    let map = this.#root;
    const stack: {
      parent: TreeNode<IterableElement, Value>;
      child: TreeNode<IterableElement, Value>;
      item: IterableElement;
    }[] = [];
    for (const item of key) {
      const nextMap = map.get(item) as TreeNode<IterableElement, Value>;
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
    } else {
      return false;
    }
  }
  clear(): void {
    this.#root.clear();
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
  #map = new Map<TreeNode<unknown, Value> | Key, [Key, Value]>();
  constructor(initialEntries: Iterable<[key: Key, value: Value]> = []) {
    for (const [key, value] of initialEntries) {
      this.set(key, value);
    }
  }
  set(key: Key, value: Value): this {
    if (isReferenceIterable(key)) {
      if (!this.#iterableKeyedMap) {
        this.#iterableKeyedMap = new IterableKeyedMap();
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
        this.#iterableKeyedMap = new IterableKeyedMap();
      }
      return this.#iterableKeyedMap.has(key);
    } else {
      return this.#vanillaMap.has(key);
    }
  }
  get(key: Key): Value | undefined {
    if (isReferenceIterable(key)) {
      if (!this.#iterableKeyedMap) {
        this.#iterableKeyedMap = new IterableKeyedMap();
      }
      return this.#iterableKeyedMap.get(key);
    } else {
      return this.#vanillaMap.get(key);
    }
  }
  delete(key: Key): boolean {
    if (isReferenceIterable(key)) {
      if (!this.#iterableKeyedMap) {
        this.#iterableKeyedMap = new IterableKeyedMap();
      }
      const map = this.#iterableKeyedMap[protectedDeleteSymbol](key);
      if (map) {
        this.#map.delete(map);
        return true;
      } else {
        return false;
      }
    } else {
      this.#map.delete(key);
      return this.#vanillaMap.delete(key);
    }
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
