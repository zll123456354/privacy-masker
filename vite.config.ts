import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import handler from './edge/mask'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'edge-middleware',
      configureServer(server) {
        server.middlewares.use('/api/mask/text', (req, res) => {
          const chunks: Buffer[] = []
          req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
          req.on('end', async () => {
            const body = Buffer.concat(chunks)
            const request = new Request('http://localhost/api/mask/text', {
              method: req.method,
              headers: req.headers as any,
              body
            })
            const response = await handler(request)
            const text = await response.text()
            res.setHeader('Content-Type', 'application/json')
            res.end(text)
          })
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
