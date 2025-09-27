## Progress component accessibility and indeterminate behaviour

The `Progress` component always exposes an accessible name even when the visible
label is disabled. When `showLabel` is `false`, the Radix root receives an
`aria-label` that falls back to `"Progress"` so assistive technology can still
announce the control. When the label is rendered, the label element is linked to
the control via `aria-labelledby`.

### Indeterminate state

Pass `value={null}` to surface Radix UI's indeterminate state. The indicator
animates instead of relying on a fixed width transform, and the formatted value
is omitted so the UI does not imply a concrete percentage.

```tsx
<Progress label="Loading data" showValue={false} value={null} />;
```
