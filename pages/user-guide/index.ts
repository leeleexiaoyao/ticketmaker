import { getSafeTopStyle } from '../../utils/safe-area';
import { applyNativeTheme, getCurrentThemeMode, getThemeClass, ThemeMode } from '../../utils/theme';

interface UserGuidePageData {
  safeTopStyle: string;
  themeMode: ThemeMode;
  themeClass: string;
}

Page<UserGuidePageData, WechatMiniprogram.IAnyObject>({
  data: {
    safeTopStyle: 'padding-top: 48px;',
    themeMode: 'dark',
    themeClass: 'theme-dark',
  },
  syncThemeMode() {
    const themeMode = getCurrentThemeMode();
    applyNativeTheme(themeMode);
    this.setData({
      themeMode,
      themeClass: getThemeClass(themeMode),
    });
  },
  onLoad() {
    this.syncThemeMode();
    this.setData({
      safeTopStyle: getSafeTopStyle(12),
    });
  },
  onShow() {
    this.syncThemeMode();
  },
});
