> **Historical research record:** Product terminology is standardized to PILAH; observed results belong to their original source revisions and must not be interpreted as current independent acceptance.

# Frozen STOCKROOM benchmark — independent local rerun

**Date:** 18 November 2026.  
**Repository target:** `v2.0.1`.  
**Source archives:** User-owned private Library ZIPs. This is an independent **environment/build preflight**, not F01–F18 execution evidence.

## Reproducible archive identity

| Private archive | SHA-256 |
| --- | --- |
| `stockroom-native(2).zip` | `b0add01495d7f3f763d08383de78bb6b49ba99937823309e20bb24ca17ef64f4` |
| `stockroom-pilah(1).zip` | `b69d9bd6e9245afdb918ca150fff6bcf0971cb59f06f127572db8bf9e099c48e` |
| `brain-native(2).zip` | `c51ec921268df83e643686d542966d88e77e298c8b26208e503d1a615fa5f1a4` |
| `Brain-PILAH(1).zip` | `e1235269992c7b87227b71dac660c71aeb591ce5881ca612c99bb97719907ef9` |

The four originals were not modified. The two app archives were extracted only into disposable, private copies with path traversal and ZIP symlinks skipped. Extracted executable bit normalization was required to run the existing esbuild binary.

## Observed executable checks

| Check | Native copy | PILAH-generated copy |
| --- | --- | --- |
| PHP `php -l` on app, routes, migrations and tests | **82/82 syntax checks passed** | **61/61 syntax checks passed** |
| Frontend Vite production build | **PASSED**, 665 modules transformed | **PASSED** |
| PHPUnit/Laravel integration test | **BLOCKED at test startup** | **BLOCKED at test startup** |
| Independent F01–F18 live HTTP/browser/database validation | **NOT RUN** | **NOT RUN** |

Environment: PHP CLI 8.4.24, Node 22.16.0, Chromium binary present. PHPUnit could not start because PHP `dom`, `mbstring`, and `xmlwriter` extensions were missing. The environment did not expose an installed `agy` command. An attempt to refresh apt repositories timed out; tests requiring the missing PHP runtime were not silently counted as passed or failed application assertions.

Commands executed on disposable copies, not the original ZIPs:

```bash
find app routes database/migrations tests -type f -name '*.php' -print0 | xargs -0 -n1 php -l
node node_modules/vite/bin/vite.js build
php artisan test --stop-on-failure
```

**Interpretation:** both apps have parseable PHP code and buildable frontend assets under this toolchain. This says nothing about last-stock transaction safety, refund correctness, offline cache isolation, role enforcement, error sanitization or end-to-end browser recovery. These remain externally unverified. The original test suite did not produce independent passes because the PHP test runner did not start.

## Remaining required acceptance

All 18 scenarios in `tests/fixtures/stockroom-acceptance-18.json` remain **not-tested** in this rerun.

Execution still requires isolated Laravel PHP with PDO SQLite and DOM/mbstring/XMLWriter, a real backend and database per application, clean browser profiles and controlled full browser restart, and an independent assessor controlling scenario definitions and signing keys. F08/F09 require **two actual overlapping DB connections**. F10/F11 require complete browser process termination and profile restore; navigating or reloading a tab does not count.

The reproducible, frozen source archives are available to the user in their private Library and were intentionally **not committed** to `the existing repository`. Do not put their `.env`, logs, browser profiles, customer data or session archives into a public GitHub release.

This report is not release acceptance. The release gate remains blocked until independent live evidence and controlled repeated benchmark trials are available.

## Later PILAH implementation does not retroactively change this baseline

Behavioral PR #36 later merged to `v2.0.1` with 213/213 **PILAH Node tests**, including local MCP stdio/SQLite E2E. Those tests are **not reruns of these frozen Laravel applications**. The PHP extension blocker and missing independent F01–F18 browser/database execution remain unchanged. Do not relabel the private STOCKROOM negative controls as passing just because PILAH CI succeeded. See release issue #15.
