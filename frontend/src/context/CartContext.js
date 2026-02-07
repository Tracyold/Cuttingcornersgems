import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const CartProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      // Load from localStorage for guests
      const savedCart = localStorage.getItem('guestCart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/cart`);
      setCart(response.data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product) => {
    if (isAuthenticated) {
      try {
        const response = await axios.post(`${API_URL}/cart/add`, {
          product_id: product.id,
          quantity: 1
        });
        setCart(response.data.cart);
      } catch (error) {
        console.error('Failed to add to cart:', error);
        throw error;
      }
    } else {
      // Guest cart
      const newCart = { ...cart };
      const existingItem = newCart.items.find(i => i.product_id === product.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        newCart.items.push({
          product_id: product.id,
          title: product.title,
          price: product.price,
          image_url: product.image_url,
          quantity: 1
        });
      }
      newCart.total = newCart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      setCart(newCart);
      localStorage.setItem('guestCart', JSON.stringify(newCart));
    }
  };

  const removeFromCart = async (productId) => {
    if (isAuthenticated) {
      try {
        await axios.delete(`${API_URL}/cart/${productId}`);
        setCart(prev => ({
          ...prev,
          items: prev.items.filter(i => i.product_id !== productId),
          total: prev.items.filter(i => i.product_id !== productId).reduce((sum, i) => sum + i.price * i.quantity, 0)
        }));
      } catch (error) {
        console.error('Failed to remove from cart:', error);
      }
    } else {
      const newCart = { ...cart };
      newCart.items = newCart.items.filter(i => i.product_id !== productId);
      newCart.total = newCart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      setCart(newCart);
      localStorage.setItem('guestCart', JSON.stringify(newCart));
    }
  };

  const clearCart = () => {
    setCart({ items: [], total: 0 });
    localStorage.removeItem('guestCart');
  };

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, removeFromCart, clearCart, itemCount, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
