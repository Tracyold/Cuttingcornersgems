import React, { useEffect, useState } from 'react';
import { ShoppingBag, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'sapphire', name: 'Sapphire' },
  { id: 'tourmaline', name: 'Tourmaline' },
  { id: 'emerald', name: 'Emerald' },
  { id: 'tanzanite', name: 'Tanzanite' },
  { id: 'aquamarine', name: 'Aquamarine' },
  { id: 'garnet', name: 'Garnet' },
];

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all'
        ? `${API_URL}/products`
        : `${API_URL}/products?category=${selectedCategory}`;
      const response = await axios.get(url);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }
    try {
      await addToCart(product);
      toast.success(`${product.title} added to cart`);
    } catch (error) {
      toast.error('Failed to add item to cart');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen" data-testid="shop-page">
      {/* Header */}
      <section className="section-spacing pb-16">
        <div className="container-custom">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Available</p>
          <h1 className="section-title">Shop</h1>
        </div>
      </section>

      {/* Category Filter */}
      <section className="pb-16">
        <div className="container-custom">
          <div className="flex flex-wrap gap-4" data-testid="shop-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 text-sm uppercase tracking-widest transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? 'bg-white text-black'
                    : 'text-gray-500 hover:text-white border border-white/10 hover:border-white/30'
                }`}
                data-testid={`shop-category-${cat.id}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="pb-24">
        <div className="container-custom">
          {loading ? (
            <div className="shop-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="aspect-square bg-white/5 animate-pulse" />
                  <div className="h-4 bg-white/5 animate-pulse w-3/4" />
                  <div className="h-4 bg-white/5 animate-pulse w-1/4" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24">
              <ShoppingBag className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-500">No products available in this category.</p>
            </div>
          ) : (
            <div className="shop-grid">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="group opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                  data-testid={`product-${index}`}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden gem-card mb-4">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Quick add button */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="absolute bottom-4 right-4 w-10 h-10 bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gray-200"
                      data-testid={`add-to-cart-${index}`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    {/* Category badge */}
                    <div className="absolute top-4 left-4">
                      <span className="spec-text text-gray-400 bg-black/50 px-2 py-1">
                        {product.category}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="font-serif text-lg mb-1 group-hover:text-gray-300 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-gray-500 text-sm mb-2 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="price-tag text-lg">{formatPrice(product.price)}</span>
                      {product.carat && (
                        <span className="spec-text text-gray-500">{product.carat}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Shop;
