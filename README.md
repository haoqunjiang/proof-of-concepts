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

## Vue 3 Support

- You can write Vue 3 code under the `src/vue3` directory
- Vue 3 components can be exported as custom elements and used in the existing Vue 2 app. They rules are:
  - The component must be in a file ended with `.ce.vue`
  - In the Vue 2 app, import a corresponding `.register` file to register the corresponding custom element.
    - That is, if you have a `HellWorld.ce.vue` file, you should write `import '@/vue3/HelloWorld.register'` in the Vue 2 app.
    - Importing anything other than the `.register` files from the `@/vue3` directory is forbidden.
    - Note that you must import using the aliased path name, that is, `@/vue3/HelloWorld.register` instead of `../vue3/HelloWorld.register`. This is for webpack to correctly externalize the Vue 3 code.
  - The custom element name is `vue3-` + the kebab-case of the file name + `-ce`. That is, `HelloWorld.ce.vue` will be registered as the `<vue3-hello-world-ce />` custom element.
  - If the file is in a nested directory, the custom element name will be the kebab-case of the file path. That is, in `@/vue3/components/HelloWorld.ce.vue` will be registered as the `<vue3-components-hello-world-ce />` custom element.

### TODOs

- Better build support
- Peer dependency resolutions for Vue 3-only packages.
  - Maybe we need a `package.json` in the `vue3` directory to fully resolve this issue? That would be a little bit hacky to me, but makes sense.
- Document child component style-injection in Vue 3 components. It should work for basic cases, but may need https://github.com/baiwusanyu-c/unplugin-vue-ce/blob/master/packages/sub-style/README.md for more complex cases and to avoid surprises.
- Extract the configuration into a Vue CLI plugin and a Vite plugin
- ESLint rules to enforce the importing convention
- A guide to re-setup the lint process without `@vue/cli-plugin-eslint`
- TypeScript support
- A more comprehensive example, e.g. integrate a page from https://github.com/vbenjs/vue-vben-admin into https://github.com/PanJiaChen/vue-element-admin
