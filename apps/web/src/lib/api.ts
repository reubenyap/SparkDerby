const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiOptions {
  method?: string;
  body?: unknown;
  sessionToken?: string;
}

async function apiCall<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.sessionToken) {
    headers['X-Session-Token'] = options.sessionToken;
  }

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  getCurrentRace: () => apiCall('/races/current'),
  getRace: (raceId: string) => apiCall(`/races/${raceId}`),
  getRaceTicks: (raceId: string) => apiCall(`/races/${raceId}/ticks`),
  getRaceHistory: (page = 1, limit = 20) =>
    apiCall(`/races/history?page=${page}&limit=${limit}`),
  identify: (sparkAddress: string, sparkName?: string) =>
    apiCall('/players/identify', {
      method: 'POST',
      body: { sparkAddress, sparkName },
    }),
  getPlayerHistory: (sparkAddress: string) =>
    apiCall(`/players/${sparkAddress}/history`),
  getHealth: () => apiCall('/health'),
};
