function messageFromBody(body: { error?: string; errors?: { path?: (string | number)[]; message?: string }[] }) {
  if (typeof body?.error === 'string' && body.error) return body.error;
  if (Array.isArray(body?.errors)) {
    const text = body.errors
      .map((issue) => {
        const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .filter(Boolean)
      .join('; ');
    if (text) return text;
  }
  return '';
}

export async function jsonFetcher(url: string) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(messageFromBody(body) || `Gagal memuat data (${res.status})`);
  return body;
}

export async function sendJson(url: string, method: 'POST' | 'PATCH', data: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(messageFromBody(body) || `Permintaan gagal (${res.status})`);
  return body;
}
