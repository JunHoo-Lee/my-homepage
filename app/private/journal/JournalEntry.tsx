'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface JournalEntryProps {
    content: string;
    createdAt: string;
}

export default function JournalEntry({ content, createdAt }: JournalEntryProps) {
    const date = new Date(createdAt);
    const timeString = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return (
        <div className="group relative pl-6 lg:pl-8 py-2 hover:bg-stone-900/40 rounded-lg transition-colors -ml-4 px-4 overflow-hidden">
            {/* Timestamp - adjusted for mobile */}
            <div className="absolute left-0 lg:left-0 top-3 text-[9px] lg:text-[10px] font-bold font-sans text-stone-700 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity select-none lg:rotate-0 -rotate-90 origin-left mt-2 lg:mt-0">
                {timeString.split(' ')[0]}
            </div>

            {/* Timeline connectors */}
            {/* The main vertical line is handled by the parent container, but we can add specific entry markers if needed. 
                For now, we just rely on indentation. 
            */}

            <div className="prose prose-invert prose-stone max-w-none text-stone-300 text-sm leading-relaxed prose-p:my-1 prose-headings:my-2 prose-pre:my-2">
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        // Custom renderers if needed
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                                <div className="bg-stone-950 rounded border border-stone-800 p-2 my-2 text-xs font-mono overflow-x-auto">
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                </div>
                            ) : (
                                <code className="bg-stone-800/50 rounded px-1 py-0.5 text-stone-200 text-xs font-mono" {...props}>
                                    {children}
                                </code>
                            )
                        },
                        img: ({ node, ...props }) => (
                            <img {...props} className="rounded-lg border border-stone-800 max-h-96 object-cover my-2" />
                        ),
                        p: ({ children }) => {
                            return (
                                <p className="mb-2 last:mb-0">
                                    {React.Children.map(children, child => {
                                        if (typeof child === 'string') {
                                            // Split by space but keep delimiters to preserve spacing
                                            const parts = child.split(/(\s+)/);
                                            return parts.map((part, index) => {
                                                if (part.match(/^#[a-zA-Z0-9_]+$/)) {
                                                    return (
                                                        <span key={index} className="inline-block bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-xs font-medium mr-1 select-none hover:bg-amber-500/20 cursor-pointer transition-colors">
                                                            {part}
                                                        </span>
                                                    );
                                                }
                                                return part;
                                            });
                                        }
                                        return child;
                                    })}
                                </p>
                            )
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}
