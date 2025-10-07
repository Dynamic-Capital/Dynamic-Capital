# Magic Link Domain Verification Error Log Guide

## Summary

This guide documents the meaning of the "associated domain not verified" error
emitted by the API service when it fails to send a magic link email. The sample
payload below mirrors a production log where the transactional email provider
rejected the request because the API key is scoped to an unverified domain.

```json
{
  "event_message": "{\"auth_event\":{\"action\":\"user_recovery_requested\",\"actor_id\":\"3030e432-a20d-4293-aefc-8ac732f95170\",\"actor_username\":\"hello@dynamicapital.ton\",\"actor_via_sso\":false,\"log_type\":\"user\"},\"component\":\"api\",\"error\":\"gomail: could not send email 1: 450 The associated domain with your API key is not verified. Please, create a new API key with full access or with a verified domain.\",\"level\":\"error\",\"method\":\"POST\",\"msg\":\"500: Error sending magic link email\",\"path\":\"/magiclink\",\"referer\":\"http://localhost:3000\",\"remote_addr\":\"54.169.75.30\",\"request_id\":\"98aceff03108fcee-SIN\",\"time\":\"2025-10-07T11:07:54Z\"}",
  "id": "d057b94e-098b-41c9-b3a0-e7d2ecb3a543",
  "metadata": [
    {
      "host": "db-qeejuomcapbdlhnjqjcc",
      "component": "api",
      "level": "error",
      "msg": "500: Error sending magic link email",
      "error": "gomail: could not send email 1: 450 The associated domain with your API key is not verified. Please, create a new API key with full access or with a verified domain.",
      "method": "POST",
      "path": "/magiclink",
      "referer": "http://localhost:3000",
      "remote_addr": "54.169.75.30",
      "request_id": "98aceff03108fcee-SIN"
    }
  ],
  "timestamp": 1759835274000000
}
```

## Key Fields

| Field                                           | Purpose                                                       | Operational Signal                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **`metadata[].error`**                          | Low-level SMTP rejection returned by the email provider.      | Indicates the provider blocked the send because the API key's sending domain has not passed verification. |
| **`metadata[].msg`**                            | High-level application error bubbled up to the client.        | Surfaces as a `500` to the end user; repeated occurrences signal that account recovery is degraded.       |
| **`metadata[].request_id`**                     | Request correlation identifier from the API service.          | Use to trace matching errors through API logs, provider dashboards, and customer support tickets.         |
| **`metadata[].method`** & **`metadata[].path`** | HTTP request that triggered the send.                         | Confirms the failure originated from the `/magiclink` endpoint rather than another email workflow.        |
| **`auth_event.action`**                         | Higher-level auth workflow (e.g., `user_recovery_requested`). | Helps prioritise response based on which user journeys are affected (passwordless login vs. recovery).    |

## Operational Guidance

1. **Verify domain status in the email provider.** Log into the transactional
   email dashboard, locate the API key referenced by the service, and confirm
   the sending domain has DKIM/SPF verification completed.
2. **Check API key scope.** Ensure the API key allows sending from the domain
   used in the `From` header. Restricted keys tied to test domains will trigger
   the 450 rejection.
3. **Inspect recent deploys.** If the error started after a configuration
   change, confirm that environment variables (`EMAIL_API_KEY`, `FROM_ADDRESS`)
   point to the verified domain credentials.
4. **Monitor error rate.** Set alerting when `/magiclink` requests return `500`
   so the incident is caught quickly; each failure means a user cannot complete
   login or recovery.
5. **Communicate with support.** Update customer support tooling with the
   request ID and guidance so they can advise affected users while remediation
   is in progress.

## Mitigation Playbook

1. **Swap to a verified key.** Rotate the API key used by the API service to one
   issued for a verified domain. Update secrets storage and redeploy the
   service.
2. **Complete domain verification.** If no verified key exists, initiate the
   provider's domain verification (DNS records, approval workflow) and track
   until status is `verified`.
3. **Implement configuration guards.** Add startup checks or health probes that
   validate the domain verification status through the provider's API, failing
   fast if misconfigured.
4. **Backfill magic links.** Once fixed, reissue magic link emails for users
   impacted during the outage, using the request logs to identify recipients.
5. **Document the change.** Record the root cause and credential updates in the
   incident tracker to prevent future regressions.

## References

- [SMTP 450 Error Overview](https://www.rfc-editor.org/rfc/rfc5321#section-4.2.4)
- Transactional email provider documentation on domain verification (e.g.,
  Resend, SendGrid, Mailgun)
