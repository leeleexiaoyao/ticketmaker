import { CacheService } from '../../services/cache.service';
import { getSafeTopStyle } from '../../utils/safe-area';

interface ProfilePageData {
  version: string;
  safeTopStyle: string;
}

Page<ProfilePageData, WechatMiniprogram.IAnyObject>({
  data: {
    version: '1.0.0',
    safeTopStyle: 'padding-top: 48px;',
  },

  onLoad() {
    const app = getApp<IAppOption>();
    this.setData({
      version: app.globalData.version,
      safeTopStyle: getSafeTopStyle(12),
    });
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
});
