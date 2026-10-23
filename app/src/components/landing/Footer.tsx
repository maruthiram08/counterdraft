import React from 'react';
import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface rounded-t-card shadow-card pt-32 pb-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-16 mb-24">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <Image src="/brand/logo-icon.png" alt="Counterdraft Icon" width={40} height={40} className="h-10 w-10 shadow-raised rounded-full" />
              <Image src="/brand/logo-text.png" alt="Counterdraft" width={160} height={28} className="h-7 w-auto mt-1" />
            </div>
            <p className="text-ink-soft text-lg max-w-sm leading-relaxed">
              The writing tool for creators who want to stand out. Built for LinkedIn, blogs, newsletters, and beyond.
            </p>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-ink-soft">
              <li><a href="#" className="hover:text-ember-600 transition-colors">The Brain</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">Command Center</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">Smart Studio</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-6">Learning</h4>
            <ul className="space-y-4 text-sm text-ink-soft">
              <li><a href="#" className="hover:text-ember-600 transition-colors">Manifesto</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">Audit Guides</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">IP Frameworks</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">Case Library</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-ink-soft">
              <li><a href="#" className="hover:text-ember-600 transition-colors">Philosophy</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">X / Threads</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">LinkedIn</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-ink text-sm font-medium mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-ink-soft">
              <li><a href="/privacy" className="hover:text-ember-600 transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-ember-600 transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-line pt-10 text-xs text-ink-muted">
          <p>© 2025 Counterdraft Inc. — Write like you.</p>
          <div className="flex gap-10 mt-6 md:mt-0">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sage-500"></div> System Operational</span>
            <span>Build_v4.1.2</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
