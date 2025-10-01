# Vercel Production Launch Checklist

Use this checklist to verify that a Vercel-hosted deployment is hardened for
production. Each section groups tasks by the Vercel Well-Architected pillars so
you can confirm operational excellence, security, reliability, performance, and
cost efficiency before launch.

## Operational Excellence

- [ ] Define an incident response plan with escalation paths, communication
      channels, and rollback strategies for deployments.
- [ ] Document how to stage, promote, and roll back deployments so the team can
      respond quickly.
- [ ] Configure caching for monorepos to avoid redundant builds in Vercel.
- [ ] Perform a zero-downtime migration to Vercel DNS ahead of launch.

## Security

- [ ] Implement a Content Security Policy (CSP) alongside standard security
      headers.
- [ ] Enable Deployment Protection to prevent unauthorized access to
      deployments.
- [ ] Configure the Vercel Web Application Firewall (WAF)—including managed
      rulesets, custom rules, and IP blocking—to monitor, block, or challenge
      risky traffic.
- [ ] Enable Log Drains so deployment logs are persisted outside of Vercel.
- [ ] Review common SSL certificate issues before switching production traffic.
- [ ] Enable a Preview Deployment suffix to route previews through a custom
      domain.
- [ ] Commit lockfiles to pin dependencies and benefit from build caching.
- [ ] Implement rate limiting to defend against abusive usage patterns.
- [ ] Review team access roles and adjust permissions where needed.
- [ ] Enable SAML SSO and SCIM (Enterprise plans, Owner role only).
- [ ] Enable Audit Logs to track member activity (Enterprise plans, Owner role
      only).
- [ ] Confirm cookies comply with the allowed cookie policy (Enterprise plans,
      Owner role only).
- [ ] Add firewall rules to block unwanted bot traffic hitting the project
      deployment.

## Reliability

- [ ] Enable Observability Plus for deeper monitoring and debugging (Pro and
      Enterprise plans).
- [ ] Turn on automatic Function failover for multi-region redundancy
      (Enterprise plans only).
- [ ] Set caching headers on static assets or Function responses to reduce
      origin load.
- [ ] Document when to use caching headers versus Incremental Static
      Regeneration (ISR).
- [ ] Evaluate using OpenTelemetry for distributed tracing across services.
- [ ] Run load tests to stress upstream services before production (Enterprise
      plans only).

## Performance

- [ ] Enable Speed Insights for real-world performance data and Core Web Vitals.
- [ ] Monitor Time To First Byte (TTFB) and correct regressions.
- [ ] Use Image Optimization to shrink asset sizes.
- [ ] Use Script Optimization to defer or inline scripts appropriately.
- [ ] Use Font Optimization to eliminate external font fetches when possible.
- [ ] Align the Vercel Function region with the origin API or database region.
- [ ] Review any third-party proxies in front of Vercel and coordinate with your
      Customer Success Manager if required (Enterprise plans).

## Cost Optimization

- [ ] Enable Fluid Compute to mitigate cold starts and improve concurrency.
- [ ] Follow Vercel’s manage and optimize usage guides to understand levers for
      cost.
- [ ] Configure Spend Management alerts for usage anomalies.
- [ ] Review and adjust function duration and memory limits.
- [ ] Tune Incremental Static Regeneration (ISR) revalidation intervals—or adopt
      on-demand revalidation—to match content freshness.
- [ ] For teams created before February 18, 2025, opt in to the new image
      optimization pricing and review best practices.
- [ ] Move large media assets (GIFs, videos, etc.) to blob storage instead of
      bundling them with the deployment.
