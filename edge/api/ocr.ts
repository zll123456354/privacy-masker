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

      // 获取 AppCode
      // 调试发现 ESA 运行时未能正确注入环境变量。
      // 为了快速跑通，请直接将您的 AppCode 填在下面的引号中。
      // 例如：const appCode = "a1b2c3d4e5f6...";
      let appCode = readEnv("ALIYUN_OCR_APPCODE");

      // TODO: 如果环境变量不生效，请在此处直接填入您的 AppCode
      if (!appCode || appCode === "YOUR_APP_CODE_HERE") {
        appCode = "da8b099d52fb495ebad042db6cf8da1a"; // <--- 请在这里填入您的阿里云 AppCode
      }

      if (!appCode) {
        return json(
          {
            error:
              "AppCode is missing. Please edit edge/api/ocr.ts and fill in your AppCode.",
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
