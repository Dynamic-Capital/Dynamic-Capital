# UI Style Guide — Interactivity First

## Do

- Use **shadcn/ui** primitives (Button, Card, Tabs, Sheet, Skeleton)
- Use **lucide-react** icons on actions
- Use **Framer Motion** for subtle transitions (fade/slide/scale)
- Replace paragraphs with: accordions, tabs, dropdowns, tooltips, checklists
- Add a clear primary CTA per screen
- Use skeletons for loads >200ms; toasts for confirmations

## Don’t

- Dump long marketing copy into app screens
- Ship pages with no interactive elements
- Hardcode colors; use theme tokens
