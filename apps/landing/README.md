# Landing App

The static landing site bundles the lightweight `once-ui.css` and `once-ui.js` assets that power marketing pages without a build step. The JavaScript helper now exposes Framer Motion-inspired reveal utilities that mirror the React experience in the Next.js app.

## Scroll-based reveal helpers

Elements marked with the `data-once-reveal` attribute fade or slide into view when they enter the viewport. The helper observes those nodes with `IntersectionObserver`, adds a preparatory `once-ready` class, and toggles `once-visible` once the element is visible.

```html
<section class="hero" data-once-reveal="fade-up">
  <h2>Dynamic Capital</h2>
  <p>Fast deposits with automated verification.</p>
</section>
```

Supported values include:

- `fade-up` (default)
- `fade-down`
- `fade-left`
- `fade-right`
- `scale`
- `slide-up`
- `slide-down`
- `slide-left`
- `slide-right`

Add the `data-once-reveal-repeat` attribute when you need the animation to play every time the element scrolls into view.

```html
<div class="stat" data-once-reveal data-once-reveal-repeat>
  <strong>3x</strong>
  Faster approvals
</div>
```

## Reduced-motion and hydration support

- Users with `prefers-reduced-motion: reduce` enabled skip the animation; elements become visible immediately.
- The framework only adds the `once-ready` class when JavaScript is active, so users without scripting continue to see static marketing content.
- Dynamic content can opt into the reveal helper by calling `window.OnceUI.observeReveals(rootNode)` or `window.OnceUI.refreshReveals()` after injecting markup.

## Smooth scrolling

Anchor links that point to IDs continue to use the existing smooth-scroll helper for in-page navigation. No additional configuration is required.
