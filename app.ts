/// <reference path="./typings/types/index.d.ts" />

import { APP_VERSION } from './utils/constants';
import { REMARK_FONT_PRESETS, RemarkFontPresetKey } from './utils/font-presets';
import { getStoredThemeMode } from './utils/theme';

const createRemarkFontFamilyMap = (): Record<RemarkFontPresetKey, string> => {
  const familyMap = {} as Record<RemarkFontPresetKey, string>;
  REMARK_FONT_PRESETS.forEach((preset) => {
    familyMap[preset.key] = preset.family;
  });
  return familyMap;
};

const createRemarkFontLoadedMap = (): Record<RemarkFontPresetKey, boolean> => {
  const loadedMap = {} as Record<RemarkFontPresetKey, boolean>;
  REMARK_FONT_PRESETS.forEach((preset) => {
    loadedMap[preset.key] = !preset.source;
  });
  return loadedMap;
};

App<IAppOption>({
  globalData: {
    version: APP_VERSION,
    remarkFontFamilyMap: createRemarkFontFamilyMap(),
    remarkFontLoadedMap: createRemarkFontLoadedMap(),
    themeMode: 'dark',
  },
  onLaunch() {
    this.globalData.themeMode = getStoredThemeMode();
    this.tryLoadRemarkFonts();
    this.tryLoadHomeTabFont();
  },
  tryLoadRemarkFonts() {
    REMARK_FONT_PRESETS.forEach((preset) => {
      if (!preset.source) {
        return;
      }
      wx.loadFontFace({
        family: preset.family,
        source: preset.source,
        scopes: ['native'],
        success: () => {
          this.globalData.remarkFontLoadedMap[preset.key] = true;
        },
        fail: () => {
          this.globalData.remarkFontLoadedMap[preset.key] = false;
        },
      });
    });
  },
  tryLoadHomeTabFont() {
    wx.loadFontFace({
      family: 'TicketHomeTabFont',
      source: 'url("/assets/fonts/jiangcheng-lvdongsong.ttf")',
      scopes: ['native'],
      success: () => {},
      fail: () => {},
    });
  },
});
