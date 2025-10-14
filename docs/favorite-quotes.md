<!-- deno-fmt-ignore-file -->

# Dynamic Quote Collection

## Collection Overview

| Theme | Quote | Author | Core Tags |
| --- | --- | --- | --- |
| Resilience | "People have many different ways of thinking. Even if you make a mistake, if you realize it was a mistake, you can always fix it. Then if you turn around, you will see the future. This must be realized by oneself." | Vash the Stampede | reflection, growth, hope |
| Resilience | "Fall seven times and stand up eight." | Japanese Proverb | perseverance, growth |
| Vision | "The future depends on what you do today." | Mahatma Gandhi | action, future |
| Vision | "Imagination is more important than knowledge." | Albert Einstein | creativity, innovation |

The collection spans themes of resilience and vision to keep messaging adaptable across campaigns. Each quote includes metadata such as origin, contextual notes, and curation scores that the dynamic engine can use for sequencing and emphasis.

## Using the Dynamic Quote Engine

```python
from dynamic_quote.collection import QuoteCollection, seed_default_quotes
from dynamic_quote.engine import QuoteContext

collection = QuoteCollection()
seed_default_quotes(collection)

context = QuoteContext(
    campaign="Launch Week",
    audience="community",
    tone="uplifting",
    urgency=0.7,
    novelty_pressure=0.6,
    emotional_intensity=0.65,
    preferred_tags=("growth", "innovation"),
    avoid_topics=("scarcity",),
)

digest = collection.build_digest(context)
print(digest.highlight_quotes)
```

This workflow seeds the collection, targets a specific activation context, and produces a digest containing highlight quotes, activation prompts, and refinement guidance. Adjust the context parameters or append new quotes to adapt the lineup for future campaigns.
