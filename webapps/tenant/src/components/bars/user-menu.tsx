'use client';

import { Button } from '@/components/ui/button';
import getEnv from '@/utils/env/client';
import { LogOut } from 'lucide-react';
import useApiFetcher from '@/utils/fetch/client';
import useSession from '@/utils/session/client/usesession';
import { useToast } from '@/components/ui/use-toast';
import useTranslation from '@/utils/i18n/client/useTranslation';

export default function UserMenu() {
  const apiFetcher = useApiFetcher();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { session, status } = useSession();

  const handleSignOut = async () => {
    try {
      await apiFetcher.delete('/api/v2/authenticator/tenant/signout');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: t('Something went wrong'),
        description: t('Please try again later.')
      });
    }
    window.location.href = `${getEnv('BASE_PATH') || ''}/signin`;
  };

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {session?.email ? (
        <span className="text-muted-foreground hidden max-w-[16rem] truncate text-sm sm:inline">
          {session.email}
        </span>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        data-cy="signoutNav"
        onClick={handleSignOut}
        className="text-muted-foreground hover:text-foreground gap-2"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">{t('Sign out')}</span>
      </Button>
    </div>
  );
}
