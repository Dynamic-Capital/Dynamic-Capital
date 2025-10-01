# Flesch–Kincaid Readability Grade

**Modules:** `dynamic_text`, `dynamic_glossary`, `dynamic_summary`,
`dynamic_letter_index`

## Overview

Estimates reading grade level from sentence and syllable statistics.

## Equation

$$0.39 \frac{\text{words}}{\text{sentences}} + 11.8 \frac{\text{syllables}}{\text{words}} - 15.59.$$

## Notes

- Word/sentence counts derive from outputs of NLP pipelines ($y_t$).
- Controls $u_t$ enforce readability targets for documentation.
