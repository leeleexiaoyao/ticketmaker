import { TemplateDraft } from '../models/draft';
import { TemplateConfig } from '../models/template';

export const DraftService = {
  createDefaultDraft(template: TemplateConfig): TemplateDraft {
    return {
      text: { ...template.defaultText },
      image: null,
      bgColor: template.defaultBgColor,
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
    };
  },
};
