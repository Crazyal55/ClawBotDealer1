const axios = require('axios');

/**
 * SessionManager - Manages cookies and headers across requests
 */
class SessionManager {
  constructor(options = {}) {
    this.cookies = new Map();  // cookie_name -> value
    this.headers = {
      'User-Agent': options.userAgent || this._getDefaultUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    // Session settings
    this.timeout = options.timeout || 30000;
    this.maxRedirects = options.maxRedirects || 5;
  }

  /**
   * Make an HTTP request with session persistence
   * @param {string} url - URL to request
   * @param {object} options - Request options
   * @returns {Promise<Response>} - Axios response
   */
  async request(url, options = {}) {
    // Merge session headers with request headers
    const headers = {
      ...this.headers,
      ...options.headers
    };

    // Add cookies to headers
    const cookieHeader = this._getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    try {
      const response = await axios.get(url, {
        ...options,
        headers,
        timeout: options.timeout || this.timeout,
        maxRedirects: options.maxRedirects || this.maxRedirects,
        validateStatus: () => true,  // Don't throw on any status
        responseType: options.responseType || 'text'
      });

      // Update cookies from response
      this._updateCookiesFromResponse(response);

      return response;

    } catch (error) {
      // Add URL to error for debugging
      error.url = url;
      throw error;
    }
  }

  /**
   * Update session headers
   * @param {object} headers - Headers to merge/update
   */
  setHeaders(headers) {
    this.headers = {
      ...this.headers,
      ...headers
    };
  }

  /**
   * Get current headers including cookies
   * @returns {object} - Current headers
   */
  getHeaders() {
    const headers = { ...this.headers };
    const cookieHeader = this._getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    return headers;
  }

  /**
   * Parse cookies from Set-Cookie header
   * @param {string} setCookieHeader - Set-Cookie header value
   */
  _updateCookiesFromResponse(response) {
    const setCookieHeaders = response.headers['set-cookie'];

    if (!setCookieHeaders) {
      return;
    }

    // Handle array of set-cookie headers
    const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    for (const cookieHeader of cookies) {
      this._parseAndStoreCookie(cookieHeader);
    }
  }

  /**
   * Parse a single Set-Cookie header and store the cookie
   * @param {string} cookieHeader - Set-Cookie header value
   */
  _parseAndStoreCookie(cookieHeader) {
    // Parse: name=value; attributes
    const parts = cookieHeader.split(';').map(p => p.trim());
    const [nameValue, ...attributes] = parts;

    if (!nameValue) {
      return;
    }

    const [name, value] = nameValue.split('=');

    if (!name) {
      return;
    }

    // Check if cookie is expired
    const expiresAttr = attributes.find(a => a.toLowerCase().startsWith('expires='));
    if (expiresAttr) {
      const expires = new Date(expiresAttr.split('=')[1]);
      if (expires < new Date()) {
        this.cookies.delete(name);
        return;
      }
    }

    // Store cookie
    this.cookies.set(name, value || '');
  }

  /**
   * Get Cookie header value for requests
   * @returns {string} - Cookie header value
   */
  _getCookieHeader() {
    if (this.cookies.size === 0) {
      return '';
    }

    const cookiePairs = [];
    for (const [name, value] of this.cookies.entries()) {
      cookiePairs.push(`${name}=${value}`);
    }

    return cookiePairs.join('; ');
  }

  /**
   * Set a cookie manually
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   */
  setCookie(name, value) {
    this.cookies.set(name, value);
  }

  /**
   * Get a cookie value
   * @param {string} name - Cookie name
   * @returns {string|undefined} - Cookie value or undefined
   */
  getCookie(name) {
    return this.cookies.get(name);
  }

  /**
   * Clear all cookies
   */
  clearCookies() {
    this.cookies.clear();
  }

  /**
   * Get default User-Agent string
   * @returns {string} - User-Agent header
   */
  _getDefaultUserAgent() {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Rotate User-Agent to avoid detection
   */
  rotateUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    this.headers['User-Agent'] = userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Get session info for debugging
   * @returns {object} - Session info
   */
  getSessionInfo() {
    return {
      cookies: Array.from(this.cookies.entries()),
      headers: this.headers,
      cookieCount: this.cookies.size
    };
  }
}

module.exports = SessionManager;
