# Dynamic Capital Phase 03 Checkout Flow

This phase wires basic payment handling for the Mini App.

1. **Plans** – The mini app calls the `/plans` Edge function to list available
   subscription plans.
2. **Checkout** – Users choose a plan and start checkout via the
   `/checkout-init` function, which creates a pending payment and returns method
   instructions.
3. **Upload** – The client requests a signed URL from `/receipt-upload-url` and
   uploads the receipt directly to the private `receipts` storage bucket.
4. **Submit** – After uploading, the client calls `/receipt-submit` to link the
   file to the payment and mark it for review.
5. **Admin approval** – A later phase will handle verifying receipts and
   activating plans.

Receipts are stored in a private Supabase Storage bucket and are only uploaded
through signed URLs. All sensitive operations (payment creation, signed uploads,
linking receipts) happen on Edge functions using the service role key.

## Receipt upload and submission APIs

### `receipt-upload-url`

Generates a signed URL for uploading a receipt file.

- **Endpoint:** `POST /functions/v1/receipt-upload-url`
- **Body:**
  - `payment_id` – ID of the pending payment
  - `filename` – original file name
  - `content_type` – MIME type
  - `initData` – Telegram WebApp `initData` (optional when running inside
    Telegram)
- **Auth:**
  - Supabase session via `Authorization` header, or
  - Telegram `initData` passed in the body
- **Response:** `{ bucket, file_path, upload_url }`

### `receipt-submit`

Links the uploaded file to the payment after the file is stored.

- **Endpoint:** `POST /functions/v1/receipt-submit`
- **Body:**
  - `payment_id` – ID of the payment being confirmed
  - `file_path` – path returned from `receipt-upload-url`
  - `bucket` – storage bucket name (optional, defaults to `payment-receipts`)
  - `initData` – Telegram WebApp `initData` (optional)
- **Auth:** `Authorization` header or `initData` as above
- **Success Response:** `{ ok: true, payment_id }`

Both endpoints accept either a Supabase session (web login) or Telegram
`initData` to resolve the user submitting the receipt.
