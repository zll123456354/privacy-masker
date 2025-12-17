export default {
  async fetch(request: Request) {
    const json = (body: unknown, init: ResponseInit = {}) => {
      const headers = new Headers(init.headers);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
      if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
      return new Response(JSON.stringify(body), { ...init, headers });
    };

    if (request.method !== "POST") return json({ error: "Method Not Allowed" }, { status: 405 });

    const { text } = await request.json();

    const masked = text
      .replace(/\d{11}/g, (m: string) => m.slice(0, 3) + "****" + m.slice(7))
      .replace(
        /\d{17}[\dX]/g,
        (m: string) => m.slice(0, 3) + "************" + m.slice(-4)
      )
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "***@***");

    return json({ result: masked });
  },
};
