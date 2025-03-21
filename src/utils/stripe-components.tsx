// This is a mock implementation of Stripe components for development purposes
// Replace with actual @stripe/stripe-js and @stripe/react-stripe-js imports in production
import * as React from 'react';

// Mock Stripe object
export const loadStripe = (apiKey: string) => {
  console.log('Mock loadStripe called with API key:', apiKey);
  return {
    elements: () => ({
      create: (type: string) => ({
        mount: (element: HTMLElement) => {
          console.log(`Mock Stripe element ${type} mounted`);
        },
        on: (event: string, callback: Function) => {
          console.log(`Mock Stripe element ${type} listening for ${event}`);
        },
        destroy: () => {
          console.log(`Mock Stripe element ${type} destroyed`);
        }
      }),
      getElement: () => ({
        clear: () => console.log('Mock card element cleared')
      })
    }),
    createPaymentMethod: () => Promise.resolve({
      paymentMethod: {
        id: 'mock_payment_method_id',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        }
      }
    })
  };
};

// Mock Elements component
interface ElementsProps {
  children: React.ReactNode;
  stripe?: any;
}

export const Elements: React.FC<ElementsProps> = ({ children }) => {
  return React.createElement('div', { className: 'stripe-elements' }, children);
};

// Mock CardElement component
export const CardElement: React.FC = () => {
  return React.createElement('div', { className: 'mock-card-element border p-4' }, 'Mock Stripe Card Element');
};

// Mock useStripe hook
export const useStripe = () => {
  return {
    createPaymentMethod: () => Promise.resolve({
      paymentMethod: {
        id: 'mock_payment_method_id',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        }
      }
    })
  };
};

// Mock useElements hook
export const useElements = () => {
  return {
    getElement: () => ({
      clear: () => console.log('Mock card element cleared')
    })
  };
}; 