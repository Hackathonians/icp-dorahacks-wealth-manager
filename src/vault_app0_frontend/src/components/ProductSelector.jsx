import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  ShoppingBagIcon, 
  ClockIcon, 
  InformationCircleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';   
import { formatDuration } from '../utils/utils'; // export Default for easier import
const ProductSelector = ({ onProductSelect, selectedProduct, selectedDuration, onDurationSelect }) => {
  const { actor } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [actor]);

  const loadProducts = async () => {
    if (!actor) return;
    
    try {
      setLoading(true);
      const activeProducts = await actor.get_active_products();
      setProducts(activeProducts || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const isDurationSelected = (duration) => {
    if (!selectedDuration) return false;
    
    // Handle both object format and direct comparison
    let durationValue, selectedValue;
    
    if (typeof duration === 'number') {
      durationValue = duration;
    } else if ('Minutes' in duration) {
      durationValue = duration.Minutes;
    }
    
    if (typeof selectedDuration === 'number') {
      selectedValue = selectedDuration;
    } else if ('Minutes' in selectedDuration) {
      selectedValue = selectedDuration.Minutes;
    }
    
    return durationValue === selectedValue;
  };

  if (loading) {
    return (
      <div className="glass rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white bg-opacity-20 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-white bg-opacity-10 rounded"></div>
            <div className="h-16 bg-white bg-opacity-10 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="glass rounded-lg p-6">
        <div className="text-center">
          <ShoppingBagIcon className="w-12 h-12 text-black text-opacity-50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-black mb-2">No Products Available</h3>
          <p className="text-black text-opacity-70">
            No staking products are currently available. Please contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <div className="glass rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <ShoppingBagIcon className="w-5 h-5 mr-2" />
          Select Staking Product
        </h3>
        
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedProduct?.id === product.id
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 hover:border-orange-300 bg-white/70 hover:bg-white'
              }`}
              onClick={() => onProductSelect(product)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="font-medium text-slate-900">{product.name}</h4>
                    {selectedProduct?.id === product.id && (
                      <CheckCircleIcon className="w-5 h-5 text-orange-500 ml-2" />
                    )}
                  </div>
                  <p className="text-slate-700 text-sm mt-1">
                    {product.description}
                  </p>
                  <div className="flex items-center mt-2">
                    <ClockIcon className="w-4 h-4 text-slate-600 mr-1" />
                    <span className="text-slate-600 text-xs">
                      {product.available_durations.length} duration option{product.available_durations.length > 1 ? 's' : ''} available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Duration Selection */}
      {selectedProduct && (
        <div className="glass rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2" />
            Select Lock Duration
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedProduct.available_durations.map((duration, index) => {
              const isSelected = isDurationSelected(duration);
              const isFlexible = 'Flexible' in duration;
              
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-slate-200 hover:border-orange-300 bg-white/70 hover:bg-white'
                  }`}
                  onClick={() => onDurationSelect(duration)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium text-slate-900">
                          {formatDuration(duration)}
                        </span>
                        {isSelected && (
                          <CheckCircleIcon className="w-4 h-4 text-orange-500 ml-2" />
                        )}
                      </div>
                      <span className={`text-xs ${
                        isFlexible ? 'text-blue-600' : 'text-yellow-600'
                      }`}>
                        {isFlexible ? 'Flexible staking' : 'Time-locked staking'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-300 rounded-lg">
            <div className="flex items-start space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-700 text-sm">
                  <strong>Flexible staking:</strong> Withdraw anytime, lower rewards
                </p>
                <p className="text-blue-700 text-sm mt-1">
                  <strong>Time-locked staking:</strong> Higher rewards, locked for specified period
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelector;
