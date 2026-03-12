/// <reference path="./typings/types/index.d.ts" />

import { APP_VERSION } from './utils/constants';

App<IAppOption>({
  globalData: {
    version: APP_VERSION,
    remarkFontFamily: 'TicketRemarkFont',
    remarkFontLoaded: false,
  },
  onLaunch() {
    this.tryLoadRemarkFont();
  },
  tryLoadRemarkFont() {
    wx.loadFontFace({
      family: 'TicketRemarkFont',
      source: 'url("/assets/fonts/remark.ttf")',
      scopes: ['native'],
      success: () => {
        this.globalData.remarkFontLoaded = true;
      },
      fail: () => {
        this.globalData.remarkFontLoaded = false;
      },
    });
  },
});
