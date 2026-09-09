import config from '../config';
import React from 'react';
import useTranslation from 'next-translate/useTranslation';

// Bayle seal, drawn in the current text color so it reads on either ground.
// When `animated`, it plays a one-shot draw-on choreography on mount and the
// dashed ring keeps turning slowly (see .seal-* rules in globals.css).
function SealOutline({ className, animated = false }) {
  const a = (cls) => (animated ? cls : undefined);
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <circle
        className={a('seal-ring-draw')}
        cx="50"
        cy="50"
        r="47"
        strokeWidth="2"
        pathLength="1"
      />
      <circle
        className={a('seal-dashring')}
        cx="50"
        cy="50"
        r="40"
        strokeWidth="1.2"
        strokeDasharray="2.4 3.2"
        opacity="0.5"
      />
      <path
        className={a('seal-roof')}
        d="M30 52 L50 34 L70 52"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
      />
      <path
        className={a('seal-house')}
        d="M34 50 L34 68 L66 68 L66 50"
        strokeWidth="3.4"
        strokeLinejoin="round"
        pathLength="1"
      />
      <g className={a('seal-key')}>
        <circle cx="50" cy="58" r="3.6" fill="currentColor" stroke="none" />
        <rect
          x="48.4"
          y="58"
          width="3.2"
          height="10"
          rx="1.2"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  );
}

export default function SignInUpLayout({ children }) {
  const { t } = useTranslation('common');

  return (
    <div className="flex h-screen">
      <div className="bg-primary text-primary-foreground relative hidden w-[36rem] flex-col items-center justify-center overflow-hidden px-14 text-center lg:flex">
        {/* Atmosphere: a soft top glow and a large ghosted seal watermark. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_75%_at_50%_-10%,hsl(var(--primary-foreground)/0.14),transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 opacity-[0.05]">
          <SealOutline className="h-[30rem] w-[30rem]" />
        </div>

        <div className="relative flex flex-col items-center gap-7">
          <SealOutline
            animated
            className="text-primary-foreground/95 h-28 w-28 drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="font-serif text-6xl tracking-tight">
              {config.APP_NAME}
            </div>
            <div className="text-primary-foreground/70 text-xs uppercase tracking-[0.22em]">
              {t('for landlords')}
            </div>
          </div>
        </div>
      </div>
      <div className="relative flex w-full flex-col items-center justify-center">
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <SealOutline animated className="text-primary h-10 w-10" />
          <span className="font-serif text-4xl">{config.APP_NAME}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
