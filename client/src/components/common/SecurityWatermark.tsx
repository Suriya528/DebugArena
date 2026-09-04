import React from 'react';

interface SecurityWatermarkProps {
  username: string;
}

export const SecurityWatermark: React.FC<SecurityWatermarkProps> = ({ username }) => {
  const timestamp = new Date().toLocaleDateString();
  const text = `${username.toUpperCase()} • ${timestamp} • AMAZON / ENTERPRISE OA ENVIRONMENT • STRICTLY CONFIDENTIAL`;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden select-none opacity-[0.035] flex flex-col justify-around rotate-[-22deg] scale-125">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="whitespace-nowrap font-mono text-sm tracking-widest text-slate-100 font-bold"
        >
          {Array.from({ length: 6 }).map((_, j) => (
            <span key={j} className="mx-12">
              {text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
