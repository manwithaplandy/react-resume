# Website delivery operations

## Public route contract

The checked CloudFront viewer-request function is `terraform/functions/rewrite-extensionless.js`. Terraform loads that exact source file and the Node VM route tests execute it directly.

- `/` rewrites to `/index.html`.
- Extensionless paths such as `/stats`, `/graph`, and unknown page names rewrite to the matching `.html` object.
- A non-root path ending in `/` returns a permanent redirect to the extensionless form. Query fields retain the encoded CloudFront event representation. When `multiValue` is present it already contains the first occurrence, so the redirect serializes that array once and does not also append `value`.
- Paths with filename extensions remain unchanged, including résumé downloads and Next.js static assets.
- Redirect paths always begin with one site-local slash. Additional leading slashes and backslashes are encoded before entering `Location` so unusual viewer input cannot create a protocol-relative external redirect.

The local tests include event fields containing `%20`, `%2B`, `%26`, `%25`, and repeated values. Their VM round trip follows AWS's published event-shape and normalization example, but it does not prove how every viewer request becomes a live CloudFront event. Before rollout, use an actual CloudFront test invocation and then send real public trailing-slash requests containing those encoded values and repeats. Inspect `Location`, follow it, and confirm the values retain their intended meaning. This runtime/viewer-to-event evidence has not yet been collected.

## Missing-page recovery

The static export contains a dark/orange `404.html` with a clear `Page not found` heading, links to the résumé and contact section, a specific document title, and `noindex, nofollow` robots metadata. Local preview checks require an actual HTTP 404 and 320-pixel fit.

CloudFront maps origin 403 and 404 responses to the checked document:

| Origin response | Response document | Viewer status | Error cache TTL |
| --- | --- | --- | --- |
| 403 | `/404.html` | 404 | 10 seconds |
| 404 | `/404.html` | 404 | 10 seconds |

This translation applies to any origin 403 or 404 response, including permission failures. Successful pages, static extension paths, resource identities, origin selection, and the existing cache behavior remain unchanged. The known-asset post-release check guards against hiding a broader origin-permission failure behind the recovery page.

## Access-log self-targeting

The log bucket remains the destination for website access logs under `website-log/` and CloudFront logs under `cloudfront-logs/`. Its bucket, stored objects, versioning, bucket policy, ownership controls, three lifecycle rules, and all Terraform resource identities remain in place. The only relationship removed by E2 is the log bucket writing S3 access logs about itself back into `this-bucket-log/`.

The controller verified the live self-target on 2026-09-08 using read-only `GetBucketLogging`: `mostly-upward-lion-log-bucket` targeted itself with prefix `this-bucket-log/`. No setting was changed. The existing metadata-only prefix baseline at 2026-09-08 07:17:28 UTC observed:

| Prefix | Current objects observed | Bytes observed | Listing boundary |
| --- | ---: | ---: | --- |
| `cloudfront-logs/` | 11,894 | 15,127,314 | Complete 12-page listing |
| `website-log/` | 71,198 | 58,489,829 | Complete 72-page listing |
| `this-bucket-log/` | At least 100,000 | At least 113,812,996 | Capped after 100 pages; incomplete |

The listing read object count and size metadata only; it did not fetch log bodies or retain keys. It excluded versions and delete markers and was not an atomic snapshot. The self-log row is a lower bound, not an exact total, growth rate, or savings estimate. A later comparison needs a documented observation window and either a comparable bounded method or a complete justified metric.

The configured lifecycle policy remains enabled for all three prefixes: current objects become eligible for expiration after 90 days, and versions become eligible after 30 days as noncurrent. This is configured policy rather than a physical deletion audit or an exact retention-duration guarantee; noncurrent age starts when a version becomes noncurrent. Expiration also does not prove that analytics history can be reconstructed from remaining objects.

The controller-owned consolidated state-backed plan must classify the E2 action as removal of only `aws_s3_bucket_logging.log_bucket_logs`. Replacement or deletion of the log bucket, stored data, versioning, normal website/CloudFront log delivery, or any lifecycle change fails this scope. No real plan or apply occurred during E2 implementation.

After an authorized release, use read-only checks to confirm the log bucket no longer targets itself while website and CloudFront sources still target the same bucket/prefixes. Existing queued S3 deliveries may arrive briefly. Record the observation interval, then compare subsequent `this-bucket-log/` growth using the stated method; if the interval or measurement is insufficient, leave savings unmeasured rather than infer a number.

## Release order and gates

Use one reviewed candidate `out` artifact and one consolidated state-backed Terraform plan. The plan must show the intended edge-function source and the two custom error responses for this task, alongside only other independently reviewed release changes. A real state-backed plan has not been run for this task; the controller owns that consolidated review with the prepared private inputs.

The workflow downloads the same candidate artifact produced by the plan job. Before Terraform apply it checks that `404.html` references candidate files that exist under `_next/static`. It uploads all candidate `_next/static` objects without deletion, then uploads `404.html` last. This order retains old hashed assets and makes the complete recovery page available before CloudFront can enable the error mapping. It does not upload or delete `stats.json`, and the later ordinary site sync still excludes that producer-owned object.

If the bucket does not exist, the pre-apply upload stops the release. Use the separately reviewed bootstrap procedure; do not create a temporary Terraform address or enable an error mapping whose recovery document is absent. The same stop applies if the candidate recovery document or any referenced candidate static asset is missing.

The analytics release gates remain load-bearing:

- A first creation or replacement of the analytics producer requires the public compatible reader check before apply.
- Ordinary analytics code updates remain downstream of website publication, CloudFront invalidation, and the public reader check.
- Follow the no-writer, durable-backup, and historical-preservation prerequisites in [analytics operations](./analytics.md) for an analytics cutover. Staging recovery assets does not satisfy or bypass them.

After apply, sync the complete same candidate export with the existing `stats.json` exclusion, then invalidate the distribution through the reviewed workflow. E4 and E5 may consolidate cache metadata and checked-artifact provenance later; they must retain this no-missing-document order and both analytics reader gates.

## Post-release verification

No production rollout or CloudFront invocation was performed during E1 implementation. After an approved rollout:

1. Check `/`, `/stats`, `/stats/`, `/graph`, and `/graph/` on both public hostnames. Each page should work directly or through one purposeful redirect.
2. Repeat the trailing-slash checks with repeated fields and encoded space, plus, ampersand, and percent values. Inspect and follow `Location`; record the actual viewer-to-event/runtime behavior.
3. Request a unique nonexistent extensionless path. Require HTTP 404, the styled recovery page, working résumé/contact links, and no S3 XML access-denied response.
4. Request a known versioned Next.js asset and the résumé PDF. A successful asset response guards against hiding a broader origin-permission failure behind the custom 404.
5. Record response status, redirect location, cache/error-cache headers, checked commit and candidate artifact identity. Do not mark F15's live behavior closed until these public checks pass.

If the recovery document or its assets fail, stop further rollout, preserve the candidate and plan evidence, and restore a previously complete site artifact through the reviewed release path. Do not remove buckets, rename Terraform resources, or use the custom 404 to mask an origin-access problem.
