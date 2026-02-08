import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AdminContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const AdminProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (adminToken) {
      verifyAdmin();
    } else {
      setLoading(false);
    }
  }, [adminToken]);

  const verifyAdmin = async () => {
    try {
      await axios.get(`${API_URL}/admin/verify`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setIsAdmin(true);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const response = await axios.post(`${API_URL}/admin/login`, { username, password });
    const { access_token } = response.data;
    localStorage.setItem('adminToken', access_token);
    setAdminToken(access_token);
    setIsAdmin(true);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setIsAdmin(false);
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  return (
    <AdminContext.Provider value={{ isAdmin, loading, login, logout, adminToken, getAuthHeaders }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
