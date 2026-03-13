import { CacheService } from '../../services/cache.service';
import { DraftService } from '../../services/draft.service';
import { RendererService } from '../../services/renderer.service';
import { TemplateService } from '../../services/template.service';
import { TemplateDraft } from '../../models/draft';
import { TemplateConfig, TemplateId } from '../../models/template';
import { getSafeTopStyle } from '../../utils/safe-area';
import { applyNativeTheme, getCurrentThemeMode, getThemeClass, ThemeMode } from '../../utils/theme';

interface PreviewPageData {
  template: TemplateConfig | null;
  templateName: string;
  draft: TemplateDraft | null;
  safeTopStyle: string;
  isSaving: boolean;
  previewCanvasStyle: string;
  themeMode: ThemeMode;
  themeClass: string;
}

const CANVAS_WIDTH_RPX = 375;

const buildPreviewCanvasStyle = (template: TemplateConfig | null): string => {
  const ratio = template ? template.canvasSize.height / template.canvasSize.width : 1.6;
  const clampedRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1.6;
  const heightRpx = (CANVAS_WIDTH_RPX * clampedRatio).toFixed(3);
  return `width: ${CANVAS_WIDTH_RPX}rpx; height: ${heightRpx}rpx;`;
};

const saveToAlbum = (filePath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: reject,
    });
  });

Page<PreviewPageData, WechatMiniprogram.IAnyObject>({
  data: {
    template: null,
    templateName: '',
    draft: null,
    safeTopStyle: 'padding-top: 48px;',
    isSaving: false,
    previewCanvasStyle: 'width: 375rpx; height: 770.455rpx;',
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
    const template = TemplateService.getTemplateById(templateId);

    if (!template) {
      wx.showToast({ title: '模板不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    const draft = DraftService.mergeTemplateDraft(template, CacheService.getTemplateDraft(templateId));

    this.setData({
      template,
      draft,
      templateName: template.name,
      safeTopStyle: getSafeTopStyle(6),
      previewCanvasStyle: buildPreviewCanvasStyle(template),
    });
  },

  onReady() {
    this.renderPreview();
  },

  onShow() {
    this.syncThemeMode();
    this.renderPreview();
  },

  async renderPreview(): Promise<boolean> {
    if (!this.data.template || !this.data.draft) {
      return false;
    }

    try {
      await RendererService.renderTemplateToCanvas({
        scope: this,
        canvasId: 'previewCanvas',
        template: this.data.template,
        draft: this.data.draft,
      });
      return true;
    } catch (_error) {
      wx.showToast({
        title: '预览渲染失败',
        icon: 'none',
      });
      return false;
    }
  },

  onTapBack() {
    wx.navigateBack();
  },

  onTapAgainEdit() {
    wx.navigateBack();
  },

  async onTapSaveAlbum() {
    if (!this.data.template || this.data.isSaving) {
      return;
    }

    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const rendered = await this.renderPreview();
      if (!rendered) {
        throw new Error('render failed');
      }
      const imagePath = await RendererService.exportCanvasImage({
        scope: this,
        canvasId: 'previewCanvas',
        template: this.data.template,
      });
      await saveToAlbum(imagePath);

      CacheService.clearTemplateDraft(this.data.template.id);

      wx.hideLoading();
      this.setData({ isSaving: false });
      wx.navigateTo({
        url: `/pages/save-result/index?templateId=${this.data.template.id}&imagePath=${encodeURIComponent(imagePath)}`,
      });
    } catch (error) {
      wx.hideLoading();
      this.setData({ isSaving: false });
      const errMsg = (error as { errMsg?: string })?.errMsg ?? '';
      const platform = wx.getSystemInfoSync().platform;
      const denied = errMsg.includes('auth deny') || errMsg.includes('auth denied');

      if (platform === 'devtools') {
        wx.showModal({
          title: '保存失败',
          content: '开发者工具无法写入系统相册，请使用真机预览后保存。',
          showCancel: false,
        });
        return;
      }

      if (denied) {
        wx.showModal({
          title: '保存失败',
          content: '请允许保存到相册权限后重试',
          confirmText: '去设置',
          success: (result) => {
            if (result.confirm) {
              wx.openSetting();
            }
          },
        });
        return;
      }

      wx.showModal({
        title: '保存失败',
        content: errMsg || '未知错误，请重试',
        showCancel: false,
      });
    }
  },
});
