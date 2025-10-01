# Term Frequency–Inverse Document Frequency

**Modules:** `dynamic_arrow`, `dynamic_ascii`, `dynamic_vocabulary`,
`dynamic_index`

## Overview

Scores term relevance across a corpus using TF-IDF weighting.

## Equation

$$w_{t,d} = \text{tf}_{t,d} \cdot \log\left(\frac{N}{\text{df}_t}\right).$$

- $\text{tf}_{t,d}$ — term frequency in document $d$ (state feature).
- $N$ — total documents; $\text{df}_t$ — document frequency for term $t$.

## Notes

- Controls $u_t$ define thresholding for indexing or summarization.
- TF-IDF vectors feed downstream similarity metrics in outputs.
