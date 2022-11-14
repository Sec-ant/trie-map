# @sec-ant/trie-map

![GitHub top language](https://img.shields.io/github/languages/top/Sec-ant/trie-map) [![npm version](https://img.shields.io/npm/v/@sec-ant/trie-map.svg)](https://www.npmjs.com/package/@sec-ant/trie-map) [![npm downloads](https://img.shields.io/npm/dm/@sec-ant/trie-map.svg)](https://www.npmjs.com/package/@sec-ant/trie-map) [![](https://data.jsdelivr.com/v1/package/npm/@sec-ant/trie-map/badge?style=rounded)](https://www.jsdelivr.com/package/npm/@sec-ant/trie-map) ![GitHub search hit counter](https://img.shields.io/github/search/Sec-ant/trie-map/goto)

This package impelements a Map-like data structure backed by [trie](https://en.wikipedia.org/wiki/Trie).

## Why?

In the native [Map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map) data structure provided by Javascript, key equality is based on the [SameValueZero](https://developer.mozilla.org/docs/Web/JavaScript/Equality_comparisons_and_sameness#same-value-zero_equality) algorithm. So, two different arrays with same contents are considered as two different keys:

```js
const a = ["hello", "world"];
const b = ["hello", "world"];

const map = new Map();

map.set(a, "foo").set(b, "bar");

map.get(a); // => "foo"
map.get(b); // => "bar"

map.get(["hello", "world"]); // => undefined
```

However, in some use cases, we don't always preserve the references of the keys (and in some cases we just don't have them, i.e. when the map is imported from a third-party module) and we want arrays with same contents always point to the same value, i.e. in a file system:

```js
const map = new Map();

map.set(["c", "program files"], "hello world.txt");

map.get(["c", "program files"]); // => undefined, oops!
```

This package treats iterable-reference-type (array or array-like object that implements the [iterable protocol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterable_protocol)) keys as values and uses value-equality to check key equality. The underlying structure is a [trie](https://en.wikipedia.org/wiki/Trie).

## Install

```bash
npm i @sec-ant/trie-map
```

or

```bash
yarn add @sec-ant/trie-map
```

## Basic Usage

```js
import { TrieMap } from "@sec-ant/trie";

const a = ["hello", "world"];
const b = ["hello", "world"];

const tmap = new TrieMap();

tmap.set(a, "foo");

tmap.get(a); // => "foo"
tmap.get(b); // => "foo"
tmap.get(["hello", "world"]); // => "foo"
```

## Features

This package is greatly inspired by and plays a similar role as [anko/array-keyed-map](https://github.com/anko/array-keyed-map). Other similar packages include [immutable.js Map](https://immutable-js.com/docs/v3.8.2/Map/#:~:text=Map%27s%20keys%20can%20be,used%20as%20a%20key.), [bemoje/trie-map](https://github.com/bemoje/trie-map), [isogon/tuple-map](https://github.com/isogon/tuple-map), etc.

However, the following features make this package stand out:

### Typescript Support

This packages is fully written in Typescript

```ts
import { TrieMap } from "@sec-ant/trie";

const tmap = new TrieMap<string[], string>();

tmap.set(["hello", "world"], "foo");

// value type will be inferred as string | undefined
const value = tmap.get(["hello", "world"]); // => "foo"
```

### Pure ECMAScript Module

[ECMAScript modules (ESM)](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Modules) is the now and future of javascript module system.

### Fully Mimics All Native Map APIs

<details>
  <summary>Mimic all methods and properties in <href src="https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map#instance_properties">Map</href></summary>

```ts
import { TrieMap } from "@sec-ant/trie";

// construct, use [key, value] entries to init a TrieMap instance
const tmap = new TrieMap<string[], string>([
  [["hello", "world"], "foo"],
  [["hello", "TrieMap"], "bar"],
]);

// set
tmap.set([], "empty"); // => tmap
tmap.set([""], "empty string"); // => tmap

// has
tmap.has(["hello", "world"]); // => true
tmap.has(["hello"]); // => false

// get
tmap.get([]); // => "empty"
tmap.get(["hello"]); // => undefined

// delete
tmap.delete([]); // => true
tmap.delete(["hello"]); // => false

// size
tmap.size; // => 3

// entries
[...tmap.entries()]; // => [[["hello", "world"], "foo"], [["hello", "TrieMap"], "bar"], [[""], "empty string"]]

// keys
[...tmap.keys()]; // => [["hello", "world"], ["hello", "TrieMap"], [""]]

// values
[...tmap.values()]; // => ["foo", "bar", "empty string"]

// forEach
tmap.forEach((value, key) => console.log([key[0], value])); // => [["hello", "foo"], ["hello", "bar"], ["", "empty string"]]

// Symbol.iterator
[...tmap]; // => same result as [...tmap.entries()]

// Symbol.toStringTag
tmap.toString(); // => [object TrieMap]

// clear
tmap.clear(); // => undefined, remove all key-value pairs
```

</details>

### Iterations in Insertion Order

All iterations (`entries()`, `keys()`, `values()`, `forEach` and `Symbol.iterator`) are in insertion order.

### Supports Mixing of Primitives and Iterable References as Keys

```ts
import { TrieMap } from "@sec-ant/trie";

const tmap = new TrieMap<string | number | string[], string>();

tmap.set("key", "string").get("key"); // => "string"
tmap.set(2, "number").get(2); // => "number"
tmap.set(["string"], "array").get(["string"]); // => "array"

[...tmap]; // => [["key", "string"], [2, "number"], [["string"], "array"]]
```

### Supports Value Comparison of Deeply Nested Iterables

```ts
import { TrieMap } from "@sec-ant/trie";

const tmap = new TrieMap<(string | string[])[], string>();

tmap.set([], "foo").get([]); // => "foo"
tmap.set([[]], "bar").get([[]]); // => "bar"
tmap.set([[], []], "baz").get([[], []]); // => "baz"
tmap.set([["1"], [], "2", ["3"]], "123").get([["1"], [], "2", ["3"]]); // => "123"
```

### Provides an Option to Opt Out From Value Comparison of Deeply Nested Iterables, i.e., Shallow Comparison of Keys

```ts
import { TrieMap, TrieMapOptions } from "@sec-ant/trie";

const options: TrieMapOptions = { deep: false }; // the default value of deep is true

const tmap = new TrieMap<(string | string[])[], string>(undefined, options);

const two = ["2"];

tmap.set([], "foo").get([]); // => "foo"
tmap.set(["1"], "bar").get(["1"]); // => "bar"
tmap.set(["1", two, "3"], "baz").get(["1", two, "3"]); // => "baz"
tmap.get(["1", ["2"], "3"]); // => undefined
```

### Uses Class Private Fields and Unique Symbols for Encapsulation

See [`#private`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Classes/Private_class_fields) and [`Symbol()`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Symbol)

### No Dependencies

This package has no dependencies and the js code is only 1.37 kiB after minification.

## Runtime Coverage

The runtime should support [ES modules](https://caniuse.com/?search=es%20modules), [Classes](https://caniuse.com/?search=classes), [Generators and `yield`](https://caniuse.com/?search=yield) and [Symbol](https://caniuse.com/?search=symbol). Although you should be able to transpile this package when using other front-end build or bundle tools.

Check the configured browserslist coverage [here](https://browsersl.ist/#q=supports+es6-module+and+last+4+versions%2C+Chrome+%3E%3D74%2C+Edge%3E%3D+79%2C+Safari+%3E%3D+14.1%2C+Firefox+%3E%3D+90%2C+Opera+%3E%3D+62%2C+ChromeAndroid+%3E%3D+107%2C+iOS+%3E%3D+15%2C+Samsung+%3E%3D+11.1%2C+node+%3E%3D+14).

## Notes

Any two iterable reference type keys are considered equal, value-comparison-wise, as long as their iteration results are same:

```ts
import { TrieMap } from "@sec-ant/trie";

const tmap = new TrieMap<number[] | Uint8Array, string>();

tmap.set([1, 2], "foo");

tmap.get(new Uint8Array([1, 2])); // => "foo"
```

## Todos

- [ ] Type issues.
- [ ] Unit tests.

## LICENSE

MIT
