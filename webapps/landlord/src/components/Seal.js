// Bayle seal, drawn in the current text color so it reads on either ground.
// When `animated`, it plays a one-shot draw-on choreography on mount and the
// dashed ring keeps turning slowly (see .seal-* rules in globals.css).
export default function Seal({ className, animated = false }) {
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
