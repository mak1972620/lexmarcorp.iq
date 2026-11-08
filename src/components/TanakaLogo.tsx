import React from 'react';

interface TanakaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showText?: boolean;
}

export const TanakaLogo: React.FC<TanakaLogoProps> = ({ 
  size = 'md', 
  className = '', 
  showText = false 
}) => {
  const dimensions = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32'
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Contenedor de lujo en negro y oro que centra el monograma y descarta el texto inferior */}
      <div className={`${dimensions} shrink-0 rounded-2xl overflow-hidden bg-[#070A0F] border border-[#D4AF37]/60 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center p-1`}>
        <svg viewBox="0 0 130 112" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <image href="/logo.png" width="130" height="167" x="0" y="0" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-base md:text-lg font-black tracking-wider text-[#D4AF37] leading-tight font-serif">
            EDILIA TANAKA
          </span>
          <span className="text-[10px] font-bold text-[#E5C058] tracking-widest uppercase">
            Y ASOCIADOS • LEGAL IQ
          </span>
          <span className="text-[11px] text-slate-400 italic font-serif">
            "La Abogada de Tu Familia"
          </span>
        </div>
      )}
    </div>
  );
};

export default TanakaLogo;
