import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Default entitlements state (used when not authenticated or on error)
const DEFAULT_ENTITLEMENTS = {
  total_spend: 0,
  unlocked_nyp: false,
  threshold: 1000,
  spend_to_unlock: 1000
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState(DEFAULT_ENTITLEMENTS);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);

  // Fetch user entitlements
  const fetchEntitlements = useCallback(async () => {
    if (!token) {
      setEntitlements(DEFAULT_ENTITLEMENTS);
      return;
    }
    
    setEntitlementsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/users/me/entitlements`);
      setEntitlements(response.data);
    } catch (error) {
      console.error('Failed to fetch entitlements:', error);
      // On error, default to locked state
      setEntitlements(DEFAULT_ENTITLEMENTS);
    } finally {
      setEntitlementsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
      setEntitlements(DEFAULT_ENTITLEMENTS);
    }
  }, [token]);

  // Fetch entitlements after user is loaded
  useEffect(() => {
    if (user) {
      fetchEntitlements();
    }
  }, [user, fetchEntitlements]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password) => {
    const response = await axios.post(`${API_URL}/auth/register`, { name, email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setEntitlements(DEFAULT_ENTITLEMENTS);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      logout, 
      isAuthenticated: !!user,
      entitlements,
      entitlementsLoading,
      refreshEntitlements: fetchEntitlements
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
