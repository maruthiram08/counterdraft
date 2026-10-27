"use client";

import { useState } from "react";
import { X_MAX_CHARS, finalPosts, parseThread, xLength } from "@/lib/content/x-thread";
import { copyText } from "@/lib/content/clipboard";
import { CopyButton } from "./CopyButton";

interface ThreadPreviewProps {
    content: string;
    // Whether posts end in "1/7"; the writer can switch it here
    numbered?: boolean;
}

// An X thread as it will go out: one card per post with X's character count and a copy button.
// Posts are the blocks between --- lines in the editor.
export function ThreadPreview({ content, numbered: initialNumbered = true }: ThreadPreviewProps) {
    const [numbered, setNumbered] = useState(initialNumbered);
    const posts = finalPosts(parseThread(content), numbered);
    const over = posts.filter(p => xLength(p) > X_MAX_CHARS).length;

    if (posts.length === 0) {
        return <p className="text-sm text-ink-soft">No posts yet. Write each post in the editor and put a line with --- between them.</p>;
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={`text-xs ${over ? 'text-rose-700 font-medium' : 'text-ink-muted'}`}>
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                    {over > 0 ? ` · ${over} over X's ${X_MAX_CHARS}-character limit` : ` · each fits X's ${X_MAX_CHARS} characters`}
                </p>
                <label className="flex items-center gap-2 h-11 md:h-9 cursor-pointer text-xs font-medium text-ink-soft">
                    <input
                        type="checkbox"
                        checked={numbered}
                        onChange={e => setNumbered(e.target.checked)}
                        className="w-4 h-4 accent-ember-500"
                    />
                    Number the posts (1/{posts.length})
                </label>
            </div>

            <ol className="space-y-3">
                {posts.map((post, i) => {
                    const length = xLength(post);
                    const tooLong = length > X_MAX_CHARS;
                    return (
                        <li key={i} className={`bg-white text-[#0f1419] rounded-xl border p-4 ${tooLong ? 'border-rose-300' : 'border-black/10'}`}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <span className="text-xs font-semibold text-black/60">{i === 0 ? 'Post 1 · the hook' : `Post ${i + 1}`}</span>
                                <span className={`text-xs tabular-nums ${tooLong ? 'text-rose-700 font-medium' : 'text-black/50'}`}>
                                    {length}/{X_MAX_CHARS}
                                </span>
                            </div>
                            <p className="text-[15px] leading-[1.4] whitespace-pre-wrap break-words">{post}</p>
                            <div className="mt-3 flex items-center justify-between gap-3">
                                {tooLong
                                    ? <span className="text-xs text-rose-700">Too long for X. Shorten it in the editor.</span>
                                    : <span />}
                                <CopyButton label="Copy" ariaLabel={`Copy post ${i + 1}`} onCopy={() => copyText(post)} />
                            </div>
                        </li>
                    );
                })}
            </ol>

            <CopyButton
                label="Copy all posts"
                className="w-full"
                onCopy={() => copyText(posts.join('\n\n'))}
            />
        </div>
    );
}
