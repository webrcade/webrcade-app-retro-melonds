import React from 'react';

import { Select } from '@webrcade/app-common';

export function ScreenLayoutSelect(props) {
  const { emulator, onPad, value, onChange, selectRef } = props;

  // SCREEN_LAYOUT_TOP_BOTTOM = 0;
  // SCREEN_LAYOUT_BOTTOM_TOP = 1
  // SCREEN_LAYOUT_LEFT_RIGHT = 2;
  // SCREEN_LAYOUT_RIGHT_LEFT = 3;
  // SCREEN_LAYOUT_TOP_ONLY = 4;
  // SCREEN_LAYOUT_BOTTOM_ONLY = 5;
  // SCREEN_LAYOUT_HYBRID_TOP = 6;
  // SCREEN_LAYOUT_HYBRID_BOTTOM = 7;

  const opts = [];
  opts.push({ value: emulator.SCREEN_LAYOUT_LEFT_RIGHT, label: "Left-Right" });
  opts.push({ value: emulator.SCREEN_LAYOUT_RIGHT_LEFT, label: "Right-Left" });
  opts.push({ value: emulator.SCREEN_LAYOUT_TOP_BOTTOM, label: "Top-Bottom" });
  opts.push({ value: emulator.SCREEN_LAYOUT_BOTTOM_TOP, label: "Bottom-Top" });
  opts.push({ value: emulator.SCREEN_LAYOUT_TOP_ONLY, label: "Top-Only" });
  opts.push({ value: emulator.SCREEN_LAYOUT_BOTTOM_ONLY, label: "Bottom-Only" });

  return (
    <Select
      ref={selectRef}
      width={"10rem"}
      options={opts}
      onChange={value => onChange(value)}
      value={value}
      onPad={e => onPad(e)}
    />
  )
}
