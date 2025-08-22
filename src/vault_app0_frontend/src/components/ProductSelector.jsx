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

  

  const getDurationValue = (duration) => {
    if ('Flexible' in duration) {
      return 'flexible';
    }
    if ('Minutes' in duration) {
      return duration.Minutes.toString();
    }
    return '';
  };

  const createDurationObject = (durationStr) => {
    if (durationStr === 'flexible') {
      return { Flexible: null };
    }
    return { Minutes: parseInt(durationStr) };
  };

  const isDurationSelected = (duration) => {
    if (!selectedDuration) return false;
    
    if ('Flexible' in duration && 'Flexible' in selectedDuration) {
      return true;
    }
    if ('Minutes' in duration && 'Minutes' in selectedDuration) {
      return duration.Minutes === selectedDuration.Minutes;
    }
    return false;
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
          <ShoppingBagIcon className="w-12 h-12 text-white text-opacity-50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Products Available</h3>
          <p className="text-white text-opacity-70">
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
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ShoppingBagIcon className="w-5 h-5 mr-2" />
          Select Staking Product
        </h3>
        
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedProduct?.id === product.id
                  ? 'border-blue-400 bg-blue-500 bg-opacity-20'
                  : 'border-white border-opacity-20 hover:border-white hover:border-opacity-40 bg-white bg-opacity-5 hover:bg-opacity-10'
              }`}
              onClick={() => onProductSelect(product)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="font-medium text-white">{product.name}</h4>
                    {selectedProduct?.id === product.id && (
                      <CheckCircleIcon className="w-5 h-5 text-blue-400 ml-2" />
                    )}
                  </div>
                  <p className="text-white text-opacity-70 text-sm mt-1">
                    {product.description}
                  </p>
                  <div className="flex items-center mt-2">
                    <ClockIcon className="w-4 h-4 text-white text-opacity-50 mr-1" />
                    <span className="text-white text-opacity-60 text-xs">
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
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
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
                      ? 'border-green-400 bg-green-500 bg-opacity-20'
                      : 'border-white border-opacity-20 hover:border-white hover:border-opacity-40 bg-white bg-opacity-5 hover:bg-opacity-10'
                  }`}
                  onClick={() => onDurationSelect(duration)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium text-white">
                          {formatDuration(duration)}
                        </span>
                        {isSelected && (
                          <CheckCircleIcon className="w-4 h-4 text-green-400 ml-2" />
                        )}
                      </div>
                      <span className={`text-xs ${
                        isFlexible ? 'text-blue-400' : 'text-yellow-400'
                      }`}>
                        {isFlexible ? 'Flexible staking' : 'Time-locked staking'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-blue-500 bg-opacity-20 border border-blue-400 border-opacity-30 rounded-lg">
            <div className="flex items-start space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-100 text-sm">
                  <strong>Flexible staking:</strong> Withdraw anytime, lower rewards
                </p>
                <p className="text-blue-100 text-sm mt-1">
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
