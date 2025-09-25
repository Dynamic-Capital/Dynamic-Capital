# UI Design Principles Quick Reference

## How to Use This Reference

Each entry pairs the original shorthand title from the course booklet with a
plain-language reminder of how to apply it in practice. Use it while planning a
new screen, auditing an existing flow, or as a checklist for design critiques.

## Starting from Scratch

- [ ] **Start with a feature, not a layout** — Anchor your exploration in the
      core user problem so the layout serves functionality instead of the other
      way around. — p.7
- [ ] **Detail comes later** — Solve interaction flows before committing to
      micro details; polish once the structure holds up. — p.10
- [ ] **Don’t design too much** — Avoid over-specifying early mocks so engineers
      and future-you can iterate without feeling locked in. — p.13
- [ ] **Choose a personality** — Pick a clear tone and attitude to guide color,
      typography, and voice decisions for a cohesive feel. — p.17
- [ ] **Limit your choices** — Constrain patterns, fonts, and colors to speed up
      decision-making and keep interfaces consistent. — p.24

## Hierarchy Is Everything

- [ ] **Not all elements are equal** — Make the most important action or message
      unmistakable; demote the rest. — p.30
- [ ] **Size isn’t everything** — Use contrast, color, and spacing in addition
      to scale to direct attention. — p.32
- [ ] **Don’t use grey text on colored backgrounds** — Preserve legibility by
      pairing adequate contrast ratios with every tint. — p.36
- [ ] **De-emphasize to emphasize** — Muting secondary UI (through opacity,
      desaturation, or spacing) lets the priority element shine. — p.39
- [ ] **Labels are a last resort** — Favor self-explanatory controls; reserve
      labels for clarification when iconography alone fails. — p.41
- [ ] **Separate visual hierarchy from document hierarchy** — Arrange content by
      importance, not just heading level or DOM order. — p.46
- [ ] **Balance weight and contrast** — Combine font weight, color, and
      whitespace thoughtfully so hierarchy feels intentional, not loud. — p.48
- [ ] **Semantics are secondary** — Structure semantics for accessibility, but
      fine-tune styling independently to highlight what matters. — p.52

## Layout and Spacing

- [ ] **Start with too much white space** — Begin roomy; it is easier to remove
      than to add breathing room later. — p.56
- [ ] **Establish a spacing and sizing system** — Define consistent increments
      to keep rhythm and ease development. — p.60
- [ ] **You don’t have to fill the whole screen** — Allow negative space to
      focus attention and prevent cognitive overload. — p.65
- [ ] **Grids are overrated** — Lean on alignment and spacing over rigid column
      structures when solving irregular problems. — p.72
- [ ] **Relative sizing doesn’t scale** — Set explicit breakpoints or tokens so
      the layout remains predictable across devices. — p.79
- [ ] **Avoid ambiguous spacing** — Make gaps intentionally different to signal
      grouping and hierarchy. — p.83

## Designing Text

- [ ] **Establish a type scale** — Define headline, subhead, body, and caption
      sizes that work in tandem. — p.88
- [ ] **Use good fonts** — Select legible, characterful typefaces that cover
      needed weights and languages. — p.94
- [ ] **Keep your line length in check** — Aim for roughly 45–75 characters per
      line to maintain comfortable reading. — p.99
- [ ] **Baseline, not center** — Align text blocks by their baselines to avoid
      awkward optical misalignment. — p.102
- [ ] **Line-height is proportional** — Adjust leading based on font size and
      weight so paragraphs breathe without drifting apart. — p.105
- [ ] **Not every link needs a color** — Use underlines, weight, or context to
      imply interactivity when color alone is insufficient. — p.109
- [ ] **Align with readability in mind** — Choose left, center, or right
      alignment by considering language direction and scan patterns. — p.111
- [ ] **Use letter-spacing effectively** — Tweak tracking on all-caps or small
      text to balance density and legibility. — p.115

## Working with Color

- [ ] **Ditch hex for HSL** — Adjust hues, saturation, and lightness
      independently to craft cohesive palettes faster. — p.119
- [ ] **You need more colors than you think** — Plan supporting neutrals,
      accents, and semantic states beyond the primary brand color. — p.123
- [ ] **Define your shades up front** — Establish scales for light-to-dark
      variants so components share consistent ramps. — p.129
- [ ] **Don’t let lightness kill your saturation** — Maintain chroma when
      lightening colors to avoid washed-out UI. — p.133
- [ ] **Greys don’t have to be grey** — Introduce subtle hue bias to greys for a
      more natural, lively interface. — p.139
- [ ] **Accessible doesn’t have to mean ugly** — Use thoughtful combinations
      that exceed contrast ratios while staying on-brand. — p.142
- [ ] **Don’t rely on color alone** — Pair color with icons, patterns, or labels
      to communicate states inclusively. — p.146

## Creating Depth

- [ ] **Emulate a light source** — Decide where light originates so shadows and
      highlights remain believable. — p.150
- [ ] **Use shadows to convey elevation** — Elevation tokens help users parse
      which layers are interactive. — p.158
- [ ] **Shadows can have two parts** — Combine a soft ambient glow with a
      tighter drop shadow for realistic depth. — p.163
- [ ] **Even flat designs can have depth** — Layer color, contrast, and overlap
      to imply hierarchy without skeuomorphism. — p.167
- [ ] **Overlap elements to create layers** — Let cards, imagery, or text
      overlap deliberately to show relationships. — p.170

## Working with Images

- [ ] **Use good photos** — Favor authentic, high-resolution imagery that
      reflects your audience. — p.174
- [ ] **Text needs consistent contrast** — Apply overlays or choose imagery that
      keeps copy readable everywhere it appears. — p.176
- [ ] **Everything has an intended size** — Display illustrations and
      photography at resolutions that preserve sharpness. — p.181
- [ ] **Beware user-uploaded content** — Plan fallbacks, cropping rules, and
      safety zones for unpredictable assets. — p.187

## Finishing Touches

- [ ] **Supercharge the defaults** — Tune focus styles, form states, and native
      controls so they feel intentional. — p.192
- [ ] **Add color with accent borders** — Use slim borders or sidebars for
      subtle, high-impact color moments. — p.195
- [ ] **Decorate your backgrounds** — Layer gradients, patterns, or textures to
      set mood without competing with content. — p.198
- [ ] **Don’t overlook empty states** — Design first-run and zero-data moments
      to educate, delight, or prompt action. — p.203
- [ ] **Use fewer borders** — Prefer spacing, color blocks, or shadows to avoid
      noisy outlines. — p.206
- [ ] **Think outside the box** — Break the grid judiciously with unexpected
      shapes or layouts to add personality. — p.210

## Leveling Up

- [ ] **Leveling up** — Treat every project as a chance to document learnings
      and refine your system for the next challenge. — p.215
