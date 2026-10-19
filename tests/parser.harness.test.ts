import { cleanBlocks, readerModel } from '@/lib/parse';

/* Smoke test for the harness itself: the frozen parser must still produce a
   reader model from a Gutenberg-shaped string. Worker D replaces/extends this
   with the real suite. */
describe('parser harness', () => {
  const raw = [
    '*** START OF THE PROJECT GUTENBERG EBOOK TEST ***',
    '',
    'CHAPTER I.',
    '',
    'It was a bright cold day in April, and the clocks were striking thirteen, which is a sentence long enough to count as prose for the parser under test.',
    '',
    'CHAPTER II.',
    '',
    'The second chapter opens with another sufficiently long paragraph so that the parser keeps it and the reader model has something to render on screen.',
    '',
    'CHAPTER III.',
    '',
    'A third chapter paragraph, long enough again, closing out this tiny synthetic book used only to prove the test harness boots and the frozen parser works.',
    '',
    '*** END OF THE PROJECT GUTENBERG EBOOK TEST ***',
  ].join('\n');

  it('builds a chapter-mode reader model', () => {
    const model = readerModel(cleanBlocks(raw));
    expect(model.mode).toBe('chapter');
    expect(model.sections.length).toBeGreaterThanOrEqual(3);
  });
});
