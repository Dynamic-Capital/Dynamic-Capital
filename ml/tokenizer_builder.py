"""SentencePiece tokenizer builder for Dhivehi/English corpora.

This CLI trains a shared multilingual vocabulary tailored to Dynamic
Capital's mentorship, trading, and governance domains.  It accepts plain
text or JSONL files, extracts textual content, and writes SentencePiece
artifacts under ``dynamic/models/tokenizers/dhivehi_en`` by default.
"""
from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path
from typing import Iterator, List, Sequence


try:  # pragma: no cover - optional dependency resolved in runtime envs
    import sentencepiece as spm  # type: ignore
except ModuleNotFoundError as exc:  # pragma: no cover - fail fast with guidance
    raise SystemExit(
        "The sentencepiece package is required. Install it with `pip install sentencepiece`."
    ) from exc


DEFAULT_SPECIAL_TOKENS: Sequence[str] = (
    "<ctx>",
    "<mentor>",
    "<trade_long>",
    "<trade_short>",
    "<governance>",
    "<analysis>",
)


def iter_text_from_path(path: Path) -> Iterator[str]:
    """Yield text content from ``path`` supporting TXT and JSONL sources."""

    if path.suffix.lower() in {".txt", ""}:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    yield line
        return

    if path.suffix.lower() in {".json", ".jsonl"}:
        with path.open("r", encoding="utf-8") as handle:
            for raw in handle:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if isinstance(payload, dict):
                    for key in ("text", "prompt", "response", "context", "content"):
                        value = payload.get(key)
                        if isinstance(value, str) and value.strip():
                            yield value.strip()
                elif isinstance(payload, str) and payload.strip():
                    yield payload.strip()
        return

    raise ValueError(f"Unsupported corpus format: {path}")


def build_sentencepiece(
    sources: Sequence[Path],
    output_dir: Path,
    *,
    prefix: str,
    vocab_size: int,
    character_coverage: float,
    special_tokens: Sequence[str],
    max_lines: int | None,
) -> None:
    """Train a SentencePiece model from ``sources`` and write artifacts."""

    output_dir.mkdir(parents=True, exist_ok=True)

    collected: List[str] = []
    for source in sources:
        for text in iter_text_from_path(source):
            collected.append(text)
            if max_lines is not None and len(collected) >= max_lines:
                break
        if max_lines is not None and len(collected) >= max_lines:
            break

    if not collected:
        raise SystemExit("No text rows found to train the tokenizer")

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".txt", delete=False) as handle:
        for row in collected:
            handle.write(row.replace("\n", " ").strip() + "\n")
        corpus_path = Path(handle.name)

    model_prefix = output_dir / prefix
    spm.SentencePieceTrainer.train(
        input=str(corpus_path),
        model_prefix=str(model_prefix),
        vocab_size=vocab_size,
        model_type="unigram",
        character_coverage=character_coverage,
        user_defined_symbols=list(special_tokens),
        shuffle_input_sentence=True,
    )

    tokenizer_config = {
        "model_max_length": 1024,
        "special_tokens_map": {
            "additional_special_tokens": list(special_tokens),
        },
        "tokenizer_class": "SentencePieceUnigramTokenizer",
    }
    config_path = output_dir / "tokenizer_config.json"
    config_path.write_text(json.dumps(tokenizer_config, indent=2), encoding="utf-8")

    corpus_path.unlink(missing_ok=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a Dhivehi/English SentencePiece tokenizer")
    parser.add_argument(
        "--input",
        nargs="+",
        type=Path,
        required=True,
        help="Paths to TXT or JSONL files used for tokenizer training",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("dynamic/models/tokenizers/dhivehi_en"),
        help="Directory to store the tokenizer artifacts",
    )
    parser.add_argument(
        "--prefix",
        type=str,
        default="dhivehi_en",
        help="Filename prefix for the SentencePiece model",
    )
    parser.add_argument(
        "--vocab-size",
        type=int,
        default=48000,
        help="Target vocabulary size",
    )
    parser.add_argument(
        "--character-coverage",
        type=float,
        default=0.9995,
        help="SentencePiece character coverage",
    )
    parser.add_argument(
        "--special-token",
        action="append",
        dest="special_tokens",
        default=list(DEFAULT_SPECIAL_TOKENS),
        help="Additional special tokens to append (can be repeated)",
    )
    parser.add_argument(
        "--max-lines",
        type=int,
        default=None,
        help="Optional cap on the number of training lines for quick experiments",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build_sentencepiece(
        args.input,
        args.output,
        prefix=args.prefix,
        vocab_size=args.vocab_size,
        character_coverage=args.character_coverage,
        special_tokens=tuple(dict.fromkeys(args.special_tokens)),
        max_lines=args.max_lines,
    )


if __name__ == "__main__":
    main()
