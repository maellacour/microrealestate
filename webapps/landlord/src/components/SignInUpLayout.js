import config from '../config';
import React from 'react';
import { SignInUpIllustration } from '../components/Illustrations';
import useTranslation from 'next-translate/useTranslation';

// Bayle seal, drawn in the current text color so it reads on either ground.
function SealOutline({ className }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="50" cy="50" r="47" strokeWidth="2" />
      <circle
        cx="50"
        cy="50"
        r="40"
        strokeWidth="1.2"
        strokeDasharray="2.4 3.2"
        opacity="0.5"
      />
      <path
        d="M30 52 L50 34 L70 52"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 50 L34 68 L66 68 L66 50"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
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
    </svg>
  );
}

export default function SignInUpLayout({ children }) {
  const { t } = useTranslation('common');

  return (
    <div className="flex h-screen">
      <div className="hidden lg:flex flex-col items-center justify-center gap-14 text-center bg-primary text-primary-foreground w-[36rem] px-14">
        <div className="flex flex-col items-center gap-5">
          <SealOutline className="w-20 h-20 text-primary-foreground/90" />
          <div className="font-serif text-6xl tracking-tight">
            {config.APP_NAME}
          </div>
          <div className="uppercase tracking-[0.22em] text-xs text-primary-foreground/70">
            {t('for landlords')}
          </div>
        </div>
        <SignInUpIllustration />
      </div>
      <div className="flex flex-col items-center justify-center w-full relative">
        <div className="lg:hidden flex items-center gap-3 mb-6">
          <SealOutline className="w-10 h-10 text-primary" />
          <span className="font-serif text-4xl">{config.APP_NAME}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
