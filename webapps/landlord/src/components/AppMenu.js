import {
  LuChevronLeft,
  LuKeyRound,
  LuLayoutDashboard,
  LuLogOut,
  LuMenu,
  LuSettings,
  LuSparkles,
  LuUserCircle,
  LuWallet
} from 'react-icons/lu';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from './ui/sheet';
import { useCallback, useContext, useEffect, useState } from 'react';
import { BsReceipt } from 'react-icons/bs';
import { Button } from './ui/button';
import { cn } from '../utils';
import config from '../config';
import dynamic from 'next/dynamic';
import moment from 'moment';
import Seal from './Seal';
import { Separator } from './ui/separator';
import SideMenuButton from './SideMenuButton';
import { StoreContext } from '../store';
import UserAvatar from './UserAvatar';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import useWhatsNew from './useWhatsNew';

// Release notes are a rare read — keep the panel and its markdown out of the
// app shell until someone opens it.
const WhatsNewDialog = dynamic(() => import('./WhatsNewDialog'), {
  ssr: false
});

const menuItems = [
  {
    key: 'dashboard',
    labelId: 'Dashboard',
    pathname: '/dashboard',
    Icon: LuLayoutDashboard,
    dataCy: 'dashboardNav'
  },
  {
    key: 'rents',
    labelId: 'Rents',
    pathname: '/rents/[yearMonth]',
    subPathnames: ['/payment/[tenantId]/[...param]'],
    Icon: BsReceipt,
    dataCy: 'rentsNav'
  },
  {
    key: 'tenants',
    labelId: 'Tenants',
    pathname: '/tenants',
    Icon: LuUserCircle,
    dataCy: 'tenantsNav'
  },
  {
    key: 'properties',
    labelId: 'Properties',
    pathname: '/properties',
    Icon: LuKeyRound,
    dataCy: 'propertiesNav'
  },
  {
    key: 'accounting',
    labelId: 'Accounting',
    pathname: '/accounting/[year]',
    Icon: LuWallet,
    dataCy: 'accountingNav'
  },
  {
    key: 'settings',
    labelId: 'Settings',
    pathname: '/settings',
    Icon: LuSettings,
    dataCy: 'settingsNav'
  },
  {
    hidden: true,
    key: 'account',
    labelId: 'Settings',
    pathname: '/settings/account'
  },
  {
    hidden: true,
    key: 'organizations',
    labelId: 'Settings',
    pathname: '/settings/organizations'
  },
  {
    hidden: true,
    key: 'landlord',
    labelId: 'Settings',
    pathname: '/settings/landlord'
  },
  {
    hidden: true,
    key: 'billing',
    labelId: 'Settings',
    pathname: '/settings/billing'
  },
  {
    hidden: true,
    key: 'contracts',
    labelId: 'Settings',
    pathname: '/settings/contracts'
  },
  {
    hidden: true,
    key: 'members',
    labelId: 'Settings',
    pathname: '/settings/members'
  },
  {
    hidden: true,
    key: 'thirdparties',
    labelId: 'Settings',
    pathname: '/settings/thirdparties'
  }
];

// The seal is the fixed anchor of the rail: collapsed, it is the only thing
// left, so the wordmark and the organization clip away around it.
function Brand({ collapsed = false }) {
  const store = useContext(StoreContext);

  return (
    <div className="flex items-center gap-3 px-5 pt-6">
      <Seal className="text-primary size-8 shrink-0" />
      <div
        className={cn(
          'min-w-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none',
          collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
        )}
      >
        <div className="text-primary font-serif text-xl font-semibold leading-none tracking-tight">
          {config.APP_NAME}
        </div>
        <div className="text-muted-foreground mt-1 truncate text-xs">
          {store.organization.selected?.name}
        </div>
      </div>
    </div>
  );
}

function WhatsNewButton({ collapsed = false }) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  // Mounted only once opened, so the dialog's chunk is fetched on demand and
  // still animates on the way out afterwards.
  const [everOpened, setEverOpened] = useState(false);
  const { hasUnseen, markSeen } = useWhatsNew();
  const label = t("What's new");

  const handleClick = useCallback(() => {
    markSeen();
    setEverOpened(true);
    setOpen(true);
  }, [markSeen]);

  const button = (
    <Button
      variant="ghost"
      onClick={handleClick}
      data-cy="whatsNewNav"
      title={collapsed ? label : undefined}
      className="text-muted-foreground hover:text-foreground relative h-11 w-full justify-start gap-3 rounded-none border-none px-5 font-normal hover:bg-primary/10"
    >
      <LuSparkles className="size-5 shrink-0" />
      <span
        className={cn(
          'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none',
          collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
        )}
      >
        {label}
      </span>
      {hasUnseen ? (
        <span
          aria-label={t('New release notes')}
          className={cn(
            'bg-primary size-2 shrink-0 rounded-full',
            'animate-in zoom-in fade-in-0 duration-500 ease-out motion-reduce:animate-none',
            collapsed ? 'absolute right-3 top-3' : 'ml-auto'
          )}
        />
      ) : null}
    </Button>
  );

  return (
    <>
      {button}
      {everOpened ? <WhatsNewDialog open={open} setOpen={setOpen} /> : null}
    </>
  );
}

function AccountSection({ collapsed = false }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const label = t('Sign out');

  const handleSignOut = useCallback(async () => {
    await store.user.signOut();
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.location.assign(config.BASE_PATH); // redirected to /signin
  }, [store.user]);

  const signOut = (
    <Button
      variant="outline"
      data-cy="signoutNav"
      onClick={handleSignOut}
      title={collapsed ? label : undefined}
      className={cn(
        'gap-2 font-normal',
        collapsed ? 'w-10 px-0' : 'w-full justify-center'
      )}
    >
      <LuLogOut className="size-4 shrink-0" />
      <span
        className={cn(
          'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none',
          collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
        )}
      >
        {label}
      </span>
    </Button>
  );

  return (
    <div>
      <Separator className="bg-secondary-foreground/25" />
      <WhatsNewButton collapsed={collapsed} />
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          collapsed ? 'justify-center px-0' : null
        )}
      >
        <UserAvatar className="text-sm" />
        <div
          className={cn(
            'min-w-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none',
            collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
          )}
        >
          <div className="truncate text-sm font-medium">
            {`${store.user.firstName} ${store.user.lastName}`}
          </div>
          {store.user.email ? (
            <div className="text-muted-foreground truncate text-xs">
              {store.user.email}
            </div>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          'px-4 pb-3',
          collapsed ? 'flex justify-center px-0' : null
        )}
      >
        {signOut}
      </div>
    </div>
  );
}

function CollapseToggle({ collapsed, onToggle }) {
  const { t } = useTranslation('common');
  const label = collapsed ? t('Expand menu') : t('Collapse menu');

  const button = (
    <Button
      variant="ghost"
      onClick={onToggle}
      aria-expanded={!collapsed}
      title={collapsed ? label : undefined}
      data-cy="collapseMenu"
      className="text-muted-foreground hover:text-foreground h-11 w-full justify-start gap-3 rounded-none border-none px-5 font-normal hover:bg-primary/10"
    >
      <LuChevronLeft
        className={cn(
          'size-5 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none',
          collapsed ? 'rotate-180' : null
        )}
      />
      <span
        className={cn(
          'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none',
          collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
        )}
      >
        {label}
      </span>
    </Button>
  );

  return button;
}

function useSelectedMenu() {
  const router = useRouter();
  const [selectedMenu, setSelectedMenu] = useState();

  useEffect(() => {
    const selectedMenuItems = menuItems.filter(
      (menuItem) => router.pathname.indexOf(menuItem.pathname) !== -1
    );
    let selectedMenuItem;
    if (selectedMenuItems.length > 0) {
      selectedMenuItem = selectedMenuItems[0];
    }
    setSelectedMenu(selectedMenuItem);
  }, [router.pathname]);

  return [selectedMenu, setSelectedMenu];
}

function useMenuNavigation(setSelectedMenu, onChange) {
  const store = useContext(StoreContext);
  const router = useRouter();

  return useCallback(
    (menuItem) => {
      setSelectedMenu(menuItem);
      onChange?.(menuItem);
      let pathname = menuItem.pathname.replace(
        '[yearMonth]',
        moment().format('YYYY.MM')
      );
      pathname = pathname.replace('[year]', moment().year());
      router.push(
        `/${store.organization.selected.name}${pathname}`,
        undefined,
        {
          locale: store.organization.selected.locale
        }
      );
    },
    [
      onChange,
      router,
      setSelectedMenu,
      store.organization.selected?.locale,
      store.organization.selected?.name
    ]
  );
}

export function HamburgerMenu({ className, onChange }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
  const [selectedMenu, setSelectedMenu] = useSelectedMenu();
  const handleMenuClick = useMenuNavigation(setSelectedMenu, onChange);

  return (
    <div className={className}>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            data-cy="appMenu"
            className="text-muted-foreground bg-card hover:bg-card"
          >
            <LuMenu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col px-0">
          <SheetHeader className="flex-row items-center gap-3 space-y-0 px-5 text-left">
            <Seal className="text-primary size-8 shrink-0" />
            <div className="min-w-0">
              <SheetTitle className="text-primary font-serif text-xl font-semibold leading-none tracking-tight">
                {config.APP_NAME}
              </SheetTitle>
              <SheetDescription className="mt-1 truncate text-xs">
                {store.organization.selected?.name}
              </SheetDescription>
            </div>
          </SheetHeader>
          <Separator className="bg-secondary-foreground/25 flex-col" />
          <div className="flex-grow overflow-auto">
            {menuItems
              .filter((menuItem) => !menuItem.hidden)
              .map((item) => {
                return (
                  <div key={item.key}>
                    <SheetClose asChild>
                      <SideMenuButton
                        item={item}
                        selected={item === selectedMenu}
                        onClick={() => handleMenuClick(item)}
                      />
                    </SheetClose>
                  </div>
                );
              })}
          </div>
          <div className="text-muted-foreground/50 pb-2 text-center text-[10px]">
            v{process.env.NEXT_PUBLIC_APP_VERSION || '?'}
          </div>
          <AccountSection />
        </SheetContent>
      </Sheet>
      {selectedMenu ? (
        <span className="text-base flex-grow">{t(selectedMenu.labelId)}</span>
      ) : null}
    </div>
  );
}

export function SideMenu({ collapsed = false, onToggleCollapsed, className }) {
  const [selectedMenu, setSelectedMenu] = useSelectedMenu();
  const navigate = useMenuNavigation(setSelectedMenu);
  const handleMenuClick = useCallback(
    (menuItem) => () => navigate(menuItem),
    [navigate]
  );

  return (
    <div
      className={cn(
        'bg-card fixed z-50 flex h-full flex-col shadow-md',
        'transition-[width] duration-300 ease-out motion-reduce:transition-none',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      <Brand collapsed={collapsed} />
      <Separator className="bg-secondary-foreground/25 my-4" />
      <div className="flex-grow overflow-y-auto overflow-x-hidden pb-52">
        {menuItems
          .filter((menuItem) => !menuItem.hidden)
          .map((item) => {
            return (
              <div key={item.key}>
                <SideMenuButton
                  item={item}
                  selected={item === selectedMenu}
                  collapsed={collapsed}
                  onClick={handleMenuClick(item)}
                />
              </div>
            );
          })}
      </div>
      {/* Pinned to the viewport bottom so it stays visible even when the
          environment bar (demo/dev) pushes the h-full sidebar past the fold. */}
      <div
        className={cn(
          'bg-card fixed bottom-0 left-0 z-50 overflow-hidden',
          'transition-[width] duration-300 ease-out motion-reduce:transition-none',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <CollapseToggle collapsed={collapsed} onToggle={onToggleCollapsed} />
        <AccountSection collapsed={collapsed} />
        <div className="text-muted-foreground/50 pb-2 text-center text-[10px]">
          v{process.env.NEXT_PUBLIC_APP_VERSION || '?'}
        </div>
      </div>
    </div>
  );
}
