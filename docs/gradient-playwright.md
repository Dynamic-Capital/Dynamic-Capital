# Gradient Playwright Chat

This integration demonstrates calling [Gradient](https://gradient.ai) serverless inference from Next.js.

## Setup

1. Add the following environment variables:

   ```bash
   GRADIENT_API_KEY=your_api_key
   GRADIENT_MODEL_ID=your_model
   ```

2. Run the development server and navigate to `/gradient-chat`:

   ```bash
   npm run dev
   ```

## Usage

Type a prompt in the chat box. Requests are sent to `/api/gradient-playwright` which proxies to Gradient's API and returns the model output.
