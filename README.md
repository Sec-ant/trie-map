# trie-map

This package is greatly inspired by [anko/array-keyed-map](https://github.com/anko/array-keyed-map).

```ts
import { TrieMap } from "./index.js";

const tmap = new TrieMap<string | any[], number | string>([
  [[0, [0, [0, [0, "0"], "0"], "0"], "0"], "hello world"],
]);

console.log(tmap.set("1", "foo").get("1"));
console.log(tmap.set([1, 2], "bar").get([1, 2]));
console.log(tmap.set(["1", "2"], 256).get(["1", "2"]));
console.log(
  tmap.set(["1", ["2", [3, 4], "5"]], 1024).get(["1", ["2", [3, 4], "5"]])
);

console.log(tmap.get([0, [0, [0, [0, "0"], "0"], "0"], "0"]));

console.log(...tmap);

console.log(tmap.delete(["1", "2"]));

console.log(...tmap);
```

## Features

- Fully written in Typescript.
- Pure ESM package.
- Allows deeply nested iterable keys.
- The underlying tree structure is trie.
- Uses [class private fields](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Classes/Private_class_fields).
- Keeps all the APIs the same with [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map#instance_properties) ensured by [`implements` clauses](https://www.typescriptlang.org/docs/handbook/2/classes.html#implements-clauses).
- Iteration is in insertion order.
- No dependencies.

## Todos

- [ ] Type issues.
- [ ] Unit tests.
- [x] Code minification. (use [esm.run](https://cdn.jsdelivr.net/npm/trie-map/+esm))
