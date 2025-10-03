# Tonkeeper Messages Integration Guide

Tonkeeper Messages provides push notifications for decentralized applications
that already onboarded users through TonConnect. Follow the steps below to
register your application, verify ownership, and start sending campaigns.

## Register and Verify Your Dapp

1. Open [Tonkeeper Messages](https://messages.tonkeeper.com/).
2. Submit your TonConnect manifest URL or a public app URL, then choose
   **Register**.
3. Create a `tc-verify.json` file in your hosting environment.
4. Copy the `payload` value provided by Tonkeeper Messages into the
   `tc-verify.json` file.
5. Host the file at the URL listed under the payload instructions (the link must
   be publicly accessible).
6. Return to Tonkeeper Messages and click **Verify** to complete the validation.

> **Note:** Each project can have only one connected decentralized application.
> Create a separate project if you need to register an additional app.

## Manage Message Quotas

- Monitor the remaining message balance in the Tonkeeper Messages dashboard. The
  current quota appears on the right-hand side of the interface.
- Click **Refill** to purchase more messages. If your TonConsole balance is low,
  refill it before completing the purchase.

## Authenticate API Requests

Generate an authorization token in Tonkeeper Messages and include it in the
`Authorization` header for every request:

```http
-H 'Authorization: Bearer <YOUR_TOKEN>'
```

Treat the token as a secret. If you suspect that it has been compromised, revoke
and regenerate it immediately.

## Send Notifications

Tonkeeper Messages supports broadcasting to all connected wallets or targeting a
specific address.

- **Broadcast to all users:** Omit the `address` field from the request body.
- **Target a single wallet:** Include the TON wallet address in the `address`
  field.

Example request body:

```json
{
  "message": "hello",
  "address": "UQ...ER",
  "link": "https://my-dapp.example/event"
}
```

### Content Limits

- Messages can contain up to **255 characters**.
- Keep copy concise and actionable to maximize engagement.
- Optionally attach a contextual link to drive users into your dapp experience.

## Recommended Use Cases

- Marketing campaigns and onboarding nudges.
- Product announcements and roadmap updates.
- Event or deadline reminders.
- Account notifications and transactional alerts.

By adhering to these guidelines, you can deliver timely, trusted communications
to the Tonkeeper users who have opted in through TonConnect.
