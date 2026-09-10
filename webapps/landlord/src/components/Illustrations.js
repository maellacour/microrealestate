import useTranslation from 'next-translate/useTranslation';

// On-brand line-art illustrations (Bayle), drawn in the current text colour.
// They replace the previous generic stock (undraw) images.

function Frame({ children, label }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <div className="text-primary/30">{children}</div>
      {!!label && <p className="text-muted-foreground text-xl">{label}</p>}
    </div>
  );
}

function HouseMark({ className = 'h-40 w-40' }) {
  return (
    <svg
      viewBox="0 0 120 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 50 L60 18 L102 50" />
      <path d="M30 45 L30 82 L90 82 L90 45" />
      <rect x="52" y="60" width="16" height="22" rx="1" />
      <line
        x1="8"
        y1="88"
        x2="112"
        y2="88"
        strokeDasharray="2 7"
        opacity="0.6"
      />
    </svg>
  );
}

function DocMark({ className = 'h-40 w-40' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M28 16 H62 L74 28 V84 H28 Z" />
      <path d="M62 16 V28 H74" />
      <line x1="38" y1="44" x2="64" y2="44" opacity="0.7" />
      <line x1="38" y1="54" x2="64" y2="54" opacity="0.7" />
      <line x1="38" y1="64" x2="56" y2="64" opacity="0.7" />
    </svg>
  );
}

function SealCheckMark({ className = 'h-40 w-40' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="34" />
      <circle
        cx="50"
        cy="50"
        r="28"
        strokeWidth="1.4"
        strokeDasharray="2.4 3.2"
        opacity="0.6"
      />
      <path d="M38 51 L47 60 L64 40" strokeWidth="3.6" />
      <path d="M18 24 v8 M14 28 h8" opacity="0.6" />
      <path d="M84 60 v8 M80 64 h8" opacity="0.6" />
    </svg>
  );
}

export const EmptyIllustration = ({ label }) => {
  const { t } = useTranslation('common');
  return (
    <div className="h-64 w-full">
      <Frame label={label || t('No data found')}>
        <HouseMark />
      </Frame>
    </div>
  );
};

export const LocationIllustration = () => (
  <div className="h-64 w-full">
    <Frame>
      <HouseMark />
    </Frame>
  </div>
);

export const BlankDocumentIllustration = () => (
  <div className="h-64 w-full">
    <Frame>
      <DocMark />
    </Frame>
  </div>
);

export const TermsDocumentIllustration = () => (
  <div className="h-64 w-full">
    <Frame>
      <DocMark />
    </Frame>
  </div>
);

export const WelcomeIllustration = () => (
  <div className="h-64 w-full">
    <Frame>
      <HouseMark className="h-48 w-48" />
    </Frame>
  </div>
);

export const CelebrationIllustration = ({ label }) => (
  <div className="h-56 w-full">
    <Frame label={label}>
      <SealCheckMark />
    </Frame>
  </div>
);
