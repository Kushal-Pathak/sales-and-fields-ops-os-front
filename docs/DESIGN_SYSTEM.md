# Design System

The visual foundation of Pilot CRM. It is derived from the reference mock in `design/AquaEdge CRM (standalone).html` and implemented with the tokens in `src/app/styles/tokens.css`, the Tailwind wiring in `src/app/styles/index.css`, and the shadcn/ui primitives in `src/components/ui/`.

Read this before building any screen. The reference file is a static mock: copy its patterns, not its DOM. Open `/design-system` in the dev server to see every token and primitive rendered.

## Principles

- **Dense and quiet.** A working tool, not a landing page: 13 px base type, 32 px controls, ~32 px table rows, hairline borders instead of shadows.
- **Warm neutrals, one accent.** Everything is stone grey. Near-black is the only primary action colour. Yellow (`brand`) is reserved for identity moments: the workspace tile, the active wizard step, AI affordances.
- **Colour means status.** Green / red / blue / amber / violet appear only as soft-fill pills, dots and small labels that carry meaning. Never as decoration.
- **Rows open panels.** Clicking a row or card opens a right-hand drawer over the content; it does not navigate away.
- **Tokens only.** No raw colour, radius, shadow or font-size values in components. If a value is missing, add a token.

## Tokens

All values live in `src/app/styles/tokens.css` and are exposed as Tailwind utilities through `@theme inline` in `index.css` (`bg-primary`, `text-muted-foreground`, `shadow-drawer`, …). Light values retain the reference palette, with text colours adjusted for readability; dark values are derived from the same stone family.

### Colour

| Token                         | Light                  | Dark                   | Use                                                       |
| ----------------------------- | ---------------------- | ---------------------- | --------------------------------------------------------- |
| `background`                  | `#ffffff`              | `#1c1917`              | page                                                      |
| `foreground`                  | `#1c1917`              | `#fafaf9`              | primary text, titles                                      |
| `foreground-secondary`        | `#57534e`              | `#d6d3d1`              | table cells, secondary button text                        |
| `muted-foreground`            | `#6b645f`              | `#a8a29e`              | table headers, captions, descriptions                     |
| `foreground-faint`            | `#706964`              | `#a39c96`              | field labels, placeholders, meta, ghost rows              |
| `card` / `popover`            | `#ffffff`              | `#232020`              | cards, menus, dialogs, drawers                            |
| `muted`                       | `#f9f8f6`              | `#292524`              | panel backgrounds, selected rows, read-only boxes         |
| `surface-2`                   | `#f4f4f2`              | `#292524`              | filter chips, search pill, neutral pills                  |
| `secondary`                   | `#f4f4f2`              | `#292524`              | secondary buttons                                         |
| `accent`                      | `#f1efeb`              | `#2f2b28`              | hover background for nav items, menu items, ghost buttons |
| `primary`                     | `#1c1917`              | `#fafaf9`              | primary buttons, checked controls, active step            |
| `destructive`                 | `#dc2626`              | `#f87171`              | danger text and outlines                                  |
| `border`                      | `#ececec`              | `white / 10 %`         | panels, sidebar, table outlines                           |
| `border-strong`               | `#e7e5e4`              | `white / 16 %`         | inputs, outlined buttons, dashed dropzones                |
| `border-faint`                | `#f4f3f1`              | `white / 6 %`          | table row dividers, list dividers                         |
| `input`                       | `#e7e5e4`              | `white / 15 %`         | form control borders, unchecked switch                    |
| `ring`                        | `#1c1917`              | `#a8a29e`              | focus border and focus halo                               |
| `brand`                       | `#f5c518` on `#1a1300` | same                   | workspace tile, active wizard step, AI mic                |
| `success` / `-soft`           | `#15803d` / `#dcfce7`  | `#4ade80` / 15 % alpha | Won, Completed, Approved, Active                          |
| `warning` / `-soft`           | `#92400e` / `#fef3c7`  | `#fbbf24` / 15 % alpha | Pending, Draft, Duplicates, Manager role                  |
| `info` / `-soft`              | `#1d4ed8` / `#dbeafe`  | `#60a5fa` / 15 % alpha | Scheduled, In progress, Sent, automation Active           |
| `destructive` / `danger-soft` | `#dc2626` / `#fee2e2`  | `#f87171` / 15 % alpha | Overdue, Lost, Rejected, errors                           |
| `highlight` / `-soft`         | `#7c3aed` / `#ede9fe`  | `#a78bfa` / 15 % alpha | site visits, calendar visit events                        |
| `whatsapp` / `-soft`          | `#25d366` / `#dcf8c6`  | same / 18 % alpha      | WhatsApp buttons, unread badges, outgoing bubbles         |
| `overlay`                     | `rgb(28 25 23 / .35)`  | `rgb(0 0 0 / .6)`      | scrim behind dialogs, sheets and the command palette      |
| `sidebar-*`                   | `#fbfbfa` family       | `#1a1715` family       | app sidebar background, item states                       |

Category colours (lead stage, source, priority, task type, role) are **feature data**, not tokens. Define them next to the feature's types as maps onto the status tokens above; see the appendix for what the reference used.

Readable neutral text (`foreground`, `foreground-secondary`, `muted-foreground`, `foreground-faint`) must have at least 4.5:1 contrast on the neutral page, card, sidebar, chip and hover surfaces in both themes. Keep metadata visually secondary through these tokens and the type scale; do not use border colours or reduced opacity for readable labels. Decorative dividers and disabled controls have separate roles.

### Typography

Font: **Hanken Grotesk** (variable, self-hosted via `@fontsource-variable/hanken-grotesk`). Weights: 400 body, 500 labels and secondary buttons, 600 primary buttons, pills, table titles, 700 headings and numbers.

The Tailwind `text-*` scale is redefined for the 13 px base:

| Utility     | Size / line | Use                                                                                             |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `text-2xs`  | 10.5 / 14   | uppercase section and field labels (`font-bold tracking-wider uppercase text-foreground-faint`) |
| `text-xs`   | 11.5 / 16   | pills, table headers, meta, timestamps                                                          |
| `text-sm`   | 12.5 / 18   | buttons, tabs, secondary text, table cells                                                      |
| `text-base` | 13 / 20     | body, inputs, primary table cell text                                                           |
| `text-lg`   | 15 / 22     | drawer and dialog titles                                                                        |
| `text-xl`   | 17 / 24     | totals, large values                                                                            |
| `text-2xl`  | 19 / 26     | page titles                                                                                     |
| `text-3xl`  | 22 / 28     | stat numbers, wizard titles                                                                     |

`h1`–`h3` get `tracking-tight` automatically. Numbers in tables and totals use `tabular-nums`. Identifiers such as quote numbers use `font-mono text-xs`.

### Shape, spacing, elevation

- **Radius** (`--radius: 0.5rem`): `rounded-sm` 4.8 px pills and small chips · `rounded-md` 6.4 px badges, kbd · `rounded-lg` 8 px buttons, inputs, nav items, tabs · `rounded-xl` 11 px cards, tables, dialogs · `rounded-2xl` 14 px command palette · `rounded-full` avatars, dots, round filter chips.
- **Spacing** follows the 4 px grid: control padding `px-2.5`–`px-3.5`, cell padding `px-3 py-1.5`, card padding `p-3`, panel padding `p-4`, section gaps `gap-3`–`gap-4`.
- **Heights**: buttons `h-7` (28) / `h-8` (32, default) / `h-9` (36); inputs `h-8`; table rows ≈ 32; top bar 42; nav item ≈ 28; switch 32 × 18.
- **Borders**: 1 px everywhere. Use `border-border` for containers, `border-border-strong` for controls, `divide-border-faint` for lists and rows. Selected/focused emphasis is a 1.5 px `ring` border, not a thicker line.
- **Shadows** (only three): `shadow-card` on hovered cards, `shadow-drawer` on the side panel, `shadow-overlay` on the command palette and dialogs. Nothing else casts a shadow.
- **Layers**: content 0 · sticky table header `z-10` · drawer `z-20` (inside the content column) · popovers, dialogs, sheets and the palette `z-50` (managed by the primitives).

## Components

Each entry says how the element looks, how it behaves, and how to build it. "Build with" names the primitive in `src/components/ui/` and the utilities that get it to the reference look. Add missing primitives with `npx shadcn add <name>`; never hand-roll an equivalent.

### Buttons

- **Looks**: 32 px tall, `rounded-lg`, 12.5 px text, icon 16 px with 6 px gap. Primary is near-black on white (600). Secondary is a soft chip (`surface-2`, 500). Outline is a 1 px `border-strong` box with `foreground-secondary` text. Ghost is text only. Destructive is a soft red fill with red text; a danger-outline variant is an outline with red text.
- **Behaves**: hover changes background only; active nudges 1 px down; disabled at 50 % opacity; focus shows the `ring` halo.
- **Build with**: `Button` (`variant`: `default` · `secondary` · `outline` · `ghost` · `destructive` · `link`; `size`: `sm` 28 · `default` 32 · `lg` 36 · `icon` / `icon-sm` / `icon-xs`). Danger-outline: `variant="outline" className="text-destructive"`. Icon-only buttons need `aria-label`.

### Inputs

- **Looks**: 32 px, `rounded-lg`, 1 px `input` border, 13 px text, `foreground-faint` placeholder. Textarea min 60 px. Select trigger shows a chevron; menu items 12.5 px with a check on the selected item.
- **Behaves**: focus turns the border `ring` colour and adds the 3 px halo; invalid uses `destructive`; disabled 50 %.
- **Build with**: `Input`, `Textarea`, `Select` + `SelectTrigger` + `SelectValue` + `SelectContent` + `SelectItem`. Field label: `<label className="text-xs font-semibold text-muted-foreground">` above the control; read-only values use `<div className="rounded-lg bg-muted px-3 py-2 text-sm">`. Search field: `InputGroup` with a leading `SearchIcon` in `InputGroupAddon`.

### Selection controls

- **Checkbox** 16 px, `rounded-[4px]`, fills `primary` with a white check. **Radio** 16 px circle, fills `primary` with an 8 px white dot. **Switch** 32 × 18, `primary` when on, `input` when off, knob slides 150 ms.
- **Build with**: `Checkbox`, `RadioGroup` + `RadioGroupItem`, `Switch`. Pair each with a `<label htmlFor>`; group option rows as `flex items-start gap-3 border-b border-border-faint px-3.5 py-3` with title (`text-base font-medium`) and description (`text-xs text-foreground-faint`). Toggle rows (label + description + switch) sit in `rounded-lg bg-muted px-3 py-2.5`.

### Pills and badges

- **Looks**: `h-5`, `px-2`, 11.5 px, 600, `rounded-md`, soft fill + strong text. Optional 6 px dot before the label. Count badges are 16 px red circles with 10 px bold white text.
- **Build with**: `Badge` (`variant`: `success` · `warning` · `info` · `highlight` · `neutral` · `destructive` for danger; the shadcn `default` / `secondary` / `outline` / `ghost` / `link` remain available). Dot: `<span className="size-1.5 rounded-full bg-current" />` as the first child. Count badge: `<Badge variant="destructive" className="h-4 min-w-4 rounded-full bg-destructive px-1 text-2xs text-white">`.
- **From data**: when the colour comes from a `StatusColor` on an entity (stage, priority map, …) use `StatusBadge color={…}` (pill with dot) or `StatusDot color={…}` (dot before plain text) from `@/components/common`; the class mapping lives in `status-color.ts` only.

### Avatars

- **Looks**: circle with initials. Default is white with a `border` ring and `foreground-secondary` text; people and roles get a tinted fallback (`*-soft` fill, strong text). Sizes: `sm` 24 (table cells), `default` 32 (lists, chat), `lg` 40 (drawer header).
- **Build with**: `InitialsAvatar name size color?` from `@/components/common` (plain ring for contacts, tinted from `user.color` for people). Underneath it is `Avatar size` + `AvatarFallback className="text-xs font-semibold"`. Stack with `AvatarGroup`.

### Tabs and segmented controls

- **Pill tabs** (view switching): transparent list, 28 px content-width triggers with 10 px horizontal padding and 2 px between tabs, 12.5 px 600 labels, active gets the `accent` fill. Each label and its 11.5 px 500 count share a baseline with a 6 px gap and matching `leading-none`; counts use `tabular-nums`. The whole label/count pair is centred vertically in the trigger. The list wraps within the toolbar at narrow widths. **Underline tabs** (inside drawers): 2 px `foreground` underline, no fill. **Segmented control** (table / kanban): bordered group, icon-only items, active fill `accent`.
- **Build with**: counted list views use `ViewTabs` + `ViewTab label count` from `components/common/list-toolbar`, composed from the `Tabs` primitives. `ViewTab` accepts `countClassName` for a feature's attention colour; count size and weight stay consistent, and a zero count remains visible. Panel tabs use `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent`; underline: `<TabsList variant="line">`. Segmented: `ToggleGroup variant="outline" spacing={0}` with `ToggleGroupItem size="sm"` and `aria-label`s — `ViewSwitch` (`features/leads`) is the table/board instance. Pill tabs that are links (settings sections) are `SettingsNav` in `components/layout/`.

### Cards and stat tiles

- **Looks**: white, 1 px hairline, `rounded-xl`, 12 px padding, 13 px body. Hover on clickable cards: `muted` background + `shadow-card`. Stat tile: label `text-xs text-muted-foreground` → value `text-3xl font-bold` → sub `text-xs text-foreground-faint`. Implemented as `StatTiles` in `features/dashboard/`; list panels with a header (icon, title, count, "View all") are `DashboardPanel` + `PanelRow`.
- **Follow-up rows**: contact name above action and due-date metadata; overdue dates use explicit `Overdue · <date>` text in `text-destructive`, without a pill. Keep the action muted and truncate it before the date. The lead stage is the sole right-aligned badge, with the same right inset as other panel rows.
- **Build with**: `Card size="sm"` (+ `CardHeader` / `CardTitle` / `CardContent`). Clickable: `className="cursor-pointer transition hover:bg-muted hover:shadow-card"`. Kanban card: `Card size="sm"` with a name row (`text-base font-semibold`), a description (`text-sm text-muted-foreground`), and a footer row separated by `border-t border-border-faint pt-2`.

### Tables

- **Looks**: header row 11.5 px 600 `muted-foreground`, sticky, white (or `sidebar` background inside bordered tables), `border-b border-border`. Cells 12.5–13 px, `px-3 py-1.5`, rows ≈ 32 px separated by `border-faint`, hover `muted`. Numeric columns right-aligned with `tabular-nums`. Leading checkbox column 36 px; a trailing faint "+" column on editable grids. The last row is a ghost "+ New …" action in `foreground-faint`. Wide tables scroll horizontally (`min-w-[…]`), they never squeeze columns.
- **Behaves**: whole row is clickable and opens a drawer; the checkbox stops propagation; sort and filter live in the page header, not in the header cells.
- **Build with**: `Table` family. Recipes: `<TableHead className="h-8 px-3 text-xs font-semibold text-muted-foreground">`, `<TableRow className="border-border-faint hover:bg-muted">`, `<TableCell className="px-3 py-1.5">`. Bordered variant: wrap in `rounded-xl border` and add `[&_th]:bg-sidebar`.

### Kanban

- **Looks**: horizontal row of 224 px columns, `gap-3`, page padding `p-4`. Column head: stage pill + faint count + bold sum right-aligned. Cards as above, `mb-2`. Ghost "+ Add" at the bottom.
- **Build with**: plain flex layout (`flex items-start gap-3 overflow-x-auto`), `Badge` for the head, `Card` for items. Implemented as `PipelineBoard` / `PipelineColumn` / `PipelineCard` in `features/leads/components/`. Cards are `@dnd-kit` draggables; the lifted card renders in a `DragOverlay` with `shadow-card rotate-1`, the source card fades to `opacity-40`, and the column under the pointer gets `bg-accent`. Keyboard: Space lifts, ←/→ change column, Space drops, Esc cancels, Enter opens the drawer. The task board (`features/tasks/components/task-board.tsx`) is the same recipe with status columns; the keyboard helpers live in `lib/dnd-columns.ts`.

### Sidebar navigation

- **Looks**: 236 px, `bg-sidebar`, `border-r`. Top: workspace switcher (24 px `brand` square with the initial, 13.5 px bold name, chevron). Group labels `text-2xs font-bold uppercase tracking-wider text-foreground-faint` with `pt-3.5 pb-1 px-2`. Items: 13 px, `px-2 py-1.5`, `rounded-lg`, icon 15 px, label, then a faint count or a red count badge on the right. Active: `bg-sidebar-accent text-foreground font-semibold`. Hover: `bg-accent`. A `Separator` before admin items. Footer: user row (22 px tinted avatar + name), Settings, Sign out, above a `border-t`.
- **Behaves**: one active item; counts are live numbers; the switcher opens a `DropdownMenu`. A `Button variant="ghost" size="icon-sm"` at the start of the top bar uses `PanelLeftClose` / `PanelLeftOpen` icons, matching the other toolbar actions. Its tooltip says "Collapse sidebar" / "Expand sidebar" with the keyboard shortcut; `aria-expanded` announces the state and `aria-controls` identifies the desktop sidebar. It (or ⌘B / Ctrl-B) collapses the desktop sidebar to a 52 px icon rail and back: labels become right-side `Tooltip`s, group labels shrink to 20 px hairline `Separator`s (heights animate with the width, so icons slide rather than jump) so every gap in the rail is equal, the workspace row shows only the brand tile, and the footer shows only the avatar with its menu opening to the right. Width animates (`transition-[width]`, off for reduced motion) and the choice is remembered per browser. Below `lg`, the desktop toggle is replaced by the mobile menu button; the mobile sheet is always full width.
- **Build with**: `Button variant="ghost"` sized `h-7 w-full justify-start gap-2 px-2` (or a plain link with the same classes), `Badge` for counts, `Separator`, `DropdownMenu` for the switcher. Build the shell once in `src/components/layout/` and read nav items from config.

### Top bar, breadcrumb, page header

- **Top bar**: 42 px, `border-b border-border-faint`, `px-4`. Left: a ghost `icon-sm` sidebar toggle on desktop or menu button on mobile, followed by the breadcrumb (root and decorative `/` in `foreground-faint`, leaf `font-semibold`). Right: ghost icon buttons (Filter, Sort, Search), the "Ask AI · ⌘K" chip (`h-7 rounded-lg bg-surface-2 px-3 text-sm text-muted-foreground` with a `Kbd`), and the user avatar.
- **Page header**: `px-4 pt-3.5 pb-2.5`; title `text-2xl font-bold`, faint count beside it, actions right-aligned (`Button` primary + outline). Optional filter-chip row below: `rounded-full bg-surface-2 px-2.5 h-6 text-xs` chips showing `Field <b>value</b>`, plus a ghost "+ Add filter".
- **Filter row recipe** (see `features/leads/components/leads-toolbar.tsx`): `ViewTabs` + `ViewTab` for saved views with faint counts → a `rounded-full bg-surface-2` `InputGroup` search → filter chips that are `SelectTrigger size="sm"` styled `h-6 rounded-full border-transparent bg-surface-2 px-2.5 text-xs` (an active chip switches to `bg-accent text-foreground`) → a ghost `xs` "Clear" when any filter is set → a `DropdownMenu` radio group for sort, `ml-auto`. The whole row wraps at narrow widths.
- Full-height screens (inbox, builders, wizards) omit the page header and draw their own top strip.

### Drawer (side panel)

- **Looks**: initially 464 px wide, full height of the content column, white, `border-l` + `shadow-drawer`. On desktop, the left border has a 12 px resize target with a `col-resize` cursor; its line uses `border-strong` on hover and `ring` on keyboard focus or drag. Header `p-4 border-b border-border-faint`: avatar or icon, title `text-lg font-bold`, subtitle, pills; a ghost `icon-sm` close button top-right; optional quick-action row (`Button size="sm" variant="outline"`); optional underline tabs. Body scrolls, `p-4`; fields as a 2-column grid of label (`text-2xs` uppercase faint) over value (`text-base`). Footer `border-t px-3.5 py-2.5` with a row of `sm` buttons and one primary on the right.
- **Behaves**: opens from a row click; Esc and the close button dismiss it; content behind stays visible and scrollable; only one drawer at a time. From `lg`, drag the left edge to resize between 360 px and the smaller of 960 px or 80% of the viewport. Left / Right arrow keys adjust by 24 px (48 px with Shift); Home / End go to the limits; double-click or Enter resets to 464 px. The handle is a focusable vertical separator with its width and limits announced. All drawers share the saved desktop preference through `data/preferences.ts`; resizing the browser clamps the visible width without changing that preference. Below `lg`, the drawer fills the viewport and hides the resize handle.
- **Build with**: `DrawerPanel` + `DrawerHeader` / `DrawerTitle` / `DrawerDescription` / `DrawerBody` / `DrawerFooter`. `DrawerPanel` wraps `Sheet` and uses its `render` composition for the resize surface, driven by `useDrawerWidth` and the `--drawer-width` layout variable. The overlay uses the `overlay` token; pass `className="bg-transparent"` to `SheetOverlay`-based variants if a screen needs the content visible without a scrim.

### Builder (full-page form)

- **Looks**: replaces the page header. Its own header row (`border-b px-4 py-2.5`): back link `← Quotes`, `/`, title `text-lg font-bold` (`Q-1048` or "New quote"), a status pill, and the customer / lead on the right in `text-sm text-muted-foreground` with bold values. Below, two panes: the form on the left (`p-4`, scrolls) and a summary rail on the right (`lg:w-80 border-l bg-surface-2/40 p-4`) with label/value rows, the totals block (`Subtotal · Discount · Tax · Total`, tabular figures, total `text-base font-bold` above a `border-t`) and a vertical stack of full-width buttons: primary "Save and submit for approval", outline "Save draft", ghost "Cancel". Under `lg` the rail stacks below the form.
- **Line items**: a bordered `rounded-lg` table whose cells are inputs (`Description` flex, `Unit`, `Qty`, `Unit price (symbol)`, `Disc %`, computed `Amount` in `font-semibold tabular-nums`, a ghost × to remove); a faint "+ Add line item" row at the bottom, like the "New …" row in tables. Errors are `text-2xs text-destructive` under the cell.
- **Build with**: `QuoteBuilder` + `LineItemsEditor` + `QuoteTotals` in `features/quotes/components/`; `Field` / `FieldLabel` / `FieldError`, `Input type="number"`, `Combobox` for the lead, `Textarea` for notes and terms.

### Print sheet

- **Looks**: the customer-facing quote on a white `max-w-[800px] p-10 shadow-sm` sheet over a `muted` page, wrapped in `.light` so it stays light in dark mode. Workspace name top-left; number, date, valid-until and status in a right-aligned label/value grid; "Prepared for" / "Prepared by" columns; a plain items table with hairline rows; the totals block right-aligned; notes and terms in `text-sm`. A toolbar with Back and Print sits above the sheet and is `print:hidden`.
- **Build with**: `QuotePrint` in `features/quotes/components/`; route `/quotes/:id/print` outside the shell; `window.print()`.

### Calendar

- **Week grid**: `grid-cols-[56px_repeat(7,minmax(0,1fr))]`; a sticky day header (weekday `text-xs`, date `text-lg font-bold`, today's column tinted `bg-accent/60` in the header and `bg-accent/30` in the body); 56 px hour rows with `border-border-faint` lines and `text-2xs` hour labels in the gutter; the range is 7 AM–7 PM stretched to fit events. Every empty hour cell is a `button` ("Schedule on …") so a click starts the scheduling dialog at that time. A `border-destructive` line marks the current time on today.
- **Month grid**: `grid-cols-7`, six rows of at least 6.5 rem, hairline borders; other-month days `bg-surface-2/40 text-foreground-faint`; today's number in a `bg-primary text-primary-foreground` circle; up to three one-line chips then a "+n more" text button that opens that week; a `+` button appears on hover to schedule that day.
- **Event chips**: `button`s with `rounded-md border-l-2` and the soft fill / strong text of their category (`STATUS_COLOR_CLASSES[color].chip`): appointments `highlight` with the type icon, tasks in their task-type colour; done items at `opacity-50`. Week chips are absolutely positioned (top and height from time, side-by-side columns when they overlap); month chips show the start time first.
- **Toolbar**: ‹ › `icon-sm` outline buttons, an outline "Today", the range as `text-sm font-semibold` (`Sep 21 – 27, 2026` / `September 2026`), pill tabs Week / Month, the Assignee chip and a pill `Toggle` for tasks.
- **Build with**: `CalendarToolbar`, `CalendarView` (`WeekGrid` / `MonthGrid` / `EventChip`) in `features/calendar/components/`; the page composes the appointment and task drawers.

### Sign-in and the user menu

- **Sign-in**: a `Card` (`max-w-sm p-6 shadow-card`) centred on a `bg-muted` page with the theme toggle top-right; brand tile, "Sign in to Pilot CRM", one line of copy, then either the member picker (rows with `InitialsAvatar`, name, role · email, `hover:bg-muted`, "Continue as …") or the email/password `Field`s and a primary "Sign in". Errors as `text-destructive` alerts under the form. `SignInForm` in `features/auth/`.
- **User menu**: the sidebar footer row (`InitialsAvatar size="sm"` in the user's colour, name, role in `text-2xs`, chevrons) opens a `DropdownMenu` upward with the email, "Switch user" (demo) and "Sign out". The top-bar avatar mirrors the user. `UserMenu` in `features/auth/`.
- **Read-only sections**: disabled actions plus `PermissionNote` (`LockIcon` + one `text-xs text-muted-foreground` line) in the page header.

### Dialogs and the command palette

- **Dialog**: centred, `rounded-xl`, `p-4`, `shadow-overlay`, `overlay` scrim; title `text-lg font-bold`, description `text-sm text-muted-foreground`, footer buttons right-aligned. Confirmations for risky actions use a red-bordered card (`border-destructive/40 bg-danger-soft/40`) with "Yes, proceed" (`destructive` fill) and "Cancel".
- **Command palette**: 556 px, `rounded-2xl`, opens on ⌘K / Ctrl-K, closes on Esc. Search row with a leading sparkle/search icon and an `Esc` `Kbd`; grouped lists ("Recent", "Suggested") with `text-2xs` uppercase headings; items 13 px with a leading icon; risky items show a red "Requires confirmation" sub-line.
- **Build with**: `Dialog` family; `CommandDialog className="sm:max-w-[556px]"` + `CommandInput` + `CommandList` + `CommandGroup` + `CommandItem` + `CommandShortcut`; `Kbd` for shortcuts. Implemented as `CommandPalette` in `features/command-palette/`: groups Recent · Suggested · Results · Ask · Go to · Quick actions, an answer panel under the input (title with count, up to five linked rows with status pills, an "Open list" primary button, Back), and the confirmation box for risky actions (`border-destructive/40 bg-danger-soft/40`, "Confirm action", `destructive` "Yes, proceed"). The top-bar "Ask AI ⌘K" chip opens it; below `sm` it is a search icon button.

### Menus, popovers, tooltips

- **Looks**: white, `rounded-lg`, hairline ring, `shadow-overlay`-light; items 12.5 px, `px-2 py-1.5`, hover `accent`; destructive items in red. Tooltips are dark (`foreground` background, 11.5 px white text).
- **Build with**: `DropdownMenu`, `Popover`, `Tooltip` (the `TooltipProvider` is already mounted in `src/app/providers`).

### Wizards, progress, steps

- **Step bar**: 40 px strip, `border-b`; each step is a 17 px circle (done: `primary` fill with ✓; active: `brand` fill; pending: `muted` fill, faint number) plus an 11.5 px label (active 600); `›` separators in `border-strong` colour. Bottom bar: 44 px, `border-t`, "Back" outline left, "Step n of N" faint centre, "Continue" primary right.
- **Progress**: 6 px track `muted`, `primary` fill, `rounded-full`, animates width.
- **Build with**: `StepBar` and `WizardFrame` in `components/layout/step-bar.tsx` (the lead import wizard, `features/lead-import`, is the reference instance: per-step `max-w`, Continue disabled until the step is valid, the last step hides the bottom bar); `Progress` (+ `ProgressLabel` / `ProgressValue`).

### Upload dropzone, timeline, chat bubbles

- **Dropzone**: `rounded-xl border-2 border-dashed border-border-strong p-5`, centred icon + `text-sm text-foreground-faint`; hover `border-input bg-muted`. File card: icon tile (`size-9 rounded-lg` soft fill) + name + faint meta + remove ×. Implemented in `features/lead-import/components/upload-step.tsx` as a `label` around a visually hidden file input, with drag-and-drop.
- **Timeline**: 7 px coloured dot (status token) and a 1 px `border` line; text 12.5 px, meta 11 px faint below.
- **Chat**: bubbles max 76–85 % wide; incoming `bg-surface-2 rounded-[3px_10px_10px_10px]`, outgoing `bg-whatsapp-soft rounded-[10px_3px_10px_10px]`; 11 px timestamps; composer is a `rounded-xl border-border-strong` box with chip buttons on top and send on the bottom-right. Implemented as `MessageList` (day separators, transcript on `bg-surface-2/40`, incoming bubbles `bg-background`, outgoing `bg-whatsapp-soft` on WhatsApp and `bg-info-soft` elsewhere) and `Composer` (growing textarea, "Quick reply" chip, Enter sends) in `features/inbox/components/`; the 3-panel split is `Inbox` (list `w-[300px]`, thread, rail `w-[248px]` from `xl`), rows carry a channel icon badge on the avatar and a `bg-whatsapp` unread count.

### Empty, loading, error states

The reference has none; these are ours.

- **Loading**: `Skeleton` rows matching the final layout (table rows 32 px, cards 88 px). Never spinners in content areas.
- **Empty**: centred, `max-w-xs`, icon in a `size-10 rounded-xl bg-muted` tile, title `text-base font-semibold`, hint `text-sm text-muted-foreground`, one primary action.
- **Error**: same layout with a `destructive` icon and a "Retry" outline button; route-level errors use `RootErrorBoundary`.
- **Build with**: `EmptyState icon title hint action` and `ErrorState error onRetry` from `@/components/common/empty-state`; `Skeleton` rows shaped like the final content (see `LeadsTable` / `LeadDrawer`).

### Icons and motion

- Icons: `lucide-react`, 16 px in buttons and inputs, 15 px in nav, 14 px inside pills and tooltips. Stroke follows the library default. Always `currentColor`.
- Motion: 150 ms for hover and toggle states, 200 ms for sheets, 100 ms for dialogs and menus; progress bars 400 ms. No motion on page load.
- Keyboard: every interactive element is a real `button`, `a`, or form control with visible focus. ⌘K opens the palette; Esc closes the topmost overlay.

## Layout shell (dimensions to build later)

`100vh` row: sidebar 236 px · main column (top bar 42 px → page header → scrolling content) · drawer initially 464 px, resizable on desktop and anchored to the right edge of the viewport. Inbox is a 3-panel split (244 · flex · 218). Wizards centre their content at `max-w-[460–900px]`. Below 1024 px the sidebar opens as a mobile sheet and detail drawers fill the viewport.

## Dark mode

Class-based (`.dark` on `<html>`, managed by `ThemeProvider`). Dark tokens keep the same roles: backgrounds go to stone-900/800, borders become white at low alpha, status colours lighten and their soft fills become 15 % alpha of the strong colour. Check new components in both themes on `/design-system`.

## Rules

1. Style with Tailwind utilities backed by tokens. No raw hex, px radii, or ad-hoc shadows in `src/` outside `tokens.css`.
2. Compose classes with `cn` from `@/lib/utils`.
3. Use the primitives in `src/components/ui/`; add new ones via `npx shadcn add <component>` and fix the `cn` import to `@/lib/utils`. Keep edits to generated files minimal (the badge status variants and the `overlay` scrim on dialog/sheet are the only local changes).
4. Reusable compositions (status pill with dot, initials avatar, data table header, page header, drawer frame) go to `src/components/common/` or `src/components/layout/` once two features need them.
5. Category colour maps (stage, source, priority, type, role) live with the feature that owns them and map onto the status tokens.

## Appendix: category colours in the reference

For later feature work; these are data, not tokens.

- **Lead stage**: New neutral · Contacted info · Site Visit Scheduled highlight · Site Visit Completed highlight (indigo in the mock) · Quote Created warning · Quote Sent warning (orange in the mock) · Negotiation warning (yellow) · Won success · Lost destructive.
- **Source**: Facebook `#1877f2` · WhatsApp `whatsapp` · Telecall sky · Website neutral · IndiaMART teal · Manual neutral (sources keep their brand colours as 6 px dots only).
- **Priority**: High destructive · Medium warning · Low neutral.
- **Task type**: Call info · Visit highlight · Quote warning · Follow-up sky · Install success · Measurement indigo · Payment destructive · General neutral.
- **Channel** (ours): WhatsApp success (plus the `whatsapp` token for badges and Send) · SMS info · Email highlight · Web chat neutral; used as the avatar badge in the inbox list.
- **Appointment status** (ours): Scheduled info · Completed success · Cancelled neutral · "Needs outcome" (scheduled but ended) warning. Appointment types (Meeting, Video call, Phone call, On-site visit) differ by icon, not colour; on the calendar every appointment is `highlight`.
- **Task status**: Pending neutral · In Progress info · Overdue destructive · Completed success.
- **Quote status**: Pending warning · Approved success · Sent info · Accepted success (deeper) · Rejected destructive · Draft warning. Implemented (`features/quotes/utils/quote-labels.ts`) as Draft neutral · Pending approval warning · Approved success · Rejected destructive · Sent info · Accepted success · Declined destructive, so Draft and Pending no longer look alike.
- **Role**: Manager warning · Field Agent success · Sales Agent info · Accountant orange · Viewer neutral.
