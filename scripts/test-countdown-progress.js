import { getCountdownProgress } from "../src/countdown-progress.js";

const now = new Date("2026-08-31T10:00:00Z");

function eventStatus(minutesUntilTarget, current = false) {
  const target = new Date(now.getTime() + minutesUntilTarget * 60000);
  return current
    ? { currentEvent: { end: target }, nextEvent: null }
    : { currentEvent: null, nextEvent: { date: target } };
}

function assertProgress(minutes, expectedBand, expectedFraction, current = false) {
  const progress = getCountdownProgress(eventStatus(minutes, current), now);
  if (progress.colorBand !== expectedBand) {
    throw new Error(
      `${minutes} minutes: expected ${expectedBand}, got ${progress.colorBand}`
    );
  }

  if (Math.abs(progress.fraction - expectedFraction) > 0.0001) {
    throw new Error(
      `${minutes} minutes: expected ${expectedFraction}, got ${progress.fraction}`
    );
  }
}

assertProgress(90, "green", 0);
assertProgress(60, "green", 0);
assertProgress(59, "orange", 1 / 60);
assertProgress(30, "orange", 0.5);
assertProgress(10, "orange", 5 / 6);
assertProgress(9, "red", 0.85);
assertProgress(0, "red", 1);
assertProgress(30, "orange", 0.5, true);

const noEvent = getCountdownProgress(
  { currentEvent: null, nextEvent: null },
  now
);
if (noEvent !== null) {
  throw new Error("Expected no countdown when there is no event");
}

console.log("Countdown progress checks passed");
