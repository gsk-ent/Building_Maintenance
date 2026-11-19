/**
 * Human-readable status labels.
 *
 * Previously each page did `status.replace("_", "")`, which only replaces
 * the *first* underscore — so `in_progress` rendered as "inprogress" and
 * `on_hold` as "onhold". Splitting on every underscore and title-casing
 * each word fixes all of them in one place.
 */
export function formatStatus(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
