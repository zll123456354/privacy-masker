export default {
  async fetch(request: Request, env: any) {
    const json = (body: unknown, init: ResponseInit = {}) => {
      const headers = new Headers(init.headers);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
      if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
      return new Response(JSON.stringify(body), { ...init, headers });
    };

    const readEnv = (key: string) => {
      // 优先尝试从全局 process.env 读取 (ESA 环境)
      // 注意：ESA 中 process 可能不存在，或 process.env 是一个特殊对象
      try {
        if (typeof process !== "undefined" && process.env && process.env[key]) {
          const val = process.env[key];
          if (typeof val === "string" && val.trim()) return val.trim();
        }
      } catch (e) {
        // 忽略 process 访问错误
      }

      // 其次尝试从 env 参数读取 (Cloudflare Workers 等环境)
      const fromEnv = env?.[key];
      if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();

      // 最后尝试兜底 globalThis.process
      try {
        const fromGlobalProcess = (globalThis as any)?.process?.env?.[key];
        if (typeof fromGlobalProcess === "string" && fromGlobalProcess.trim())
          return fromGlobalProcess.trim();
      } catch (e) {
        // 忽略
      }

      return undefined;
    };

    if (request.method !== "POST") return json({ error: "Method Not Allowed" }, { status: 405 });

    try {
      let body: any;
      try {
        body = (await request.json()) as any;
      } catch {
        return json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const { image, side = "face" } = body ?? {};

      if (typeof image !== "string" || !image.trim()) {
        return json({ error: "Image is required" }, { status: 400 });
      }

      if (side !== "face" && side !== "back") {
        return json({ error: "Invalid side" }, { status: 400 });
      }

      const rawImage = image.trim();
      let imageForUpstream = rawImage;
      if (rawImage.startsWith("data:image/")) {
        imageForUpstream = rawImage.replace(/^data:image\/\w+;base64,/, "");
      }

      // 获取 AppCode (假设环境变量名为 ALIYUN_OCR_APPCODE)
      // 注意：在本地开发时可能需要 mock env，或者在 vite config 里注入
      const appCode = readEnv("ALIYUN_OCR_APPCODE");

      if (!appCode || appCode === "YOUR_APP_CODE_HERE") {
        // 收集调试信息
        const envKeys = env ? Object.keys(env) : [];
        const processEnvKeys =
          typeof process !== "undefined" && process.env
            ? Object.keys(process.env)
            : [];
        const globalProcessEnvKeys = (globalThis as any)?.process?.env
          ? Object.keys((globalThis as any).process.env)
          : [];

        return json(
          {
            error:
              "AppCode is missing. Please set ALIYUN_OCR_APPCODE in ESA Console.",
            debug: {
              envKeys,
              processEnvKeys,
              globalProcessEnvKeys,
              message:
                "Please check if 'ALIYUN_OCR_APPCODE' is in the keys list above.",
            },
          },
          { status: 500 }
        );
      }

      const aliyunUrl =
        readEnv("ALIYUN_OCR_URL") || "https://cardnumber.market.alicloudapi.com/rest/160601/ocr/ocr_idcard.json";

      const configure = { side };

      const response = await fetch(aliyunUrl, {
        method: "POST",
        headers: {
          Authorization: `APPCODE ${appCode}`,
          "Content-Type": "application/json; charset=UTF-8",
          Accept: "application/json",
        },
        body: JSON.stringify({
          image: imageForUpstream,
          configure,
        }),
      });

      const upstreamText = await response.text();
      let upstreamJson: any = null;
      if (upstreamText) {
        try {
          upstreamJson = JSON.parse(upstreamText);
        } catch {
          upstreamJson = null;
        }
      }

      const upstreamTextPreview = upstreamText.length > 2000 ? upstreamText.slice(0, 2000) : upstreamText;

      if (!response.ok) {
        return json(
          {
            error: "Aliyun OCR request failed",
            upstreamStatus: response.status,
            upstreamBody: upstreamJson ?? upstreamTextPreview,
          },
          { status: 502 }
        );
      }

      if (upstreamJson == null) {
        return json(
          {
            error: "Aliyun OCR returned non-JSON response",
            upstreamStatus: response.status,
            upstreamBody: upstreamTextPreview,
          },
          { status: 502 }
        );
      }

      return json(upstreamJson);

    } catch (err: any) {
      return json({ error: err?.message || String(err) }, { status: 500 });
    }
  },
};
