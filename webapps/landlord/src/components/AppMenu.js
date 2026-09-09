import {
  LuKeyRound,
  LuLayoutDashboard,
  LuLogOut,
  LuMenu,
  LuSettings,
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
import moment from 'moment';
import { Separator } from './ui/separator';
import SideMenuButton from './SideMenuButton';
import SponsorMenu from './SponsorMenu';
import { StoreContext } from '../store';
import UserAvatar from './UserAvatar';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

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

function AccountSection() {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);

  const handleSignOut = useCallback(async () => {
    await store.user.signOut();
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.location.assign(config.BASE_PATH); // redirected to /signin
  }, [store.user]);

  return (
    <div>
      <Separator className="bg-secondary-foreground/25" />
      <div className="flex items-center gap-3 px-4 py-3">
        <UserAvatar className="text-sm" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {`${store.user.firstName} ${store.user.lastName}`}
          </div>
          {store.user.email ? (
            <div className="text-muted-foreground text-xs truncate">
              {store.user.email}
            </div>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        data-cy="signoutNav"
        onClick={handleSignOut}
        className="text-muted-foreground hover:text-foreground hover:bg-secondary flex w-full items-center gap-2 px-4 py-2 text-sm"
      >
        <LuLogOut className="size-4" />
        {t('Sign out')}
      </button>
    </div>
  );
}

export function HamburgerMenu({ className, onChange }) {
  const { t } = useTranslation('common');
  const store = useContext(StoreContext);
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

  const handleMenuClick = useCallback(
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
      store.organization.selected?.locale,
      store.organization.selected?.name
    ]
  );

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
          <SheetHeader className="px-4">
            <SheetTitle> {store.organization.selected?.name}</SheetTitle>
            <SheetDescription className="font-serif text-base text-primary">
              {config.APP_NAME}
            </SheetDescription>
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
          <SponsorMenu />
          <div className="text-muted-foreground/50 text-[10px] text-center pb-2">
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

export function SideMenu({ className }) {
  const store = useContext(StoreContext);
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

  const handleMenuClick = useCallback(
    (menuItem) => () => {
      setSelectedMenu(menuItem);
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
      router,
      store.organization.selected?.locale,
      store.organization.selected?.name
    ]
  );

  return (
    <div
      className={cn(
        'bg-card flex flex-col fixed w-60 h-full z-50 shadow-md',
        className
      )}
    >
      <div className="whitespace-nowrap text-2xl font-semibold px-4 mt-6">
        {store.organization.selected.name}
      </div>
      <div className="font-serif text-lg text-primary px-4 mt-2">
        {config.APP_NAME}
      </div>
      <Separator className="bg-secondary-foreground/25 my-4" />
      <div className="flex-grow overflow-auto pb-40">
        {menuItems
          .filter((menuItem) => !menuItem.hidden)
          .map((item) => {
            return (
              <div key={item.key}>
                <SideMenuButton
                  item={item}
                  selected={item === selectedMenu}
                  onClick={handleMenuClick(item)}
                />
              </div>
            );
          })}
      </div>
      {/* Pinned to the viewport bottom so it stays visible even when the
          environment bar (demo/dev) pushes the h-full sidebar past the fold. */}
      <div className="bg-card fixed bottom-0 left-0 w-60 z-50">
        <SponsorMenu className="mb-2" />
        <div className="text-muted-foreground/50 text-[10px] text-center mb-2">
          v{process.env.NEXT_PUBLIC_APP_VERSION || '?'}
        </div>
        <AccountSection />
      </div>
    </div>
  );
}
