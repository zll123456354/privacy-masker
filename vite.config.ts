import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "node:path";

// 简单的 Edge 函数模拟中间件
const edgeMiddleware = () => {
  return {
    name: 'edge-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url.startsWith('/api/')) {
          try {
            // 简单路由映射: /api/ocr -> edge/api/ocr.ts
            // /api/mask -> edge/api/mask.ts
            const url = new URL(req.url, 'http://localhost');
            const handlerName = url.pathname.replace('/api/', '');
            // 动态导入处理文件 (注意：这里假设是 .ts 文件且在 edge/api 下)
            // Vite 在开发模式下支持直接导入 .ts
            const modulePath = `./edge/api/${handlerName}.ts`;
            
            let module;
            try {
               module = await server.ssrLoadModule(modulePath);
            } catch (e) {
               // 如果找不到文件，尝试不带后缀或 index
               console.error(`Failed to load module ${modulePath}:`, e);
               return next();
            }

            const handler = module.default;
            if (!handler || typeof handler.fetch !== 'function') {
               console.error(`Module ${modulePath} does not export a default object with a fetch method.`);
               return next();
            }

            // 读取请求体
            const chunks: any[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', async () => {
              const body = Buffer.concat(chunks);
              
              // 构造 Request 对象
              const request = new Request(`http://localhost${req.url}`, {
                method: req.method,
                headers: req.headers as any,
                body: ['GET', 'HEAD'].includes(req.method!) ? null : body,
              });

              // 模拟环境变量
              const env = {
                ALIYUN_OCR_APPCODE: process.env.ALIYUN_OCR_APPCODE || '' // 从系统环境读取或留空
              };

              try {
                const response = await handler.fetch(request, env);
                
                // 发送响应
                res.statusCode = response.status;
                response.headers.forEach((val: string, key: string) => {
                  res.setHeader(key, val);
                });
                
                const responseBody = await response.text();
                res.end(responseBody);
              } catch (err) {
                console.error('Edge execution error:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
              }
            });
            
            return;
          } catch (e) {
            console.error(e);
            next();
          }
        } else {
          next();
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [vue(), edgeMiddleware()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
