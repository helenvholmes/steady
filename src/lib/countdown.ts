import { daysBetween } from "./dates";

export const DEFAULT_MILESTONE_DAYS = [365, 180, 100, 30, 7];

export function daysLeft(targetDate: string, today: string) {
  return Math.max(0, daysBetween(today, targetDate));
}

/** Marks that fit the goal: longer than the whole span from start to target, a mark never applies. */
export function applicableMilestones(milestoneDays: number[], startDate: string, targetDate: string) {
  const span = daysBetween(startDate, targetDate);
  return [...milestoneDays].filter((m) => m < span).sort((a, b) => b - a);
}

/** Milestones already passed (days left at or below the mark), largest first. */
export function reachedMilestones(milestoneDays: number[], left: number) {
  return [...milestoneDays].sort((a, b) => b - a).filter((m) => left <= m);
}

/** Places (or any count) per week needed to finish by the target. */
export function pacePerWeek(remaining: number, left: number) {
  if (remaining <= 0) return 0;
  if (left <= 0) return remaining;
  return remaining / (left / 7);
}
