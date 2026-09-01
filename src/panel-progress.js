import Clutter from "gi://Clutter";
import St from "gi://St";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

const MINIMUM_VISIBLE_FRACTION = 0.04;
const FILL_OPACITY = 82;

function colorToCss(color) {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${
    color.alpha / 255
  })`;
}

export default class PanelProgress {
  constructor() {
    const panelColor = Main.panel.get_theme_node().get_background_color();

    this._previousPanelStyle = Main.panel.get_style();
    this._fraction = 0;
    this._hasProgress = false;

    this._fill = new St.Widget({
      x_align: Clutter.ActorAlign.START,
      y_align: Clutter.ActorAlign.FILL,
      y_expand: true,
      opacity: FILL_OPACITY,
      reactive: false,
    });

    this._backdrop = new St.Widget({
      layout_manager: new Clutter.BinLayout(),
      reactive: false,
      style: `background-color: ${colorToCss(panelColor)};`,
      constraints: new Clutter.BindConstraint({
        source: Main.layoutManager.panelBox,
        coordinate: Clutter.BindCoordinate.ALL,
      }),
    });
    this._backdrop.add_child(this._fill);

    Main.uiGroup.insert_child_below(
      this._backdrop,
      Main.layoutManager.panelBox
    );

    const previousStyle = this._previousPanelStyle
      ? `${this._previousPanelStyle} `
      : "";
    Main.panel.set_style(
      `${previousStyle}background-color: transparent; box-shadow: none;`
    );

    this._widthSignalId = this._backdrop.connect("notify::width", () => {
      this._updateFillWidth();
    });
    this._overviewShowingSignalId = Main.overview.connect("showing", () => {
      this._backdrop.hide();
    });
    this._overviewHidingSignalId = Main.overview.connect("hiding", () => {
      this._backdrop.show();
    });
  }

  setProgress(fraction, color) {
    this._fraction = Math.min(1, Math.max(0, fraction));
    this._hasProgress = true;
    this._fill.set_style(`background-color: ${color};`);
    this._fill.show();
    this._updateFillWidth();
  }

  hideProgress() {
    this._hasProgress = false;
    this._fill.hide();
  }

  destroy() {
    this._backdrop.disconnect(this._widthSignalId);
    Main.overview.disconnect(this._overviewShowingSignalId);
    Main.overview.disconnect(this._overviewHidingSignalId);

    Main.panel.set_style(this._previousPanelStyle);
    this._backdrop.destroy();

    this._fill = null;
    this._backdrop = null;
  }

  _updateFillWidth() {
    if (!this._hasProgress) {
      return;
    }

    const backdropWidth = this._backdrop.get_width();
    const visibleFraction = Math.max(
      MINIMUM_VISIBLE_FRACTION,
      this._fraction
    );
    this._fill.set_width(Math.round(backdropWidth * visibleFraction));
  }
}
