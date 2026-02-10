import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Cart = () => {
  const { cart, removeFromCart, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to checkout');
      return;
    }

    if (!shippingAddress.trim()) {
      toast.error('Please enter a shipping address');
      return;
    }

    try {
      setCheckoutLoading(true);
      await axios.post(`${API_URL}/orders`, {
        items: cart.items.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        shipping_address: shippingAddress,
        payment_method: 'stripe'
      });
      clearCart();
      setShowOrderConfirm(true);
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="empty-cart">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-600 mb-6" />
          <h1 className="page-title title-xl text-3xl mb-4">Your Cart is Empty</h1>
          <p className="text-gray-500 mb-8">Discover our collection of precision-cut gemstones.</p>
          <Link to="/shop" className="btn-primary" data-testid="shop-now-btn">
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="cart-page">
      {/* Header */}
      <section className="section-spacing pb-16">
        <div className="container-custom">
          <Link to="/shop" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
          <h1 className="page-title title-xl">Your Cart</h1>
        </div>
      </section>

      {/* Cart Content */}
      <section className="pb-24">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6" data-testid="cart-items">
              {cart.items.map((item, index) => (
                <div
                  key={item.product_id}
                  className="flex gap-6 p-4 gem-card"
                  data-testid={`cart-item-${index}`}
                >
                  <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="title-sm text-lg">{item.title}</h3>
                    <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                    <p className="price-tag mt-2">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.product_id)}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                    data-testid={`remove-item-${index}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="gem-card p-6 sticky top-28" data-testid="cart-summary">
                <h2 className="title-sm text-xl mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatPrice(cart.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="border-t border-white/10 pt-4 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-mono text-lg">{formatPrice(cart.total)}</span>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="mb-6">
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Shipping Address
                  </label>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Enter your shipping address..."
                    className="textarea-dark"
                    rows={3}
                    data-testid="shipping-address-input"
                  />
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="btn-primary w-full disabled:opacity-50"
                  data-testid="checkout-btn"
                >
                  {checkoutLoading ? 'Processing...' : 'Checkout'}
                </button>

                {!isAuthenticated && (
                  <p className="text-center text-gray-500 text-xs mt-4">
                    Please login to complete checkout
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order Confirmation Popup */}
      {showOrderConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" data-testid="order-confirm-popup">
          <div className="gem-card p-8 max-w-md text-center mx-4">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="title-sm text-2xl mb-4">Thank you!</h2>
            <p className="text-gray-400 mb-6">
              Please finish purchase in account page! Items are still available until you purchase from your account page!
            </p>
            <button
              onClick={() => navigate('/dashboard?tab=orders')}
              className="btn-primary w-full"
              data-testid="go-to-account-btn"
            >
              Go to My Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
