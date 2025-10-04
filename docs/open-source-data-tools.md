# Open-Source Tools for Data Tasks

This quick-reference guide pairs common data collection and preparation goals
with trusted open-source tools you can adopt immediately.

| Goal                                     | Recommended Open-Source Tool(s)                                                                 | Notes                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Scrape text/data from the web            | [Scrapy](https://scrapy.org/), [Beautiful Soup](https://www.crummy.com/software/BeautifulSoup/) | Scrapy is ideal for large-scale, structured crawling; Beautiful Soup excels at lightweight HTML parsing. |
| Extract text/tables from PDFs            | [pdfplumber](https://github.com/jsvine/pdfplumber)                                              | Provides precise PDF text and table extraction with coordinate-aware parsing.                            |
| Read text from scanned documents/images  | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)                                          | Offers multilingual OCR with pre-trained models and easy fine-tuning.                                    |
| Download videos for video/audio datasets | [yt-dlp](https://github.com/yt-dlp/yt-dlp)                                                      | A maintained fork of youtube-dl supporting extensive video/audio sources.                                |
| Label images (boxes, polygons)           | [CVAT](https://www.cvat.ai/)                                                                    | Web-based annotation suite with collaborative workflows and automation.                                  |
| Label text (NER, classification)         | [Label Studio](https://labelstud.io/), [Doccano](https://github.com/doccano/doccano)            | Flexible labeling platforms covering NLP, audio, and computer vision tasks.                              |
| Version and track your datasets          | [DVC](https://dvc.org/)                                                                         | Adds Git-like versioning to data, experiments, and models.                                               |
| Find/load existing datasets easily       | [Hugging Face Datasets](https://huggingface.co/docs/datasets)                                   | Provides thousands of ready-to-use datasets with streaming and caching.                                  |

## Enable Every Recommended Tool

Follow these enablement steps to get each tool running quickly in a standard
Python-first workflow. Replace `python3` with `python` if your environment
defaults to Python 3.

### Scrapy & Beautiful Soup

1. Create and activate a virtual environment.
   ```bash
   python3 -m venv .venv && source .venv/bin/activate
   ```
2. Install both packages and start a Scrapy project scaffold.
   ```bash
   pip install scrapy beautifulsoup4
   scrapy startproject my_spider
   ```
3. Add Beautiful Soup parsing inside your Scrapy spider for complex HTML
   extraction.

### pdfplumber

1. Install the library along with optional table extras.
   ```bash
   pip install "pdfplumber[table]"
   ```
2. Verify extraction by running the built-in CLI against a sample PDF.
   ```bash
   pdfplumber my.pdf --pages 1-3
   ```

### PaddleOCR

1. Install the runtime and dependencies (PaddleOCR and PaddlePaddle).
   ```bash
   pip install "paddlepaddle==2.6.1" "paddleocr>=2.7"
   ```
2. Run the quick-start command to confirm OCR works with bundled models.
   ```bash
   paddleocr --image_dir ./sample.jpg --lang en
   ```

### yt-dlp

1. Install the downloader and upgrade FFmpeg if you need advanced transcoding.
   ```bash
   pip install yt-dlp
   ```
2. Test a download and capture JSON metadata for downstream processing.
   ```bash
   yt-dlp -J https://www.youtube.com/watch?v=BaW_jenozKc
   ```

### CVAT

1. Clone the official repository and start the Docker Compose stack.
   ```bash
   git clone https://github.com/opencv/cvat.git
   cd cvat && docker compose up -d
   ```
2. Visit `http://localhost:8080` to create an admin account and import labeling
   tasks.

### Label Studio & Doccano

1. Install both services into a Python environment.
   ```bash
   pip install label-studio doccano
   ```
2. Launch each server separately (they default to different ports) and walk
   through the onboarding wizards.
   ```bash
   label-studio start
   doccano init && doccano createuser --username admin --password changeme --email admin@example.com
   doccano webserver --port 8001
   ```

### DVC

1. Install DVC with support for your preferred remote (S3 example shown).
   ```bash
   pip install "dvc[s3]"
   ```
2. Initialize tracking inside your repository and connect a remote.
   ```bash
   dvc init
   dvc remote add -d storage s3://my-bucket/path
   ```

### Hugging Face Datasets

1. Install the datasets library with optional data processing extras.
   ```bash
   pip install "datasets[streaming]"
   ```
2. Load a dataset to validate your setup and enable local caching.
   ```python
   from datasets import load_dataset

   ds = load_dataset("ag_news", split="train")
   print(ds[0])
   ```

## Next Steps

1. Identify your immediate data workflow needs.
2. Evaluate the recommended tools based on project scale, language requirements,
   and team expertise.
3. Prototype with one tool at a time, documenting configuration and integration
   details as you go.
4. Revisit this guide regularly to expand your toolkit and share best practices
   with teammates.
