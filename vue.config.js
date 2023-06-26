const { defineConfig } = require('@vue/cli-service')


const VITE_BASE = '/__vite/'

// It's a CJS file so no top-level await
// `setupMiddlewares` is sync
// middleware function can be async
// Therefore we have this hack:
let viteServer

async function ensureViteServerIsRunning() {
  if (!viteServer) {
    const { createServer } = await import('vite')
    viteServer = await createServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: 7777,
          clientPort: 7777
        }
      },
      root: process.cwd(),
      base: VITE_BASE
    })
  }
  
  return viteServer
}

// FIXME: avoid calling createServer multiple times
// TODO: maybe it's easier to start a Vite process (with execa) and use proxy?
ensureViteServerIsRunning()

// https://github.com/vitest-dev/vitest/blob/fbb56ad8ae5159f3c4fe2eaaf51f07eef1a2ca0a/packages/vite-node/src/utils.ts#L15C1-L34C1
function normalizeRequestId(id, base) {
  if (base && id.startsWith(base))
    id = `/${id.slice(base.length)}`

  return id
    .replace(/^\/@id\/__x00__/, '\0') // virtual modules start with `\0`
    .replace(/^\/@id\//, '')
    .replace(/^__vite-browser-external:/, '')
    .replace(/^file:/, '')
    .replace(/^\/+/, '/') // remove duplicate leading slashes
    .replace(/\?v=\w+/, '?') // remove ?v= query
    .replace(/&v=\w+/, '') // remove &v= query
    .replace(/\?t=\w+/, '?') // remove ?t= query
    .replace(/&t=\w+/, '') // remove &t= query
    .replace(/\?import/, '?') // remove ?import query
    .replace(/&import/, '') // remove &import query
    .replace(/\?&/, '?') // replace ?& with just ?
    .replace(/\?+$/, '') // remove end query mark
}


const viteTransformMiddleware = async (req, res, next) => {
  await ensureViteServerIsRunning()

  const isSourceMapRequest = req.originalUrl.endsWith('.map')

  if (isSourceMapRequest) {
    res.status(404)
    res.end()
    return
  }

  const moduleUrl = req.originalUrl.replace(/\.map$/, '')

  // FIXME: handle errors
  // and I'm not sure what's the correct way to handle source map, so ignore for now
  const { code } = await viteServer.transformRequest(normalizeRequestId(moduleUrl, VITE_BASE), { ssr: false, sourcemap: false })

  res.type('application/javascript')
  res.end(code)
}

/** @typedef {import("express").Request} Request */
/** @typedef {import("express").Response} Response */
/** @typedef {import("express").NextFunction} NextFunction */
/** @typedef {import("express").RequestHandler} ExpressRequestHandler */
/** @typedef {import("express").ErrorRequestHandler} ExpressErrorRequestHandler */

/**
 * @typedef {{ name?: string, path?: string, middleware: ExpressRequestHandler | ExpressErrorRequestHandler } | ExpressRequestHandler | ExpressErrorRequestHandler} Middleware
 */


module.exports = defineConfig({
  transpileDependencies: true,

  devServer: {
    setupMiddlewares(/** @type Middleware[] */ middlewares) {
      middlewares.unshift({
        path: `${VITE_BASE}*`,
        middleware: viteTransformMiddleware
      })
      middlewares.unshift({
        path: '/src/vue3/*',
        middleware: viteTransformMiddleware
      })

      return middlewares
    }
  },
  
  // externalize src/vue3/*.ce.vue
  configureWebpack: {
    externals: {
      // TODO: read from src/vue3/*.ce.vue using fast-glob
      '@/vue3/HelloVue3.ce.vue.register': `promise import("${VITE_BASE}src/vue3/HelloVue3.ce.vue.register.js")`
    }
  },


  // TODO: build-time plugin to call vite.
})
