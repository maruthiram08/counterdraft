import type { Draft } from '@/types';

// Where people post. 'other' means "somewhere else" or "didn't say" and is never shown as a label.
export const POST_PLATFORMS = [
    { key: 'linkedin', name: 'LinkedIn' },
    { key: 'x', name: 'X' },
    { key: 'threads', name: 'Threads' },
    { key: 'instagram', name: 'Instagram' },
    { key: 'medium', name: 'Medium' },
    { key: 'substack', name: 'Substack' },
    { key: 'newsletter', name: 'Newsletter' },
    { key: 'other', name: 'Somewhere else' },
] as const;

export type PostPlatformKey = typeof POST_PLATFORMS[number]['key'];

const NAMES: Record<string, string> = {
    linkedin: 'LinkedIn',
    x: 'X',
    twitter: 'X',
    instagram: 'Instagram',
    medium: 'Medium',
    substack: 'Substack',
    threads: 'Threads',
    blog: 'Blog',
    newsletter: 'Newsletter',
    x_thread: 'X thread',
};

// The platform a repurposed draft is written for, as the Post sheet should preselect it
const POSTS_TO: Record<string, string> = { x_thread: 'x', newsletter: 'newsletter' };

export function postPlatformFor(format?: string | null): string | null {
    if (!format) return null;
    return POSTS_TO[format] ?? format;
}

export function isPostPlatform(value: unknown): value is PostPlatformKey {
    return typeof value === 'string' && POST_PLATFORMS.some(p => p.key === value);
}

export function platformName(platform: string): string {
    const key = platform.trim().toLowerCase();
    return NAMES[key] || platform.charAt(0).toUpperCase() + platform.slice(1);
}

type PostRecord = NonNullable<Draft['published_posts']>[number];

// LinkedIn API posts store a URN; posts marked by hand store the link the writer gave (or nothing)
export function isManualRecord(p: PostRecord): boolean {
    return !p.platform_post_id?.startsWith('urn:');
}

export function postUrl(p: PostRecord): string | null {
    if (p.url) return p.url;
    const id = p.platform_post_id || '';
    if (/^https?:\/\//i.test(id)) return id;
    if (p.platform === 'linkedin' && id.includes('urn:li')) {
        return `https://www.linkedin.com/feed/update/urn:li:activity:${id.split(':').pop()}`;
    }
    return null;
}

// Platforms a post went out on: real records first, else the platform it was written for.
// Unknown stays unsaid rather than "Unknown platform".
export function postPlatforms(draft: Draft): string[] {
    const fromRecords = (draft.published_posts || []).map(p => p.platform).filter(Boolean);
    const source = fromRecords.length > 0 ? fromRecords : [draft.labels?.platform || draft.platform].filter((p): p is string => !!p);
    const names = source.filter(p => p !== 'other').map(platformName);
    return Array.from(new Set(names));
}

// When the post went out: the record's date, else when it was last touched
export function postedDate(draft: Draft): string {
    return draft.published_posts?.[0]?.published_at || draft.updated_at;
}

// Only a http(s) link that fits the column; anything else is dropped rather than stored
export function cleanPostUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(withScheme);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        if (!url.hostname.includes('.')) return null;
        const href = url.toString();
        return href.length <= 255 ? href : null;
    } catch {
        return null;
    }
}
