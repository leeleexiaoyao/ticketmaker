import { TemplateService } from '../../services/template.service';
import { TemplateCategory, TemplateConfig, TemplateId } from '../../models/template';
import { getSafeTopStyle } from '../../utils/safe-area';
import { applyNativeTheme, getCurrentThemeMode, getThemeClass } from '../../utils/theme';

interface CategoryViewModel {
  id: TemplateCategory;
  label: string;
  className: string;
}

interface TemplateViewModel extends TemplateConfig {
  className: string;
  previewRatio: number;
}

interface HomePageData {
  categories: CategoryViewModel[];
  selectedCategory: TemplateCategory;
  categoryIndicatorStyle: string;
  templates: TemplateViewModel[];
  currentIndex: number;
  swiperHeightStyle: string;
  homePaddingStyle: string;
  isRouting: boolean;
  themeMode: 'dark' | 'light';
  themeClass: string;
}

const CATEGORY_TAB_WIDTH_RPX = 150;
const TEMPLATE_CARD_WIDTH_VW = 75;
const TEMPLATE_SWIPER_EXTRA_HEIGHT_RPX = 60;
const DEFAULT_PREVIEW_RATIO = 904 / 440;

Page<HomePageData, WechatMiniprogram.IAnyObject>({
  data: {
    categories: [],
    selectedCategory: 'concert',
    categoryIndicatorStyle: 'transform: translateX(0rpx);',
    templates: [],
    currentIndex: 0,
    swiperHeightStyle: `height: calc(${TEMPLATE_CARD_WIDTH_VW}vw * ${DEFAULT_PREVIEW_RATIO} + ${TEMPLATE_SWIPER_EXTRA_HEIGHT_RPX}rpx);`,
    homePaddingStyle: 'padding-top: 48px;',
    isRouting: false,
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
    this.syncThemeMode();
    this.setData({ homePaddingStyle: getSafeTopStyle(18) });
    this.syncCategoryAndTemplates(this.data.selectedCategory, 0);
  },
  
  onShow() {
    this.syncThemeMode();
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
    const categories = TemplateService.getCategories();
    const rawTemplates = TemplateService.getTemplatesByCategory(category);
    const safeIndex =
      currentIndex < 0 ? 0 : currentIndex > rawTemplates.length - 1 ? Math.max(rawTemplates.length - 1, 0) : currentIndex;
    const templates = rawTemplates.map((item, index) => {
      const previewWidth = item.preview?.width || item.canvasSize.width || 440;
      const previewHeight = item.preview?.height || item.canvasSize.height || 904;
      const previewRatio = previewWidth > 0 ? previewHeight / previewWidth : DEFAULT_PREVIEW_RATIO;
      return {
        ...item,
        className: index === safeIndex ? 'template-card selected' : 'template-card',
        previewRatio,
      };
    });
    const selectedPreviewRatio = templates[safeIndex]?.previewRatio || DEFAULT_PREVIEW_RATIO;
    const categoryIndex = Math.max(
      categories.findIndex((item) => item.id === category),
      0,
    );
    this.setData({
      categories: this.buildCategoryViewModels(category),
      selectedCategory: category,
      categoryIndicatorStyle: `transform: translateX(${categoryIndex * CATEGORY_TAB_WIDTH_RPX}rpx);`,
      templates,
      currentIndex: safeIndex,
      swiperHeightStyle: `height: calc(${TEMPLATE_CARD_WIDTH_VW}vw * ${selectedPreviewRatio} + ${TEMPLATE_SWIPER_EXTRA_HEIGHT_RPX}rpx);`,
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
