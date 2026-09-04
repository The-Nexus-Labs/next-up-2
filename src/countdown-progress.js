export const DEFAULT_ORANGE_THRESHOLD_MINUTES = 60;
export const DEFAULT_RED_THRESHOLD_MINUTES = 10;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function countdownTarget(eventStatus) {
  if (eventStatus.currentEvent?.end instanceof Date) {
    return eventStatus.currentEvent.end;
  }

  if (eventStatus.nextEvent?.date instanceof Date) {
    return eventStatus.nextEvent.date;
  }

  return null;
}

export function getCountdownProgress(
  eventStatus,
  now = new Date(),
  orangeThresholdMinutes = DEFAULT_ORANGE_THRESHOLD_MINUTES,
  redThresholdMinutes = DEFAULT_RED_THRESHOLD_MINUTES
) {
  const target = countdownTarget(eventStatus);
  if (target === null) {
    return null;
  }

  const orangeThreshold = Math.max(1, orangeThresholdMinutes);
  const redThreshold = clamp(redThresholdMinutes, 0, orangeThreshold);
  const minutesRemaining = Math.max(
    0,
    Math.ceil((target.getTime() - now.getTime()) / 60000)
  );

  if (minutesRemaining >= orangeThreshold) {
    return null;
  }

  let colorBand = "orange";
  if (minutesRemaining < redThreshold) {
    colorBand = "red";
  }

  return {
    colorBand,
    minutesRemaining,
    fraction: clamp(1 - minutesRemaining / orangeThreshold, 0, 1),
  };
}
