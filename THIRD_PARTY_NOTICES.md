# Third-party notices

Steady is licensed under AGPL-3.0-only (see `LICENSE`). It includes code from the projects below, under their own
licenses. npm dependencies (Next.js, React, Motion, Radix UI, and others) carry their licenses in their packages.

## Fancy Components

Thank you to Daniel Petho for [Fancy Components](https://fancycomponents.dev)
([source](https://github.com/danielpetho/fancy)), a lovely collection of animated components.

Copied into `src/components/fancy/`, each file noting its source and any changes:

- `basic-number-ticker.tsx`: the count-up of the percentage on a goal page.
- `animated-gradient-with-svg.tsx`: the animated gradient frame (Settings).
- `use-debounced-dimensions.ts` and `utils.ts` (`cn`): helpers those two use.
- The `background-gradient` keyframes in `src/app/globals.css`.

```
MIT License

Copyright (c) 2024 Daniel Petho

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Design inspiration (no code copied)

- [Animate UI](https://animate-ui.com) by Elliot Sutton: the progress tooltip and the confirmation dialog are
  modeled on its tooltip and alert dialog motion. Its license (MIT + Commons Clause) restricts redistributing its
  components, which doesn't fit this AGPL project, so Steady's versions are written from scratch on Radix UI and
  Motion.

## Drawings

- Open Peeps by Pablo Stanley and Doodle Icons by Khushmeen Sidhu, both CC0 (public domain). See the `LICENSE.md`
  files beside them (`src/lib/peeps/`, `public/doodles/`).
