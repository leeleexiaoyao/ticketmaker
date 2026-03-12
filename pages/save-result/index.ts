import { TemplateId } from '../../models/template';
import { TemplateService } from '../../services/template.service';
import { getSafeTopStyle } from '../../utils/safe-area';

interface SaveResultPageData {
  templateName: string;
  imagePath: string;
  safeTopStyle: string;
}

Page<SaveResultPageData, WechatMiniprogram.IAnyObject>({
  data: {
    templateName: '',
    imagePath: '',
    safeTopStyle: 'padding-top: 48px;',
  },

  onLoad(options) {
    const templateId = options.templateId as TemplateId;
    const templateName = templateId ? TemplateService.getTemplateLabel(templateId) : '';
    const imagePath = options.imagePath ? decodeURIComponent(options.imagePath) : '';

    this.setData({
      templateName,
      imagePath,
      safeTopStyle: getSafeTopStyle(20),
    });
  },

  onTapBackHome() {
    wx.reLaunch({
      url: '/pages/home/index',
    });
  },
});
