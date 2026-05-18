import React from 'react';

/**
 * Custom Trendy Treasures brand mark — a faceted gem/diamond.
 * Uses currentColor so it inherits text color and looks correct on any
 * background (white-on-gradient, gradient-on-white, etc.).
 */
function BrandMark({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 10L8.5 4h7L19 10L12 20.5L5 10Z" />
      <path d="M5 10h14" />
      <path d="M8.5 4L12 10L15.5 4" />
      <path d="M12 10v10.5" />
    </svg>
  );
}

export default BrandMark;
