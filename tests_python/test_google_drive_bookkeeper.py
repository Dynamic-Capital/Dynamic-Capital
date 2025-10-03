import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_corpus_extraction import CorpusDocument  # noqa: E402
from dynamic_keepers.bookkeeping import GoogleDriveBookkeeper  # noqa: E402
from dynamic_database.database import DynamicDatabase  # noqa: E402


def test_bookkeeper_indexes_documents_with_metadata():
    database = DynamicDatabase()
    keeper = GoogleDriveBookkeeper(
        table="drive_docs",
        database=database,
        default_tags=("drive", "pdf"),
    )

    mapping_document = {
        "identifier": "google-drive-doc-1",
        "content": "First document",
        "source": "google_drive",
        "metadata": {
            "web_view_link": "https://drive.google.com/file/d/doc-1/view",
            "md5_checksum": "hash-1",
        },
        "tags": ("google_drive",),
    }

    corpus_document = CorpusDocument(
        identifier="google-drive-doc-2",
        content="Second document",
        source="google_drive",
        metadata={"size": 512},
        tags=("pdf",),
    )

    records = keeper.index_documents(
        [mapping_document, corpus_document],
        extra_tags=("dataset",),
    )

    assert len(records) == 2

    stored = database.get_record("drive_docs", "google-drive-doc-1")
    assert stored is not None
    assert stored.payload["metadata"]["md5_checksum"] == "hash-1"
    assert stored.payload["links"] == ["https://drive.google.com/file/d/doc-1/view"]
    assert set(stored.tags) == {"drive", "pdf", "google_drive", "dataset"}
    assert set(stored.sources) == {
        "google_drive",
        "https://drive.google.com/file/d/doc-1/view",
    }

    snapshot = keeper.snapshot()
    assert snapshot.table == "drive_docs"
    assert snapshot.record_count == 2
    assert "dataset" in snapshot.tag_catalog

    events = keeper.recent_events(limit=10)
    assert len(events) == 2

    removed = keeper.evict(["google-drive-doc-1"])
    assert removed == 1
    assert keeper.snapshot().record_count == 1


def test_bookkeeper_validates_documents():
    keeper = GoogleDriveBookkeeper(table="drive_docs")

    with pytest.raises(ValueError):
        keeper.index_documents(
            [
                {
                    "identifier": "",
                    "content": "",
                }
            ]
        )
