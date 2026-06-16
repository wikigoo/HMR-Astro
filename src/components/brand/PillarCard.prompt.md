**HMR PillarCard** — the feature card used for the five product pillars (new-phone guidance, used-phone guidance, troubleshooting, hardware education, accessories). Composes `GlassCard` + `IconWell`.

```jsx
<PillarCard
  icon={<i data-lucide="shield-check"></i>}
  title="Used phone guidance"
  description="Fair-price checks, inspection checklists, registry status, counterfeit-part detection."
  question="Is a Samsung A54 worth 35M after 18 months?"
/>
```

Props: `icon`, `title`, `description`, `question` (italic, under a hairline), `accent`, `rtl`.
