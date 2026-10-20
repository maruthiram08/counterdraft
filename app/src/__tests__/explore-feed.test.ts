import { buildFeed, cleanTitle, dedupeItems, matchBelief, parseGoogleNewsRss, type RawFeedItem } from '@/lib/explore/feed';

const RSS = `<?xml version="1.0"?><rss><channel>
<item>
  <title>Companies rethink remote work policies - Reuters</title>
  <link>https://news.google.com/rss/articles/abc</link>
  <pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate>
  <description>&lt;ol&gt;&lt;li&gt;&lt;a href="https://news.google.com/a"&gt;Companies rethink remote work policies&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Reuters&lt;/font&gt;&lt;/li&gt;&lt;li&gt;&lt;a href="https://news.google.com/b"&gt;Return to office stalls&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;The Verge&lt;/font&gt;&lt;/li&gt;&lt;/ol&gt;</description>
  <source url="https://www.reuters.com">Reuters</source>
</item>
<item>
  <title><![CDATA[Why is async hiring &amp; onboarding hard? - Wired]]></title>
  <link>https://news.google.com/rss/articles/def</link>
  <pubDate>Sun, 11 Oct 2026 10:00:00 GMT</pubDate>
  <description>&lt;a href="https://news.google.com/c"&gt;Why is async hiring hard?&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Wired&lt;/font&gt;</description>
  <source url="https://www.wired.com">Wired</source>
</item>
</channel></rss>`;

function item(overrides: Partial<RawFeedItem>): RawFeedItem {
    return { title: 'Story', link: 'https://example.com', source: 'Example', otherSources: [], query: 'q', ...overrides };
}

describe('explore feed helpers', () => {
    it('parses Google News items with clean titles and other outlets', () => {
        const items = parseGoogleNewsRss(RSS, 'remote work');
        expect(items).toHaveLength(2);
        expect(items[0]).toMatchObject({
            title: 'Companies rethink remote work policies',
            source: 'Reuters',
            otherSources: ['The Verge'],
            query: 'remote work',
        });
        expect(items[1].title).toBe('Why is async hiring & onboarding hard?');
        expect(items[1].otherSources).toEqual([]);
    });

    it('only strips the matching outlet suffix', () => {
        expect(cleanTitle('Hiring - a new era - Wired', 'Wired')).toBe('Hiring - a new era');
        expect(cleanTitle('Hiring - a new era', 'Wired')).toBe('Hiring - a new era');
    });

    it('merges the same story from different queries and sources', () => {
        const merged = dedupeItems([
            item({ title: 'AI agents go mainstream', source: 'Reuters' }),
            item({ title: 'AI Agents Go Mainstream!', source: 'techcrunch.com', summary: 'Snippet' }),
        ]);
        expect(merged).toHaveLength(1);
        expect(merged[0].otherSources).toEqual(['techcrunch.com']);
        expect(merged[0].summary).toBe('Snippet');
    });

    it('matches the belief with the most shared keywords', () => {
        const beliefs = [
            { id: 'a', statement: 'Remote teams need a strong written culture' },
            { id: 'b', statement: 'Hiring for attitude beats hiring for skills' },
        ];
        expect(matchBelief('Remote teams struggle without written culture', beliefs).belief?.id).toBe('a');
        expect(matchBelief('Quarterly earnings beat expectations', beliefs).belief).toBeNull();
    });

    it('ranks belief matches and fresh stories first', () => {
        const now = Date.parse('2026-10-20T00:00:00Z');
        const feed = buildFeed([
            item({ title: 'Old unrelated story', pubDate: 'Mon, 01 Sep 2026 10:00:00 GMT' }),
            item({ title: 'Fresh unrelated story', pubDate: 'Mon, 19 Oct 2026 20:00:00 GMT' }),
            item({ title: 'Remote teams written culture matters', pubDate: 'Mon, 05 Oct 2026 10:00:00 GMT' }),
        ], [{ id: 'a', statement: 'Remote teams need a strong written culture' }], 'default', now);

        expect(feed.map(f => f.title)).toEqual([
            'Remote teams written culture matters',
            'Fresh unrelated story',
            'Old unrelated story',
        ]);
        expect(feed[0].relatedBelief).toBe('Remote teams need a strong written culture');
        expect(feed[1].publishedAt).toBe('2026-10-19T20:00:00.000Z');
    });
});
