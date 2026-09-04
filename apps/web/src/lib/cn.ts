/** Joins class-name fragments, dropping falsy values. No conflict resolution — keep call sites free of duplicate utility classes. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
