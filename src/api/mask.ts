export async function maskText(text: string) {
  const res = await fetch('/api/mask/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })
  return res.json()
}
