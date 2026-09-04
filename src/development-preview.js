import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Shell from "gi://Shell";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

const PREVIEW_MINUTES_VARIABLE = "NEXT_UP_PREVIEW_MINUTES";
const PREVIEW_TITLE_VARIABLE = "NEXT_UP_PREVIEW_TITLE";
const SCREENSHOT_FILE_VARIABLE = "NEXT_UP_SCREENSHOT_FILE";

export function getDevelopmentPreview(now = new Date()) {
  const rawMinutes = GLib.getenv(PREVIEW_MINUTES_VARIABLE);
  if (rawMinutes === null) {
    return null;
  }

  const minutes = Number.parseInt(rawMinutes, 10);
  if (!Number.isFinite(minutes) || minutes < 0) {
    console.warn(`${PREVIEW_MINUTES_VARIABLE} must be a non-negative integer`);
    return null;
  }

  const title = GLib.getenv(PREVIEW_TITLE_VARIABLE) ?? "Development preview";
  const date = new Date(now.getTime() + minutes * 60000);

  return {
    currentEvent: null,
    nextEvent: {
      summary: title,
      date,
      end: new Date(date.getTime() + 30 * 60000),
    },
  };
}

export function scheduleDevelopmentScreenshot(onFinished) {
  const screenshotFile = GLib.getenv(SCREENSHOT_FILE_VARIABLE);
  if (screenshotFile === null) {
    return null;
  }

  Main.welcomeDialog?.close();
  Main.overview.hide();

  return GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
    captureScreenshot(screenshotFile)
      .catch((error) => console.error(error))
      .finally(onFinished);
    return GLib.SOURCE_REMOVE;
  });
}

async function captureScreenshot(screenshotFile) {
  const destination = Gio.File.new_for_path(screenshotFile);
  const partial = Gio.File.new_for_path(`${screenshotFile}.partial`);
  const stream = partial.replace(
    null,
    false,
    Gio.FileCreateFlags.REPLACE_DESTINATION,
    null
  );
  const screenshot = new Shell.Screenshot();

  await screenshot.screenshot(false, stream);
  stream.close(null);
  partial.move(destination, Gio.FileCopyFlags.OVERWRITE, null, null);
}
