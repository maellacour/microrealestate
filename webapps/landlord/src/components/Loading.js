import { cn } from '../utils';

// Branded loading indicator: the Bayle seal with a sweeping arc on its outer
// ring. Animations live in globals.css (.seal-loader-*), reduced-motion safe.
function SealLoader({ className }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('text-primary', className)}
      fill="none"
      stroke="currentColor"
      role="status"
      aria-label="Loading"
    >
      <circle cx="50" cy="50" r="47" strokeWidth="2" opacity="0.15" />
      <circle
        className="seal-loader-arc"
        cx="50"
        cy="50"
        r="47"
        strokeWidth="2.6"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="0.28 1"
      />
      <circle
        className="seal-loader-dash"
        cx="50"
        cy="50"
        r="40"
        strokeWidth="1.2"
        strokeDasharray="2.4 3.2"
        opacity="0.35"
      />
      <path
        d="M30 52 L50 34 L70 52"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d="M34 50 L34 68 L66 68 L66 50"
        strokeWidth="3.4"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <g opacity="0.7">
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

export default function Loading({ fullScreen = true, className }) {
  return fullScreen ? (
    <div
      className={cn(
        'fixed left-0 top-16 right-0 bottom-0 flex items-center justify-center',
        'xl:left-60',
        className
      )}
    >
      <SealLoader className="z-50 size-12" />
    </div>
  ) : (
    <div className={cn('flex items-center justify-center', className)}>
      <SealLoader className="z-50 size-10" />
    </div>
  );
}
