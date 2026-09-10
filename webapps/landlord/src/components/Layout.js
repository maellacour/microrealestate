import { HamburgerMenu, SideMenu } from './AppMenu';
import { useCallback, useContext, useEffect, useState } from 'react';
import { cn } from '../utils';
import EnvironmentBar from './EnvironmentBar';
import { StoreContext } from '../store';
import { Toaster } from '../components/ui/sonner';
import { useMediaQuery } from 'usehooks-ts';

const COLLAPSED_KEY = 'bayle.sidemenu.collapsed';

export default function Layout({ hideMenu, children }) {
  const store = useContext(StoreContext);
  const isXLorGreater = useMediaQuery('(min-width: 1280px)');
  // Read after mount: the server has no way to know the stored preference and
  // rendering the collapsed rail straight away would mismatch the markup.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === 'true');
    } catch (error) {
      setCollapsed(false);
    }
  }, []);

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch (error) {
        // A browser refusing storage just forgets the choice next visit.
      }
      return next;
    });
  }, []);

  return (
    <>
      {hideMenu ? (
        <>
          <div className="sticky top-0 z-50 shadow">
            <EnvironmentBar />
          </div>
          <div className={cn('flex-grow')}>{children}</div>
        </>
      ) : (
        <>
          <div className="sticky top-0 z-50 shadow">
            <EnvironmentBar />
            {store.user?.signedIn && !isXLorGreater ? (
              <div className="flex items-center bg-card w-full gap-2 py-1">
                <HamburgerMenu className="flex flex-grow items-center" />
              </div>
            ) : null}
          </div>
          <div className="flex">
            {store.user?.signedIn && isXLorGreater ? (
              <SideMenu
                collapsed={collapsed}
                onToggleCollapsed={handleToggleCollapsed}
              />
            ) : null}
            <div
              className={cn(
                'flex-grow',
                'transition-[margin] duration-300 ease-out motion-reduce:transition-none',
                store.user?.signedIn
                  ? collapsed
                    ? 'xl:ml-16'
                    : 'xl:ml-60'
                  : ''
              )}
            >
              {children}
            </div>
          </div>
        </>
      )}

      <Toaster
        position="bottom-center"
        closeButton
        toastOptions={{
          unstyled: true,
          classNames: {
            error:
              'flex items-center gap-2 p-4 rounded-lg shadow-lg bg-destructive text-destructive-foreground',
            success:
              'flex items-center gap-2 p-4 rounded-lg shadow-lg bg-success text-success-foreground',
            warning:
              'flex items-center gap-2 p-4 rounded-lg shadow-lg bg-warning text-warning-foreground',
            info: 'flex items-center gap-2 p-4 rounded-lg shadow-lg bg-info text-info-foreground'
          }
        }}
      />
    </>
  );
}
