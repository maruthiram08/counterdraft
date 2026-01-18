import Link from "next/link";

export function Header() {
    return (
        <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-50">
            <div className="container h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-medium tracking-tight hover:opacity-80 transition-opacity">
                    counterdraft
                </Link>
                <nav className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                        Log in
                    </Link>
                </nav>
            </div>
        </header>
    );
}
