const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}
async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { body, ...rest } = options;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...rest,
    credentials: "include", // sends httpOnly cookies
    headers: {
      "Content-Type": "application/json",
      ...rest.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  return data;
}

export default apiClient;