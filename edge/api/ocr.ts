export default {
  async fetch(request: Request, env: any) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const body = await request.json() as any;
      const { image, side = "face" } = body;

      if (!image) {
        return new Response(JSON.stringify({ error: "Image is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 移除可能的 base64 头部 (data:image/jpeg;base64,)
      const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

      // 获取 AppCode (假设环境变量名为 ALIYUN_OCR_APPCODE)
      // 注意：在本地开发时可能需要 mock env，或者在 vite config 里注入
      const appCode = env?.ALIYUN_OCR_APPCODE || "YOUR_APP_CODE_HERE"; 
      
      if (appCode === "YOUR_APP_CODE_HERE") {
         console.warn("AppCode is missing. Please set ALIYUN_OCR_APPCODE environment variable.");
      }

      const aliyunUrl = "https://cardnumber.market.alicloudapi.com/rest/160601/ocr/ocr_idcard.json";

      const response = await fetch(aliyunUrl, {
        method: "POST",
        headers: {
          Authorization: `APPCODE ${appCode}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          image: base64Image,
          configure: { side }, // 修复：必须是 JSON 对象，不是 JSON 字符串
        }),
      });

      const result = await response.json();
      
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });

    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
