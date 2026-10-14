import React from 'react';

interface CatInHardHatProps {
  className?: string;
  size?: number;
}

export const CatInHardHat: React.FC<CatInHardHatProps> = ({ className = '', size = 56 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Черный кот в строительной каске"
    >
      <defs>
        {/* Soft fur & helmet gradients */}
        <radialGradient id="catEyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="65%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
        <linearGradient id="helmetGrad" x1="50" y1="6" x2="50" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="helmetRidge" x1="50" y1="6" x2="50" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="catHeadGrad" x1="50" y1="25" x2="50" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="45%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <filter id="helmetShadow" x="12" y="32" width="76" height="24" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.75" />
        </filter>
      </defs>

      {/* Cat Ears (poking out from behind the helmet sides) */}
      {/* Left Ear */}
      <path
        d="M 23 44 L 11 18 C 10 16 12 14 15 15 L 34 29 Z"
        fill="#090d16"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      <path
        d="M 22 40 L 14 21 C 13.5 20 14.5 19 16 20 L 31 30 Z"
        fill="#334155"
        opacity="0.8"
      />

      {/* Right Ear */}
      <path
        d="M 77 44 L 89 18 C 90 16 88 14 85 15 L 66 29 Z"
        fill="#090d16"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      <path
        d="M 78 40 L 86 21 C 86.5 20 85.5 19 84 20 L 69 30 Z"
        fill="#334155"
        opacity="0.8"
      />

      {/* Cat Head Base */}
      <path
        d="M 20 44 C 18 58 20 74 31 84 C 39 91 61 91 69 84 C 80 74 82 58 80 44 C 74 41 26 41 20 44 Z"
        fill="url(#catHeadGrad)"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Cheeks Fur tufts */}
      <path d="M 18 64 L 13 67 L 19 72" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M 82 64 L 87 67 L 81 72" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Eyes */}
      {/* Left Eye */}
      <ellipse cx="36" cy="62" rx="7.5" ry="9" fill="url(#catEyeGlow)" />
      {/* Left Pupil (cat vertical slit with slight dilation) */}
      <ellipse cx="36" cy="62" rx="2.8" ry="7.5" fill="#020617" />
      <circle cx="34" cy="58" r="2" fill="#ffffff" />
      <circle cx="38" cy="65" r="1" fill="#ffffff" opacity="0.8" />

      {/* Right Eye */}
      <ellipse cx="64" cy="62" rx="7.5" ry="9" fill="url(#catEyeGlow)" />
      {/* Right Pupil */}
      <ellipse cx="64" cy="62" rx="2.8" ry="7.5" fill="#020617" />
      <circle cx="62" cy="58" r="2" fill="#ffffff" />
      <circle cx="66" cy="65" r="1" fill="#ffffff" opacity="0.8" />

      {/* Cute Cat Nose */}
      <polygon points="50,71 46.5,67 53.5,67" fill="#f472b6" />

      {/* Cat Mouth line */}
      <path
        d="M 50 71 L 50 75 M 50 75 Q 44 78 40 76 M 50 75 Q 56 78 60 76"
        stroke="#64748b"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Whiskers */}
      {/* Left Whiskers */}
      <line x1="38" y1="72" x2="16" y2="70" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
      <line x1="38" y1="75" x2="14" y2="77" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
      <line x1="39" y1="78" x2="18" y2="83" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />

      {/* Right Whiskers */}
      <line x1="62" y1="72" x2="84" y2="70" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
      <line x1="62" y1="75" x2="86" y2="77" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
      <line x1="61" y1="78" x2="82" y2="83" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />

      {/* === CONSTRUCTION HARD HAT (Каска) === */}
      {/* Helmet Dome */}
      <path
        d="M 23 37 C 23 18 34 8 50 8 C 66 8 77 18 77 37 Z"
        fill="url(#helmetGrad)"
        stroke="#b45309"
        strokeWidth="1.5"
      />

      {/* Top reinforcing ridge / stiffening crest */}
      <path
        d="M 45 8 C 45 8 47 6 50 6 C 53 6 55 8 55 8 L 54 36 C 54 36 52 37 50 37 C 48 37 46 36 46 36 Z"
        fill="url(#helmetRidge)"
      />
      <line x1="50" y1="7" x2="50" y2="36" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />

      {/* Side structural ribs on hard hat */}
      <path d="M 33 22 Q 38 15 44 11" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M 67 22 Q 62 15 56 11" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />

      {/* Helmet Front Brim / Peak with drop shadow */}
      <g filter="url(#helmetShadow)">
        <path
          d="M 16 38 C 16 35 25 34 50 34 C 75 34 84 35 84 38 C 84 43 73 45 50 45 C 27 45 16 43 16 38 Z"
          fill="#f59e0b"
          stroke="#b45309"
          strokeWidth="1.5"
        />
        {/* Shiny highlight on the helmet brim edge */}
        <path
          d="M 22 38 C 30 36 42 35.5 50 35.5 C 58 35.5 70 36 78 38"
          stroke="#fef08a"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Hard Hat Mascot Emblem / Logo in Center (blueprint symbol "К") */}
      <circle cx="50" cy="24" r="5.5" fill="#0f172a" stroke="#d97706" strokeWidth="1" />
      <text
        x="50"
        y="27.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill="#fbbf24"
        fontFamily="sans-serif"
      >
        К
      </text>
    </svg>
  );
};
