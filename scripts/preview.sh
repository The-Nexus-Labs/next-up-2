#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UUID="next-up-2@nanolookc.github.com"

run_nested_session() {
  local screenshot_file="$1"
  local hold_open="$2"

  gsettings set org.gnome.shell disable-user-extensions false
  gsettings set org.gnome.shell enabled-extensions "['$UUID']"
  gsettings set org.gnome.shell welcome-dialog-last-shown-version '999'

  gnome-shell --devkit --wayland >"$NEXT_UP_PREVIEW_LOG" 2>&1 &
  NEXT_UP_PREVIEW_SHELL_PID=$!

  # shellcheck disable=SC2329 # Invoked indirectly by the EXIT trap.
  cleanup_shell() {
    if kill -0 "$NEXT_UP_PREVIEW_SHELL_PID" 2>/dev/null; then
      kill "$NEXT_UP_PREVIEW_SHELL_PID"
      wait "$NEXT_UP_PREVIEW_SHELL_PID" 2>/dev/null || true
    fi
  }
  trap cleanup_shell EXIT

  for _ in $(seq 1 100); do
    if gdbus introspect --session \
      --dest org.gnome.Shell \
      --object-path /org/gnome/Shell >/dev/null 2>&1; then
      break
    fi
    if ! kill -0 "$NEXT_UP_PREVIEW_SHELL_PID" 2>/dev/null; then
      tail -n 80 "$NEXT_UP_PREVIEW_LOG" >&2
      return 1
    fi
    sleep 0.1
  done

  local extension_enabled=false
  for _ in $(seq 1 100); do
    if gnome-extensions enable "$UUID" >/dev/null 2>&1; then
      extension_enabled=true
      break
    fi
    if ! kill -0 "$NEXT_UP_PREVIEW_SHELL_PID" 2>/dev/null; then
      break
    fi
    sleep 0.1
  done

  if [[ "$extension_enabled" != "true" ]]; then
    printf 'Could not enable %s in the nested shell.\n' "$UUID" >&2
    tail -n 80 "$NEXT_UP_PREVIEW_LOG" >&2
    return 1
  fi

  # The extension attaches after three seconds, then captures itself after the
  # next complete second so panel allocation and painting have settled.
  for _ in $(seq 1 80); do
    if [[ -s "$screenshot_file" ]]; then
      break
    fi
    if ! kill -0 "$NEXT_UP_PREVIEW_SHELL_PID" 2>/dev/null; then
      break
    fi
    sleep 0.1
  done

  if [[ ! -s "$screenshot_file" ]]; then
    printf 'Screenshot capture failed.\n' >&2
    tail -n 80 "$NEXT_UP_PREVIEW_LOG" >&2
    return 1
  fi

  if [[ "$hold_open" == "true" ]]; then
    printf 'Nested GNOME Shell is open. Close its window to stop the preview.\n'
    wait "$NEXT_UP_PREVIEW_SHELL_PID"
  fi
}

if [[ "${1:-}" == "--nested-session" ]]; then
  shift
  run_nested_session "$@"
  exit
fi

minutes="${1:-43}"
screenshot_file="${2:-$ROOT_DIR/dist/preview-${minutes}-minutes.png}"
hold_open="${NEXT_UP_PREVIEW_HOLD:-false}"

if [[ ! "$minutes" =~ ^[0-9]+$ ]]; then
  printf 'Usage: %s [minutes-until-event] [screenshot-path]\n' "$0" >&2
  exit 2
fi

mkdir -p "$(dirname "$screenshot_file")"
screenshot_file="$(realpath -m "$screenshot_file")"

preview_root="$(mktemp -d "${TMPDIR:-/tmp}/next-up-2-preview.XXXXXX")"
cleanup_preview() {
  rm -rf -- "$preview_root" || true
}
trap cleanup_preview EXIT

extension_dir="$preview_root/data/gnome-shell/extensions/$UUID"
capture_file="$preview_root/capture.png"
mkdir -p "$extension_dir"
cp "$ROOT_DIR/extension.js" "$ROOT_DIR/metadata.json" "$ROOT_DIR/prefs.js" "$extension_dir/"
cp -R "$ROOT_DIR/assets" "$ROOT_DIR/schemas" "$ROOT_DIR/src" "$extension_dir/"
if ! command -v glib-compile-schemas >/dev/null 2>&1; then
  printf 'glib-compile-schemas is required to build the preview schema.\n' >&2
  exit 1
fi
glib-compile-schemas --strict "$extension_dir/schemas"

export GSETTINGS_BACKEND=memory
export NEXT_UP_PREVIEW_LOG="$preview_root/gnome-shell.log"
export NEXT_UP_PREVIEW_MINUTES="$minutes"
export NEXT_UP_PREVIEW_TITLE="Preview meeting"
export NEXT_UP_SCREENSHOT_FILE="$capture_file"
export XDG_DATA_HOME="$preview_root/data"

session_log="$preview_root/session.log"
if ! dbus-run-session -- "$ROOT_DIR/scripts/preview.sh" \
  --nested-session "$capture_file" "$hold_open" \
  >"$session_log" 2>&1; then
  tail -n 120 "$session_log" >&2
  exit 1
fi

cp "$capture_file" "$screenshot_file"
printf 'Created %s\n' "$screenshot_file"
