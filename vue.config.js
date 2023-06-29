const { defineConfig } = require('@vue/cli-service')
const fg = require('fast-glob');

const { Compilation, sources } = require('webpack')

const VITE_BASE = '/__vite/'

const vue3Externals = fg.sync(['src/vue3/**/*.ce.vue']).reduce((acc, componentPath) => {
  const registerPath = componentPath.replace(/\.ce\.vue$/, '.register')
  const aliasedPath = registerPath.replace(/^src/, '@')
  acc[aliasedPath] = `promise import("${VITE_BASE}${registerPath}")`
  return acc
}, {})

// It's a CJS file so no top-level await
// `setupMiddlewares` is sync
// middleware function can be async
// Therefore we have this hack:
let viteServer, viteBuild

async function ensureViteServerIsRunning() {
  if (!viteServer) {
    const vite = await import('vite')
    const { createServer } = vite
    viteBuild = vite.build
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

// TODO:
// potential optimization: should run vite build in watch mode when webpack is in watch mode
class BuildVue3ExternalsPlugin {
  apply (compiler) {
    const pluginName = 'BuildVue3ExternalsPlugin'

    const usedVue3Imports = new Set()
    compiler.hooks.beforeCompile.tapAsync(pluginName, (params, callback) => {
      usedVue3Imports.clear()
      callback()
    })

    compiler.hooks.normalModuleFactory.tap(pluginName, (normalModuleFactory) => {
      // ExternalModuleFactoryPlugin intercepts at the `factorize` stage,
      // so we need to use `beforeResolve` to get ahead of it
      // TODO:
      // This is the most accurate way to collect the externals to avoid bundling too many in Vitt, but not necessarily most efficient.
      // We can also just collect all the imports in the source code. That way, we may even be able to fix the hashing issue.
      normalModuleFactory.hooks.beforeResolve.tap(pluginName, (data) => {
        if (/^@\/vue3\/.*\.register/.test(data.request)) {
          usedVue3Imports.add(data.request)
        }
      })
    })

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
        }, (assets, callback) => {
          if (usedVue3Imports.size === 0) { return callback() }

          viteBuild({
            build: {
              lib: {
                entry: [...usedVue3Imports.values()].map((importPath) => importPath.replace(/^@/, 'src')),
                formats: ['es'],
                // FIXME:
                // rollup only considers entry file names, which doesn't include the full path
                // so we need to refactor it later to manually run multiple build passes on each layer of the nested folder structure
                fileName: 'js/[name]-[hash:10]'
              },
              // FIXME:
              // Lib mode doesn't replace environment variable references
              // It's not convenient, maybe we need to use normal build directly
              // https://github.com/vitejs/vite/blob/126e93e6693474a038a5053b7cefb99295f21eb5/packages/vite/src/node/plugins/define.ts#L19-L31
            },
            resolve: {
              // TODO: externalize to a local file
              alias: {
                'vue': 'https://unpkg.com/vue@3.3.4/dist/vue.runtime.esm-browser.prod.js',
                '@vue/runtime-dom': 'https://unpkg.com/@vue/runtime-dom@3.3.4/dist/runtime-dom.esm-browser.prod.js',
                '@vue/runtime-core': 'https://unpkg.com/@vue/runtime-core@3.3.4/dist/runtime-core.esm-browser.prod.js'
              }
            }
          }).then((result) => {
            // FIXME: mutliple outputs, nested folders
            const fileName = result[0].output[0].fileName.split('/')[1]
            console.log(fileName)
            const originalName = `/__vite/src/vue3/${fileName.split('-')[0]}.register`
            console.log(originalName)

            Object.entries(assets).forEach(([pathname, source]) => {
              const contents = source.source()
              compilation.updateAsset(
                pathname,
                new sources.RawSource(
                  contents.toString().replace(originalName, `./${fileName}`)
                )
              );
            })
            callback()
          })
    
          // FIXME: Run vite build and get the hashed file names and write back to the assets in the compilation object
          // FIXME: Should update the hash, too. But it seems very complex.
        }
      )
    })

    compiler.hooks.shutdown.tapPromise(pluginName, async () => {
      await viteServer.close()
    })
  }
}

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
  
  // externalize src/vue3/*.register
  configureWebpack: {
    externals: vue3Externals,
    plugins: [
      new BuildVue3ExternalsPlugin()
    ]
  },

  // TODO: build-time plugin to call vite.
  // Use entries in `usedVue3Imports` as entry points
})
