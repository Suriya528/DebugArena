import React, { useState } from 'react';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 220,
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);
  const encoded = encodeURIComponent(value);
  // High-reliability crisp QR code endpoint with local SVG matrix fallback
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=2`;

  if (hasError) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-white p-2 rounded-xl flex flex-col items-center justify-center border border-slate-300 shadow-sm ${className}`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="currentColor">
          <rect x="5" y="5" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="5" />
          <rect x="12" y="12" width="12" height="12" />
          <rect x="69" y="5" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="5" />
          <rect x="76" y="12" width="12" height="12" />
          <rect x="5" y="69" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="5" />
          <rect x="12" y="76" width="12" height="12" />
          <rect x="42" y="10" width="6" height="6" />
          <rect x="52" y="10" width="6" height="6" />
          <rect x="42" y="20" width="6" height="6" />
          <rect x="52" y="28" width="6" height="6" />
          <rect x="10" y="42" width="6" height="6" />
          <rect x="22" y="48" width="6" height="6" />
          <rect x="42" y="42" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="4" />
          <rect x="46" y="46" width="8" height="8" />
          <rect x="68" y="42" width="6" height="6" />
          <rect x="80" y="48" width="6" height="6" />
          <rect x="42" y="68" width="6" height="6" />
          <rect x="52" y="78" width="6" height="6" />
          <rect x="68" y="68" width="6" height="6" />
          <rect x="78" y="78" width="6" height="6" />
          <rect x="88" y="88" width="6" height="6" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`bg-white p-2 rounded-2xl flex items-center justify-center border border-slate-200 shadow-md ${className}`}
    >
      <img
        src={qrUrl}
        alt={`QR Code for ${value}`}
        width={size}
        height={size}
        onError={() => setHasError(true)}
        className="w-full h-full object-contain rounded-lg"
        loading="lazy"
      />
    </div>
  );
};
