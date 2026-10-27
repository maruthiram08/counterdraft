import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FeedbackLink } from '@/components/shared/FloatingFeedbackButton';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface rounded-t-card shadow-card pt-12 md:pt-32 pb-10 md:pb-16 safe-area-pb">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10 md:gap-16 mb-12 md:mb-24">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-5 md:mb-8">
              <Image src="/brand/logo-icon.png" alt="Counterdraft Icon" width={40} height={40} className="h-10 w-10 shadow-raised rounded-full" />
              <Image src="/brand/logo-text.png" alt="Counterdraft" width={160} height={28} className="h-7 w-auto mt-1" />
            </div>
            <p className="text-ink-soft text-base md:text-lg max-w-sm leading-relaxed">
              The writing tool for creators who want to stand out. Built for LinkedIn, with Medium, Instagram, X thread and newsletter versions of every post.
            </p>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-3 md:mb-6">Product</h4>
            <ul className="space-y-1 text-sm text-ink-soft">
              <li><Link href="/#the-brain" className="inline-block py-2 hover:text-ember-600 transition-colors">How It Works</Link></li>
              <li><Link href="/#command-center" className="inline-block py-2 hover:text-ember-600 transition-colors">Organize</Link></li>
              <li><Link href="/#smart-studio" className="inline-block py-2 hover:text-ember-600 transition-colors">Repurpose</Link></li>
              <li><Link href="/pricing" className="inline-block py-2 hover:text-ember-600 transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-3 md:mb-6">Company</h4>
            <ul className="space-y-1 text-sm text-ink-soft">
              <li><Link href="/philosophy" className="inline-block py-2 hover:text-ember-600 transition-colors">Philosophy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-3 md:mb-6">Legal</h4>
            <ul className="space-y-1 text-sm text-ink-soft">
              <li><Link href="/privacy" className="inline-block py-2 hover:text-ember-600 transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="inline-block py-2 hover:text-ember-600 transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-line pt-8 md:pt-10 text-xs text-ink-muted">
          <p>© {new Date().getFullYear()} Counterdraft. Write like you.</p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 mt-6 md:mt-0">
            <FeedbackLink className="hover:text-ember-600 transition-colors md:hidden" />
          </div>
        </div>
      </div>
    </footer>
  );
};
