import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import Loading from './Loading';
import moment from 'moment';
import PanelCard from './PanelCard';
import Seal from './Seal';
import useTranslation from 'next-translate/useTranslation';

// The changelog headings are English in the source file; the ones it actually
// uses are translated, anything else falls back to the raw heading.
const SECTION_LABELS = {
  Added: 'Added',
  Changed: 'Changed',
  Fixed: 'Fixed',
  Removed: 'Removed',
  Security: 'Security',
  Deprecated: 'Deprecated'
};

// The changelog only ever uses bold, italic, inline code and the odd link, so
// this covers those four rather than pulling in a markdown renderer.
const INLINE = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function inlineMarkdown(text) {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-medium">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-secondary rounded px-1 py-0.5 text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
        >
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

function Entry({ text }) {
  // A bullet that spans lines may carry nested list items under it.
  const [lead, ...rest] = text.split('\n');
  const nested = rest.filter((line) => line.startsWith('- '));
  const continuation = rest.filter((line) => !line.startsWith('- '));

  return (
    <li className="text-sm">
      {inlineMarkdown([lead, ...continuation].join(' '))}
      {nested.length ? (
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          {nested.map((line, index) => (
            <li key={index}>{inlineMarkdown(line.replace(/^- /, ''))}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

// One release reads as a panel, like every other titled block of content in
// the app: version as the panel title, its date as the line under it.
function Release({ release, isCurrent }) {
  const { t } = useTranslation('common');
  const isUnreleased = release.version.toLowerCase() === 'unreleased';
  const date = release.date ? moment(release.date, 'YYYY-MM-DD') : null;

  return (
    <PanelCard
      title={isUnreleased ? t('Unreleased') : release.version}
      description={date?.isValid() ? date.format('LL') : null}
      actions={
        isCurrent ? (
          <Badge variant="secondary" className="shrink-0 font-normal">
            {t('Installed')}
          </Badge>
        ) : null
      }
    >
      <div className="space-y-4">
        {release.sections.map((section) => (
          <div key={section.title}>
            <div className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
              {SECTION_LABELS[section.title]
                ? t(SECTION_LABELS[section.title])
                : section.title}
            </div>
            <ul className="list-disc space-y-2 pl-5">
              {section.entries.map((entry, index) => (
                <Entry key={index} text={entry} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

// The parsed changelog is a generated module of some size, so it is fetched
// the first time the panel opens rather than shipped with the app shell.
function useChangelog(open) {
  const [releases, setReleases] = useState(null);

  useEffect(() => {
    if (!open || releases) {
      return;
    }
    let cancelled = false;
    import('../generated/changelog.json')
      .then(({ default: data }) => !cancelled && setReleases(data))
      .catch(() => !cancelled && setReleases([]));
    return () => {
      cancelled = true;
    };
  }, [open, releases]);

  return releases;
}

export default function WhatsNewDialog({ open, setOpen }) {
  const { t } = useTranslation('common');
  const releases = useChangelog(open);
  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION;

  // Laid out like a screen rather than a document: the heading sits on the
  // card surface, the notes scroll on the page ground the app uses behind its
  // cards, so the panels read the same way they do everywhere else.
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
        <DialogHeader className="bg-card flex-row items-center gap-4 space-y-0 border-b px-6 py-5 pr-12 text-left">
          {/* The same seal the panel was opened from, drawing itself again —
              its dashed ring keeps turning slowly while the panel is open. */}
          <Seal animated className="text-primary size-10 shrink-0" />
          <div className="min-w-0 space-y-1">
            <DialogTitle className="font-serif text-2xl font-semibold tracking-tight">
              {t("What's new")}
            </DialogTitle>
            {currentVersion ? (
              <p className="text-muted-foreground text-sm">
                {t('You are running version {{version}}', {
                  version: currentVersion
                })}
              </p>
            ) : null}
          </div>
        </DialogHeader>
        <div className="bg-body overflow-y-auto p-4">
          {releases === null ? (
            <div className="flex justify-center py-8">
              <Loading fullScreen={false} className="size-6" />
            </div>
          ) : releases.length ? (
            <div className="space-y-4">
              {releases.map((release, index) => (
                // Staggered so the history unrolls; capped, or the oldest
                // release would sit and wait for the best part of a second.
                <div
                  key={release.version}
                  className="panel-rise"
                  style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                >
                  <Release
                    release={release}
                    isCurrent={release.version === currentVersion}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {t('No release notes available')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
