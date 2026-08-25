import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { CartDrawer } from '@/components/CartDrawer';
import { Package, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';
import Image from 'next/image';
import type { Dictionary, Locale } from '@/app/[lang]/dictionaries';
import { naqshlabLogo } from '@/lib/brand-assets';
import { ThemeToggle } from '@/components/ThemeToggle';

export async function Navbar({
  lang,
  dict,
}: {
  lang: Locale;
  dict: Dictionary;
}) {
  const session = await auth();
  const { nav } = dict;

  return (
    <header className='sticky top-0 z-30 w-full'>
      <div className='h-[2px] w-full bg-landing-accent-strip' />

      <div className='border-b border-landing-border bg-landing/90 backdrop-blur-xl'>
        <nav className='mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10'>
          {/* Logo */}
          <Link
            href={`/${lang}`}
            className='group flex items-center'
            aria-label='Naqshlab home'
          >
            <span className='relative inline-flex h-[48px] w-[104px] items-center justify-center sm:w-[116px]'>
              <Image
                src='/ornament.png'
                alt=''
                width={36}
                height={36}
                className='absolute left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin opacity-70 transition-opacity group-hover:opacity-100'
                style={{ top: '15px', animationDuration: '14s' }}
                aria-hidden='true'
              />
              <Image
                src={naqshlabLogo}
                alt='Naqshlab'
                width={96}
                height={27}
                className='relative z-10 mt-2 h-auto w-[88px] sm:w-[96px]'
                priority
              />
            </span>
          </Link>

          {/* Right side */}
          <div className='flex items-center gap-0.5'>
            <Link
              href={`/${lang}/products`}
              className='hidden rounded-full px-3 py-2 text-sm font-semibold text-landing-nav transition-all hover:bg-landing-hover hover:text-landing-foreground sm:block'
            >
              {nav.shop}
            </Link>

            <ThemeToggle label={nav.toggleTheme} />

            {session?.user ? (
              <>
                <Link
                  href={`/${lang}/orders`}
                  className='rounded-lg p-2 text-landing-nav transition-all hover:bg-landing-hover hover:text-landing-foreground'
                  aria-label={nav.myOrders}
                >
                  <Package className='h-[18px] w-[18px]' />
                </Link>

                {/* @ts-expect-error custom role field */}
                {session.user.role === 'admin' && (
                  <Link
                    href={`/${lang}/admin`}
                    className='rounded-lg p-2 text-landing-nav transition-all hover:bg-landing-hover hover:text-landing-foreground'
                    aria-label={nav.adminPanel}
                  >
                    <LayoutDashboard className='h-[18px] w-[18px]' />
                  </Link>
                )}

                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: `/${lang}` });
                  }}
                >
                  <button
                    type='submit'
                    className='hidden rounded-full px-3 py-2 text-sm font-semibold text-landing-nav transition-all hover:bg-landing-hover hover:text-landing-foreground sm:block'
                  >
                    {nav.signOut}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href={`/${lang}/login`}
                  className='flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-landing-nav transition-all hover:bg-landing-hover hover:text-landing-foreground sm:px-3'
                  aria-label={nav.signIn}
                >
                  <LogIn className='h-4 w-4' />
                  <span className='hidden md:inline'>{nav.signIn}</span>
                </Link>
                <Link
                  href={`/${lang}/register`}
                  className='ml-0.5 flex h-10 items-center gap-1.5 rounded-full bg-landing-primary px-3 text-sm font-bold text-landing-on-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-landing-primary-hover sm:ml-1 sm:px-4'
                  aria-label={nav.register}
                >
                  <UserPlus className='h-3.5 w-3.5' />
                  <span className='hidden sm:inline'>{nav.register}</span>
                </Link>
              </>
            )}

            <div className='ml-1'>
              <CartDrawer />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
