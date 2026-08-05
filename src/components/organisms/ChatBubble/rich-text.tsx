// Rich text rendering for AI chat messages: markdown links, images, PDFs, bold, italic, code.
import { createElement, Fragment, type ReactNode } from 'react';
import { Download } from 'lucide-react';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;
const PDF_EXT = /\.pdf(\?.*)?$/i;

const isImageUrl = (url: string) => {
  try {
    return IMAGE_EXT.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

const isPdfUrl = (url: string) => {
  try {
    return PDF_EXT.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

const filenameFromUrl = (url: string) => {
  try {
    const path = new URL(url).pathname;
    return path.split('/').pop() || 'documento.pdf';
  } catch {
    return 'documento.pdf';
  }
};

const renderInlineMarkdown = (text: string, keyOffset: number): ReactNode[] => {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = keyOffset;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        createElement('strong', { key: key++, className: 'font-bold text-text-primary' }, token.slice(2, -2)),
      );
    } else if (token.startsWith('`')) {
      parts.push(
        createElement(
          'code',
          { key: key++, className: 'rounded bg-base/80 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan' },
          token.slice(1, -1),
        ),
      );
    } else {
      parts.push(
        createElement('em', { key: key++, className: 'italic text-text-primary' }, token.slice(1, -1)),
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};

export const renderRichText = (text: string): ReactNode[] => {
  const parts: ReactNode[] = [];
  const regex = /!?\[([^\]]+)\]\(([^)\s]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      parts.push(...renderInlineMarkdown(segment, key));
      key += 10;
    }
    const isImage = match[0].startsWith('!');
    const label = match[1];
    const url = match[2];

    if (isImage || isImageUrl(url)) {
      parts.push(
        createElement(
          'a',
          {
            key: key++,
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'mt-2 block rounded-lg border border-border transition-opacity hover:opacity-90',
          },
          createElement('img', {
            src: url,
            alt: label,
            loading: 'lazy',
            className: 'block max-w-full cursor-zoom-in rounded-lg',
          }),
        ),
      );
    } else if (isPdfUrl(url)) {
      const filename = filenameFromUrl(url);
      parts.push(
        createElement(
          'div',
          {
            key: key++,
            className: 'mt-2 overflow-hidden rounded-lg border border-border bg-surface-elevated transition-colors hover:border-primary',
          },
          createElement(
            'a',
            {
              href: url,
              download: filename,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'flex items-center gap-3 p-3',
            },
            createElement(
              'div',
              { className: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-base' },
              createElement(
                'svg',
                {
                  xmlns: 'http://www.w3.org/2000/svg',
                  fill: 'none',
                  viewBox: '0 0 24 24',
                  strokeWidth: 1.5,
                  stroke: 'currentColor',
                  className: 'h-5 w-5 text-text-secondary',
                },
                createElement('path', {
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  d: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
                }),
              ),
            ),
            createElement(
              'div',
              { className: 'min-w-0 flex-1' },
              createElement('p', { className: 'truncate font-mono text-sm font-medium text-text-primary' }, label),
              createElement('p', { className: 'truncate font-mono text-xs text-text-secondary' }, `PDF · ${filename}`),
            ),
            createElement(Download, { className: 'h-4 w-4 shrink-0 text-text-secondary' }),
          ),
          createElement('iframe', {
            src: url,
            title: label,
            className: 'block h-48 w-full border-0 border-t border-border bg-white',
          }),
        ),
      );
    } else {
      parts.push(
        createElement(
          'a',
          {
            key: key++,
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'text-cyan underline decoration-cyan/40 underline-offset-2 hover:decoration-cyan',
          },
          label,
        ),
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(...renderInlineMarkdown(text.slice(lastIndex), key));
  }
  return parts;
};

export { Fragment };
