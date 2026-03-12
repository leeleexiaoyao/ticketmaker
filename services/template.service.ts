import { TemplateCategory, TemplateConfig, TemplateId, TEMPLATE_CONFIGS } from '../models/template';

const CATEGORY_TITLE_MAP: Record<TemplateCategory, string> = {
  concert: '演唱会',
  train: '车票',
  other: '其他票根',
};

export const TemplateService = {
  getCategories() {
    return [
      { id: 'concert' as const, label: CATEGORY_TITLE_MAP.concert },
      { id: 'train' as const, label: CATEGORY_TITLE_MAP.train },
      { id: 'other' as const, label: CATEGORY_TITLE_MAP.other },
    ];
  },
  getTemplatesByCategory(category: TemplateCategory): TemplateConfig[] {
    return TEMPLATE_CONFIGS.filter((item) => item.category === category);
  },
  getTemplateById(templateId: TemplateId): TemplateConfig | undefined {
    return TEMPLATE_CONFIGS.find((item) => item.id === templateId);
  },
  getTemplateLabel(templateId: TemplateId): string {
    return this.getTemplateById(templateId)?.name ?? templateId;
  },
};
