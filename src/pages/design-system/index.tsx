import { useEffect, useState, type ReactNode } from 'react';
import {
  CheckIcon,
  ClockIcon,
  Columns3Icon,
  ListIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  UploadIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ViewTab, ViewTabs } from '@/components/common/list-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DrawerBody,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from '@/components/layout/drawer-panel';
import { useDrawerParam } from '@/hooks/use-drawer-param';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db, isDemoData, queryKeys, resetDemoData, type CollectionName } from '@/data';
import { formatMoney } from '@/lib/format';

/**
 * Dev-only style guide: renders every token and primitive so the design system
 * can be checked against the reference mock (docs/DESIGN_SYSTEM.md). Registered
 * in the router only when `import.meta.env.DEV` is true.
 */
export function DesignSystemPage() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const drawer = useDrawerParam('demo');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex max-w-5xl flex-col gap-10 p-6">
      <div>
        <h1 className="text-2xl font-bold">Design system</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tokens and primitives as specified in <code>docs/DESIGN_SYSTEM.md</code>. Dev only.
        </p>
      </div>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {swatches.map((swatch) => (
            <div key={swatch.name} className="flex items-center gap-2">
              <span className={`size-8 shrink-0 rounded-lg border ${swatch.className}`} />
              <span className="text-xs text-muted-foreground">{swatch.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          {typeScale.map((step) => (
            <div key={step.className} className="flex items-baseline gap-4">
              <span className="w-20 shrink-0 font-mono text-xs text-foreground-faint">
                {step.className}
              </span>
              <span className={step.className}>{step.sample}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            <PlusIcon /> Add lead
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">
            <UploadIcon /> Import
          </Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline" className="text-destructive">
            Reject
          </Button>
          <Button variant="link">Link</Button>
          <Button size="icon" variant="outline" aria-label="Search">
            <SearchIcon />
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small 28</Button>
          <Button>Default 32</Button>
          <Button size="lg">Large 36</Button>
          <Button size="icon-sm" variant="ghost" aria-label="Call">
            <PhoneIcon />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Email">
            <MailIcon />
          </Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Customer name">
            <Input placeholder="Enter name" />
          </Field>
          <Field label="Stage">
            <Select items={stageItems} defaultValue="new">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stageItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Invalid">
            <Input aria-invalid defaultValue="+91 12" />
          </Field>
          <Field label="Disabled">
            <Input disabled placeholder="Not editable" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea placeholder="Add internal notes (not visible to customer)…" />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Selection controls">
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox defaultChecked /> Create follow-up task
          </label>
          <RadioGroup defaultValue="skip" className="flex w-auto gap-4">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="create" /> Create new lead
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="skip" /> Skip duplicates
            </label>
          </RadioGroup>
          <label className="flex items-center gap-2 text-sm">
            <Switch defaultChecked /> Mark as Won
          </label>
        </div>
        <div className="flex max-w-sm items-center justify-between rounded-lg bg-muted px-3 py-2.5">
          <div>
            <div className="text-base font-medium">Create follow-up task</div>
            <div className="text-xs text-foreground-faint">
              Auto-create a call task for each lead
            </div>
          </div>
          <Switch defaultChecked aria-label="Create follow-up task" />
        </div>
      </Section>

      <Section title="Pills and badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">
            <Dot /> Won
          </Badge>
          <Badge variant="warning">
            <Dot /> Pending
          </Badge>
          <Badge variant="info">
            <Dot /> Scheduled
          </Badge>
          <Badge variant="destructive">
            <Dot /> Overdue
          </Badge>
          <Badge variant="highlight">
            <Dot /> Site visit
          </Badge>
          <Badge variant="neutral">
            <Dot /> New
          </Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge>Default</Badge>
          <Badge
            variant="destructive"
            className="h-4 min-w-4 rounded-full bg-destructive px-1 text-2xs text-white"
          >
            4
          </Badge>
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback className="text-xs font-semibold">AM</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback className="text-xs font-semibold">KK</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback className="text-sm font-semibold">SN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback className="bg-warning-soft text-xs font-bold text-warning">
              PS
            </AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback className="bg-success-soft text-xs font-bold text-success">
              AP
            </AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback className="bg-info-soft text-xs font-bold text-info">VS</AvatarFallback>
          </Avatar>
          <span className="flex size-6 items-center justify-center rounded-md bg-brand text-xs font-bold text-brand-foreground">
            P
          </span>
        </div>
      </Section>

      <Section title="Tabs and segmented controls">
        <ViewTabs defaultValue="all">
          {[
            { value: 'all', label: 'All', count: 124 },
            { value: 'unread', label: 'Unread', count: 3 },
            { value: 'mine', label: 'Mine', count: 0 },
            { value: 'hot', label: 'Hot leads', count: 12 },
          ].map((view) => (
            <ViewTab key={view.value} {...view} />
          ))}
        </ViewTabs>
        <p className="text-muted-foreground">
          Pill tabs switch views. Labels and counts share a baseline; active tabs take the accent
          fill.
        </p>
        <Tabs defaultValue="overview">
          <TabsList variant="line">
            {['Overview', 'Activity', 'Tasks', 'Quotes'].map((label) => (
              <TabsTrigger key={label} value={label.toLowerCase()} className="px-3">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview" className="text-muted-foreground">
            Underline tabs are used inside drawers.
          </TabsContent>
        </Tabs>
        <ToggleGroup variant="outline" spacing={0} defaultValue={['table']}>
          <ToggleGroupItem value="table" size="sm" aria-label="Table view">
            <ListIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" size="sm" aria-label="Kanban view">
            <Columns3Icon />
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section title="Cards">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} size="sm">
              <CardContent>
                <div className="text-xs font-medium text-muted-foreground">{stat.label}</div>
                <div className="mt-1 text-3xl font-bold tabular-nums">{stat.value}</div>
                <div className="mt-0.5 text-xs text-foreground-faint">{stat.sub}</div>
              </CardContent>
            </Card>
          ))}
          <Card size="sm" className="cursor-pointer transition hover:bg-muted hover:shadow-card">
            <CardContent>
              <div className="flex items-start justify-between gap-2">
                <span className="text-base font-semibold">Aarav Mehta</span>
                <Avatar size="sm">
                  <AvatarFallback className="text-2xs font-semibold">AP</AvatarFallback>
                </Avatar>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Frameless shower · 8×6 ft</p>
              <div className="mt-2 flex items-center justify-between border-t border-border-faint pt-2 text-sm">
                <span className="flex items-center gap-1.5 text-foreground-secondary">
                  <span className="size-1.5 rounded-full bg-whatsapp" /> WhatsApp
                </span>
                <span className="font-bold tabular-nums">₹78,000</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Table">
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="h-8 w-9 px-3">
                  <Checkbox aria-label="Select all" />
                </TableHead>
                {['Lead name', 'Phone', 'Stage', 'Assigned to', 'Priority'].map((head) => (
                  <TableHead
                    key={head}
                    className="h-8 px-3 text-xs font-semibold text-muted-foreground"
                  >
                    {head}
                  </TableHead>
                ))}
                <TableHead className="h-8 px-3 text-right text-xs font-semibold text-muted-foreground">
                  Quote ₹
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.name}
                  className="cursor-pointer border-border-faint hover:bg-muted"
                >
                  <TableCell className="px-3 py-1.5">
                    <Checkbox aria-label={`Select ${row.name}`} />
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <span className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback className="text-2xs font-semibold">
                          {row.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">{row.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-sm text-foreground-secondary">
                    {row.phone}
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <Badge variant={row.stageVariant}>
                      <Dot /> {row.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-sm">{row.assigned}</TableCell>
                  <TableCell className="px-3 py-1.5 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className={`size-1.5 rounded-full ${row.priorityDot}`} />
                      {row.priority}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-right text-sm font-semibold tabular-nums">
                    {row.quote}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-0 hover:bg-muted">
                <TableCell colSpan={7} className="px-3 py-1.5 text-sm text-foreground-faint">
                  <span className="flex cursor-pointer items-center gap-1.5">
                    <PlusIcon className="size-3.5" /> New lead
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Overlays">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => drawer.open('lead-1')}>
            Open drawer
          </Button>
          <DrawerPanel
            open={drawer.isOpen}
            onOpenChange={(open) => {
              if (!open) drawer.close();
            }}
          >
            <DrawerHeader>
              <div className="flex items-center gap-2.5">
                <Avatar size="lg">
                  <AvatarFallback className="text-sm font-semibold">AM</AvatarFallback>
                </Avatar>
                <div>
                  <DrawerTitle>Aarav Mehta</DrawerTitle>
                  <DrawerDescription>+91 98230 11234 · {drawer.id}</DrawerDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="highlight">
                  <Dot /> Site Visit Scheduled
                </Badge>
                <span className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                  <span className="size-1.5 rounded-full bg-destructive" /> High priority
                </span>
              </div>
            </DrawerHeader>
            <DrawerBody className="grid grid-cols-2 gap-x-4 gap-y-3">
              {drawerFields.map((field) => (
                <div key={field.label}>
                  <div className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
                    {field.label}
                  </div>
                  <div className="mt-0.5 text-base">{field.value}</div>
                </div>
              ))}
            </DrawerBody>
            <DrawerFooter>
              <Button size="sm" variant="outline">
                <PlusIcon /> Task
              </Button>
              <Button size="sm" variant="outline" className="text-success">
                WhatsApp
              </Button>
              <Button size="sm" className="ml-auto">
                Move stage
              </Button>
            </DrawerFooter>
          </DrawerPanel>

          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
            <DialogContent className="shadow-overlay">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Confirm action</DialogTitle>
                <DialogDescription>
                  This will reassign 6 hot leads to Priya Sharma. Continue?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button className="bg-destructive text-white hover:bg-destructive/90">
                  Yes, proceed
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="secondary"
            className="text-muted-foreground"
            onClick={() => setPaletteOpen(true)}
          >
            <SparklesIcon /> Ask AI <Kbd>⌘K</Kbd>
          </Button>
          <CommandDialog
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            className="shadow-overlay sm:max-w-[556px]"
          >
            <CommandInput placeholder="Search leads, tasks, quotes, or ask AI…" />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup heading="Recent">
                <CommandItem>
                  <ClockIcon /> Show leads from Facebook this week
                </CommandItem>
                <CommandItem>
                  <ClockIcon /> List all overdue tasks
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Suggested">
                <CommandItem>
                  <SparklesIcon /> Find leads without follow-up
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
                <CommandItem className="text-destructive">
                  <SparklesIcon /> Assign all hot leads to Priya (requires confirmation)
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>

          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Help" />}>
              <CheckIcon />
            </TooltipTrigger>
            <TooltipContent>Mark done</TooltipContent>
          </Tooltip>
        </div>
      </Section>

      <Section title="Progress and loading">
        <div className="flex max-w-sm flex-col gap-4">
          <Progress value={65}>
            <ProgressLabel>67 / 103 completed</ProgressLabel>
            <ProgressValue />
          </Progress>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        </div>
      </Section>

      <Section title="Dropzone">
        <div className="flex max-w-sm cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-border-strong p-5 transition hover:border-input hover:bg-muted">
          <UploadIcon className="size-4 text-foreground-faint" />
          <span className="text-sm text-foreground-faint">Drag files or click to upload</span>
        </div>
      </Section>

      <DataSection />
    </div>
  );
}

/** Smoke test for the data layer: counts every collection through TanStack Query. */
function DataSection() {
  const queryClient = useQueryClient();
  const counts = useQuery({
    queryKey: ['dev', 'collection-counts'],
    queryFn: async () => {
      const names = Object.keys(db) as CollectionName[];
      return Promise.all(
        names.map(async (name) => [name, (await db[name].list()).length] as const),
      );
    },
  });
  const workspace = useQuery({
    queryKey: queryKeys.workspace.list(),
    queryFn: () => db.workspace.list(),
  });
  const current = workspace.data?.[0];

  return (
    <Section title="Data">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{isDemoData ? 'Local demo data' : 'Backend API'}</span>
        {current && (
          <span>
            · {current.name} ·{' '}
            {formatMoney(125000, { currency: current.currency, locale: current.locale })}
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={!isDemoData}
          onClick={() => {
            resetDemoData();
            void queryClient.invalidateQueries();
          }}
        >
          Reset demo data
        </Button>
      </div>
      {counts.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : counts.isError ? (
        <p className="text-sm text-destructive">Failed to load collections.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {counts.data.map(([name, count]) => (
            <Card key={name} size="sm">
              <CardContent>
                <div className="text-xs text-muted-foreground">{name}</div>
                <div className="text-xl font-bold tabular-nums">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">{title}</h2>
      {children}
      <Separator />
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Dot() {
  return <span className="size-1.5 rounded-full bg-current" />;
}

const swatches = [
  { name: 'background', className: 'bg-background' },
  { name: 'foreground', className: 'bg-foreground' },
  { name: 'foreground-secondary', className: 'bg-foreground-secondary' },
  { name: 'muted-foreground', className: 'bg-muted-foreground' },
  { name: 'foreground-faint', className: 'bg-foreground-faint' },
  { name: 'card', className: 'bg-card' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'surface-2', className: 'bg-surface-2' },
  { name: 'secondary', className: 'bg-secondary' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'sidebar', className: 'bg-sidebar' },
  { name: 'sidebar-accent', className: 'bg-sidebar-accent' },
  { name: 'primary', className: 'bg-primary' },
  { name: 'brand', className: 'bg-brand' },
  { name: 'border', className: 'bg-border' },
  { name: 'border-strong', className: 'bg-border-strong' },
  { name: 'border-faint', className: 'bg-border-faint' },
  { name: 'ring', className: 'bg-ring' },
  { name: 'success', className: 'bg-success' },
  { name: 'success-soft', className: 'bg-success-soft' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'warning-soft', className: 'bg-warning-soft' },
  { name: 'info', className: 'bg-info' },
  { name: 'info-soft', className: 'bg-info-soft' },
  { name: 'destructive', className: 'bg-destructive' },
  { name: 'danger-soft', className: 'bg-danger-soft' },
  { name: 'highlight', className: 'bg-highlight' },
  { name: 'highlight-soft', className: 'bg-highlight-soft' },
  { name: 'whatsapp', className: 'bg-whatsapp' },
  { name: 'whatsapp-soft', className: 'bg-whatsapp-soft' },
];

const typeScale = [
  { className: 'text-2xs font-bold tracking-wider uppercase', sample: 'Section label · 10.5px' },
  { className: 'text-xs', sample: 'Meta and table headers · 11.5px' },
  { className: 'text-sm', sample: 'Buttons, tabs, secondary text · 12.5px' },
  { className: 'text-base', sample: 'Body and inputs · 13px' },
  { className: 'text-lg font-bold', sample: 'Drawer title · 15px' },
  { className: 'text-xl font-bold', sample: 'Total · 17px' },
  { className: 'text-2xl font-bold', sample: 'Page title · 19px' },
  { className: 'text-3xl font-bold', sample: 'Stat number · 22px' },
];

const stageItems = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'scheduled', label: 'Site Visit Scheduled' },
  { value: 'won', label: 'Won' },
];

const stats = [
  { label: 'New leads today', value: '6', sub: '+2 from Facebook' },
  { label: 'Quotes pending', value: '4', sub: 'Awaiting approval' },
  { label: 'Won this month', value: '₹ 5.2L', sub: '8 deals closed' },
];

const rows = [
  {
    name: 'Aarav Mehta',
    initials: 'AM',
    phone: '+91 98230 11234',
    stage: 'Site Visit Scheduled',
    stageVariant: 'highlight',
    assigned: 'Amit Patel',
    priority: 'High',
    priorityDot: 'bg-destructive',
    quote: '₹78,000',
  },
  {
    name: 'Ishita Desai',
    initials: 'ID',
    phone: '+91 99250 71140',
    stage: 'Quote Sent',
    stageVariant: 'warning',
    assigned: 'Priya Sharma',
    priority: 'Medium',
    priorityDot: 'bg-warning',
    quote: '₹95,000',
  },
  {
    name: 'Arjun Rao',
    initials: 'AR',
    phone: '+91 90030 44556',
    stage: 'Won',
    stageVariant: 'success',
    assigned: 'Kavya Nair',
    priority: 'Low',
    priorityDot: 'bg-foreground-faint',
    quote: '₹88,000',
  },
] as const;

const drawerFields = [
  { label: 'Phone', value: '+91 98230 11234' },
  { label: 'Source', value: 'WhatsApp' },
  { label: 'Assigned to', value: 'Amit Patel' },
  { label: 'Priority', value: 'High' },
  { label: 'Quote value', value: '₹78,000' },
  { label: 'Next action', value: 'Confirm slot' },
];
