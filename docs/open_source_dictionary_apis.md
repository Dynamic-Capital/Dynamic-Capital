# Open-Source Dictionary APIs

This guide highlights several open-source dictionary APIs that are useful for
building language-aware applications. Each section includes data sources,
notable features, and practical usage tips to help you choose the right service
for your project.

## Quickstart Tasks

1. **Verify connectivity:** Issue the sample `curl` command provided for the API
   you plan to use and confirm you receive a `200 OK` JSON response.
2. **Map response fields:** Run the parsing snippet (Python or shell) to extract
   definitions, phonetics, and example sentences from the payload.
3. **Normalize for Dynamic AGI:** Convert the parsed data into a compact
   dictionary and feed it into `DynamicAGIModel.evaluate()` following the
   example below.
4. **Record findings:** Capture any anomalies (missing fields, rate-limit
   headers, latency spikes) in your integration notes so the evaluation loop can
   address them.
5. **Re-run with cached inputs:** Repeat the request using your application
   cache or proxy to confirm deterministic results before promoting the
   workflow.

### Runbook

Execute the following commands locally (or in CI) to exercise each checklist
item end-to-end:

1. **Hit the API and confirm transport health.**

   ```bash
   # Replace <word> and <api> as needed; expect HTTP/2 200 with JSON in the body.
   curl -i "https://api.dictionaryapi.dev/api/v2/entries/en/liquidity" | head -n 5
   ```

2. **Project key lexical fields.** Use `jq` for shell-based parsing or the
   Python helper below for richer validation.

   ```bash
   curl -s "https://api.dictionaryapi.dev/api/v2/entries/en/liquidity" \
     | jq '.[0] | {word, phonetic, definition: .meanings[0].definitions[0].definition}'
   ```

   ```python
   import json
   import urllib.request

   with urllib.request.urlopen(
       "https://api.dictionaryapi.dev/api/v2/entries/en/liquidity"
   ) as response:
       payload = json.loads(response.read())

   entry = payload[0]
   lexical_projection = {
       "word": entry.get("word"),
       "phonetics": [item.get("text") for item in entry.get("phonetics", []) if item.get("text")],
       "definitions": [
           definition.get("definition")
           for meaning in entry.get("meanings", [])
           for definition in meaning.get("definitions", [])
       ],
       "examples": [
           definition.get("example")
           for meaning in entry.get("meanings", [])
           for definition in meaning.get("definitions", [])
           if definition.get("example")
       ],
   }

   print(json.dumps(lexical_projection, indent=2))
   ```

3. **Normalize and send to Dynamic AGI.** Combine the projected fields with any
   upstream signals (market data, experiment metadata) before invoking the
   evaluation model as shown later in this guide.

4. **Document anomalies.** Append structured notes—status codes, missing fields,
   throttling headers—to your run log or issue tracker so the evaluation
   feedback loop has concrete observations to address.

5. **Repeat against cache or proxy.** Re-run the exact request through your
   caching tier and diff the payload. A zero-diff result validates deterministic
   semantics for the scenario you just exercised.

## 1. Free Dictionary API

This popular and straightforward service is ideal when you need to wire up
dictionary functionality quickly.

- **Data source:** English Wiktionary.
- **Key features:** Definitions, phonetics, pronunciations, parts of speech,
  synonyms, and example sentences.
- **Usage:** No API key required. Access via REST at
  `https://api.dictionaryapi.dev/api/v2/entries/en/<word>`.
- **Documentation:** Clear guidance is maintained on GitHub and public API
  directories.

```bash
curl -s "https://api.dictionaryapi.dev/api/v2/entries/en/liquidity" | jq '.[0].meanings[0].definitions[0].definition'
```

## 2. Wiktionary API

As the source that powers Free Dictionary, the Wiktionary API provides direct
access to the collaborative, multilingual corpus.

- **Data source:** Community-driven Wiktionary project across many languages.
- **Key features:** Definitions, translations, etymologies, pronunciations, and
  other linguistic data.
- **Usage:** Query via MediaWiki API endpoints, such as
  `https://en.wiktionary.org/w/api.php` for English.

```bash
curl -s "https://en.wiktionary.org/w/api.php?action=query&prop=extracts&format=json&titles=liquidity" | jq '.query.pages[] | .title, .extract'
```

## 3. Wordnik API

Wordnik aggregates multiple commercial and open dictionary sources into a
single, developer-friendly interface.

- **Data source:** Wiktionary, American Heritage Dictionary, Century Dictionary,
  WordNet, and additional partners.
- **Key features:** Definitions, synonyms, antonyms, example sentences, audio
  pronunciations, and a word-of-the-day feed.
- **Usage:** Offers a dedicated developer portal. An API key is required for
  most requests, though the free tier covers many common use cases.

```bash
WORDNIK_KEY="<your-api-key>"
curl -s "https://api.wordnik.com/v4/word.json/liquidity/definitions?limit=1&includeRelated=false&sourceDictionaries=ahd" \
  -H "accept: application/json" \
  -H "api_key: ${WORDNIK_KEY}" | jq '.[0].text'
```

## 4. Datamuse API

While not a traditional dictionary, Datamuse excels at semantic and phonetic
relationships that complement definition-based lookups.

- **Data source:** Word-finding engine built on aggregated linguistic data.
- **Key features:** Surface words by rhyme, meaning, sound, or topical
  association to enrich creative or analytical workflows.
- **Usage:** Free, API-key-free endpoints with parameters geared toward word
  discovery rather than canonical definitions.

```bash
curl -s "https://api.datamuse.com/words?ml=liquidity&max=5" | jq '.[].word'
```

## Selection Considerations

- **Licensing:** Check that the license aligns with your distribution plans,
  particularly for commercial products.
- **Data quality and scope:** Evaluate language coverage, update cadence, and
  whether entries include the metadata (phonetics, usage, etc.) you require.
- **Maintenance and community:** Favor APIs with active stewards, release notes,
  and responsive support channels.

## Complete Tasks

1. [ ] Identify the dictionary API that best fits your language and licensing
       requirements.
2. [ ] Issue a sample request (e.g., `curl` or `requests`) to confirm the
       endpoint and payload format.
3. [ ] Normalise the response into definitions, synonyms, and usage examples
       required by your workflow.
4. [ ] Feed the processed payload into `DynamicAGIModel.evaluate()` via the
       `research` argument.
5. [ ] Capture reviewer notes or user feedback in `feedback_notes` to guide
       iterative improvements.
6. [ ] Re-run the evaluation to verify the updated context resolves any
       outstanding lexical gaps.
7. [ ] Log latency, error rates, and rate-limit headers in your monitoring stack
       to catch regressions early.
8. [ ] Schedule recurring validation (e.g., weekly) to ensure upstream API
       schema or licensing changes are surfaced quickly.

## Connect with Dynamic AGI

The `dynamic.intelligence.agi` package can ingest dictionary outputs as part of a broader
knowledge or research pipeline. Use dictionary entries to enrich the `research`
payload that accompanies a market or product evaluation.

1. Normalise the API response into lightweight fields (definitions, synonyms,
   usage examples) so the AGI layer can digest it alongside other telemetry.
2. Thread the processed payload into `DynamicAGIModel.evaluate()` via the
   `research` argument, keeping contextual tags (e.g., language, domain) that
   matter for downstream analysis.
3. Record any follow-up questions or human feedback in `feedback_notes` so the
   `DynamicSelfImprovement` manager can refine future prompts.

```python
from dynamic.intelligence.agi import DynamicAGIModel

model = DynamicAGIModel()

dictionary_summary = {
    "term": "liquidity",
    "definitions": [
        "The ability to quickly convert an asset into cash without affecting the price."
    ],
    "synonyms": ["marketability", "fluidity"],
    "phonetics": ["lɪˈkwɪdɪti"],
    "examples": ["High liquidity lets traders exit large positions without moving the market."],
    "sources": ["free-dictionary"],
}

agi_output = model.evaluate(
    market_data={"symbol": "DCT", "price": 2.43},
    research={"lexical_insights": dictionary_summary},
    feedback_notes=[
        "Highlight regulatory-specific definitions in the next iteration."
    ],
)

metadata = agi_output.to_dict()
print(metadata["version"])  # Dynamic AGI-00.01
print(metadata["version_info"]["number"]["formatted"])  # 00.01
print(metadata["generated_at"])  # 2024-06-05T13:25:42.901823+00:00
```

This pattern keeps dictionary intelligence aligned with broader market context,
enabling Dynamic AGI to fold linguistic nuance into its decisioning loop. Each
evaluation now returns a `generated_at` timestamp alongside structured version
metadata, simplifying chronological log reviews and cross-model comparisons.
