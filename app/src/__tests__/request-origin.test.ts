import { checkWriteOrigin } from '@/lib/request-origin';

const base = { origin: null, referer: null, host: 'www.counterdraft.com', secFetchSite: null };

describe('checkWriteOrigin', () => {
    it('allows same-host requests', () => {
        expect(checkWriteOrigin({ ...base, origin: 'https://www.counterdraft.com', secFetchSite: 'same-origin' })).toBeNull();
    });

    it('allows the extension origin', () => {
        expect(checkWriteOrigin({ ...base, origin: 'chrome-extension://abc', secFetchSite: 'none' })).toBeNull();
    });

    it('allows the extension after the apex-to-www redirect blanks its Origin', () => {
        expect(checkWriteOrigin({ ...base, origin: 'null', secFetchSite: 'none' })).toBeNull();
    });

    it('rejects a null Origin from a web page (sandboxed iframe, data: URL)', () => {
        expect(checkWriteOrigin({ ...base, origin: 'null', secFetchSite: 'cross-site' })).toBe('Invalid Origin');
        expect(checkWriteOrigin({ ...base, origin: 'null' })).toBe('Invalid Origin');
    });

    it('rejects other sites and lookalike hosts', () => {
        expect(checkWriteOrigin({ ...base, origin: 'https://evil.com', secFetchSite: 'cross-site' })).toBe('Invalid Origin');
        expect(checkWriteOrigin({ ...base, origin: 'https://www.counterdraft.com.evil.com' })).toBe('Invalid Origin');
    });

    it('needs a matching Referer when there is no Origin', () => {
        expect(checkWriteOrigin({ ...base, referer: 'https://www.counterdraft.com/workspace' })).toBeNull();
        expect(checkWriteOrigin(base)).toBe('Missing Referer/Origin');
    });
});
