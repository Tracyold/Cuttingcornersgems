/**
 * Admin API Client
 * =================
 * Canonical client for all admin API requests.
 * Prevents the "double-nesting headers" bug by centralizing request configuration.
 * 
 * EXPECTED SHAPE:
 * All methods attach the Authorization header at the correct location:
 * { headers: { Authorization: 'Bearer <token>' } }
 * 
 * NEVER use { headers: getAuthHeaders() } - that causes double-nesting!
 * 
 * Usage:
 *   import { adminApi } from '../../api/adminApi';
 *   const data = await adminApi.get('/admin/products');
 *   await adminApi.post('/admin/products', productData);
 */

import axios from 'axios';

// API base URL from environment
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * DEV-ONLY: Safety assertion to catch header misnesting
 * Throws immediately if config contains headers.headers (the bug pattern)
 */
const assertNoNestedHeaders = (config) => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    if (config?.headers?.headers) {
      const errorMsg = 
        '[adminApi] CRITICAL: Detected nested headers object (headers.headers). ' +
        'This is the double-nesting bug. Fix the caller to pass headers correctly.';
      console.error(errorMsg, config);
      throw new Error(errorMsg);
    }
  }
};

/**
 * Get the admin token from localStorage
 * @returns {string|null} The admin JWT token
 */
const getAdminToken = () => {
  return localStorage.getItem('adminToken');
};

/**
 * Build axios request config with Authorization header
 * @returns {object} Axios config object in correct shape
 */
const buildAuthConfig = () => {
  const token = getAdminToken();
  
  if (!token) {
    // Redirect to login if no token
    if (typeof window !== 'undefined') {
      console.warn('[adminApi] No admin token found. Redirecting to login.');
      window.location.href = '/admin/login';
    }
    throw new Error('No admin token available. Please log in.');
  }
  
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  // Dev safety check
  assertNoNestedHeaders(config);
  
  return config;
};

/**
 * Admin API client with pre-configured authentication
 */
export const adminApi = {
  /**
   * GET request to admin endpoint
   * @param {string} urlPath - Path relative to /api (e.g., '/admin/products')
   * @returns {Promise<any>} Response data
   */
  async get(urlPath) {
    const config = buildAuthConfig();
    const response = await axios.get(`${API_BASE_URL}${urlPath}`, config);
    return response.data;
  },

  /**
   * POST request to admin endpoint
   * @param {string} urlPath - Path relative to /api
   * @param {object} data - Request body
   * @returns {Promise<any>} Response data
   */
  async post(urlPath, data = {}) {
    const config = buildAuthConfig();
    const response = await axios.post(`${API_BASE_URL}${urlPath}`, data, config);
    return response.data;
  },

  /**
   * PUT request to admin endpoint
   * @param {string} urlPath - Path relative to /api
   * @param {object} data - Request body
   * @returns {Promise<any>} Response data
   */
  async put(urlPath, data = {}) {
    const config = buildAuthConfig();
    const response = await axios.put(`${API_BASE_URL}${urlPath}`, data, config);
    return response.data;
  },

  /**
   * PATCH request to admin endpoint
   * @param {string} urlPath - Path relative to /api
   * @param {object} data - Request body
   * @returns {Promise<any>} Response data
   */
  async patch(urlPath, data = {}) {
    const config = buildAuthConfig();
    const response = await axios.patch(`${API_BASE_URL}${urlPath}`, data, config);
    return response.data;
  },

  /**
   * DELETE request to admin endpoint
   * @param {string} urlPath - Path relative to /api
   * @returns {Promise<any>} Response data
   */
  async delete(urlPath) {
    const config = buildAuthConfig();
    const response = await axios.delete(`${API_BASE_URL}${urlPath}`, config);
    return response.data;
  },

  /**
   * Get full axios response (not just data) - for cases needing status/headers
   * @param {string} urlPath - Path relative to /api
   * @returns {Promise<AxiosResponse>} Full axios response
   */
  async getFullResponse(urlPath) {
    const config = buildAuthConfig();
    return axios.get(`${API_BASE_URL}${urlPath}`, config);
  }
};

/**
 * Dev-only endpoint for debugging
 * POST to dev endpoints (auto-blocked in production by backend)
 */
export const devApi = {
  async post(urlPath, data = {}) {
    const config = buildAuthConfig();
    const response = await axios.post(`${API_BASE_URL}${urlPath}`, data, config);
    return response.data;
  }
};

export default adminApi;
