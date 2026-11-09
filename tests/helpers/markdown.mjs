import assert from 'node:assert/strict';

function sameOrHigherLevel(heading) {
  const level = heading.match(/^#+/)[0].length;
  return (line) => {
    const next = line.match(/^(#+)\s/);
    return next !== null && next[1].length <= level;
  };
}

/** Returns the text between a heading line and the next heading of the same or a higher level; throws when the heading is missing. */
export function section(text, heading, { exact = false, includeHeading = false, endsAt, skipFences = false, message } = {}) {
  const lines = text.split('\n');
  const start = lines.findIndex(exact ? (line) => line === heading : (line) => line.trim() === heading);
  assert.notEqual(start, -1, message ?? `missing section: ${heading}`);
  const ends = endsAt ? (line) => endsAt.test(line) : sameOrHigherLevel(heading);
  let openFenceLength = 0;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const fence = skipFences ? lines[i].match(/^(`{3,})/) : null;
    if (fence) {
      // A shorter fence inside a longer one is content, so only a fence at least as long closes it.
      if (openFenceLength === 0) openFenceLength = fence[1].length;
      else if (fence[1].length >= openFenceLength) openFenceLength = 0;
    }
    if (openFenceLength === 0 && ends(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(includeHeading ? start : start + 1, end).join('\n');
}

/** Returns the body of every fenced bash block in the text. */
export function bashBlocks(text) {
  return [...text.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]);
}
