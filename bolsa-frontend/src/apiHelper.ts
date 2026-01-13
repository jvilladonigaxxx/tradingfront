// API Helper with Authentication
// This wraps fetch calls to automatically include the JWT token

export interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

export const authenticatedFetch = async (
  url: string,
  options: FetchOptions = {},
  getAuthToken: () => Promise<string | null>
): Promise<Response> => {
  // Get the JWT token
  const token = await getAuthToken();

  // Merge headers with Authorization header
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Make the fetch call
  return fetch(url, {
    ...options,
    mode: 'cors',
    headers,
  });
};
