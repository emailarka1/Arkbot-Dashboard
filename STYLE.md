# ArkBot Dashboard — Style Guide

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0a0a0a` | Main background |
| `--bg-sidebar` | `#111111` | Sidebar background |
| `--bg-card` | `#141414` | Card, table row hover |
| `--bg-input` | `#1a1a1a` | Input fields, search bar |
| `--border` | `rgba(255,255,255,0.06)` | Borders, dividers |
| `--border-focus` | `rgba(255,255,255,0.15)` | Focus states |
| `--text-primary` | `#ffffff` | Headings, important text |
| `--text-secondary` | `rgba(255,255,255,0.5)` | Body text |
| `--text-muted` | `rgba(255,255,255,0.3)` | Labels, timestamps |
| `--accent` | `#f97316` | Primary action (orange-500) |
| `--accent-hover` | `#fb923c` | Hover state (orange-400) |
| `--accent-bg` | `rgba(249,115,22,0.1)` | Accent background |
| `--success` | `#22c55e` | Success status (green) |
| `--error` | `#ef4444` | Error status (red) |
| `--warning` | `#f59e0b` | Warning/pending (amber) |

## Typography

- **Font:** Inter, system-ui, sans-serif
- **Heading:** 20px, font-weight 600, white
- **Subheading:** 14px, font-weight 400, white/40
- **Body:** 14px, font-weight 400, white/80
- **Label:** 12px, font-weight 500, white/40
- **Badge:** 12px, font-weight 500

## Components

### Sidebar
- Width: 256px (expanded) / 68px (collapsed)
- Background: `#111111`
- Border-right: `1px solid rgba(255,255,255,0.06)`
- Nav item: rounded-lg, px-3 py-2, text-sm
- Active: `bg-white/10 text-white`
- Inactive: `text-white/50 hover:bg-white/5`
- Section headers: uppercase, 11px, letter-spacing 0.05em, white/30

### Table
- Border: `1px solid rgba(255,255,255,0.06)`
- Border-radius: 12px
- Header: `bg-white/[0.02]`, border-bottom
- Row: border-bottom `rgba(255,255,255,0.04)`
- Row hover: `bg-white/[0.02]`
- Cell padding: 12px 16px
- Header text: 12px, font-weight 500, white/40

### Search Bar
- Border-radius: 12px
- Border: `1px solid rgba(255,255,255,0.1)`
- Background: `rgba(255,255,255,0.05)`
- Focus: border `rgba(255,255,255,0.25)`
- Icon: left, 16px, white/30
- Placeholder: white/30

### Buttons
- Primary: `bg-orange-500 text-white`, hover `bg-orange-400`
- Ghost: `text-white/50 hover:bg-white/5 hover:text-white/70`
- Icon button: 32x32px or 36x36px
- Border-radius: 8px (small) / 12px (medium)

### Status Badges
- Container: rounded-md, border, px-2 py-0.5
- Synced: `bg-green-500/15 text-green-400 border-green-500/20`
- Error: `bg-red-500/15 text-red-400 border-red-500/20`
- Pending: `bg-amber-500/15 text-amber-400 border-amber-500/20`

### Form Inputs
- Border-radius: 12px
- Border: `1px solid rgba(255,255,255,0.1)`
- Background: `rgba(255,255,255,0.05)`
- Padding: 10px 16px
- Text: 14px, white
- Placeholder: white/30
- Focus: border `rgba(255,255,255,0.25)`

### Cards
- Border: `1px solid rgba(255,255,255,0.06)`
- Border-radius: 12px
- Background: transparent or `rgba(255,255,255,0.02)`

## Spacing
- Page padding: 24px
- Section gap: 24px
- Item gap: 8px
- Inline gap: 12px

## Animation
- Transitions: 150ms ease
- Hover: background color change
- Focus: border color change

## Layout Pattern

```
┌──────────┬────────────────────────────────────┐
│ Sidebar  │  Header (title + actions)          │
│          ├────────────────────────────────────┤
│  Logo    │  Search / Filter bar               │
│          ├────────────────────────────────────┤
│  Nav 1   │                                    │
│  Nav 2   │  Content (table / list)            │
│  Nav 3   │                                    │
│          │                                    │
│          ├────────────────────────────────────┤
│          │  Footer / Pagination               │
│  Collapse│                                    │
│  Logout  │                                    │
└──────────┴────────────────────────────────────┘
```

## File Structure

```
src/
├── pages/           # Page components
├── components/
│   ├── admin/       # Admin layout, shared admin components
│   └── ui/          # shadcn/ui primitives
├── lib/
│   ├── utils.ts     # cn() helper
│   └── supabase.ts  # Supabase client
└── index.css        # Global styles, CSS variables
```
