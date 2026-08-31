import St from "gi://St";
import Clutter from "gi://Clutter";
import * as Calendar from "resource:///org/gnome/shell/ui/calendar.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";

export default class Indicator extends PanelMenu.Button {
  constructor(props) {
    super();
    this._confettiGicon = props.confettiGicon;
    this._openPrefsCallback = props.openPrefsCallback;
    this._earlyDoneCallback = null;
    this._progressFraction = 0;
  }

  _init() {
    super._init(0.0, _("Next Up 2 Indicator"));

    this._calendarSource = new Calendar.DBusEventSource();

    this._loadGUI();
    this._initialiseMenu();
  }

  _loadGUI() {
    this._contentLayout = new St.BoxLayout({
      vertical: true,
      clip_to_allocation: true,
      x_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
    });

    this._menuLayout = new St.BoxLayout({
      vertical: false,
      clip_to_allocation: true,
      x_align: Clutter.ActorAlign.START,
      y_align: Clutter.ActorAlign.CENTER,
      reactive: true,
      x_expand: true,
    });

    this.icon = new St.Icon({
      icon_name: "alarm-symbolic",
      style_class: "system-status-icon",
    });

    // Ensure the label truncates neatly with CSS
    this.text = new St.Label({
      text: "Loading",
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
      style: "text-overflow: ellipsis; white-space: nowrap;",
    });

    this._menuLayout.add_child(this.icon);
    this._menuLayout.add_child(this.text);

    this._progressFill = new St.Widget({
      x_align: Clutter.ActorAlign.START,
      y_expand: true,
    });
    this._progressTrack = new St.Bin({
      child: this._progressFill,
      x_expand: true,
      height: 3,
      style:
        "background-color: rgba(128, 128, 128, 0.28); " +
        "border-radius: 2px; margin: 0 2px 1px 2px;",
    });
    this._progressTrack.connect("notify::width", () => {
      this._updateProgressWidth();
    });
    this._progressTrack.hide();

    this._contentLayout.add_child(this._menuLayout);
    this._contentLayout.add_child(this._progressTrack);
    this.add_child(this._contentLayout);
  }

  _initialiseMenu() {
    // 1. Create a custom container for our side-by-side buttons
    this._actionBox = new PopupMenu.PopupBaseMenuItem({ reactive: false });
    
    const buttonBoxLayout = new St.BoxLayout({
      vertical: false,
      x_expand: true,
      x_align: Clutter.ActorAlign.FILL,
    });

    // 2. Complete Task Button
    this._completeBtn = new St.Button({
      style_class: 'button',
      label: 'Complete Task',
      x_expand: true,
      reactive: false, // Disabled by default
      opacity: 128,    // Greyed out visually by default
      style: 'margin-right: 4px; padding: 6px 12px; border-radius: 6px; text-align: center;'
    });
    
    this._completeBtn.connect('clicked', () => {
      if (this._earlyDoneCallback && this._completeBtn.reactive) {
        this._earlyDoneCallback();
        this.menu.close();
      }
    });

    // 3. Open Calendar Button
    this._calendarBtn = new St.Button({
      style_class: 'button',
      label: 'Open Calendar',
      x_expand: true,
      style: 'margin-left: 4px; padding: 6px 12px; border-radius: 6px; text-align: center;'
    });

    this._calendarBtn.connect('clicked', () => {
      this.menu.close();
      Main.panel.toggleCalendar();
    });

    buttonBoxLayout.add_child(this._completeBtn);
    buttonBoxLayout.add_child(this._calendarBtn);
    this._actionBox.add_child(buttonBoxLayout);

    // 4. Add items to the drop-down menu
    this.menu.addMenuItem(this._actionBox);
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const settingsItem = new PopupMenu.PopupMenuItem(_("Settings"));
    settingsItem.connect("activate", () => {
      this._openPrefsCallback();
    });
    this.menu.addMenuItem(settingsItem);
  }

  setText(text) {
    this.text.set_text(text);
  }

  showAlarmIcon() {
    this.icon.set_icon_name("alarm-symbolic");
    this.icon.show();
  }

  showConfettiIcon(showIcon = true) {
    if (showIcon) {
      this.icon.set_gicon(this._confettiGicon);
      this.icon.show();
    } else {
      this.icon.hide();
    }
  }

  setMaxWidth(maxWidth) {
    this._contentLayout.set_style(`max-width: ${maxWidth}px;`);
  }

  setProgress(fraction, color) {
    this._progressFraction = Math.min(1, Math.max(0, fraction));
    this._progressFill.set_style(
      `background-color: ${color}; border-radius: 2px;`
    );
    this._progressTrack.show();
    this._updateProgressWidth();
  }

  hideProgress() {
    this._progressTrack.hide();
  }

  _updateProgressWidth() {
    const trackWidth = this._progressTrack.get_width();
    if (trackWidth <= 0 || !this._progressTrack.visible) {
      return;
    }

    // Keep a quiet color marker visible for events more than an hour away,
    // while the fill grows across the final countdown hour.
    const visibleFraction = Math.max(0.04, this._progressFraction);
    this._progressFill.set_width(
      Math.min(trackWidth, Math.max(3, Math.round(trackWidth * visibleFraction)))
    );
  }

  setupEarlyCompletion(enable, callback) {
    if (enable && callback) {
      this._completeBtn.reactive = true;
      this._completeBtn.opacity = 255; // Fully opaque (enabled)
      this._earlyDoneCallback = callback;
    } else {
      this._completeBtn.reactive = false;
      this._completeBtn.opacity = 128; // Greyed out (disabled)
      this._earlyDoneCallback = null;
    }
  }

  // Memory Leak Fix for the Calendar Data Source
  destroy() {
    if (this._calendarSource) {
      this._calendarSource.destroy();
      this._calendarSource = null;
    }
    super.destroy();
  }
}
