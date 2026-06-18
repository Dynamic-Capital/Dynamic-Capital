# Page Numbering, Table of Contents, and Page Navigation Guide

This guide summarizes best practices for professional documents, focusing on
page numbering, table of contents creation, and the consistent use of headers
and footers.

## Quick Implementation Workflow

Use the following high-level runbook before diving into the detailed checklists.
Each step links to a deeper section in this guide.

1. **Audit the document sections.** Identify which pages belong in the front
   matter, the main body, and supporting materials so that page numbering rules
   can be applied correctly.
2. **Configure page numbering styles.** Apply Roman numerals to the front matter
   and Arabic numerals to the main body, choosing continuous or section-based
   numbering as required.
3. **Build or refresh the TOC.** Generate or update the table of contents to
   reflect the latest headings and ensure numbering alignment.
4. **Standardize headers and footers.** Populate the header with identity
   information and the footer with navigation aids such as page numbers or
   notes.
5. **Run a navigation review.** Walk through the final review checklist to
   confirm numbering, TOC links, and navigation cues all match the finished
   document.

## Page Numbering Strategies

| Numbering style                    | Where to use it                                                                  | Configuration notes                                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Roman numerals (i, ii, iii, …)** | Front matter (acknowledgments, abstract, TOC, lists of figures/tables)           | Set the start number to `i` and enable separate headers/footers so the style does not bleed into the main body.                 |
| **Arabic numerals (1, 2, 3, …)**   | Main body (introduction through appendices)                                      | Start at `1` when the main body begins—usually the introduction—and confirm the style is locked for the remaining sections.     |
| **Continuous numbering**           | Regulatory reports or long-form deliverables that need a single reference stream | Configure the page-numbering dialog to “Continue from previous section” so each break inherits the latest value.                |
| **Section-based numbering**        | Training manuals or textbooks where each chapter stands alone                    | Enable “Restart each section” and confirm that chapters with appendices still follow the parent chapter’s numbering convention. |

> **Academic tip:** Many academic papers begin Arabic numbering at the
> introduction while keeping front matter in Roman numerals. Add a section break
> between the front matter and the first chapter so the numbering styles stay
> isolated.

### Page Numbering Checklist

- [ ] Assign Roman numerals to all front-matter sections (acknowledgments,
      abstract, TOC, lists of figures/tables).
- [ ] Begin Arabic numerals at the introduction or first chapter.
- [ ] Confirm that continuous or section-based numbering matches stakeholder or
      publication requirements.
- [ ] Verify headers and footers display the correct numeral style for each
      section break.

#### How to Complete These Tasks

- **Assign Roman numerals to front matter**
  1. Insert a section break between the cover content and the acknowledgments or
     abstract.
  2. Open the page-number formatting dialog and choose Roman numerals (`i, ii,
     iii`).
  3. Ensure “Apply to: This section” is selected so later sections can use a
     different style.
  4. Confirm the numbering starts at `i` by using the “Set value” option.
- **Switch to Arabic numerals for the main body**
  1. Place the cursor on the first page of the introduction.
  2. Add another section break (next page) to isolate the main content.
  3. Re-open the page-number formatting dialog, select Arabic numerals, and set
     the starting number to `1`.
- **Validate continuous or section-based numbering**
  1. Review the document requirements or stakeholder guidance.
  2. In the page-numbering options, choose either “Continue from previous
     section” (continuous) or “Restart at 1” (section-based).
  3. Scroll through each section break to ensure the numbering behaves as
     intended.
- **Check header/footer numeral styles**
  1. Toggle the “Link to Previous” option off in headers/footers where styles
     change.
  2. Verify the displayed numeral style matches the page-number settings for the
     current section.
  3. Update header/footer fields if the numeral style is inherited from the
     wrong section.

## Table of Contents (TOC)

The TOC acts as the map of your document and should list the major sections
alongside their page numbers. Decide whether the document will live inside a
word processor, PDF export, or web view so you can match the TOC style to the
publishing environment.

### TOC Types

- **Automatic TOC**
  - Generated by word processors such as Microsoft Word, Google Docs, or LaTeX.
- **Manual TOC**
  - Curated by hand, usually reserved for shorter documents or when automation
    is unavailable.

### TOC Levels

- **Main headings**
  - Chapters or primary sections.
- **Subheadings**
  - Sub-sections, appendices, or nested topics.
- **Optional lists**
  - Figures, tables, and abbreviations when relevant.

### TOC Implementation Checklist

- [ ] Capture all top-level sections (chapters, major headings) in the TOC.
- [ ] Include relevant subheadings for deeper navigation where helpful.
- [ ] Insert optional lists for figures, tables, or abbreviations when the
      document includes them.
- [ ] Update page numbers automatically or re-check manual entries after layout
      changes.

#### How to Complete These Tasks

- **Capture top-level sections**
  1. Apply the correct heading styles (e.g., Heading 1) to each main section.
  2. Refresh the automatic TOC or, for a manual TOC, type the headings with the
     corresponding page numbers.
- **Add subheadings**
  1. Style subsections with Heading 2/Heading 3.
  2. Regenerate the TOC and confirm the indentation reflects the hierarchy.
- **Insert optional lists**
  1. Label figures and tables with captions so they appear in list generators.
  2. Use the “Insert Table of Figures/Tables” feature or manually compose the
     list when automation is unavailable.
- **Update page numbers after layout changes**
  1. Right-click the TOC and choose “Update Field → Update Entire Table.”
  2. For manual TOCs, recheck pagination and edit the numbers directly.

## Headers and Footers

Headers and footers appear on every page and provide identity and navigation
cues.

- **Typical header content**
  - Document title or current chapter, author name, or institutional
    affiliation.
- **Typical footer content**
  - Page numbers, publication date, and footnotes with references or explanatory
    notes.
- **Professional writing guideline**
  - Treat the header as the document identity and the footer as the navigation
    anchor.

### Header and Footer Checklist

- [ ] Display the document title, chapter, or section name in the header.
- [ ] Include author or institution details if required by the format or
      audience.
- [ ] Place page numbers in the footer, centered or aligned per style guide.
- [ ] Add footnotes or publication dates only when necessary to avoid clutter.
- [ ] Confirm odd/even pages use mirrored layouts when printing double-sided
      reports.
- [ ] Verify section breaks reset header/footer content appropriately (e.g.,
      chapter name updates while the document title remains consistent).

#### How to Complete These Tasks

- **Header identity details**
  1. Activate the header area and insert a field for the document title or
     current heading.
  2. Use styles that match the organization’s branding guidelines.
- **Author or institution details**
  1. Determine whether the document requires author attribution in every header.
  2. If so, insert the text or fields once and use “Link to Previous” to copy
     them through identical sections.
- **Footer page numbers**
  1. Insert page numbers via the footer interface and choose the required
     alignment.
  2. Confirm the numbering style matches the current section’s numeral format.
- **Optional footnotes or dates**
  1. Add dates or footnotes only when they support the document’s purpose (e.g.,
     revision history).
  2. Keep the layout uncluttered by limiting the footer to essential elements.
- **Mirrored layouts**
  1. Enable “Different Odd & Even Pages” for double-sided documents.
  2. Align headers/footers so inner margins carry binding information and outer
     margins show navigation cues.
- **Section break resets**
  1. For each section break, confirm the header updates to the new chapter title
     while the footer maintains consistent navigation.
  2. Remove stray “Link to Previous” connections if content should change.

## Placement within a Document

- **Overview**
  - Appears before the table of contents to introduce the document.
- **Summary or abstract**
  - Placed in the front matter, commonly before or immediately after the TOC.
- **Main body**
  - Contains analysis, findings, discussion, and evidence structured according
    to the TOC entries.
- **Referencing and index**
  - Located at the end of the document after the main content and appendices.
- **Grading or scoring rubrics**
  - Often reference proper numbering, TOC accuracy, and navigation clarity—keep
    supporting evidence (screenshots or PDF exports) with submissions.
- **Headers and footers**
  - Applied consistently across the entire document for continuity.

## Document Element Interactions

Use this reference to keep navigation artifacts aligned while you draft or edit
the report.

- **Overview → TOC**
  - Link the overview’s promises to TOC entries so reviewers can jump to the
    relevant sections.
- **Summary or abstract → Main body**
  - Ensure summary insights cite the sections that expand on them. Cross-check
    page numbers after layout changes.
- **TOC → Analysis sections**
  - Every heading in the analysis must appear in the TOC at the appropriate
    level; regenerate automatic TOCs after structural edits.
- **Analysis → Referencing**
  - Footnotes and in-text citations must map to the reference list and share the
    correct numbering or identifier system.
- **Referencing → Index**
  - Use consistent terminology so the index can point readers to both analysis
    sections and citation details.
- **Headers/footers → Navigation cues**
  - Pair the header (identity) and footer (page number/notes) so readers always
    know where they are in the document.
- **Grading or scoring → Evidence packet**
  - Capture PDF exports or screenshots of numbering, TOC, and navigation
    elements to satisfy academic or professional review requirements.

### Final Review Checklist

- [ ] Confirm that the front matter precedes the TOC and uses Roman numerals.
- [ ] Ensure the summary, analysis, references, index, and appendices appear in
      the order outlined below.
- [ ] Regenerate automatic TOCs or update manual entries after any content
      changes.
- [ ] Scan the document to confirm headers and footers remain consistent across
      section breaks.
- [ ] Verify that in-text citations align with the reference list and the index
      anchors point to the correct pages.
- [ ] Capture an export (PDF or print preview) that demonstrates numbering and
      navigation accuracy for grading or stakeholder sign-off.

#### How to Complete These Tasks

- **Front matter verification**
  1. Review the document structure in the navigation pane or outline view.
  2. Check that all front matter pages use Roman numerals before the TOC.
- **Content order confirmation**
  1. Compare the document’s section order to the recommended report structure.
  2. Move misplaced sections so the narrative flows from overview to appendices.
- **TOC refresh**
  1. Update the TOC and any lists of figures/tables to capture late edits.
  2. Scroll through the document to confirm the page numbers match the TOC.
- **Header/footer consistency audit**
  1. Inspect each section break in print preview mode.
  2. Ensure headers carry the correct chapter names and footers show the right
     numbering style.
- **Citation and index alignment**
  1. Cross-reference in-text citations with the reference list entries.
  2. Verify index anchors resolve to the correct pages or headings.
- **Export evidence**
  1. Produce a PDF or print preview and skim it for numbering or TOC issues.
  2. Save the export as part of the submission or review evidence.

## Example Professional Report Structure

1. Cover page
2. Acknowledgments (Roman i)
3. Abstract or summary (Roman ii)
4. Table of contents (Roman iii)
5. List of figures and tables (Roman iv)
6. Introduction (Arabic 1)
7. Main body (analysis, findings, discussion)
8. Conclusion and recommendations
9. References or bibliography
10. Index
11. Appendices

**Navigation cues**

- Headers might display the report title (e.g., “Report on Renewable Energy”).
- Footers typically show centered page numbers and optional footnotes.

By aligning page numbering, TOCs, and navigation elements, documents remain
professional, readable, and easy to grade or review.
