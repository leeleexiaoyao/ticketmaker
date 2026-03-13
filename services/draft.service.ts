import { TemplateDraft } from '../models/draft';
import { TemplateConfig } from '../models/template';
import { DEFAULT_REMARK_FONT_PRESET_KEY, getRemarkFontPreset } from '../utils/font-presets';

export const DraftService = {
  createDefaultDraft(template: TemplateConfig): TemplateDraft {
    return {
      text: { ...template.defaultText },
      image: null,
      bgColor: template.defaultBgColor,
      remarkFontPresetKey: DEFAULT_REMARK_FONT_PRESET_KEY,
    };
  },

  mergeTemplateDraft(template: TemplateConfig, incoming: TemplateDraft | null): TemplateDraft {
    const base = this.createDefaultDraft(template);
    if (!incoming) {
      return base;
    }

    return {
      text: {
        ...base.text,
        ...incoming.text,
      },
      image: incoming.image ?? null,
      bgColor: incoming.bgColor || base.bgColor,
      remarkFontPresetKey: getRemarkFontPreset(incoming.remarkFontPresetKey).key,
    };
  },
};
