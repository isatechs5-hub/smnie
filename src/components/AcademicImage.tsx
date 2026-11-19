import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface AcademicImageProps {
  src: string;
  alt: string;
  className?: string;
  caption?: string;
  priority?: boolean;
}

export const AcademicImage: React.FC<AcademicImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  caption,
  priority = false,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2241] to-[#13315B] text-white/85 p-6 text-center ${className}`}
      >
        <Building2 className="w-8 h-8 text-[#CFA756] mb-3" aria-hidden="true" />
        <span className="font-serif text-sm tracking-wide">{caption || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
