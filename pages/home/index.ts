import { TemplateService } from '../../services/template.service';
import { TemplateCategory, TemplateConfig, TemplateId } from '../../models/template';
import { getSafeTopStyle } from '../../utils/safe-area';

interface CategoryViewModel {
  id: TemplateCategory;
  label: string;
  className: string;
}

interface TemplateViewModel extends TemplateConfig {
  className: string;
}

interface HomePageData {
  categories: CategoryViewModel[];
  selectedCategory: TemplateCategory;
  templates: TemplateViewModel[];
  currentIndex: number;
  homePaddingStyle: string;
  isRouting: boolean;
}

Page<HomePageData, WechatMiniprogram.IAnyObject>({
  data: {
    categories: [],
    selectedCategory: 'concert',
    templates: [],
    currentIndex: 0,
    homePaddingStyle: 'padding-top: 48px;',
    isRouting: false,
  },

  onLoad() {
    this.setData({ homePaddingStyle: getSafeTopStyle(18) });
    this.syncCategoryAndTemplates(this.data.selectedCategory, 0);
  },
  
  onShow() {
    if (this.data.isRouting) {
      this.setData({ isRouting: false });
    }
  },

  buildCategoryViewModels(selectedCategory: TemplateCategory): CategoryViewModel[] {
    return TemplateService.getCategories().map((item) => ({
      ...item,
      className: selectedCategory === item.id ? 'category-item active' : 'category-item',
    }));
  },

  syncCategoryAndTemplates(category: TemplateCategory, currentIndex: number) {
    const rawTemplates = TemplateService.getTemplatesByCategory(category);
    const safeIndex =
      currentIndex < 0 ? 0 : currentIndex > rawTemplates.length - 1 ? Math.max(rawTemplates.length - 1, 0) : currentIndex;
    const templates = rawTemplates.map((item, index) => ({
      ...item,
      className: index === safeIndex ? 'template-card selected' : 'template-card',
    }));
    this.setData({
      categories: this.buildCategoryViewModels(category),
      selectedCategory: category,
      templates,
      currentIndex: safeIndex,
    });
  },

  onTapCategory(event: WechatMiniprogram.BaseEvent) {
    const category = event.currentTarget.dataset.id as TemplateCategory;
    if (category === this.data.selectedCategory) {
      return;
    }

    this.syncCategoryAndTemplates(category, 0);
  },

  onSwiperChange(event: WechatMiniprogram.CustomEvent<{ current: number }>) {
    this.syncCategoryAndTemplates(this.data.selectedCategory, event.detail.current);
  },

  onTapTemplate(event: WechatMiniprogram.BaseEvent) {
    const templateId = event.currentTarget.dataset.id as TemplateId;
    if (!templateId || this.data.isRouting) {
      return;
    }
    this.setData({ isRouting: true }, () => {
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/template-detail/index?templateId=${templateId}`,
          fail: () => {
            this.setData({ isRouting: false });
          },
        });
      }, 16);
    });
  },

  onOpenProfile() {
    wx.navigateTo({
      url: '/pages/profile/index',
    });
  },
});
