const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

export default apiClient;

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include", // envoie le cookie httpOnly
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Request failed"), { status: res.status, data });
  return data as T;
}