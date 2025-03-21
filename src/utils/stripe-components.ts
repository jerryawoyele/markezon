// Use real Stripe components instead of mocks
import { loadStripe as stripeLoader } from '@stripe/stripe-js';
import { 
  Elements as RealElements, 
  CardElement as RealCardElement,
  useStripe, 
  useElements,
  CardElementProps,
  ElementsProps
} from '@stripe/react-stripe-js';
import React from 'react';

// Re-export the components directly
// We're not using JSX in this file to avoid needing .tsx extension
export { useStripe, useElements, RealCardElement as CardElement };

// Re-export types
export type { CardElementProps, ElementsProps };

// Re-export Elements component 
export const Elements = RealElements;

// Export loadStripe with proper typing
export const loadStripe = stripeLoader; 