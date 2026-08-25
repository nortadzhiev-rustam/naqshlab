'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export function ThemeToggle({ label }: { label: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type='button'
      onClick={toggleTheme}
      className='group flex h-10 w-10 items-center justify-center rounded-full text-landing-nav transition-all hover:bg-landing-hover hover:text-landing-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-brand'
      aria-label={label}
      title={label}
    >
      <Moon className='h-[17px] w-[17px] transition-transform group-hover:-rotate-12 dark:hidden' />
      <Sun className='hidden h-[17px] w-[17px] transition-transform group-hover:rotate-45 dark:block' />
    </button>
  );
}
