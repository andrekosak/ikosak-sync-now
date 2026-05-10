# Project Instructions

- Always use `iconsole-logger` for any logging that writes to the console.
- In source files, import logging helpers from `src/lib/console.ts` instead of calling `console.log`, `console.error`, `console.warn`, or other `console.*` methods directly.
- Use the existing wrapper exports: `log` for informational messages, `error` for errors, and `print` only when that style is already used nearby.
- If new logging behavior is needed, extend `src/lib/console.ts` rather than bypassing `iconsole-logger`.
