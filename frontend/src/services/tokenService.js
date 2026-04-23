const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function getToken() {
  const res = await fetch(`${API_BASE}/api/token`)
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`)
  const data = await res.json()
  return data.token
}
