# Open-Source AI Crawlers

## Overview

Modern AI projects need ingestion pipelines that can keep pace with rapidly
changing web content. The frameworks below focus on producing large volumes of
structured, model-ready data while handling JavaScript-heavy pages, bot
countermeasures, and custom extraction logic. Use this guide to quickly compare
their strengths and select a crawler that matches your throughput,
configurability, and integration requirements.

## Quick Comparison

| Framework     | Language            | Signature Strengths                                                                                                   | Output Formats           | Ideal Team Profile                                                                      |
| ------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| Crawl4AI      | Python              | High-throughput crawling engine with concurrency controls and hook-based customization                                | Markdown (primary), JSON | Engineering teams building large-scale, automated ingestion loops                       |
| ScrapeGraphAI | Python              | Prompt-driven pipeline assembly that combines LLM reasoning with graph execution                                      | HTML, JSON, Markdown     | Developers comfortable with natural-language specifications who want flexible workflows |
| Firecrawl     | Python              | Cleans and normalizes modern websites while defending against anti-bot measures; integrates with LangChain/LlamaIndex | Markdown, JSON           | AI platform teams feeding RAG or fine-tuning corpora with minimal preprocessing         |
| Crawlee       | TypeScript & Python | Battle-tested crawling toolkit with proxy rotation, link discovery, and Playwright/BeautifulSoup adapters             | User-defined             | Full-stack teams needing browser automation and resilient scheduling                    |
| LLM Scraper   | TypeScript          | Schema-first extraction orchestrated by LLMs on top of Playwright sessions                                            | JSON (schema-aligned)    | Teams that require precise, typed payloads from complex pages                           |

## Repository Installation

- **Node toolchains:** Run `npm run crawlers:install` to fetch Crawlee, Firecrawl,
  and LLM Scraper directly from their GitHub repositories alongside the rest of
  the workspace dependencies.
- **Python libraries:** Execute `python -m pip install --upgrade --disable-pip-version-check -r dynamic_crawlers/requirements-github.txt`
  to install Crawl4AI and ScrapeGraphAI from source.

## Framework Profiles

### Crawl4AI

- **Core Focus:** High-performance Python crawler optimized for AI/LLM data
  pipelines.
- **Key Features:** Handles JavaScript-rendered pages, schedules concurrent
  fetches, and exposes hooks for custom parsing or enrichment.
- **Data Output:** Generates clean Markdown designed for downstream
  retrieval-augmented generation (RAG) or fine-tuning workflows.
- **Best For:** Teams running large-scale ingestion jobs that need deterministic
  structure and seamless LLM alignment without bolting on extra tooling.
- **Install:** `pip install --upgrade "crawl4ai @ git+https://github.com/unclecode/crawl4ai"`

### ScrapeGraphAI

- **Core Focus:** Prompt-programmed scraping graphs that translate
  natural-language goals into executable workflows.
- **Key Features:** Uses LLM reasoning to design scraping flows, supports
  single- and multi-page traversals, and emits HTML, JSON, or Markdown depending
  on the node configuration.
- **Data Output:** Structured payloads shaped by the described targets, letting
  teams iterate quickly without rewriting code.
- **Best For:** Developers who want to describe desired data in natural language
  and let the system synthesize the extraction plan.
- **Install:** `pip install --upgrade "scrapegraphai @ git+https://github.com/ScrapeGraphAI/Scrapegraph-ai"`

### Firecrawl

- **Core Focus:** Converting public sites into immediately usable, LLM-ready
  corpora.
- **Key Features:** Built-in Markdown/JSON normalization, resilience against
  anti-bot patterns, and integrations with LangChain, LlamaIndex, and similar
  frameworks.
- **Data Output:** Consistent Markdown or JSON that slots directly into
  knowledge bases, agent memories, or fine-tuning datasets.
- **Best For:** Teams that prioritize rapid ingestion of clean content into AI
  stacks without spending cycles on transformation scripts.
- **Install:** `npm install --no-save firecrawl@github:firecrawl/firecrawl`

### Crawlee

- **Core Focus:** General-purpose crawling and browser automation available for
  both TypeScript and Python ecosystems.
- **Key Features:** Provides request queues, link crawling helpers, proxy
  rotation, and adapters for Playwright, BeautifulSoup, or raw HTTP clients.
- **Data Output:** User-defined; Crawlee supplies the orchestration while
  letting you decide how to serialize and persist results.
- **Best For:** Engineering squads that need a resilient crawler capable of
  complex interactions, login flows, or custom scheduling.
- **Install:** `npm install --no-save crawlee@github:apify/crawlee`

### LLM Scraper

- **Core Focus:** Schema-driven data extraction orchestrated by large language
  models.
- **Key Features:** Built on Playwright, supports multiple LLM backends, and
  adheres to developer-defined TypeScript/JSON schemas for structured payloads.
- **Data Output:** JSON documents that follow the declared schema, enabling
  precise ingestion into typed pipelines.
- **Best For:** Teams that must guarantee schema fidelity when scraping dynamic,
  JavaScript-heavy pages.
- **Install:** `npm install --no-save llm-scraper@github:mishushakov/llm-scraper`

## Selection Guide

1. **Prioritize raw performance and scale:** Choose **Crawl4AI** when
   throughput, concurrency management, and deterministic Markdown output are the
   top priorities.
2. **Prefer natural-language workflow design:** Pick **ScrapeGraphAI** to draft
   extraction logic via prompts instead of code, especially for iterative
   research tasks.
3. **Need plug-and-play RAG corpora:** Adopt **Firecrawl** when you want
   normalized Markdown/JSON ready for LangChain, LlamaIndex, or custom vector
   stores.
4. **Require advanced browser automation:** Go with **Crawlee** for heavy
   automation, login flows, or when you already rely on Playwright/BeautifulSoup
   stacks.
5. **Demand schema-accurate payloads:** Select **LLM Scraper** when your
   downstream systems depend on strict JSON schemas and typed contracts.

## Implementation Checklist

- **Scope Requirements:** Document target domains, refresh cadence, expected
  volume, and compliance constraints before committing to a framework.
- **Prototype Extraction:** Run pilot jobs with representative URLs to confirm
  handling of dynamic content, pagination, and rate limits.
- **Plan for Observability:** Set up logging, retry policies, and
  content-diffing so you can monitor drift and data quality regressions.
- **Security & Ethics:** Respect robots.txt, rate limits, and terms of service.
  Mask or hash sensitive fields and ensure data governance aligns with legal
  standards.
- **LLM Integration:** Establish how the crawler hands off to vector databases,
  fine-tuning pipelines, or agent memory layers. Standardize Markdown/JSON
  schemas to simplify ingestion.

## Additional Resources

- Combine these crawlers with Dynamic Capital's existing data pipelines by
  mapping outputs to the ingestion queues defined in `data/` and `queue/`.
- Review the [knowledge-base-training-drop](./knowledge-base-training-drop.md)
  playbook to align crawled corpora with internal knowledge refresh routines.
- For proxy management or bot-defense strategies, cross-reference the
  [ton-proxy-rotations](./ton-proxy-rotations.md) checklist.
