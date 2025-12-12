'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from '@/utils/supabase';
import { Loader2, Image as ImageIcon, Eye, Edit2 } from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = "Write here...", minHeight = "300px" }: RichTextEditorProps) {
    const [view, setView] = useState<'edit' | 'preview'>('edit');
    const [uploading, setUploading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;

        setUploading(true);
        try {
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const { data, error } = await supabase.storage
                .from('uploads')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(fileName);

            const imageMarkdown = `![Image](${publicUrl})`;
            insertText(imageMarkdown);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Image upload failed. Please checking your storage configuration.');
        } finally {
            setUploading(false);
        }
    };

    const insertText = (text: string) => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newValue = value.substring(0, start) + text + value.substring(end);

        onChange(newValue);

        // Restore cursor position after the inserted text
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length;
                textareaRef.current.focus();
            }
        }, 0);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) handleImageUpload(file);
                return;
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm h-full">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setView('edit')}
                        className={`text-sm flex items-center gap-1 px-2 py-1 rounded ${view === 'edit' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Edit2 size={14} /> Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => setView('preview')}
                        className={`text-sm flex items-center gap-1 px-2 py-1 rounded ${view === 'preview' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Eye size={14} /> Preview
                    </button>
                </div>
                <div className="text-xs text-gray-400">
                    {uploading ? <span className="flex items-center gap-1 text-blue-500"><Loader2 size={12} className="animate-spin" /> Uploading...</span> : 'Support Markdown & LaTeX'}
                </div>
            </div>

            {/* Editor Area */}
            <div className="relative flex-1" style={{ minHeight }}>
                {view === 'edit' ? (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        onPaste={handlePaste}
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                        placeholder={placeholder}
                        className="w-full h-full p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                    />
                ) : (
                    <div className="w-full h-full p-4 overflow-auto prose prose-blue max-w-none prose-img:rounded-lg">
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                        >
                            {value || '*Nothing to preview*'}
                        </ReactMarkdown>
                    </div>
                )}

                {/* Drag Overlay Hint */}
                {view === 'edit' && !uploading && (
                    <div className="absolute bottom-2 right-2 pointer-events-none opacity-50">
                        <ImageIcon size={16} className="text-gray-400" />
                    </div>
                )}
            </div>
        </div>
    );
}
