// From Fancy Components by Daniel Petho (https://fancycomponents.dev), MIT License. See THIRD_PARTY_NOTICES.md.
// Source: https://github.com/danielpetho/fancy/blob/main/src/lib/utils.ts
// Changes: only `cn` is copied (the file's absoluteUrl helper isn't used here).

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
