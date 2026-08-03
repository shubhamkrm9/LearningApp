/**
 * Learning Module SDK - API Service
 *
 * Centralized HTTP client. Reads baseUrl and accessToken configured
 * by the SDK. All outgoing API calls route through this service.
 */

let _baseUrl = '';
let _accessToken = '';

export const ApiService = {
  /**
   * Configure the service. Called by SDKProvider on init.
   */
  configure(baseUrl: string, accessToken: string) {
    _baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    _accessToken = accessToken;
    console.log('[ApiService] Configured with baseUrl:', _baseUrl);
  },

  getBaseUrl(): string {
    return _baseUrl;
  },

  /**
   * Build full video HLS stream URL for react-native-video.
   */
  getVideoStreamUrl(videoId: string | number): string {
    return `${_baseUrl}/api/video/${videoId}/playlist.m3u8`;
  },

  /**
   * GET request with Authorization header.
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = `${_baseUrl}${endpoint}`;
    console.log('[ApiService] GET', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${_accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `API Error: ${response.status} ${response.statusText} — ${text}`,
      );
    }

    return (await response.json()) as T;
  },

  /**
   * POST request with Authorization header.
   */
  async post<T>(endpoint: string, body: any): Promise<T> {
    const url = `${_baseUrl}${endpoint}`;
    console.log('[ApiService] POST', url, JSON.stringify(body));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${_accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `API Error: ${response.status} ${response.statusText} — ${text}`,
      );
    }

    return (await response.json()) as T;
  },
};
