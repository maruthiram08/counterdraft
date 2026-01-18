import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

interface HeaderProps {
    className?: string;
}

export function Header({ className }: HeaderProps) {
    return (
        <header className={`border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-50 ${className || ''}`}>
            <div className="container h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-medium tracking-tight hover:opacity-80 transition-opacity">
                    counterdraft
                </Link>
                <nav className="flex items-center gap-6">
                    <SignedIn>
                        <Link href="/workspace" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                            Workspace
                        </Link>
                        <Link href="/settings" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                            Settings
                        </Link>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                    <SignedOut>
                        <Link href="/sign-in" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                            Sign In
                        </Link>
                        <Link href="/sign-up" className="btn btn-primary text-sm px-4 py-2">
                            Get Started
                        </Link>
                    </SignedOut>
                </nav>
            </div>
        </header>
    );
}


