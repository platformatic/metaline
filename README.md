# metaline

A tiny language to write mapping functions as strings.

## Install

```bash
npm i metaline
```

## Example syntax

The string `where.id.in.$>#id;limit:99` generates the equivalent function of:

```js
function transform (input) {
  return {
    where: {
      id: {
        in: input.map((i) => i.id)
      }
    },
    limit: 99
  }
}
```

The string `$>id.#directoryId` generates the equivalent function of:

```js
function transform (input) {
  return input.map((t) => {
    return {
      id: t.directoryId
    }
  })
}
```


## Language Tokens

* `.` separate properties in an object
* `$` the input 
* `$>` loop over the input
* `#` access the following input property

## License

Apache-2.0
