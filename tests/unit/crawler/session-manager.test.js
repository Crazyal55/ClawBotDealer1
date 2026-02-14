const axios = require('axios');
const SessionManager = require('../../../crawler/session-manager');

jest.mock('axios');
const mockedAxios = axios;

describe('SessionManager', () => {
  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    session = new SessionManager();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(session.cookies).toBeInstanceOf(Map);
      expect(session.headers).toHaveProperty('User-Agent');
      expect(session.headers).toHaveProperty('Accept');
      expect(session.timeout).toBe(30000);
      expect(session.maxRedirects).toBe(5);
    });

    it('should accept custom user agent', () => {
      const customSession = new SessionManager({ userAgent: 'CustomAgent/1.0' });

      expect(customSession.headers['User-Agent']).toBe('CustomAgent/1.0');
    });

    it('should accept custom timeout', () => {
      const customSession = new SessionManager({ timeout: 60000 });

      expect(customSession.timeout).toBe(60000);
    });

    it('should accept custom max redirects', () => {
      const customSession = new SessionManager({ maxRedirects: 10 });

      expect(customSession.maxRedirects).toBe(10);
    });
  });

  describe('request', () => {
    it('should make HTTP request with session headers', async () => {
      mockedAxios.get.mockResolvedValue({ headers: {} });

      await session.request('https://example.com');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
            'Accept': expect.any(String)
          }),
          timeout: 30000,
          maxRedirects: 5
        })
      );
    });

    it('should merge custom headers with session headers', async () => {
      mockedAxios.get.mockResolvedValue({ headers: {} });

      await session.request('https://example.com', {
        headers: { 'X-Custom': 'custom-value' }
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'custom-value',
            'User-Agent': expect.any(String)
          })
        })
      );
    });

    it('should add cookies to request headers', async () => {
      session.setCookie('session', 'abc123');
      mockedAxios.get.mockResolvedValue({ headers: {} });

      await session.request('https://example.com');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': 'session=abc123'
          })
        })
      );
    });

    it('should update cookies from response', async () => {
      mockedAxios.get.mockResolvedValue({
        headers: {
          'set-cookie': ['session_id=xyz789; Path=/; HttpOnly']
        }
      });

      await session.request('https://example.com');

      expect(session.getCookie('session_id')).toBe('xyz789');
    });

    it('should handle multiple Set-Cookie headers', async () => {
      mockedAxios.get.mockResolvedValue({
        headers: {
          'set-cookie': [
            'session_id=xyz789; Path=/',
            'user_pref=dark_mode; Path=/'
          ]
        }
      });

      await session.request('https://example.com');

      expect(session.getCookie('session_id')).toBe('xyz789');
      expect(session.getCookie('user_pref')).toBe('dark_mode');
    });

    it('should use custom timeout from options', async () => {
      mockedAxios.get.mockResolvedValue({ headers: {} });

      await session.request('https://example.com', { timeout: 60000 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          timeout: 60000
        })
      );
    });

    it('should add URL to error object on failure', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValue(error);

      await expect(session.request('https://example.com'))
        .rejects.toHaveProperty('url', 'https://example.com');
    });

    it('should handle response errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(session.request('https://example.com'))
        .rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('setHeaders', () => {
    it('should update session headers', () => {
      session.setHeaders({ 'Authorization': 'Bearer token123' });

      expect(session.headers['Authorization']).toBe('Bearer token123');
    });

    it('should merge headers with existing ones', () => {
      const originalUA = session.headers['User-Agent'];
      session.setHeaders({ 'X-Custom': 'value' });

      expect(session.headers['User-Agent']).toBe(originalUA);
      expect(session.headers['X-Custom']).toBe('value');
    });

    it('should override existing headers', () => {
      session.setHeaders({ 'User-Agent': 'NewAgent/1.0' });

      expect(session.headers['User-Agent']).toBe('NewAgent/1.0');
    });
  });

  describe('getHeaders', () => {
    it('should return current headers', () => {
      const headers = session.getHeaders();

      expect(headers).toHaveProperty('User-Agent');
      expect(headers).toHaveProperty('Accept');
    });

    it('should include cookies in returned headers', () => {
      session.setCookie('session', 'abc123');
      const headers = session.getHeaders();

      expect(headers['Cookie']).toBe('session=abc123');
    });

    it('should not include Cookie header if no cookies', () => {
      const headers = session.getHeaders();

      expect(headers).not.toHaveProperty('Cookie');
    });
  });

  describe('Cookie Management', () => {
    describe('setCookie', () => {
      it('should store a cookie', () => {
        session.setCookie('test', 'value');

        expect(session.getCookie('test')).toBe('value');
      });

      it('should overwrite existing cookie', () => {
        session.setCookie('test', 'value1');
        session.setCookie('test', 'value2');

        expect(session.getCookie('test')).toBe('value2');
      });

      it('should store empty value', () => {
        session.setCookie('flag', '');

        expect(session.getCookie('flag')).toBe('');
      });
    });

    describe('getCookie', () => {
      it('should return cookie value', () => {
        session.setCookie('test', 'value');

        expect(session.getCookie('test')).toBe('value');
      });

      it('should return undefined for missing cookie', () => {
        expect(session.getCookie('missing')).toBeUndefined();
      });
    });

    describe('clearCookies', () => {
      it('should remove all cookies', () => {
        session.setCookie('test1', 'value1');
        session.setCookie('test2', 'value2');

        session.clearCookies();

        expect(session.cookies.size).toBe(0);
        expect(session.getCookie('test1')).toBeUndefined();
        expect(session.getCookie('test2')).toBeUndefined();
      });
    });

    describe('_parseAndStoreCookie', () => {
      it('should parse simple cookie', () => {
        session._parseAndStoreCookie('session=abc123');

        expect(session.getCookie('session')).toBe('abc123');
      });

      it('should parse cookie with attributes', () => {
        session._parseAndStoreCookie('session=abc123; Path=/; HttpOnly');

        expect(session.getCookie('session')).toBe('abc123');
      });

      it('should parse cookie with expires attribute', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const expiresStr = futureDate.toUTCString();

        session._parseAndStoreCookie(`session=abc123; Expires=${expiresStr}`);

        expect(session.getCookie('session')).toBe('abc123');
      });

      it('should delete expired cookies', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7);
        const expiresStr = pastDate.toUTCString();

        session.setCookie('temp', 'value');
        session._parseAndStoreCookie(`temp=value; Expires=${expiresStr}`);

        expect(session.getCookie('temp')).toBeUndefined();
      });

      it('should handle malformed cookie gracefully', () => {
        expect(() => session._parseAndStoreCookie('invalid cookie'))
          .not.toThrow();
      });

      it('should handle cookie without value', () => {
        session._parseAndStoreCookie('flag');

        expect(session.getCookie('flag')).toBe('');
      });

      it('should handle cookie without name', () => {
        session._parseAndStoreCookie('=value');

        expect(session.cookies.size).toBe(0);
      });
    });

    describe('_getCookieHeader', () => {
      it('should return empty string when no cookies', () => {
        expect(session._getCookieHeader()).toBe('');
      });

      it('should format single cookie', () => {
        session.setCookie('session', 'abc123');

        expect(session._getCookieHeader()).toBe('session=abc123');
      });

      it('should format multiple cookies', () => {
        session.setCookie('session', 'abc123');
        session.setCookie('user_pref', 'dark');

        const header = session._getCookieHeader();
        expect(header).toMatch(/session=abc123/);
        expect(header).toMatch(/user_pref=dark/);
      });

      it('should separate cookies with semicolon and space', () => {
        session.setCookie('a', '1');
        session.setCookie('b', '2');

        expect(session._getCookieHeader()).toBe('a=1; b=2');
      });
    });

    describe('_updateCookiesFromResponse', () => {
      it('should handle array of Set-Cookie headers', () => {
        const response = {
          headers: {
            'set-cookie': [
              'session=abc123',
              'pref=dark'
            ]
          }
        };

        session._updateCookiesFromResponse(response);

        expect(session.getCookie('session')).toBe('abc123');
        expect(session.getCookie('pref')).toBe('dark');
      });

      it('should handle single Set-Cookie header', () => {
        const response = {
          headers: {
            'set-cookie': 'session=abc123'
          }
        };

        session._updateCookiesFromResponse(response);

        expect(session.getCookie('session')).toBe('abc123');
      });

      it('should handle missing Set-Cookie header', () => {
        const response = { headers: {} };

        expect(() => session._updateCookiesFromResponse(response))
          .not.toThrow();
      });
    });
  });

  describe('rotateUserAgent', () => {
    it('should change User-Agent to random option', () => {
      const originalUA = session.headers['User-Agent'];

      session.rotateUserAgent();
      const newUA = session.headers['User-Agent'];

      expect(newUA).toBeTruthy();
      expect(typeof newUA).toBe('string');
    });

    it('should select from predefined user agents', () => {
      session.rotateUserAgent();

      const ua = session.headers['User-Agent'];
      expect(ua).toMatch(/(Chrome|Firefox|Safari)/);
    });
  });

  describe('_getDefaultUserAgent', () => {
    it('should return Chrome user agent string', () => {
      const ua = session._getDefaultUserAgent();

      expect(ua).toContain('Mozilla/5.0');
      expect(ua).toContain('Chrome');
    });
  });

  describe('getSessionInfo', () => {
    it('should return session information object', () => {
      session.setCookie('test', 'value');
      const info = session.getSessionInfo();

      expect(info).toHaveProperty('cookies');
      expect(info).toHaveProperty('headers');
      expect(info).toHaveProperty('cookieCount', 1);
    });

    it('should return cookies as array', () => {
      session.setCookie('a', '1');
      session.setCookie('b', '2');
      const info = session.getSessionInfo();

      expect(Array.isArray(info.cookies)).toBe(true);
      expect(info.cookies).toContainEqual(['a', '1']);
      expect(info.cookies).toContainEqual(['b', '2']);
    });

    it('should return current headers', () => {
      const info = session.getSessionInfo();

      expect(info.headers).toBe(session.headers);
    });

    it('should return cookie count', () => {
      session.setCookie('a', '1');
      session.setCookie('b', '2');
      const info = session.getSessionInfo();

      expect(info.cookieCount).toBe(2);
    });
  });
});
