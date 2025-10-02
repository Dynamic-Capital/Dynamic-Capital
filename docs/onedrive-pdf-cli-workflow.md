# OneDrive PDF CLI Workflow

## Overview

This runbook captures how to pull PDF documents from Microsoft OneDrive using
command line tooling and convert them into training-ready datasets for AI
experiments. It combines Microsoft Graph SDK automation with rclone-based sync
routines, highlights dataset extraction patterns, and finishes with runnable
scripts for fully automated pipelines.

## 1. Accessing OneDrive from the CLI

### 1.1 Microsoft Graph SDK (Python)

Install the Graph client and authenticate with an Azure AD application that has
permission to read the target OneDrive directory.

```python
from msgraph import GraphServiceClient
from azure.identity import InteractiveBrowserCredential
import asyncio
import os

async def download_pdfs_from_onedrive(folder_path: str, local_dir: str):
    credential = InteractiveBrowserCredential(
        client_id="YOUR_CLIENT_ID",
        tenant_id="YOUR_TENANT_ID",
    )

    client = GraphServiceClient(credentials=credential)
    items = await client.me.drive.root.item_with_path(folder_path).children.get()

    os.makedirs(local_dir, exist_ok=True)

    for item in items.value:
        if item.name.endswith(".pdf"):
            content = await client.me.drive.items.by_drive_item_id(item.id).content.get()

            with open(os.path.join(local_dir, item.name), "wb") as f:
                f.write(content)

            print(f"Downloaded: {item.name}")

asyncio.run(download_pdfs_from_onedrive("/Documents/PDFs", "./local_pdfs"))
```

### 1.2 rclone Sync

When a shell-first workflow is preferred, use rclone to mirror PDF assets from
OneDrive into a local working directory.

```bash
curl https://rclone.org/install.sh | sudo bash
rclone config  # add an "onedrive" remote
rclone copy onedrive:/path/to/pdfs ./local_pdfs --include "*.pdf"
# Batch sync example
rclone sync onedrive:/Documents/Training_PDFs ./data/pdfs --progress
```

## 2. Building the Training Dataset Pipeline

Use `pdfplumber` to extract text, tables, and metadata before serialising the
content into JSON or JSONL files that align with fine-tuning or RAG ingestion
requirements.

```python
import json
from typing import Dict, List
import pdfplumber
from pathlib import Path

class PDFTrainingDataExtractor:
    """Extract and format PDF data for AI training."""

    def __init__(self, pdf_dir: str, output_dir: str):
        self.pdf_dir = Path(pdf_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def extract_for_training(self, pdf_path: str) -> Dict:
        with pdfplumber.open(pdf_path) as pdf:
            pages_data = []

            for page_num, page in enumerate(pdf.pages):
                pages_data.append(
                    {
                        "page_number": page_num + 1,
                        "text": page.extract_text(),
                        "tables": page.extract_tables(),
                        "metadata": {"width": page.width, "height": page.height},
                    }
                )

            return {
                "filename": Path(pdf_path).name,
                "total_pages": len(pages_data),
                "pages": pages_data,
                "document_metadata": pdf.metadata,
            }

    def create_training_dataset(self, format_type: str = "jsonl"):
        all_data = []

        for pdf_file in self.pdf_dir.glob("*.pdf"):
            print(f"Processing: {pdf_file.name}")

            try:
                extracted = self.extract_for_training(str(pdf_file))

                if format_type == "jsonl":
                    for page in extracted["pages"]:
                        all_data.append(
                            {
                                "prompt": "Extract information from this document page:",
                                "completion": page["text"],
                                "metadata": {
                                    "source": extracted["filename"],
                                    "page": page["page_number"],
                                },
                            }
                        )
                elif format_type == "qa_pairs":
                    all_data.append(
                        {
                            "document": extracted["filename"],
                            "content": " ".join(page["text"] for page in extracted["pages"]),
                            "tables": [
                                table
                                for page in extracted["pages"]
                                for table in page["tables"]
                                if table
                            ],
                        }
                    )
            except Exception as exc:
                print(f"Error processing {pdf_file.name}: {exc}")

        if format_type == "jsonl":
            output_file = self.output_dir / "training_data.jsonl"
            with open(output_file, "w", encoding="utf-8") as f:
                for item in all_data:
                    f.write(json.dumps(item) + "\n")
        else:
            output_file = self.output_dir / "training_data.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(all_data, f, indent=2)

        print(f"Training data saved to: {output_file}")
        print(f"Total examples: {len(all_data)}")
        return output_file
```

Instantiate the extractor to prepare datasets for downstream fine-tuning:

```python
extractor = PDFTrainingDataExtractor("./local_pdfs", "./training_data")
extractor.create_training_dataset(format_type="jsonl")
```

## 3. CLI Automation Wrapper

Package the workflow in a CLI utility so teams can download, parse, and format
PDFs in a single command.

```python
#!/usr/bin/env python3
"""CLI tool for PDF extraction and training data preparation."""

import argparse
import subprocess


def main():
    parser = argparse.ArgumentParser(
        description="Extract PDFs from OneDrive for AI training"
    )
    parser.add_argument("--onedrive-path", required=True, help="OneDrive folder path")
    parser.add_argument("--output", default="./training_data", help="Output directory")
    parser.add_argument("--batch-size", type=int, default=10, help="Batch size for processing")
    parser.add_argument("--format", choices=["jsonl", "qa_pairs"], default="jsonl")
    args = parser.parse_args()

    print("Downloading PDFs from OneDrive...")
    subprocess.run(
        [
            "rclone",
            "sync",
            f"onedrive:{args.onedrive_path}",
            "./temp_pdfs",
            "--include",
            "*.pdf",
        ],
        check=True,
    )

    print("\nExtracting training data...")
    extractor = PDFTrainingDataExtractor("./temp_pdfs", args.output)
    output_file = extractor.create_training_dataset(format_type=args.format)

    print(f"\n✓ Complete! Training data: {output_file}")


if __name__ == "__main__":
    main()
```

## 4. Training Data Formats

### 4.1 Fine-tuning Payloads

```python
def create_finetuning_format(text: str, doc_type: str) -> Dict:
    return {
        "messages": [
            {
                "role": "user",
                "content": f"Analyze this {doc_type} document and extract key information.",
            },
            {"role": "assistant", "content": text},
        ]
    }
```

### 4.2 Retrieval-Augmented Generation Chunks

```python
def create_rag_chunks(text: str, chunk_size: int = 1000) -> List[Dict]:
    chunks = []
    words = text.split()

    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append({"text": chunk, "chunk_id": i // chunk_size, "embedding": None})

    return chunks
```

## 5. End-to-End Automation Script

```bash
#!/bin/bash
# automation.sh - Complete pipeline

set -euo pipefail

echo "Syncing PDFs from OneDrive..."
rclone sync onedrive:/Training_Documents ./pdfs --progress

echo "Extracting training data..."
python pdf_trainer.py --onedrive-path /Training_Documents --output ./data --format jsonl

echo "Training data ready at ./data/training_data.jsonl"
rm -rf ./temp_pdfs
```

## 6. Recommended Packages

Install the supporting libraries before running the workflow:

```bash
pip install pdfplumber msgraph-sdk msal pandas python-dotenv
pip install openai anthropic
pip install langchain chromadb
```

## 7. Training Approaches

Use the generated datasets for multiple AI training scenarios:

1. **Fine-tuning** – Feed JSONL examples into Claude, GPT, or similar services.
2. **RAG** – Chunk content and store it in vector databases such as ChromaDB or
   Pinecone.
3. **Prompt engineering** – Inject extracted passages as context in prompt
   templates.
4. **Document classification** – Train classifiers to categorise or route
   incoming PDFs.
5. **Named entity recognition** – Label entities and fine-tune models for
   targeted extraction.

## 8. Operational Tips

- Batch downloads to avoid throttling Microsoft Graph or OneDrive APIs.
- Keep secrets (`client_id`, `tenant_id`, `rclone` tokens) outside the
  repository and load them from environment variables or secret managers.
- Monitor disk usage in `./temp_pdfs` and clean up the directory after
  successful dataset generation.
- Version training datasets alongside the models or experiments that consume
  them for reproducibility.
