import React from 'react';

interface JapaneseTextRendererProps {
  text: string;
  underlinedText?: string;
  className?: string;
}

export const JapaneseTextRenderer: React.FC<JapaneseTextRendererProps> = ({
  text,
  underlinedText,
  className = '',
}) => {
  if (!text) return null;

  const cleanUnderline = underlinedText ? underlinedText.trim() : '';

  // Helper to split text by newline and insert <br/>
  const formatNewlines = (val: string, keyPrefix: string) => {
    if (!val.includes('\n')) return val;
    return val.split('\n').map((line, idx, arr) => (
      <React.Fragment key={`${keyPrefix}-nl-${idx}`}>
        {line}
        {idx < arr.length - 1 && <br className="my-1" />}
      </React.Fragment>
    ));
  };

  const renderFormatted = () => {
    let processed = text;
    // If an underlined word is defined and not already wrapped in <u>
    if (cleanUnderline && !processed.includes('<u>') && processed.includes(cleanUnderline)) {
      const escaped = cleanUnderline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match the word even if it has furigana attached: e.g. 会社(かいしゃ)
      const furiganaRegex = new RegExp(`(${escaped})(\\([\\u3040-\\u309f\\u30a0-\\u30ff]+\\)|\\[[\\u3040-\\u309f\\u30a0-\\u30ff]+\\])?`, 'g');
      processed = processed.replace(furiganaRegex, (match) => `<u>${match}</u>`);
    }

    // Split by <u>...</u> tags
    const uRegex = /<u>([\s\S]*?)<\/u>/g;
    const segments: { content: string; isUnderlined: boolean }[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = uRegex.exec(processed)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ content: processed.substring(lastIdx, match.index), isUnderlined: false });
      }
      segments.push({ content: match[1], isUnderlined: true });
      lastIdx = uRegex.lastIndex;
    }
    if (lastIdx < processed.length) {
      segments.push({ content: processed.substring(lastIdx), isUnderlined: false });
    }

    // Ruby / Furigana parser: only Kanji followed by Kana in () or []
    const rubyRegex = /([\u4e00-\u9faf々]+)[\(（\[]([\u3040-\u309f\u30a0-\u30ff]+)[\)\]）]/g;

    return segments.map((seg, sIdx) => {
      const parts: React.ReactNode[] = [];
      let rLastIdx = 0;
      let rMatch: RegExpExecArray | null;
      const str = seg.content;

      while ((rMatch = rubyRegex.exec(str)) !== null) {
        if (rMatch.index > rLastIdx) {
          const plainSub = str.substring(rLastIdx, rMatch.index);
          parts.push(formatNewlines(plainSub, `sub-${sIdx}-${rLastIdx}`));
        }
        const kanji = rMatch[1];
        const rt = rMatch[2];
        parts.push(
          <ruby key={`ruby-${sIdx}-${rMatch.index}`} className="mx-0.5 inline-block text-center align-baseline">
            {kanji}
            <rt className="text-[10px] text-indigo-700 font-medium select-none block leading-none mb-0.5">
              {rt}
            </rt>
          </ruby>
        );
        rLastIdx = rubyRegex.lastIndex;
      }
      if (rLastIdx < str.length) {
        const remaining = str.substring(rLastIdx);
        parts.push(formatNewlines(remaining, `sub-${sIdx}-${rLastIdx}`));
      }

      const node = parts.length > 0 ? parts : formatNewlines(str, `seg-${sIdx}`);

      if (seg.isUnderlined) {
        return (
          <span
            key={`u-${sIdx}`}
            className="underline decoration-[2.5px] decoration-indigo-600 underline-offset-8 font-bold bg-indigo-50/90 px-1.5 py-0.5 rounded shadow-xs mx-0.5 text-indigo-950 inline-block border-b border-indigo-200"
          >
            {node}
          </span>
        );
      }
      return <React.Fragment key={`seg-${sIdx}`}>{node}</React.Fragment>;
    });
  };

  return <span className={`font-japanese tracking-wide ${className}`}>{renderFormatted()}</span>;
};
