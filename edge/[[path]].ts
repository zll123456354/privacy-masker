export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    // 如果是 API 请求但没有匹配到具体的 API 函数（理论上会被 specific file 捕获，这里是兜底），
    // 返回 JSON 404，避免返回 HTML 导致前端解析错误
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    // 对于前端路由（如 /id-card-ocr），返回 index.html
    // 注意：静态资源应在 _routes.json 中 exclude，不应进入此函数
    // 我们通过 fetch 请求同域的 /index.html，由于 /index.html 被 exclude，它会直接访问静态资源
    return fetch(new URL("/index.html", request.url));
  },
};
