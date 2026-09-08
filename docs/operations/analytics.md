# Analytics operations

The static `/stats` reader supports legacy payloads and schema version 2. Version 2 keeps every legacy field and adds independent CloudFront/Cloudflare status, day-precision coverage and success dates, and exactly 30 daily observations ending yesterday. `uniqueVisitors` remains a sum of daily unique visits; countries count zone requests, not people or homepage requests. Coverage is the range of stored measurement dates, not a completeness guarantee.

Absent observations are null/missing. A stored numeric zero is measured; yesterday is provisional. Legacy `dailySeries` contains numeric available observations only. Public lists retain the threshold of five for named buckets, aggregate remaining valid buckets into Other, and contain at most five names plus Other. Counts are bounded at one billion. Existing page/domain/IP and uppercase two-letter country validation remain in place. No new identifiers, tracking, raw request records or finer-than-day public timestamps are introduced.

Source records use the existing table under `source#cloudfront` and `source#cloudflare`; daily Cloudflare items remain `cf#daily#YYYY-MM-DD`. A successful refresh records its own date and actual stored coverage. Failure retains prior success and coverage and becomes stale if measurements remain, otherwise unavailable. Legacy measurements have no recoverable success timestamp: they stay stale with a null success date until successful refresh. The reader preserves these measurements and shows “Last successful update: Unavailable”; a current source with a null success date is rejected as unavailable. A successful publication is not proof both sources are fresh.

Cloudflare configuration, token retrieval, HTTP, API, malformed/empty response and daily-write errors are handled as one source outcome. Valid CloudFront aggregates can publish before an error is raised for a configured Cloudflare failure. Fully absent optional Cloudflare configuration is visible without a recurring alarm; partial configuration is an error. Responses are fully validated before any daily write. Storage failure after some writes can leave partial observations, but never advances source success metadata. CloudFront truncation/object errors also prevent its success date advancing. Metadata/scan/publication failures may prevent publication entirely: the Lambda error alarm does not promise partial publication for those failures.

## Local verification

Use Python 3.12 and a fresh environment, independent of an AWS login:

```sh
python3 -m venv .venv-stats
PIP_NO_CACHE_DIR=true .venv-stats/bin/python -m pip install -r tests/requirements.txt
PIP_NO_CACHE_DIR=true .venv-stats/bin/python -m pip check
.venv-stats/bin/python -m unittest discover -s tests/stats -p 'test_*.py' -v
STATS_TEST_PYTHON="$PWD/.venv-stats/bin/python" yarn playwright test tests/unit/statsPayload.spec.ts tests/e2e/stats-producer.spec.ts --project=chromium
```

The tests set synthetic credentials/region, disable metadata lookup, point shared config files at the null device, and replace SDK clients before import/execution. All service responses are in-memory; the browser intercepts stats and blocks external traffic. The exporter in `tests/stats/export_fixture.py` executes the actual handler against fakes for current, stale legacy and zero scenarios; its JSON is normalized and rendered by the actual reader. No Lambda invocation or public request is part of this check.

Terraform's archive declaration and both workflow packaging paths contain exactly `lambda_function.py` and `payload.py`. The archive tests verify members and import each extracted flat handler with dummy clients. Run `terraform fmt -check`, backend-disabled `terraform validate` using the committed provider lock, actionlint, build and type/lint checks. A state-backed plan and real CI runs remain separate release evidence.

## Release dependencies and recovery boundaries

Publish the compatible reader before any v2 producer. The workflow's code-update job depends on website publication. **D4/E5 must additionally verify the actual public/cached reader is compatible before updating the producer; a successful upload alone is insufficient.** Initial creation through Terraform/bootstrap also requires this prerequisite before apply; the code-update dependency cannot enforce first creation. D2 does not authorize deployment, invocation, settings changes or automatic replay.

Preserve the existing historical aggregate baseline and legacy markers. Never erase counts or automatically replay marked objects to repair uncertain history. The inherited marker-before-counter durability problem is not repaired by source metadata; D3 owns transactional batches, durable completion and interruption recovery. D4 owns reviewed migration/release checks, including the existing daily schedule and concurrency controls. Keep these later gates before production use of the combined remediation. A failed refresh can be retried by existing scheduling, but an uncertain transaction outcome must never be treated as proof it did not commit.
