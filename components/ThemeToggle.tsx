'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export function ThemeToggle({ label }: { label: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type='button'
      onClick={toggleTheme}
      className='group flex h-10 w-10 items-center justify-center rounded-full text-[#62594f] transition-all hover:bg-black/5 hover:text-[#1d1a17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-[#b5aca2] dark:hover:bg-white/10 dark:hover:text-white'
      aria-label={label}
      title={label}
    >
      <Moon className='h-[17px] w-[17px] transition-transform group-hover:-rotate-12 dark:hidden' />
      <Sun className='hidden h-[17px] w-[17px] transition-transform group-hover:rotate-45 dark:block' />
    </button>
  );
}
