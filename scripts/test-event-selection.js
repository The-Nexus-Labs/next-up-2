import assert from "node:assert/strict";
import test from "node:test";
import { getNextEventsToDisplay } from "../src/date.js";

const at = (time) => new Date(`2026-09-10T${time}:00+02:00`);
const event = (summary, start, end) => ({ summary, date: at(start), end: at(end) });
const appointment = event("Appointment", "10:00", "14:00");
const work = event("Work", "10:40", "11:00");
const nextMeeting = event("Next meeting", "11:00", "11:30");
const afternoon = event("Afternoon", "13:00", "14:00");

for (const time of ["10:40", "10:47"]) {
  test(`overlapping events at ${time} keep the next start in the future`, () => {
    assert.deepEqual(
      getNextEventsToDisplay([appointment, work, nextMeeting, afternoon], at(time)),
      { currentEvent: appointment, nextEvent: nextMeeting }
    );
  });
}

test("selects the earliest future event even when the input is unsorted", () => {
  assert.deepEqual(
    getNextEventsToDisplay([afternoon, work, appointment, nextMeeting], at("10:47")),
    { currentEvent: appointment, nextEvent: nextMeeting }
  );
});

test("an event is current at its start and is ignored at its end", () => {
  assert.deepEqual(
    getNextEventsToDisplay([work, nextMeeting, afternoon], at("11:00")),
    { currentEvent: nextMeeting, nextEvent: afternoon }
  );
});

test("keeps an ongoing event when every overlapping event has already started", () => {
  assert.deepEqual(
    getNextEventsToDisplay([appointment, work], at("10:47")),
    { currentEvent: appointment, nextEvent: null }
  );
});

test("handles upcoming-only and finished calendars", () => {
  assert.deepEqual(getNextEventsToDisplay([work], at("10:00")), {
    currentEvent: null, nextEvent: work,
  });
  assert.deepEqual(getNextEventsToDisplay([work], at("11:00")), {
    currentEvent: null, nextEvent: null,
  });
  assert.deepEqual(getNextEventsToDisplay([], at("11:00")), {
    currentEvent: null, nextEvent: null,
  });
});
