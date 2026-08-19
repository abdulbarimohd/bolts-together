/**
 * Minimal class-name joiner.
 *
 * Deliberately not `clsx` + `tailwind-merge`: this ships to Cloudflare
 * Workers, the primitives here compose classes by variant rather than by
 * override, and two more dependencies in the client bundle buy nothing.
 *
 * It does NOT resolve conflicting Tailwind classes. If a caller passes
 * `className="p-8"` to something already styled `p-4`, whichever Tailwind
 * emits last wins. Every primitive therefore puts `className` last in its
 * own list, which is the ordering callers expect.
 */
export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

export function cx(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cx(...input);
      if (nested) out.push(nested);
    } else {
      for (const key in input) {
        if (input[key]) out.push(key);
      }
    }
  }

  return out.join(" ");
}
