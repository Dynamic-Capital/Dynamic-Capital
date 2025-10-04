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

## Next Steps

1. Identify your immediate data workflow needs.
2. Evaluate the recommended tools based on project scale, language requirements,
   and team expertise.
3. Prototype with one tool at a time, documenting configuration and integration
   details as you go.
4. Revisit this guide regularly to expand your toolkit and share best practices
   with teammates.
