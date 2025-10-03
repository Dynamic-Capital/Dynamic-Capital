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
from .google_drive import (
    DriveShareTarget,
    GoogleDriveClient,
    build_google_drive_pdf_loader,
    parse_drive_share_link,
    parse_drive_share_link_details,
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
    "GoogleDriveClient",
    "build_google_drive_pdf_loader",
    "parse_drive_share_link",
    "parse_drive_share_link_details",
    "DriveShareTarget",
]
