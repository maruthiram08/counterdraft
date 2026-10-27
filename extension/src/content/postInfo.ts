// Who wrote a framed social post and the post's own link, so a reframe can credit it and
// link back to the post rather than the feed it was seen in. LinkedIn and X only; their markup
// changes often, so every lookup has fallbacks and a miss just leaves the field out.

export interface PostInfo {
    author?: string;
    authorUrl?: string;
    url?: string;
}

const text = (el: Element | null | undefined) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

const absolute = (href: string | null | undefined) => {
    if (!href) return undefined;
    try {
        const url = new URL(href, window.location.href);
        url.search = '';
        url.hash = '';
        return url.toString();
    } catch {
        return undefined;
    }
};

// The one post the element belongs to: an ancestor, or the only post inside it
function findPost(el: HTMLElement, selector: string): HTMLElement | null {
    const up = el.closest<HTMLElement>(selector);
    if (up) return up;
    const inside = el.querySelectorAll<HTMLElement>(selector);
    return inside.length === 1 ? inside[0] : null;
}

const LINKEDIN_POST = '[data-urn*="urn:li:activity:"], [data-urn*="urn:li:share:"], [data-urn*="urn:li:ugcPost:"], [data-id*="urn:li:activity:"]';

function linkedInPost(el: HTMLElement): PostInfo {
    const post = findPost(el, LINKEDIN_POST);
    const info: PostInfo = {};
    // A single post page already has the post's link
    if (/\/(feed\/update|posts)\//.test(window.location.pathname)) info.url = absolute(window.location.href);
    if (!post) return info;

    const urn = (post.getAttribute('data-urn') || post.getAttribute('data-id') || '').match(/urn:li:(activity|share|ugcPost):\d+/)?.[0];
    if (urn && !info.url) info.url = `https://www.linkedin.com/feed/update/${urn}/`;

    // aria-hidden spans hold the visible name; the others repeat it for screen readers
    const name = post.querySelector('.update-components-actor__title span[aria-hidden="true"]')
        || post.querySelector('.update-components-actor__name span[aria-hidden="true"]')
        || post.querySelector('.feed-shared-actor__name')
        || post.querySelector('a[href*="/in/"] span[aria-hidden="true"], a[href*="/company/"] span[aria-hidden="true"]');
    const author = text(name).split(' • ')[0];
    if (author) info.author = author.slice(0, 120);

    const link = post.querySelector<HTMLAnchorElement>('a.update-components-actor__meta-link, a.update-components-actor__image, a[href*="/in/"], a[href*="/company/"]');
    const authorUrl = absolute(link?.getAttribute('href'));
    if (authorUrl) info.authorUrl = authorUrl;
    return info;
}

function xPost(el: HTMLElement): PostInfo {
    const post = findPost(el, 'article[data-testid="tweet"]');
    if (!post) return {};
    const info: PostInfo = {};
    // The first span of User-Name is the display name, then the @handle
    const author = text(post.querySelector('[data-testid="User-Name"] span'));
    if (author) info.author = author.slice(0, 120);
    const status = post.querySelector<HTMLAnchorElement>('a[href*="/status/"] time')?.closest('a');
    const url = absolute(status?.getAttribute('href'));
    if (url) {
        info.url = url;
        info.authorUrl = absolute(`/${url.split('/')[3]}`);
    }
    return info;
}

export function readPostInfo(el: HTMLElement): PostInfo | undefined {
    try {
        const host = window.location.hostname;
        const info = /(^|\.)linkedin\.com$/.test(host) ? linkedInPost(el)
            : /(^|\.)(x|twitter)\.com$/.test(host) ? xPost(el)
            : {};
        return Object.keys(info).length ? info : undefined;
    } catch (err) {
        console.warn('[CounterDraft] Could not read the post details:', err);
        return undefined;
    }
}
