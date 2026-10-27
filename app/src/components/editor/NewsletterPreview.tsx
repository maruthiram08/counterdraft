"use client";

import DOMPurify from "isomorphic-dompurify";
import { PREVIEW_MAX_CHARS, SUBJECT_MAX_CHARS, newsletterHtml, newsletterPlainText, parseNewsletter } from "@/lib/content/newsletter";
import { copyFormatted, copyText } from "@/lib/content/clipboard";
import { CopyButton } from "./CopyButton";

interface NewsletterPreviewProps {
    content: string;
    // The draft's title, used as the subject when the draft has no "Subject:" line
    title?: string;
    // Leave out the rendered email (the post sheet only needs the copy buttons)
    compact?: boolean;
}

// A newsletter issue as it lands: the inbox line (subject and preview text), the email, and ways to copy it.
export function NewsletterPreview({ content, title, compact }: NewsletterPreviewProps) {
    const parts = parseNewsletter(content);
    const subject = parts.subject || title || '';
    const html = newsletterHtml(parts.body);
    const plain = newsletterPlainText(parts.body);
    const subjectLong = subject.length > SUBJECT_MAX_CHARS;
    const previewLong = parts.previewText.length > PREVIEW_MAX_CHARS;

    return (
        <div className="space-y-4">
            {!compact && (
                <>
                    <div className="bg-white text-[#1f1f1f] rounded-xl border border-black/10 px-4 py-3">
                        <p className="text-xs text-black/50 mb-1">In the inbox</p>
                        <p className="text-sm leading-snug break-words">
                            <span className="font-semibold">{subject || 'No subject yet'}</span>
                            {parts.previewText && <span className="text-black/55"> · {parts.previewText}</span>}
                        </p>
                        <p className="mt-2 text-xs text-black/50">
                            Subject <span className={subjectLong ? 'text-rose-700 font-medium' : ''}>{subject.length}/{SUBJECT_MAX_CHARS}</span>
                            {' · '}Preview text <span className={previewLong ? 'text-rose-700 font-medium' : ''}>{parts.previewText.length}/{PREVIEW_MAX_CHARS}</span>
                            {(subjectLong || previewLong) && ' · inboxes cut off longer text'}
                        </p>
                    </div>

                    <div
                        className="bg-white rounded-xl border border-black/10 px-5 py-6 md:px-8 md:max-h-[480px] md:overflow-y-auto"
                        data-testid="newsletter-body"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
                    />
                </>
            )}

            <div className={`grid gap-2 ${parts.previewText ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <CopyButton label="Copy subject" onCopy={() => copyText(subject)} />
                {parts.previewText && <CopyButton label="Copy preview text" onCopy={() => copyText(parts.previewText)} />}
            </div>
            <CopyButton
                primary={!compact}
                label="Copy the email, formatted"
                className="w-full"
                onCopy={() => copyFormatted(html, plain)}
            />
            <div className="grid grid-cols-2 gap-2">
                <CopyButton label="Copy plain text" onCopy={() => copyText(plain)} />
                <CopyButton label="Copy HTML code" onCopy={() => copyText(html)} />
            </div>
            <p className="text-xs text-ink-muted">
                &ldquo;Formatted&rdquo; pastes with headings and links into Substack, Beehiiv, Kit or Gmail. Use the HTML code for an HTML block in Mailchimp and similar tools.
            </p>
        </div>
    );
}
