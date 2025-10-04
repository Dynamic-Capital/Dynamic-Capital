# Codex Prompting Best Practices

These guidelines outline a structured workflow for interacting with Codex-style
models. Following them helps keep prompts focused, code generation reliable, and
iterations efficient.

## 1. Break Work Into Small, Ordered Steps

- Decompose complex tasks into sequential prompts (e.g., "read the CSV" → "clean
  the data" → "export the result").
- Validate each output before moving to the next step so issues are caught
  early.

```python
# Step 1: Read dataset
prompt = "Write Python code to read a CSV file using pandas."

# Step 2: Clean data
prompt = "Add code to handle missing values in the DataFrame."
```

## 2. Give Explicit, Detailed Instructions

- Specify required libraries, file paths, and expected behaviors.
- Document any edge cases the model should anticipate.

Generate prompts with explicit requirements:

```
Generate Python code to:
 - Load a CSV file using pandas.
 - Drop rows with missing values.
 - Save the cleaned data to a new CSV.
Include error handling for file not found.
```

## 3. Always Request Error Handling

- Ask for `try`/`except` blocks and defensive checks around external
  dependencies.
- Ensure responses validate paths, data formats, and assumptions.

```python
try:
    df = pd.read_csv("data.csv")
except FileNotFoundError:
    print("Error: File not found.")
```

## 4. Validate Outputs Incrementally

- Execute generated code in isolation before combining it with other snippets.
- Confirm imports resolve, data shapes match expectations, and edge cases (e.g.,
  empty datasets) are handled.

## 5. Provide Context and Examples

- Offer concise examples of the expected style or APIs (few-shot prompting).
- Clarify source locations (local files, URLs, APIs) and the exact output
  format.

Example of the desired context sharing:

```
Example of reading a CSV:
import pandas as pd
df = pd.read_csv("data.csv")

Now, write code to extract summary statistics from df.
```

## 6. Remove Ambiguity

- Reference concrete resources, including URLs or schema definitions.
- Specify formats for outputs (e.g., JSON structure, CSV columns).

## 7. Iterate and Refine

- If a response is incomplete, adjust the prompt with clearer constraints or
  additional context.
- Track rate limits and execution environments when automating prompt workflows.

## Example Workflow

```python
# Prompt 1: Data Extraction
prompt1 = """
Write Python code to fetch a dataset from a URL and load it into a pandas DataFrame.
URL: https://example.com/data.csv
Include error handling for HTTP errors.
"""
# (Run Codex with prompt1, then validate the output)

# Prompt 2: Data Cleaning
prompt2 = """
Using the DataFrame 'df', handle missing values by filling with the column mean.
"""
# (Run Codex with prompt2, then test the cleaning logic)
```

## Additional Tips

- Test snippets in isolated environments (e.g., Jupyter notebooks) before
  integrating them.
- Reference common libraries such as `pandas`, `requests`, or `sqlalchemy`
  explicitly.
- Watch for API rate limits and timeouts when chaining automated prompts.
