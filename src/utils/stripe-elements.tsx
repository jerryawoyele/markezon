import React from 'react';
import { CardElement as RealCardElement, CardElementProps } from '@stripe/react-stripe-js';

// Create a styled CardElement component with proper typing
export const StyledCardElement: React.FC<CardElementProps> = (props) => {
  return (
    <RealCardElement 
      options={{
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            fontFamily: '"Segoe UI", Roboto, sans-serif',
            '::placeholder': {
              color: '#aab7c4',
            },
            iconColor: '#6772e5',
          },
          invalid: {
            color: '#9e2146',
            iconColor: '#fa755a',
          },
        },
        hidePostalCode: true,
      }}
      {...props}
    />
  );
}; 