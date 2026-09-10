import config from '../config';
import Seal from './Seal';
import useTranslation from 'next-translate/useTranslation';

export default function SignInUpLayout({ children }) {
  const { t } = useTranslation('common');

  return (
    <div className="flex h-screen">
      <div className="bg-primary text-primary-foreground relative hidden w-[36rem] flex-col items-center justify-center overflow-hidden px-14 text-center lg:flex">
        {/* Atmosphere: a soft top glow and a large ghosted seal watermark. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_75%_at_50%_-10%,hsl(var(--primary-foreground)/0.14),transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 opacity-[0.05]">
          <Seal className="h-[30rem] w-[30rem]" />
        </div>

        <div className="relative flex flex-col items-center gap-7">
          <Seal
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
          <Seal animated className="text-primary h-10 w-10" />
          <span className="font-serif text-4xl">{config.APP_NAME}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
