import { TemplateId } from '../../models/template';
import { TemplateService } from '../../services/template.service';
import { getSafeTopStyle } from '../../utils/safe-area';
import { applyNativeTheme, getCurrentThemeMode, getThemeClass, ThemeMode } from '../../utils/theme';

interface SaveResultPageData {
  templateName: string;
  imagePath: string;
  safeTopStyle: string;
  themeMode: ThemeMode;
  themeClass: string;
}

Page<SaveResultPageData, WechatMiniprogram.IAnyObject>({
  data: {
    templateName: '',
    imagePath: '',
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

  onLoad(options) {
    this.syncThemeMode();
    const templateId = options.templateId as TemplateId;
    const templateName = templateId ? TemplateService.getTemplateLabel(templateId) : '';
    const imagePath = options.imagePath ? decodeURIComponent(options.imagePath) : '';

    this.setData({
      templateName,
      imagePath,
      safeTopStyle: getSafeTopStyle(20),
    });
  },

  onShow() {
    this.syncThemeMode();
  },

  onTapBackHome() {
    wx.reLaunch({
      url: '/pages/home/index',
    });
  },
});
