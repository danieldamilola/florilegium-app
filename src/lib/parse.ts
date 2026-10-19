import type { ReaderModel, ReaderSection } from '../types/book';

/* Ported verbatim from the Florilegium web app (C:\dev\library\index.html,
   main @ 1393d8d — functions cleanBlocks / isHeading / headingIndices /
   cleanTitle / chaptersOf / isProse / proseParas / readerModel).
   Keep behaviour identical: the web app's tests/parser-fidelity.test.js is the
   reference for what these rules must produce (Moby Dick 135 chapters,
   Dracula 27 with V/IX/X present, Sherlock 12 titled stories, etc.). */

const HEAD_RE = /^(chapter|part|book|act|letter)\b/i;
const NUMBERED_HEAD_RE = /^(?:[IVXLCDM]+|\d+)[.)]\s+(\S.*)$/;

/* Return a numbered story title when the block is "#. TITLE", else ''. */
export function numberedTitle(b: string): string {
  const m = NUMBERED_HEAD_RE.exec(b);
  if (!m) return '';
  const title = m[1].trim();
  if (title.length < 3 || title.length > 80) return ''; /* length cap: rejects TOC runs and paragraphs */
  if (title.indexOf(';') >= 0) return ''; /* a list such as "I. THE FOLIO WHALE; II. ..." */
  const letters = title.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3) return '';
  const caps = title.replace(/[^A-Z]/g, '');
  return caps.length / letters.length >= 0.6 ? title : ''; /* headings are short and mostly uppercase */
}

/* A section heading is a chapter/part/book/act/letter marker, a numbered
   story heading ("I. A SCANDAL IN BOHEMIA"), or a bare letter heading
   ("Letter 1", "Letter I"). Epistolary captions such as
   "Letter from Miss Mina Murray to Miss Lucy Westenra." are prose subheads,
   not section starts, so they are excluded. */
export function isHeading(b: string): boolean {
  if (!b || b.length >= 140) return false;
  if (HEAD_RE.test(b)) {
    /* "Letter 1"/"Letter I" stay headings; a "Letter" line naming from/to is a caption. */
    if (/^letter\b/i.test(b) && /\b(from|to)\b/i.test(b.slice(0, 120))) return false;
    return true;
  }
  return !!numberedTitle(b);
}

/* Collapse runs of consecutive heading blocks. A long run (>=4) is a table of
   contents or index and starts nothing; a short run is a heading next to its
   subheads, so keep only its first block. This neutralises Moby Dick's
   135-line contents while preserving Dracula's "CHAPTER V" even when a
   caption sits beside it. */
export function headingIndices(blocks: string[]): number[] {
  const marks: number[] = [];
  blocks.forEach((b, i) => {
    if (isHeading(b)) marks.push(i);
  });
  const idx: number[] = [];
  for (let i = 0; i < marks.length; ) {
    let j = i;
    while (j + 1 < marks.length && marks[j + 1] === marks[j] + 1) j++;
    if (j - i + 1 < 4) idx.push(marks[i]);
    i = j + 1;
  }
  return idx;
}

/* Section titles never keep markdown emphasis or trailing punctuation. */
export function cleanTitle(b: string): string {
  return String(b || '')
    .replace(/^[\[\s]+|[\]\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[_*]/g, '')
    .replace(/[\s.,;:]+$/, '')
    .trim();
}

export function cleanBlocks(raw: string): string[] {
  let t = String(raw || '').replace(/\r/g, '');
  const s = t.search(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG/i);
  if (s >= 0) t = t.slice(s).replace(/^\*\*\*[^\n]*\n?/, '');
  const e = t.search(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i);
  if (e >= 0) t = t.slice(0, e);
  const mc = t.indexOf('Markdown Content:');
  if (mc >= 0 && mc < 4000) t = t.slice(mc + 17);
  t = t.replace(/^(Title|URL Source|Published Time):.*$/gm, '');
  const out: string[] = [];
  for (let b of t.split(/\n{2,}/)) {
    b = b
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .replace(/^[#>*]+\s*/, '')
      .replace(/^&gt;\s*/, '')
      .replace(/^[_*]+|[_*]+$/g, '')
      .trim();
    b = b
      .replace(/_([^_\n]{1,120})_/g, '$1')
      .replace(/\*([^*\n]{1,120})\*/g, '$1')
      .replace(/\[\d+\]/g, '')
      .trim();
    const head = isHeading(b);
    if (!b || (b.length < 42 && !head)) continue;
    if (/^(project gutenberg|gutenberg|www\.gutenberg|\[illustration|illustration:|transcriber)/i.test(b)) continue;
    if (b.includes('gutenberg.org') && b.length < 160) continue;
    if (/^\[.*\]\(.*\)$/.test(b)) continue;
    out.push(b);
  }
  return out;
}

export function chaptersOf(blocks: string[]): { title: string; start: number }[] {
  const idx = headingIndices(blocks);
  if (idx.length >= 3) return idx.map((start) => ({ title: cleanTitle(blocks[start]), start }));
  const ch: { title: string; start: number }[] = [];
  for (let i = 0; i < blocks.length; i += 14) ch.push({ title: '', start: i });
  return ch;
}

export function isProse(p: string): boolean {
  if (!p || p.length < 90 || isHeading(p)) return false;
  const letters = p.replace(/[^A-Za-z]/g, '');
  const caps = p.replace(/[^A-Z]/g, '');
  if (letters.length > 20 && caps.length / letters.length > 0.8) return false;
  if ((p.match(/\bCHAPTER\b/gi) || []).length > 1) return false;
  if (/^(project gutenberg|contents|illustration|transcriber|chiswick press)/i.test(p)) return false;
  if (/^[_*]|[_*]$/.test(p)) return false;
  return true;
}

export function proseParas(blocks: string[], n = 5): string[] {
  if (!blocks || !blocks.length) return [];
  let from = 0;
  const chs = chaptersOf(blocks);
  if (chs && chs.length && chs[0].start > 0) from = chs[0].start + (chs[0].title ? 1 : 0);
  const out: string[] = [];
  for (let i = from; i < blocks.length && out.length < n; i++) if (isProse(blocks[i])) out.push(blocks[i].trim());
  if (!out.length) {
    for (let i = from; i < blocks.length && out.length < n; i++) {
      const p = blocks[i];
      if (p && p.length > 80 && !isHeading(p)) out.push(p.trim());
    }
  }
  return out;
}

/* Chapter mode when at least 3 section headings survive; otherwise 22-paragraph
   pages. Only the current section is ever rendered (see the reader worker). */
export function readerModel(blocks: string[]): ReaderModel {
  const idx = headingIndices(blocks);
  if (idx.length >= 3) {
    const sections: ReaderSection[] = idx
      .map((start, k) => {
        const end = k + 1 < idx.length ? idx[k + 1] : blocks.length;
        return { title: cleanTitle(blocks[start]), paras: blocks.slice(start + 1, end) };
      })
      .filter((s) => s.paras.length);
    if (sections.length >= 3) return { mode: 'chapter', sections };
  }
  let pool = blocks.filter((p) => isProse(p));
  if (pool.length < 6) pool = blocks.filter((p) => !isHeading(p));
  if (!pool.length) pool = blocks.slice();
  const size = 22;
  const pages: ReaderSection[] = [];
  for (let i = 0; i < pool.length; i += size) pages.push({ title: '', paras: pool.slice(i, i + size) });
  return { mode: 'page', sections: pages };
}
