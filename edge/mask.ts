export async function onRequest({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { text = "" } = await request.json();

  const masked = text
    .replace(/\d{11}/g, (m) => m.slice(0, 3) + "****" + m.slice(7))
    .replace(/\d{18}/g, (m) => m.slice(0, 3) + "************" + m.slice(-4))
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "***@***")
    .replace(/\d{16,19}/g, (m) => m.slice(0, 4) + " **** **** " + m.slice(-4));

  return new Response(JSON.stringify({ result: masked }), {
    headers: { "Content-Type": "application/json" },
  });
}
