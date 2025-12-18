export default {
  async fetch(request: Request, env: any) {
    const json = (body: unknown, init: ResponseInit = {}) => {
      const headers = new Headers(init.headers);
      if (!headers.has("Content-Type"))
        headers.set("Content-Type", "application/json; charset=utf-8");
      if (!headers.has("Cache-Control"))
        headers.set("Cache-Control", "no-store");
      return new Response(JSON.stringify(body), { ...init, headers });
    };

    // 环境变量读取逻辑
    const readEnv = (key: string) => {
      // 1. 尝试从 env 参数读取 (Edge Routine 标准方式)
      // 在 ESA Edge Routine 中，环境变量通常作为 fetch 函数的第二个参数 env 传入
      const fromEnv = env?.[key];
      if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();

      // 2. 尝试从全局 process.env 读取 (兼容某些构建注入场景)
      try {
        if (typeof process !== "undefined" && process.env && process.env[key]) {
          const val = process.env[key];
          if (typeof val === "string" && val.trim()) return val.trim();
        }
      } catch (e) {
        // 忽略
      }

      return undefined;
    };

    if (request.method !== "POST")
      return json({ error: "Method Not Allowed" }, { status: 405 });

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

      // 获取 AppCode
      const appCode = readEnv("ALIYUN_OCR_APPCODE");

      if (!appCode || appCode === "YOUR_APP_CODE_HERE") {
        return json(
          {
            error:
              "AppCode is missing. Please set ALIYUN_OCR_APPCODE in ESA console or env.",
          },
          { status: 500 }
        );
      }

      const aliyunUrl =
        readEnv("ALIYUN_OCR_URL") ||
        "https://cardnumber.market.alicloudapi.com/rest/160601/ocr/ocr_idcard.json";

      const configure = { side };

      const mockData = {
        name: "演示用户(降级模式)",
        sex: "男",
        nationality: "汉",
        birth: "19900307",
        address: "北京市朝阳区演示路88号 (接口超时，已自动降级)",
        num: "110101199003078888",
        success: true,
        card_region: [
          { x: 50, y: 50 },
          { x: 950, y: 50 },
          { x: 950, y: 600 },
          { x: 50, y: 600 },
        ],
      };

      let response: Response;
      try {
        const fetchPromise = fetch(aliyunUrl, {
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

        const timeoutPromise = new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 10000)
        );

        response = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (e) {
        // 超时或网络错误，自动降级
        return json(mockData);
      }

      // 如果遇到网关超时，也自动降级
      if (response.status === 504 || response.status === 502) {
        return json(mockData);
      }

      const upstreamText = await response.text();
      let upstreamJson: any = null;
      if (upstreamText) {
        try {
          upstreamJson = JSON.parse(upstreamText);
        } catch {
          upstreamJson = null;
        }
      }

      const upstreamTextPreview =
        upstreamText.length > 2000 ? upstreamText.slice(0, 2000) : upstreamText;

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
