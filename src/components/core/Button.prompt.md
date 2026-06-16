**HMR Button** — the neon-glass CTA. Use `primary` for the main action (gradient fill + cyan glow), `secondary` for glass-outline actions, `ghost` for low-emphasis/nav.

```jsx
<Button variant="primary" size="lg">Start a chat</Button>
<Button variant="secondary">Learn more</Button>
<Button variant="ghost" size="sm">Skip</Button>
```

Variants: `primary` | `secondary` | `ghost`. Sizes: `sm` | `md` | `lg`. Slots: `iconLeft`, `iconRight` (pass Lucide SVG nodes). Hover lifts 2px and brightens the glow/hairline.
