import { buildFeed, cleanTitle, dedupeItems, matchBelief, parseGoogleNewsRss, rankScore, trimSnippet, type RawFeedItem } from '@/lib/explore/feed';

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

    it('does not link a belief on a single shared word', () => {
        const beliefs = [{ id: 'a', statement: 'Linear time frameworks stifle creativity and personal well-being.' }];
        expect(matchBelief('Acuity hires hint at a private-client push in personal lines', beliefs).belief).toBeNull();
    });

    it('uses screening results: drops off-topic stories and keeps the stance', () => {
        const now = Date.parse('2026-10-20T00:00:00Z');
        const beliefs = [{ id: 'a', statement: 'AI tools save product managers real time' }];
        const items = Array.from({ length: 7 }, (_, i) => item({ title: `Story ${i}` }));
        const annotations = items.map((_, i) => ({
            relevant: i !== 0,
            beliefId: i === 3 ? 'a' : null,
            stance: i === 3 ? 'challenges' as const : null,
        }));

        const feed = buildFeed(items, beliefs, 'default', now, annotations);
        expect(feed.map(f => f.title)).not.toContain('Story 0');
        expect(feed[0]).toMatchObject({ title: 'Story 3', relatedBelief: beliefs[0].statement, beliefStance: 'challenges' });
    });

    it('drops screened-out results instead of padding the list with them', () => {
        const items = [item({ title: 'What is B2C marketing?' }), item({ title: 'How Duolingo launched in new markets' })];
        const annotations = [
            { relevant: false, beliefId: null, stance: null },
            { relevant: true, beliefId: null, stance: null, kind: 'case study' as const, takeaway: 'Launch market by market.' },
        ];
        const feed = buildFeed(items, [], 'default', Date.now(), annotations, 'learn');
        expect(feed).toHaveLength(1);
        expect(feed[0]).toMatchObject({ title: 'How Duolingo launched in new markets', kind: 'case study', takeaway: 'Launch market by market.' });
    });

    it('trims snippets at a word boundary', () => {
        const text = "When you don't have momentum, every launch channel looks the same and nothing compounds.";
        expect(trimSnippet(text, 40)).toBe("When you don't have momentum, every…");
        expect(trimSnippet('Short one.', 40)).toBe('Short one.');
    });

    it('keeps month-old guides competitive but not month-old news', () => {
        const now = Date.parse('2026-10-20T00:00:00Z');
        const monthOld = Date.parse('2026-09-20T00:00:00Z');
        expect(rankScore(0, monthOld, 1, now, 'learn')).toBeGreaterThan(0.5);
        expect(rankScore(0, monthOld, 1, now, 'news')).toBeLessThan(0.01);
    });
});
