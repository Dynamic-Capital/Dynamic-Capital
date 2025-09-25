# UI Design Principles Implementation Guide

## How to Use This Guide

Use these checklists to translate each principle from the course booklet into
concrete actions while you plan, critique, or refine a UI. Read the overview for
context, then run through the implementation steps so every screen reflects the
intention behind the principle.

## Starting from Scratch

### Start with a feature, not a layout (p.7)

- Identify the primary user problem or job-to-be-done before opening a design
  tool.
- Draft a quick narrative of the ideal user flow to ground subsequent layout
  decisions.
- Validate that every component you add supports that core task.

### Detail comes later (p.10)

- Begin with low-fidelity sketches that capture information hierarchy and
  interaction paths.
- Defer typography, color, and illustration decisions until the structure has
  stakeholder buy-in.
- Schedule a follow-up polish pass once usability feedback confirms the layout
  works.

### Don’t design too much (p.13)

- Document assumptions and leave space for engineering or user research input on
  unknowns.
- Provide guidelines rather than pixel-perfect specs for patterns that may
  change.
- Capture open questions in the design file so later contributors understand
  what is flexible.

### Choose a personality (p.17)

- Define three adjectives that describe the product’s tone (e.g., friendly,
  authoritative, playful).
- Assemble a mini mood board to align the team on imagery, typography, and color
  direction.
- Audit new components against these traits to ensure the visual language stays
  cohesive.

### Limit your choices (p.24)

- Establish a baseline component and typography library before expanding
  variations.
- Cap the number of primary and secondary colors to a manageable palette.
- Standardize spacing and sizing tokens to discourage ad-hoc values.

## Hierarchy Is Everything

### Not all elements are equal (p.30)

- Rank content and actions from critical to optional before arranging the
  layout.
- Use scale, placement, and contrast to ensure the primary action stands out
  immediately.
- Test with real users or teammates to confirm the intended focal point is
  obvious.

### Size isn’t everything (p.32)

- Pair moderate size changes with shifts in color, weight, or whitespace to
  emphasize importance.
- Reserve oversized elements for rare, high-priority actions to keep the
  interface calm.
- Verify hierarchy in grayscale mocks to ensure emphasis doesn’t rely solely on
  size.

### Don’t use grey text on colored backgrounds (p.36)

- Check text-on-color combinations with contrast tools (e.g., WCAG contrast
  checker) before shipping.
- Use light-on-dark or dark-on-light pairings with sufficient contrast ratio for
  readability.
- Provide alternate states (hover, focus) that maintain contrast across
  interactions.

### De-emphasize to emphasize (p.39)

- Muted colors, reduced opacity, and lighter weights should be applied to
  secondary content.
- Space supporting text away from primary actions to visually separate priority
  levels.
- Confirm that deemphasized content remains accessible via screen reader or
  alternate cues.

### Labels are a last resort (p.41)

- Prototype interactions with iconography or intrinsic affordances before adding
  text labels.
- Conduct quick usability tests; add labels only if users hesitate or
  misinterpret meaning.
- When labels are necessary, keep them short and position them consistently.

### Separate visual hierarchy from document hierarchy (p.46)

- Plan semantic HTML structure first for accessibility and SEO.
- Independently style headings and body text to reflect visual importance rather
  than markup level.
- Use ARIA attributes or visually hidden labels to reconcile semantic order with
  visual layout.

### Balance weight and contrast (p.48)

- Combine font weights with color values that enhance readability without
  overwhelming the eye.
- Avoid stacking multiple heavy treatments (e.g., bold + dark + large) unless
  absolutely necessary.
- Review the design at different zoom levels to ensure balance holds across
  viewports.

### Semantics are secondary (p.52)

- Respect semantic HTML, but adjust styling tokens to highlight the most
  important information.
- Reorder content visually with CSS (grid, flex) when it improves comprehension
  without breaking semantics.
- Ensure keyboard navigation and focus order still follow a logical, accessible
  sequence.

## Layout and Spacing

### Start with too much white space (p.56)

- Begin drafts with generous margins and padding to establish breathing room.
- Iteratively tighten spacing only where content density demands it.
- Check responsive breakpoints to confirm whitespace scales appropriately.

### Establish a spacing and sizing system (p.60)

- Define a base unit (e.g., 4px or 8px) and document multiples for padding,
  margins, and gaps.
- Apply the system to every component and note exceptions for future refinement.
- Share tokens with engineering to keep implementation consistent across
  platforms.

### You don’t have to fill the whole screen (p.65)

- Introduce intentional negative space to guide focus toward primary content.
- Limit full-bleed sections to scenarios where they add clarity or impact.
- Evaluate readability on large monitors and handheld devices to ensure
  compositions stay balanced.

### Grids are overrated (p.72)

- Use alignment, proximity, and visual rhythm instead of rigid multi-column
  grids when solving complex layouts.
- Establish a primary alignment axis (left, center, right) for each section to
  maintain order.
- Layer a light reference grid only to cross-check consistency, not as a design
  straitjacket.

### Relative sizing doesn’t scale (p.79)

- Replace ad-hoc percentages with named breakpoints and explicit component
  sizes.
- Document behavior for each breakpoint, including how components rearrange or
  resize.
- Validate on real devices or emulators to catch unexpected scaling issues.

### Avoid ambiguous spacing (p.83)

- Ensure space between grouped elements is consistently smaller than space
  between separate groups.
- Use divider lines or background color shifts only when spacing alone cannot
  communicate grouping.
- Conduct a squint test or blur the layout to verify grouping remains clear.

## Designing Text

### Establish a type scale (p.88)

- Define a modular scale that covers headings, subheadings, body text, captions,
  and UI labels.
- Document intended use cases for each step in the scale to prevent misuse.
- Apply the scale throughout the product and update tokens when the brand
  evolves.

### Use good fonts (p.94)

- Select typefaces with sufficient weights, language support, and licensing for
  your platform.
- Test combinations of primary and secondary fonts in situ with real copy.
- Create fallback stacks that preserve legibility when custom fonts fail to
  load.

### Keep your line length in check (p.99)

- Target 45–75 characters per line for body text and adjust column widths
  accordingly.
- Introduce responsive breakpoints to maintain optimal line length on different
  screens.
- Use layout containers or max-width utilities to prevent overly wide
  paragraphs.

### Baseline, not center (p.102)

- Align text blocks and icons using baselines rather than vertical centering to
  avoid optical misalignment.
- Configure layout systems (auto-layout, flexbox) to respect baseline alignment
  where available.
- Review multi-line components (e.g., cards with titles and descriptions) for
  consistent baselines.

### Line-height is proportional (p.105)

- Establish default line-height ratios for each text style in your type scale.
- Adjust line-height for weight changes (e.g., tighter for bold, looser for
  light) to maintain readability.
- Verify legibility in languages with taller glyphs or diacritics that may
  require extra leading.

### Not every link needs a color (p.109)

- Provide multiple affordances for links: underline, iconography, or motion in
  addition to color.
- Reserve high-contrast colors for critical links or actions that need extra
  emphasis.
- Confirm hover and focus states remain distinguishable for keyboard and screen
  reader users.

### Align with readability in mind (p.111)

- Choose left alignment for left-to-right languages by default; center only
  short or symmetrical content.
- Avoid mixing multiple alignment styles within the same section unless it
  supports comprehension.
- Validate readability for translated content that may alter text direction or
  length.

### Use letter-spacing effectively (p.115)

- Increase tracking for all-caps labels and small text to improve clarity.
- Reduce tracking for large headlines to prevent letters from feeling
  disconnected.
- Test adjustments in the target rendering environment to account for font
  hinting differences.

## Working with Color

### Ditch hex for HSL (p.119)

- Build palettes using HSL sliders to control hue, saturation, and lightness
  independently.
- Document base hues and the adjustments needed for hover, focus, and disabled
  states.
- Translate approved HSL values to HEX only when handing off to implementation
  teams that require it.

### You need more colors than you think (p.123)

- Plan supporting neutrals, semantic states, and accent colors during the
  palette design phase.
- Create usage guidelines that map colors to roles (primary action, background,
  feedback, etc.).
- Stress-test the palette against real UI scenarios like charts, alerts, and
  form states.

### Define your shades up front (p.129)

- Generate tonal scales (e.g., 50–900) for each core hue and document their
  intended uses.
- Ensure steps in the scale represent perceptible differences for accessibility.
- Share shade tokens with developers for consistent application across
  components.

### Don’t let lightness kill your saturation (p.133)

- Adjust saturation alongside lightness when lightening colors to preserve
  vibrancy.
- Compare light and dark variants side-by-side to maintain brand recognition.
- Test colors on common devices to ensure the perceived saturation meets
  expectations.

### Greys don’t have to be grey (p.139)

- Introduce subtle hue biases (warm or cool) to greys to complement brand
  colors.
- Verify that tinted greys still meet contrast requirements with primary text
  colors.
- Document hue shifts so future additions stay aligned with the chosen
  direction.

### Accessible doesn’t have to mean ugly (p.142)

- Explore combinations that meet or exceed WCAG AA/AAA without defaulting to
  harsh contrasts.
- Use complementary accent colors, typography, or iconography to keep accessible
  designs delightful.
- Collect an accessibility palette with pre-vetted pairings for rapid use.

### Don’t rely on color alone (p.146)

- Pair color cues with icons, patterns, or text labels to convey state changes.
- Provide non-color feedback (shape, motion, copy) for error, success, and
  warning states.
- Audit flows using accessibility checklists to confirm color-independent
  comprehension.

## Creating Depth

### Emulate a light source (p.150)

- Decide on a consistent light direction and intensity for each experience.
- Apply the same logic to shadows, highlights, and gradients across components.
- Document lighting rules so new elements blend seamlessly with existing ones.

### Use shadows to convey elevation (p.158)

- Define elevation tiers (e.g., resting card, raised card, modal) and map shadow
  tokens to each.
- Preview shadows against various backgrounds to ensure clarity without
  overpowering content.
- Animate transitions between elevation states to reinforce spatial
  relationships.

### Shadows can have two parts (p.163)

- Combine a soft, diffused ambient shadow with a sharper key shadow for realism.
- Adjust blur, spread, and opacity separately to fine-tune the depth effect.
- Ensure layered shadows render efficiently across platforms and do not harm
  performance.

### Even flat designs can have depth (p.167)

- Use subtle gradients, color overlays, and layering to imply hierarchy without
  skeuomorphism.
- Offset overlapping elements slightly to create separation while maintaining
  cleanliness.
- Validate depth cues in high-contrast and reduced-motion modes to ensure
  usability.

### Overlap elements to create layers (p.170)

- Intentionally overlap imagery, cards, or text to show relationships between
  content.
- Provide sufficient padding and z-index management so overlaps remain legible
  and interactive.
- Test overlaps on touch devices to confirm they do not hinder tap targets.

## Working with Images

### Use good photos (p.174)

- Source high-resolution, authentic imagery that reflects your audience and
  brand values.
- Establish cropping and focal-point guidelines for consistency across
  placements.
- Document licensing and attribution requirements for every asset.

### Text needs consistent contrast (p.176)

- Apply color overlays or scrims when placing text over photos to maintain
  readability.
- Verify contrast ratios for text in all responsive states and art-directed
  crops.
- Provide fallback backgrounds when images fail to load to keep text legible.

### Everything has an intended size (p.181)

- Define the minimum and maximum display sizes for each asset type.
- Export imagery at 1x, 2x, and 3x resolutions for crisp rendering on
  high-density displays.
- Monitor file sizes and compression to balance performance with visual quality.

### Beware user-uploaded content (p.187)

- Design safe zones and aspect ratio constraints to handle unpredictable
  uploads.
- Offer guidance or inline validation to encourage appropriate file types and
  dimensions.
- Implement fallbacks (icons, patterns) for missing or inappropriate content.

## Finishing Touches

### Supercharge the defaults (p.192)

- Customize native controls, focus states, and form elements to match the brand
  system.
- Replace default tooltips, notifications, and dialogs with on-brand
  equivalents.
- Document component defaults so future teams don’t revert to unstyled patterns.

### Add color with accent borders (p.195)

- Introduce slim borders or sidebars to bring brand color into otherwise neutral
  layouts.
- Pair accent borders with spacing adjustments to avoid crowding content.
- Ensure borders remain visible against both light and dark backgrounds.

### Decorate your backgrounds (p.198)

- Layer gradients, textures, or subtle illustrations behind content to add
  depth.
- Keep decorative elements low-contrast to avoid competing with foreground
  information.
- Provide simplified alternatives for high-contrast or reduced-motion
  accessibility modes.

### Don’t overlook empty states (p.203)

- Design first-use, loading, and zero-data screens with clear guidance and
  personality.
- Include primary and secondary actions so users know what to do next.
- Revisit empty states when features evolve to keep messaging relevant.

### Use fewer borders (p.206)

- Favor spacing, color blocks, or shadows to create separation instead of
  default borders.
- When borders are necessary, lighten their color or reduce their width to
  minimize noise.
- Audit complex screens to remove redundant dividers that add clutter.

### Think outside the box (p.210)

- Experiment with unexpected layouts or shapes where it reinforces brand
  personality.
- Prototype variations and test them with users to ensure novelty doesn’t hurt
  usability.
- Record learnings from experiments to inform future design explorations.

## Leveling Up

### Leveling up (p.215)

- Keep a running log of lessons learned after each project, including what
  worked and what didn’t.
- Share patterns, components, and documentation with the team to improve
  collective craft.
- Set personal learning goals (workshops, reading, mentorship) to continue
  growing as a designer.
