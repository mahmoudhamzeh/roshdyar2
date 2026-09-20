import React, { useCallback, useEffect, useRef, useState } from 'react';

const TOOLS = [
    { label: 'عنوان', command: 'formatBlock', value: 'H2' },
    { label: 'زیرعنوان', command: 'formatBlock', value: 'H3' },
    { label: 'H4', command: 'formatBlock', value: 'H4' },
    { label: 'ضخیم', command: 'bold' },
    { label: 'ایتالیک', command: 'italic' },
    { label: 'نقل‌قول', command: 'formatBlock', value: 'BLOCKQUOTE' },
    { label: 'فهرست', command: 'insertUnorderedList' },
    { label: 'شماره', command: 'insertOrderedList' }
];

const escapeAttr = (value) => String(value || '').replace(/"/g, '&quot;');

const RichTextEditor = ({ value, onChange, onUpload }) => {
    const surfaceRef = useRef(null);
    const fileRef = useRef(null);
    const savedRange = useRef(null);
    const lastHtml = useRef('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        const el = surfaceRef.current;
        if (!el) return;
        const next = value || '';
        if (next === lastHtml.current || next === el.innerHTML) {
            lastHtml.current = next;
            return;
        }
        el.innerHTML = next;
        lastHtml.current = next;
    }, [value]);

    const emit = useCallback(() => {
        if (!surfaceRef.current || !onChange) return;
        const html = surfaceRef.current.innerHTML;
        lastHtml.current = html;
        onChange(html);
    }, [onChange]);

    const saveRange = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (surfaceRef.current && surfaceRef.current.contains(range.commonAncestorContainer)) {
            savedRange.current = range.cloneRange();
        }
    };

    const restoreRange = () => {
        const el = surfaceRef.current;
        if (!el) return;
        el.focus();
        const selection = window.getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        if (savedRange.current) {
            selection.addRange(savedRange.current);
            return;
        }
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.addRange(range);
    };

    const run = (command, commandValue) => {
        restoreRange();
        document.execCommand(command, false, commandValue);
        emit();
        saveRange();
    };

    const insertHtml = (html) => {
        restoreRange();
        document.execCommand('insertHTML', false, html);
        emit();
        saveRange();
    };

    const addLink = () => {
        restoreRange();
        const href = window.prompt('نشانی لینک');
        if (!href) return;
        run('createLink', href);
    };

    const pickImage = () => {
        saveRange();
        if (fileRef.current) {
            fileRef.current.value = '';
            fileRef.current.click();
        }
    };

    const onFileChange = async (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        if (!onUpload) {
            setStatus('آپلود تصویر در دسترس نیست');
            return;
        }
        setStatus('در حال بارگذاری تصویر…');
        try {
            const url = await onUpload(file);
            if (!url) {
                setStatus('بارگذاری تصویر ناموفق بود');
                return;
            }
            insertHtml(`<img src="${escapeAttr(url)}" alt="" />`);
            setStatus('تصویر داخل متن قرار گرفت');
        } catch (_) {
            setStatus('بارگذاری تصویر ناموفق بود');
        }
    };

    return (
        <div className="magazine-editor">
            <div className="magazine-editor-toolbar" onMouseDown={(event) => event.preventDefault()}>
                {TOOLS.map((tool) => (
                    <button
                        key={tool.label}
                        type="button"
                        onMouseDown={saveRange}
                        onClick={() => run(tool.command, tool.value)}
                    >
                        {tool.label}
                    </button>
                ))}
                <button type="button" onMouseDown={saveRange} onClick={addLink}>لینک</button>
                <button type="button" onMouseDown={saveRange} onClick={pickImage}>انتخاب عکس</button>
                <button
                    type="button"
                    onMouseDown={saveRange}
                    onClick={() => insertHtml('<table><thead><tr><th>ستون ۱</th><th>ستون ۲</th></tr></thead><tbody><tr><td></td><td></td></tr></tbody></table>')}
                >
                    جدول
                </button>
            </div>
            <input
                ref={fileRef}
                className="magazine-editor-file"
                type="file"
                accept="image/*,.webp,.avif"
                onChange={onFileChange}
            />
            <div
                ref={surfaceRef}
                className="magazine-editor-surface"
                contentEditable
                suppressContentEditableWarning
                dir="rtl"
                data-placeholder="متن مقاله را همین‌جا بنویسید. از نوار بالا عنوان، فهرست و عکس بگذارید."
                onInput={emit}
                onKeyUp={saveRange}
                onMouseUp={saveRange}
                onBlur={saveRange}
            />
            {status && <p className="magazine-editor-status">{status}</p>}
        </div>
    );
};

export default RichTextEditor;
