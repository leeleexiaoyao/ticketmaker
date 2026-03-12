import { CacheService } from '../../services/cache.service';
import { DraftService } from '../../services/draft.service';
import { RendererService } from '../../services/renderer.service';
import { TemplateService } from '../../services/template.service';
import { TemplateDraft } from '../../models/draft';
import { TemplateConfig, TemplateId } from '../../models/template';
import { getSafeTopStyle } from '../../utils/safe-area';

interface PreviewPageData {
  template: TemplateConfig | null;
  templateName: string;
  draft: TemplateDraft | null;
  safeTopStyle: string;
  isSaving: boolean;
}

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
  },

  onLoad(options) {
    const templateId = options.templateId as TemplateId;
    const template = TemplateService.getTemplateById(templateId);

    if (!template) {
      wx.showToast({ title: '模板不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    const draft = DraftService.mergeTemplateDraft(template, CacheService.getTemplateDraft(templateId));

    this.setData({ template, draft, templateName: template.name, safeTopStyle: getSafeTopStyle(6) });
  },

  onReady() {
    this.renderPreview();
  },

  onShow() {
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
      const imagePath = await RendererService.exportCanvasImage(this, 'previewCanvas');
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
      const denied = errMsg.includes('auth deny') || errMsg.includes('auth denied');

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

      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },
});
