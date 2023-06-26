import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function fromPascalcaseToKebabcase(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase().replace(/^-/, '')
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'dummy-index-html',
      configureServer(server) {
        const cleanUrl = (url) => url.replace(/#.*$/s, '').replace(/\?.*$/s, '')
        return () => {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url && cleanUrl(req.url)
            if (url?.endsWith('.html')) {
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html')
              let html = `<!DOCTYPE html>
  <html>
    <head>
      <title></title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <meta name="description" content="">
    </head>
    <body>
      <div id="app"></div>
    </body>
  </html>`
              html = await server.transformIndexHtml(url, html, req.originalUrl)
              res.end(html)
              return
            }
            next()
          })
        }
      }
    },
    vue({
      template: {
        compilerOptions: {
          // TODO: automatically read from `src/vue3/` using fast-glob
          isCustomElement: (tag) => tag.endsWith('-ce')
        }
      }
    }),

    {
      name: 'auto-register-vue-custom-elements',
      resolveId(id) {
        if (id.endsWith('.ce.vue.register.js')) {
          const shortId = id.replace(process.cwd(), '')
          return shortId
        }
      },
      load(id) {
        if (id.endsWith('.ce.vue.register.js')) {
          const componentId = id.replace(/\.register.js$/, '')

          const componentName = componentId.replace('.ce.vue', 'Ce').replace(/^.*\//, '')
          const ceName = fromPascalcaseToKebabcase(componentName)

          return `
import { defineCustomElement } from 'vue'
import ${componentName} from '${componentId}'
customElements.define('${ceName}', defineCustomElement(${componentName}))
`
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // TODO: when vue 3 became a nested dependency, we can use absolute path instead
      'vue': 'vue3'
    }
  },

  // TODO: build
})
