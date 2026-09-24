import { Columns3Icon, SlidersHorizontalIcon, ZapIcon, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { SettingsNav } from '@/components/layout/settings-nav';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const SECTIONS: { title: string; hint: string; to: string; icon: LucideIcon; soon?: true }[] = [
  {
    title: 'Pipeline stages',
    hint: 'Name, colour and order of the stages leads move through.',
    to: '/settings/pipeline',
    icon: Columns3Icon,
  },
  {
    title: 'Custom fields',
    hint: 'Extra fields on leads, contacts and appointments.',
    to: '/settings/fields',
    icon: SlidersHorizontalIcon,
  },
  {
    title: 'Automations',
    hint: 'Rules that assign, create tasks or notify when things happen.',
    to: '/settings/automations',
    icon: ZapIcon,
  },
];

/** `/settings`: the entry point to every settings section. */
export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings">
        <SettingsNav />
      </PageHeader>
      <PageBody className="p-4">
        <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
          {SECTIONS.map((section) => {
            const body = (
              <>
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <section.icon className="size-4" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-base font-semibold">
                    {section.title}
                    {section.soon && <Badge variant="neutral">Coming soon</Badge>}
                  </span>
                  <span className="text-sm text-muted-foreground">{section.hint}</span>
                </span>
              </>
            );
            return section.soon ? (
              <Card
                key={section.to}
                size="sm"
                className="flex-row items-start gap-3 px-3 opacity-70"
              >
                {body}
              </Card>
            ) : (
              <Link
                key={section.to}
                to={section.to}
                className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card
                  size="sm"
                  className="flex-row items-start gap-3 px-3 transition hover:bg-muted hover:shadow-card"
                >
                  {body}
                </Card>
              </Link>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
