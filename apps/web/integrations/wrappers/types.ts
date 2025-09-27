export interface OneDriveAssetRow {
  object_key: string | null;
  title: string | null;
  description: string | null;
  content_type: string | null;
  byte_size: string | null;
  last_modified: string | null;
  checksum: string | null;
  source_url: string | null;
  tags: string | null;
}

export interface OneDriveAssetMeta {
  /**
   * Storage key inside the OneDrive S3 mirror (for example `docs/overview.pdf`).
   */
  key: string;
  /**
   * Raw display title sourced from the manifest; falls back to the file name.
   */
  title: string;
  /**
   * Short description provided by the manifest, if any.
   */
  description: string | null;
  /**
   * MIME type reported by the manifest.
   */
  contentType: string | null;
  /**
   * Object size in bytes, when reported.
   */
  sizeBytes: number | null;
  /**
   * Last modified timestamp from the manifest or remote object metadata.
   */
  lastModified: string | null;
  /**
   * Integrity checksum (etag, md5, etc.).
   */
  checksum: string | null;
  /**
   * Direct download URL for the mirrored asset.
   */
  sourceUrl: string | null;
  /**
   * Comma-delimited tags describing the asset content.
   */
  tags: string[];
}

export interface ListAssetsOptions {
  /**
   * Restrict results to manifest entries whose keys start with the given prefix.
   */
  prefix?: string;
  /**
   * Perform a simple case-insensitive search against the title and description fields.
   */
  search?: string;
  /**
   * Limit the number of rows returned.
   */
  limit?: number;
}
