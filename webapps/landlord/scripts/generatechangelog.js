// Turns the repository CHANGELOG.md into the data the "What's new" panel
// reads. Run from next.config.js so it happens on both `dev` and `build`.
//
// The changelog is Keep a Changelog: `## [version] - date` per release, then
// `### Added|Changed|Fixed|Removed` sections of bullets. Bullets may span
// several lines and carry nested list items, so a bullet ends at the next one
// that starts at column zero.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '../../../CHANGELOG.md');
const TARGET = path.resolve(__dirname, '../src/generated/changelog.json');

const digest = (contents) =>
  crypto.createHash('sha256').update(contents).digest('hex').slice(0, 12);

const readIdOf = (file) => {
  try {
    return digest(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return '';
  }
};

const parse = (markdown) => {
  const releases = [];
  let release;
  let section;
  let bullet;

  const closeBullet = () => {
    if (bullet && section) {
      section.entries.push(bullet.join('\n').trim());
    }
    bullet = null;
  };

  for (const line of markdown.split('\n')) {
    const releaseMatch = line.match(/^## \[([^\]]+)\](?: - (.+))?\s*$/);
    if (releaseMatch) {
      closeBullet();
      section = null;
      release = {
        version: releaseMatch[1],
        date: releaseMatch[2] || null,
        sections: []
      };
      releases.push(release);
      continue;
    }

    const sectionMatch = line.match(/^### (.+?)\s*$/);
    if (sectionMatch && release) {
      closeBullet();
      section = { title: sectionMatch[1], entries: [] };
      release.sections.push(section);
      continue;
    }

    if (!section) {
      continue;
    }

    if (/^- /.test(line)) {
      closeBullet();
      bullet = [line.replace(/^- /, '')];
    } else if (bullet && line.trim()) {
      bullet.push(line.trim());
    } else if (!line.trim()) {
      closeBullet();
    }
  }
  closeBullet();

  return releases.filter(({ sections }) =>
    sections.some(({ entries }) => entries.length)
  );
};

let releases = null;
try {
  releases = parse(fs.readFileSync(SOURCE, 'utf8'));
} catch (error) {
  console.warn(
    `generatechangelog: could not read ${SOURCE} (${error.code || error.message})`
  );
}

if (releases === null) {
  // Never clobber notes that are already there: a build context without the
  // changelog would otherwise replace them with nothing. Only write the empty
  // state when there is nothing to keep.
  if (fs.existsSync(TARGET)) {
    console.warn('generatechangelog: keeping the release notes already built');
    module.exports = { id: readIdOf(TARGET) };
    return;
  }
  releases = [];
}

const serialized = JSON.stringify(releases, null, 2) + '\n';

fs.mkdirSync(path.dirname(TARGET), { recursive: true });
fs.writeFileSync(TARGET, serialized);
console.log(
  `generatechangelog: wrote ${releases.length} release(s) to ${path.relative(process.cwd(), TARGET)}`
);

// A digest of the notes, not the version number: the top entry is normally
// "Unreleased", so a version string would stop marking anything as new once
// it had been read the first time.
module.exports = { id: releases.length ? digest(serialized) : '' };
