# Remediation evidence archive

This directory preserves the nonsecret local implementation/review record for the September7–8,2026 design/UX remediation. Start with the [current finding ledger](../../design-ux-remediation-status.md), [E6 implementation report](task-E6-report.md), [final corrected UI acceptance](e6-final-ui-acceptance.md), [E5 checked-artifact report](task-E5-report.md), [consolidated read-only plan report](terraform-final-read-only-plan-report.md), and [chronological rulings](rulings.md). The [progress record](progress.md) includes intermediate and final independent-review decisions.

## Integrity and historical paths

[archive-manifest.json](archive-manifest.json) lists every original workspace-relative path and its stored path, byte length and SHA256. Uncompressed files are copied byte-for-byte. The25 historical `review-*.diff` packages are stored as `.diff.gz` with an empty gzip filename and timestamp0; decompression was verified against each original SHA256. For example:

```sh
gzip -dc docs/reviews/remediation-evidence/2026-09-07-design-ux-remediation/review-E5-fix1.diff.gz
```

Do not run an archived reproduction script merely because it is present. Scripts/transcripts describe the environment and source at their recorded time; some intentionally reproduce failures or depend on old local preview/temporary paths. Current contributor commands live in the root README and operations runbooks.

Historical reports and stdout are deliberately unchanged. Ruling27 preserves their CRLF, transcript trailing spaces and brief endings; the [recorded whole-diff warnings](evidence/e6-staged-historical-whitespace.log) are archive-only, while [current authored files pass](evidence/e6-staged-diff-check-summary.json) the scoped whitespace check. Some links therefore retain absolute `/Users/andrew/Scripts/react-resume/...` paths, the execution worktree path, `.superpowers/sdd/2026-09-07-design-ux-remediation`, or relative paths calculated from that old scratch directory. Interpret a scratch path’s suffix as the same relative path in this archive, adding `.gz` for a historical review diff. Repository source references resolve against the repository root at the cited commit. The current ledger and final reports link directly to durable evidence. The old paths are provenance, not a requirement to recreate this workstation or retain the scratch directory forever.

`README.md` and `archive-manifest.json` are generated archive metadata and are excluded from the inventory’s self-hash. No source report was rewritten to make an intermediate failure look like a pass. In particular:

- E1 strict initialization initially failed on the obsolete null lock entry; E5 later removed only that unused entry and strict initialization passed.
- E5 initial cutover classification was independently rejected, then its scoped fix was approved.
- E6 initial phone/enlarged-text failures and the first393px residual failure remain in their original logs; only the final corrected build has the7/7 and97/97 passing evidence.
- The original-checkout preflight contains22 files; earlier controller prose said23 and the progress record explicitly corrects that count.
- Initial blank graph screenshots or QA selector/timing mistakes are distinguished from accepted settled, real-clock render evidence in the relevant report.

All six previously force-tracked scratch reports/evidence files are preserved here unchanged. Their original scratch locations remain until the controller verifies durable copies during a later reviewed cleanup. This archive does not delete or alter the original checkout, its untracked deliverables or the execution WS.

## Public, synthetic and private boundaries

The archive includes public-site baselines, sanitized read-only configuration/aggregate summaries, approved public résumé content, screenshots, synthetic browser/backend fixture results, task instructions/reports, review diffs and local validation output. Contact messages in test evidence are synthetic intercepted drafts. No real contact submission occurred.

It excludes private Terraform state/full plans/variable files, raw-log bodies, private aggregate/processing-item exports, authentication credentials and temporary signed download URLs. Historical references to private `/private/tmp/...` paths identify evidence kept outside the repository; their contents are not copied or made public by the reference. Aggregate summaries state their scan/listing limits and are not quiesced backups. The old deployed Lambda digest/package metadata is investigation evidence, not a safe post-ledger rollback.

A file-type allowlist, exact copy/decompression checks and a credential/raw-state heuristic support the controlled provenance review; pattern scanning alone cannot certify absence of every possible secret. No outside symlinks or private paths were followed by the archive operation.

## What this archive does not prove

Local checks are not a GitHub run, enforced branch rule, approved release, Cloudflare account inspection, Terraform apply or production continuity test. The real read-only plan is a time-bounded scope observation. Browser semantics/emulation do not establish OS speech, native zoom, physical rotation or OS preference/background behavior. Owner content/credential/tier/project questions and the ledger’s exact external gates remain explicit.

The controller will append independent E6/whole-branch review and final closure updates before any later scratch cleanup. Those future records must preserve this chronology rather than silently replacing it.
