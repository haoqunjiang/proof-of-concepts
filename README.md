# parallel-vue-versions-js-only

## Project setup

```sh
yarn install
```

### Compiles and hot-reloads for development

```sh
yarn serve
```

### Compiles and minifies for production

```sh
yarn build
```

<!-- ### Lints and fixes files
```sh
yarn lint
``` -->

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).

### Vue 3 Support

- You can write Vue 3 code under the `src/vue3` directory
- Vue 3 components can be exported as custom elements and used in the existing Vue 2 app. They rules are:
  - The component must be in a file ended with `.ce.vue`
  - In the Vue 2 app, import a corresponding `.register` file to register the corresponding custom element.
    - That is, if you have a `HellWorld.ce.vue` file, you should write `import '@/vue3/HelloWorld.register'` in the Vue 2 app.
    - Importing anything other than the `.register` files from the `@/vue3` directory is forbidden.
    - Note that you must import using the aliased path name, that is, `@/vue3/HelloWorld.register` instead of `../vue3/HelloWorld.register`. This is for webpack to correctly externalize the Vue 3 code.
  - The custom element name is the kebab-case of the file name + `-ce`. That is, `HelloWorld.ce.vue` will be registered as `hello-world-ce` custom element.
  - If the file is in a nested directory, the custom element name will be the kebab-case of the file path. That is, in `@/vue3/components/HelloWorld.ce.vue` will be registered as `components-hello-world` custom element.

#### TODOs

- Build support
- Is `hello-world-ce` a good name? How about `vue3-hello-world` or `vue3-hello-world-ce`?
- Peer dependency resolutions for Vue 3-only packages.
  - Maybe we need a `package.json` in the `vue3` directory to fully resolve this issue? That would be a little bit hacky to me, but makes sense.
- ESLint rules to enforce the importing convention
