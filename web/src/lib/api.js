export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Diner-Client': 'web', ...options.headers },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error?.message ?? 'Não foi possível conectar ao servidor.');
    error.status = response.status;
    if (data?.error?.details?.length)
      error.message += ` ${data.error.details
        .map((d) => d.campo)
        .filter(Boolean)
        .join(', ')}.`;
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('diner:unauthorized'));
    throw error;
  }
  return data;
}
export const query = (values) =>
  new URLSearchParams(
    Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  ).toString();
