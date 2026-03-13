import { CacheService } from '../../services/cache.service';
import { getSafeTopStyle } from '../../utils/safe-area';
import {
  applyNativeTheme,
  getCurrentThemeMode,
  getNextThemeMode,
  getThemeClass,
  setCurrentThemeMode,
  ThemeMode,
} from '../../utils/theme';

interface ProfilePageData {
  version: string;
  safeTopStyle: string;
  themeMode: ThemeMode;
  themeClass: string;
}

Page<ProfilePageData, WechatMiniprogram.IAnyObject>({
  data: {
    version: '1.0.0',
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
    const app = getApp<IAppOption>();
    this.syncThemeMode();
    this.setData({
      version: app.globalData.version,
      safeTopStyle: getSafeTopStyle(12),
    });
  },

  onShow() {
    this.syncThemeMode();
  },

  onTapClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '是否清除本地缓存？',
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        CacheService.clearAllDrafts();
        wx.showToast({
          title: '缓存已清除',
          icon: 'none',
        });
      },
    });
  },

  onTapAbout() {
    wx.showModal({
      title: '关于我们',
      content: `票根制作器\n版本号：${this.data.version}\n基于本地离线数据的票根编辑与保存工具。`,
      showCancel: false,
    });
  },

  onTapGuide() {
    wx.navigateTo({
      url: '/pages/user-guide/index',
    });
  },

  onTapThemeMode(event: WechatMiniprogram.BaseEvent) {
    const mode = event.currentTarget.dataset.mode as ThemeMode;
    if (mode !== 'dark' && mode !== 'light') {
      return;
    }

    const appliedMode = setCurrentThemeMode(mode);
    this.setData({
      themeMode: appliedMode,
      themeClass: getThemeClass(appliedMode),
    });
  },

  onTapToggleTheme() {
    const nextMode = getNextThemeMode(this.data.themeMode);
    const appliedMode = setCurrentThemeMode(nextMode);
    this.setData({
      themeMode: appliedMode,
      themeClass: getThemeClass(appliedMode),
    });
  },
});
