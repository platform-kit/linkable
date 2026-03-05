/**
 * Content scheduling utilities.
 *
 * Items with a `publishDate` are hidden before that date.
 * Items with an `expirationDate` are hidden after that date.
 * Empty strings mean "no constraint".
 */

export type Schedulable = {
  publishDate: string; // ISO date string, e.g. "2025-06-01"
  expirationDate: string;
};

/**
 * Returns true if the item should be visible right now based on its
 * publish and expiration dates.
 *
 * @param item - Any object with publishDate / expirationDate strings
 * @param now  - Override for the current date (ISO string), useful for testing
 */
export const isScheduleVisible = (
  item: Schedulable,
  now?: string,
): boolean => {
  const today = now ?? new Date().toISOString().slice(0, 10);
  if (item.publishDate && today < item.publishDate) return false;
  if (item.expirationDate && today > item.expirationDate) return false;
  return true;
};

/**
 * Filter an array of items, keeping only those whose schedule allows
 * visibility right now.
 */
export const filterBySchedule = <T extends Schedulable>(
  items: T[],
  now?: string,
): T[] => items.filter((item) => isScheduleVisible(item, now));
