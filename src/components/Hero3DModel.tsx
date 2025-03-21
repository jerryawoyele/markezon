import React, { useEffect, useRef } from 'react';

interface Hero3DModelProps {
  className?: string;
}

export function Hero3DModel({ className }: Hero3DModelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const { left, top, width, height } = container.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;
      
      // Apply rotation based on mouse position
      container.style.transform = `
        perspective(1000px)
        rotateY(${x * 10}deg)
        rotateX(${-y * 10}deg)
      `;
      
      // Move layers based on mouse position for parallax effect
      const layers = container.querySelectorAll('.layer');
      layers.forEach((layer: HTMLElement, index) => {
        const depth = index + 1;
        const translateX = x * depth * 20;
        const translateY = y * depth * 20;
        layer.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`;
      });
    };
    
    const handleMouseLeave = () => {
      container.style.transform = `
        perspective(1000px)
        rotateY(0deg)
        rotateX(0deg)
      `;
      
      const layers = container.querySelectorAll('.layer');
      layers.forEach((layer: HTMLElement) => {
        layer.style.transform = 'translateX(0) translateY(0)';
      });
    };
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className={`relative h-96 w-full max-w-xl mx-auto transition-transform duration-200 ease-out ${className}`}
    >
      {/* Layer 1: Background */}
      <div className="layer absolute inset-0 rounded-xl bg-gradient-to-br from-blue-700 to-purple-800 transition-transform duration-200 ease-out"></div>
      
      {/* Layer 2: Middle grid */}
      <div className="layer absolute inset-0 rounded-xl transition-transform duration-200 ease-out">
        <div className="absolute inset-0 bg-grid-white/10 bg-grid-16 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"></div>
      </div>
      
      {/* Layer 3: Service icons floating */}
      <div className="layer absolute inset-0 transition-transform duration-200 ease-out">
        <div className="absolute top-10 left-10 w-16 h-16 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white animate-float-slow">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        
        <div className="absolute top-20 right-16 w-14 h-14 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white animate-float-normal">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="absolute bottom-20 left-24 w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white animate-float-fast">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <div className="absolute bottom-12 right-12 w-16 h-16 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white animate-float-slow">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </div>
      
      {/* Layer 4: Foreground content */}
      <div className="layer absolute inset-0 flex items-center justify-center transition-transform duration-200 ease-out">
        <div className="bg-black/30 backdrop-blur-lg p-8 rounded-xl text-center text-white">
          <h2 className="text-xl font-bold mb-2">Markezon</h2>
          <p className="text-sm text-white/80">Your marketplace for services</p>
        </div>
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i}
            className="absolute w-2 h-2 rounded-full bg-white/30"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
} 