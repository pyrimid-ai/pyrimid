'use client';

import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Integrate', href: '#integrate' },
  { label: 'Products', href: '#products' },
  { label: 'Reputation', href: '#reputation' },
  { label: 'Proof', href: '/dashboard' },
  { label: 'Docs', href: '/docs' },
  { label: 'AgentZone', href: 'https://agentzone.fun', external: true },
  { label: 'MYA', href: 'https://monetizeyouragent.fun', external: true },
  { label: 'Contracts', href: 'https://basescan.org/address/0x34e22fc20D457095e2814CdFfad1e42980EEC389', external: true },
  { label: 'llms.txt', href: '/llms.txt', external: true },
  { label: 'agents.txt', href: '/agents.txt', external: true },
  { label: 'skill.md', href: '/skill.md', external: true },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-[5px] cursor-pointer bg-transparent border-none z-[100]"
        aria-label="Toggle menu"
      >
        <span
          className="block w-5 h-[2px] transition-all duration-200"
          style={{
            background: 'var(--muted)',
            transform: open ? 'rotate(45deg) translate(2.5px, 2.5px)' : 'none',
          }}
        />
        <span
          className="block w-5 h-[2px] transition-all duration-200"
          style={{
            background: 'var(--muted)',
            opacity: open ? 0 : 1,
          }}
        />
        <span
          className="block w-5 h-[2px] transition-all duration-200"
          style={{
            background: 'var(--muted)',
            transform: open ? 'rotate(-45deg) translate(2.5px, -2.5px)' : 'none',
          }}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] md:hidden"
          style={{ background: 'var(--bg)', opacity: 0.98 }}
        >
          <nav className="flex flex-col items-center justify-center h-full gap-6">
            {NAV_ITEMS.map(({ label, href, external }) => (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="font-mono text-[1.1rem] no-underline transition-colors duration-200"
                style={{ color: 'var(--muted)' }}
                {...(external ? { target: '_blank', rel: 'noopener' } : {})}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
