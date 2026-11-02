import assert from "node:assert/strict";
import test from "node:test";
import { getNextEventsToDisplay, eventStatusToIndicatorText } from "../src/date.js";

import { getCountdownProgress } from "../src/countdown-progress.js";

const at = (time) => new Date(`2026-09-10T${time}:00+02:00`);
const event = (summary, start, end) => ({ summary, date: at(start), end: at(end) });
const appointment = event("Appointment", "10:00", "14:00");
const work = event("Work", "10:40", "11:00");
const nextMeeting = event("Next meeting", "11:00", "11:30");
const afternoon = event("Afternoon", "13:00", "14:00");

for (const time of ["10:40", "10:47"]) {
  test(`overlapping events at ${time} keep every active event and the next start in the future`, () => {
    assert.deepEqual(
      getNextEventsToDisplay([appointment, work, nextMeeting, afternoon], at(time)),
      { currentEvents: [work, appointment], nextEvents: [nextMeeting] }
    );
  });
}

test("selects the earliest future event even when the input is unsorted", () => {
  assert.deepEqual(
    getNextEventsToDisplay([afternoon, work, appointment, nextMeeting], at("10:47")),
    { currentEvents: [work, appointment], nextEvents: [nextMeeting] }
  );
});

test("an event is current at its start and is ignored at its end", () => {
  assert.deepEqual(
    getNextEventsToDisplay([work, nextMeeting, afternoon], at("11:00")),
    { currentEvents: [nextMeeting], nextEvents: [afternoon] }
  );
});

test("keeps every ongoing event when overlapping events have already started", () => {
  assert.deepEqual(
    getNextEventsToDisplay([appointment, work], at("10:47")),
    { currentEvents: [work, appointment], nextEvents: [] }
  );
});

test("handles upcoming-only and finished calendars", () => {
  assert.deepEqual(getNextEventsToDisplay([work], at("10:00")), {
    currentEvents: [], nextEvents: [work],
  });
  assert.deepEqual(getNextEventsToDisplay([work], at("11:00")), {
    currentEvents: [], nextEvents: [],
  });
  assert.deepEqual(getNextEventsToDisplay([], at("11:00")), {
    currentEvents: [], nextEvents: [],
  });
});

const simony = event("U Simony", "14:00", "17:00");
const simultaneousWork = event("💼 Work", "14:00", "14:45");
const later = event("Later", "18:00", "19:00");

test("keeps every tied next event regardless of input order and removes later starts", () => {
  for (const events of [[later, simony, simultaneousWork], [simultaneousWork, later, simony]]) {
    const status = getNextEventsToDisplay(events, at("13:50"));
    assert.deepEqual(new Set(status.nextEvents), new Set([simony, simultaneousWork]));
    assert.deepEqual(status.currentEvents, []);
  }
});

test("shows both simultaneous titles in every layout and text format", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: at("13:50") });
  const status = getNextEventsToDisplay([simony, simultaneousWork]);
  for (const format of [0, 1]) {
    assert.equal(eventStatusToIndicatorText(status, format, 0),
      "In 10 min: U Simony + 💼 Work at 14:00");
    assert.equal(eventStatusToIndicatorText(status, format, 1),
      "14:00: U Simony + 💼 Work");
  }
});

test("shows simultaneous starts alongside an existing active event", () => {
  const ongoing = event("Ongoing", "13:00", "14:30");
  const status = getNextEventsToDisplay([simony, ongoing, simultaneousWork], at("13:50"));
  for (const format of [0, 1]) {
    for (const layout of [0, 1]) {
      const text = eventStatusToIndicatorText(status, format, layout);
      assert.ok(text.includes("U Simony + 💼 Work"));
    }
  }
});

test("shows active titles with individual end times and removes only the finished event", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: at("14:00") });
  const events = [simony, simultaneousWork, later];
  const status = getNextEventsToDisplay(events);
  assert.deepEqual(status.currentEvents, [simultaneousWork, simony]);
  assert.equal(eventStatusToIndicatorText(status, 1, 1),
    "💼 Work (45m left) | U Simony (3h 0m left) — 18:00: Later");
  assert.deepEqual(getNextEventsToDisplay(events, at("14:45")), {
    currentEvents: [simony], nextEvents: [later],
  });
  assert.deepEqual(getNextEventsToDisplay(events, at("17:00")), {
    currentEvents: [], nextEvents: [later],
  });
});

test("countdown targets the shared start, then the earliest active end", () => {
  const events = [simony, simultaneousWork];
  const upcoming = getNextEventsToDisplay(events, at("13:50"));
  assert.equal(getCountdownProgress(upcoming, at("13:50")).minutesRemaining, 10);
  const active = getNextEventsToDisplay(events, at("14:10"));
  assert.equal(getCountdownProgress(active, at("14:10")).minutesRemaining, 35);
  const remaining = getNextEventsToDisplay(events, at("14:45"));
  assert.equal(getCountdownProgress(remaining, at("14:45")), null);
});
