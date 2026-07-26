# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-07-26

### Fixed
- `getSpaceAndUser()` no longer picks the first workspace returned by `loadUserContent` (arbitrary, unrelated to what's open) — it now resolves the space actually open in the current tab via `lastVisitedRouteSpaceViewId` (kept live in `localStorage` by Notion itself), falling back to the old behavior only if that lookup fails. Fixes the extension emptying the trash of the wrong workspace for accounts with more than one Notion space.

## [1.0.9] - 2026-06-15

### Added
- Background service worker (`background.js`) for Chrome system notifications on completion — fires even when the user has switched to another tab
- `AbortController` wired to every `fetch` call: in-flight requests are cleanly cancelled on page unload instead of being left orphaned
- Build pipeline: `npm run build` (esbuild) minifies JS to `dist/`, `npm run zip` produces the Chrome Web Store package

### Changed
- `MutationObserver` removal watcher now observes only the button's direct parent element (no `subtree`) instead of all of `document.body` — significantly reduces mutation callbacks while the trash panel is open
- `popup.js` now sets `<html lang>` dynamically from `chrome.i18n.getUILanguage()` for correct screen-reader language
- Aborted operations no longer show the error toast

## [1.0.8] - 2026-06-15

### Fixed
- Eliminated redundant `/search` call: `firstPage` is now passed directly into `emptyTrash`, removing the duplicate offset-0 fetch that happened right after the confirm dialog
- README: wrong GitHub username (`marcofugaro` → `marcofinadri`) in badge and clone URL
- README: removed stale "live deletion counter" feature bullet; noted Chrome Web Store submission pending
- `privacy-policy.md`: added `*.notion.so` to host access description
- `.gitignore`: expanded `.DS_Store` pattern to cover all subdirectories (`**/`)

## [1.0.7] - 2026-06-15

### Changed
- Replaced fetch-all + sort strategy with streaming cascade deletion: fetch 1000 roots, delete them (Notion's cascade removes descendants automatically), repeat from offset 0 until trash is empty — constant RAM regardless of trash size
- Removed `orderChildrenFirst` and all graph/sorting logic
- Progress percentage removed (no grand total available in streaming mode)
- Success toast with Refresh button restored (8 s, `pointer-events: auto`)

### Added
- `apiFetch` with exponential backoff retry (up to 4 attempts) for 429 and 5xx transient errors
- Binary-split fallback in `deleteBatch`: isolates and skips individual undeletable blocks without failing the entire chunk
- `beforeunload` warning when deletion is in progress
- Centralised constants (API base, chunk sizes, retry params, CSS colour tokens)

## [1.0.6] - 2026-06-14

### Added
- i18n support for 20 languages: English, Italian, Spanish, French, German, Portuguese, Chinese (Simplified), Hindi, Arabic, Bengali, Russian, Japanese, Korean, Turkish, Vietnamese, Polish, Ukrainian, Dutch, Thai, Indonesian
- `popup.js` applies `data-i18n` translations at runtime
- `default_locale: "en"` in manifest; extension name and description use `__MSG_*` substitutions

### Fixed
- `zh_CN/messages.json`: replaced curly/smart quotes with corner brackets to avoid Chrome JSON parse error
- Manifest `name` field changed to `__MSG_extensionName__` (required for `default_locale`)
- ZIP command updated to include `popup.js` and `_locales/`

## [1.0.5] - 2026-06-13

### Added
- i18n foundation: 6 languages (English, Italian, Spanish, French, German, Portuguese)
- Button repositioned after the first filter pill ("Last edited by") so it stays visible even when the percentage counter expands

## [1.0.4] - 2026-06-12

### Added
- Live deletion percentage counter in the button while running
- Pre-fetch all IDs before deletion to show accurate progress from 0%
- Toast notification on completion with a Refresh button (`location.reload`)

### Fixed
- Infinite loop when all blocks in a batch returned 403: added `batchDeleted === 0` break condition

## [1.0.3] - 2026-06-11

### Added
- Support for `*.notion.so` subdomains in addition to `app.notion.com`
- `navigableBlockContentOnly: false` to include inline databases in search results

## [1.0.2] - 2026-06-10

### Added
- Custom icon (1000×1000 source, resized to 16/32/48/128 px)
- Promo tile (440×280) for the Chrome Web Store listing

### Fixed
- Icon circle clipped at top: increased padding from 10% to 15%

## [1.0.1] - 2026-06-08

### Changed
- Button moved into the filter pill row (inserted after first pill) instead of appended to the filter row's end
- Overflow detection via `getBoundingClientRect` + `requestAnimationFrame`: if the icon button is clipped, it is replaced with a labeled pill on its own row below

## [1.0.0] - 2026-06-01

### Added
- Initial release
- "Empty trash" button injected into Notion's trash filter bar
- Pagination support: handles more than 1000 trashed items
- Toast notifications for success and errors
- Confirmation dialog before irreversible deletion
