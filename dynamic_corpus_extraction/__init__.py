"""Dynamic corpus extraction engine."""

from .engine import (
    CorpusDocument,
    CorpusExtractionContext,
    CorpusExtractionSummary,
    DynamicCorpusExtractionEngine,
)
from .forexfactory import (
    ForexFactoryAttachment,
    build_forexfactory_attachment_loader,
    fetch_forexfactory_attachment_text,
    parse_forexfactory_proxy_payload,
)
from .onedrive import (
    OneDriveGraphClient,
    build_onedrive_share_loader,
    to_share_id,
)

__all__ = [
    "CorpusDocument",
    "CorpusExtractionContext",
    "CorpusExtractionSummary",
    "DynamicCorpusExtractionEngine",
    "ForexFactoryAttachment",
    "build_forexfactory_attachment_loader",
    "fetch_forexfactory_attachment_text",
    "parse_forexfactory_proxy_payload",
    "OneDriveGraphClient",
    "build_onedrive_share_loader",
    "to_share_id",
]
