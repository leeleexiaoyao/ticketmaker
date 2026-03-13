import { CacheService } from '../../services/cache.service';
import { DraftService } from '../../services/draft.service';
import { ImageEditService } from '../../services/image-edit.service';
import { RendererService } from '../../services/renderer.service';
import { TemplateService } from '../../services/template.service';
import { CropParams, TemplateDraft } from '../../models/draft';
import { TemplateConfig, TemplateId } from '../../models/template';
import { TEXT_CACHE_DELAY } from '../../utils/constants';
import { REMARK_FONT_PRESETS, getRemarkFontPreset } from '../../utils/font-presets';
import { getSafeTopStyle } from '../../utils/safe-area';
import { applyNativeTheme, getCurrentThemeMode, getThemeClass, ThemeMode } from '../../utils/theme';

interface FieldViewModel {
  key: string;
  label: string;
  placeholder: string;
  isRemark: boolean;
  isTimeField: boolean;
  isAddressField: boolean;
  maxLength: number;
  overflow: boolean;
  value: string;
}

interface ColorViewModel {
  value: string;
  className: string;
}

interface FontOptionViewModel {
  key: string;
  label: string;
  className: string;
}

interface TemplateDetailPageData {
  template: TemplateConfig | null;
  templateName: string;
  draft: TemplateDraft | null;
  safeTopStyle: string;
  themeMode: ThemeMode;
  themeClass: string;
  isRouting: boolean;
  activeTab: 'text' | 'image' | 'font' | 'bg';
  editorVisible: boolean;
  pageClass: string;
  editorPanelClass: string;
  textTabClass: string;
  imageTabClass: string;
  fontTabClass: string;
  bgTabClass: string;
  tabIndicatorClass: string;
  showTextTab: boolean;
  showImageTab: boolean;
  showFontTab: boolean;
  showBgTab: boolean;
  showEntryAction: boolean;
  isFullPreview: boolean;
  isSaving: boolean;
  fieldsForRender: FieldViewModel[];
  colorsForRender: ColorViewModel[];
  fontOptionsForRender: FontOptionViewModel[];
  previewBaseImagePath: string;
  previewTextImagePath: string;
  previewImagePath: string;
  previewCanvasStyle: string;
  renderCanvasStyle: string;
  fullPreviewEmptyStyle: string;
  imageSlotFrameStyle: string;
  imageSlotMaskTopStyle: string;
  imageSlotMaskRightStyle: string;
  imageSlotMaskBottomStyle: string;
  imageSlotMaskLeftStyle: string;
  overflowKeys: string[];
  addressOverflow: boolean;
  dateTimeRange: string[][];
  dateTimeIndex: number[];
  hasAddressField: boolean;
}

interface PreviewRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

let textDebounceTimer: number | null = null;
let previewLayerRenderToken = 0;
let previewSnapshotInFlight = false;
let titleLimitToastTimer: number | null = null;
let titleMeasureCtx: any = null;
let gestureMode: 'idle' | 'drag' | 'pinch' = 'idle';
let lastTouchX = 0;
let lastTouchY = 0;
let gestureCrop: CropParams | null = null;
let gestureSlotWidth = 0;
let gestureSlotHeight = 0;
let gestureSlotLeftClient = 0;
let gestureSlotTopClient = 0;
let gestureCanvasPerClientX = 1;
let gestureCanvasPerClientY = 1;
let pinchStartDistance = 0;
let pinchStartCenterX = 0;
let pinchStartCenterY = 0;
let pinchStartCrop: CropParams | null = null;
let cachedCanvasWidth = 0;
let cachedCanvasHeight = 0;
let cropRenderTimer: number | null = null;

const CANVAS_WIDTH_RPX = 500;
const CROP_RENDER_THROTTLE_MS = 16;

const buildCanvasStyles = (template: TemplateConfig | null): { preview: string; render: string; fullPreviewEmpty: string } => {
  const ratio = template ? template.canvasSize.height / template.canvasSize.width : 1.6;
  const clampedRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1.6;
  const canvasHeightRpx = (CANVAS_WIDTH_RPX * clampedRatio).toFixed(3);
  return {
    preview: `width: ${CANVAS_WIDTH_RPX}rpx; height: ${canvasHeightRpx}rpx;`,
    render: `width: ${CANVAS_WIDTH_RPX}rpx; height: ${canvasHeightRpx}rpx;`,
    fullPreviewEmpty: `width: ${CANVAS_WIDTH_RPX}rpx; height: ${canvasHeightRpx}rpx;`,
  };
};

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

const toPercent = (value: number): string => `${Math.round(value * 100000) / 1000}%`;

const buildImageSlotMaskStyle = (
  template: TemplateConfig | null,
): {
  frame: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
} => {
  if (!template) {
    return {
      frame: '',
      top: '',
      right: '',
      bottom: '',
      left: '',
    };
  }

  const x = clamp01(template.imageSlot.x);
  const y = clamp01(template.imageSlot.y);
  const width = clamp01(template.imageSlot.width);
  const height = clamp01(template.imageSlot.height);
  const right = clamp01(1 - x - width);
  const bottom = clamp01(1 - y - height);

  return {
    frame: `left:${toPercent(x)};top:${toPercent(y)};width:${toPercent(width)};height:${toPercent(height)};`,
    top: `left:0;top:0;width:100%;height:${toPercent(y)};`,
    right: `left:${toPercent(x + width)};top:${toPercent(y)};width:${toPercent(right)};height:${toPercent(height)};`,
    bottom: `left:0;top:${toPercent(y + height)};width:100%;height:${toPercent(bottom)};`,
    left: `left:0;top:${toPercent(y)};width:${toPercent(x)};height:${toPercent(height)};`,
  };
};

const getTouchXY = (touch: any): { x: number; y: number } => ({
  x: touch.clientX ?? touch.pageX ?? touch.x ?? 0,
  y: touch.clientY ?? touch.pageY ?? touch.y ?? 0,
});

const getTouchDistance = (a: any, b: any): number => {
  const pointA = getTouchXY(a);
  const pointB = getTouchXY(b);
  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getTouchCenter = (a: any, b: any): { x: number; y: number } => {
  const pointA = getTouchXY(a);
  const pointB = getTouchXY(b);
  return {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
  };
};

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

const getDayCount = (year: number, month: number): number => new Date(year, month, 0).getDate();

const formatDateTime = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const parseDateTime = (value: string | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const matched = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!matched) {
    return null;
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const hour = Number(matched[4] || '0');
  const minute = Number(matched[5] || '0');
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

const buildDateTimeRange = (year: number, month: number): string[][] => {
  const now = new Date();
  const yearStart = now.getFullYear() - 5;
  const yearEnd = now.getFullYear() + 10;
  const years = Array.from({ length: yearEnd - yearStart + 1 }, (_, index) => `${yearStart + index}`);
  const months = Array.from({ length: 12 }, (_, index) => pad2(index + 1));
  const days = Array.from({ length: getDayCount(year, month) }, (_, index) => pad2(index + 1));
  const hours = Array.from({ length: 24 }, (_, index) => pad2(index));
  const minutes = Array.from({ length: 60 }, (_, index) => pad2(index));
  return [years, months, days, hours, minutes];
};

const saveToAlbum = (filePath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: reject,
    });
  });

const chooseSingleImage = (sourceType: Array<'album' | 'camera'>): Promise<string> =>
  new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType,
      success: (res) => {
        const imagePath = res.tempFilePaths?.[0];
        if (!imagePath) {
          reject(new Error('empty image path'));
          return;
        }
        resolve(imagePath);
      },
      fail: reject,
    });
  });

const getImageInfoByPath = (src: string): Promise<WechatMiniprogram.GetImageInfoSuccessCallbackResult> =>
  new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: resolve,
      fail: reject,
    });
  });

const ensureTitleMeasureCtx = (): any => {
  if (titleMeasureCtx) {
    return titleMeasureCtx;
  }
  try {
    const offscreenFactory = (wx as WechatMiniprogram.Wx & { createOffscreenCanvas?: (options: { type: '2d'; width: number; height: number }) => any })
      .createOffscreenCanvas;
    if (!offscreenFactory) {
      return null;
    }
    const canvas = offscreenFactory({ type: '2d', width: 4, height: 4 });
    titleMeasureCtx = canvas.getContext('2d');
    return titleMeasureCtx;
  } catch (_error) {
    return null;
  }
};

const canTitleFitTwoLines = (value: string): boolean => {
  const text = value.replace(/\r\n/g, '\n');
  if (!text.trim()) {
    return true;
  }
  const ctx = ensureTitleMeasureCtx();
  if (!ctx) {
    return true;
  }

  const baseWidth = 440;
  const leftRightPadding = 24 * 2;
  const maxWidth = baseWidth - leftRightPadding;
  const maxLines = 2;
  ctx.font = `700 ${Math.floor(baseWidth * 0.062)}px sans-serif`;

  const paragraphs = text.split('\n');
  let lines = 0;
  for (let i = 0; i < paragraphs.length; i += 1) {
    const paragraph = paragraphs[i];
    let currentLine = '';
    for (const char of paragraph) {
      const candidate = `${currentLine}${char}`;
      if (currentLine && ctx.measureText(candidate).width > maxWidth) {
        lines += 1;
        currentLine = char;
        if (lines >= maxLines) {
          return false;
        }
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine || paragraph.length === 0) {
      lines += 1;
      if (lines > maxLines) {
        return false;
      }
      if (lines === maxLines && i < paragraphs.length - 1) {
        return false;
      }
    }
  }

  return true;
};

Page<TemplateDetailPageData, WechatMiniprogram.IAnyObject>({
  data: {
    template: null,
    templateName: '',
    draft: null,
    safeTopStyle: 'padding-top: 48px;',
    themeMode: 'dark',
    themeClass: 'theme-dark',
    isRouting: false,
    activeTab: 'text',
    editorVisible: false,
    pageClass: 'container detail-page',
    editorPanelClass: 'editor-panel',
    textTabClass: 'tab-item active',
    imageTabClass: 'tab-item',
    fontTabClass: 'tab-item',
    bgTabClass: 'tab-item',
    tabIndicatorClass: 'tab-indicator on-text',
    showTextTab: false,
    showImageTab: false,
    showFontTab: false,
    showBgTab: false,
    showEntryAction: true,
    isFullPreview: false,
    isSaving: false,
    fieldsForRender: [],
    colorsForRender: [],
    fontOptionsForRender: [],
    previewBaseImagePath: '',
    previewTextImagePath: '',
    previewImagePath: '',
    previewCanvasStyle: 'width: 500rpx; height: 1027.273rpx;',
    renderCanvasStyle: 'width: 500rpx; height: 1027.273rpx;',
    fullPreviewEmptyStyle: 'width: 500rpx; height: 1027.273rpx;',
    imageSlotFrameStyle: '',
    imageSlotMaskTopStyle: '',
    imageSlotMaskRightStyle: '',
    imageSlotMaskBottomStyle: '',
    imageSlotMaskLeftStyle: '',
    overflowKeys: [],
    addressOverflow: false,
    dateTimeRange: [[], [], [], [], []],
    dateTimeIndex: [0, 0, 0, 0, 0],
    hasAddressField: false,
  },

  syncThemeMode() {
    const themeMode = getCurrentThemeMode();
    applyNativeTheme(themeMode);
    this.setData({
      themeMode,
      themeClass: getThemeClass(themeMode),
    });
  },

  refreshComputedData() {
    const { template, draft, activeTab, editorVisible, isFullPreview } = this.data;
    const hasAddressField = !!template?.fields.some((field) => field.key === 'address');
    const canvasStyles = buildCanvasStyles(template);
    const imageSlotMaskStyle = buildImageSlotMaskStyle(template);

    const overflowKeysSet = new Set(this.data.overflowKeys);
    const fieldsForRender: FieldViewModel[] =
      template && draft
        ? template.fields.map((field) => ({
            key: field.key,
            label: field.key === 'name' ? '主题' : field.key === 'remark' ? '留言区' : field.key === 'source' ? '出自' : field.label,
            placeholder:
              field.key === 'name'
                ? '请输入不超过两行的标题内容'
                : field.key === 'remark'
                  ? '请输入留言区内容，不超过50字'
                  : field.key === 'source'
                    ? '请输入出自内容，不超过50字'
                    : field.key === 'address'
                      ? '请输入地点（不超过10字）'
                    : field.placeholder,
            isRemark: field.key === 'remark',
            isTimeField: field.key === 'time',
            isAddressField: field.key === 'address',
            maxLength: field.key === 'name' ? 120 : field.key === 'address' ? 10 : field.key === 'remark' || field.key === 'source' ? 50 : 120,
            overflow: overflowKeysSet.has(field.key),
            value: draft.text[field.key] || '',
          }))
        : [];

    const colorsForRender: ColorViewModel[] =
      template && draft
        ? template.presetColors.map((value) => ({
            value,
            className: draft.bgColor === value ? 'color-item selected' : 'color-item',
          }))
        : [];

    const fontOptionsForRender: FontOptionViewModel[] = REMARK_FONT_PRESETS.map((preset) => ({
      key: preset.key,
      label: preset.label,
      className: draft?.remarkFontPresetKey === preset.key ? 'font-option selected' : 'font-option',
    }));

    this.setData({
      templateName: template ? template.name : '',
      pageClass: editorVisible ? 'container detail-page editor-open' : 'container detail-page',
      editorPanelClass: editorVisible ? 'editor-panel open' : 'editor-panel',
      textTabClass: activeTab === 'text' ? 'tab-item active' : 'tab-item',
      imageTabClass: activeTab === 'image' ? 'tab-item active' : 'tab-item',
      fontTabClass: activeTab === 'font' ? 'tab-item active' : 'tab-item',
      bgTabClass: activeTab === 'bg' ? 'tab-item active' : 'tab-item',
      tabIndicatorClass:
        activeTab === 'text'
          ? 'tab-indicator on-text'
          : activeTab === 'image'
            ? 'tab-indicator on-image'
            : activeTab === 'font'
              ? 'tab-indicator on-font'
              : 'tab-indicator on-bg',
      showTextTab: activeTab === 'text' && !!template && !!draft,
      showImageTab: activeTab === 'image',
      showFontTab: activeTab === 'font' && !!template && !!draft,
      showBgTab: activeTab === 'bg' && !!template && !!draft,
      showEntryAction: !editorVisible && !isFullPreview,
      fieldsForRender,
      colorsForRender,
      fontOptionsForRender,
      hasAddressField,
      previewCanvasStyle: canvasStyles.preview,
      renderCanvasStyle: canvasStyles.render,
      fullPreviewEmptyStyle: canvasStyles.fullPreviewEmpty,
      imageSlotFrameStyle: imageSlotMaskStyle.frame,
      imageSlotMaskTopStyle: imageSlotMaskStyle.top,
      imageSlotMaskRightStyle: imageSlotMaskStyle.right,
      imageSlotMaskBottomStyle: imageSlotMaskStyle.bottom,
      imageSlotMaskLeftStyle: imageSlotMaskStyle.left,
      addressOverflow: overflowKeysSet.has('address'),
    });
  },

  onLoad(options) {
    this.syncThemeMode();
    cachedCanvasWidth = 0;
    cachedCanvasHeight = 0;
    this.resetGestureState();
    const templateId = options.templateId as TemplateId;
    const template = TemplateService.getTemplateById(templateId);

    if (!template) {
      wx.showToast({
        title: '模板不存在',
        icon: 'none',
      });
      wx.navigateBack();
      return;
    }

    const localDraft = CacheService.getTemplateDraft(templateId);
    const mergedDraft = DraftService.mergeTemplateDraft(template, localDraft);
    const hasTimeField = template.fields.some((field) => field.key === 'time');
    const shouldUseNowForTime = !localDraft && hasTimeField;
    const draft: TemplateDraft = shouldUseNowForTime
      ? {
          ...mergedDraft,
          text: {
            ...mergedDraft.text,
            time: formatDateTime(new Date()),
          },
        }
      : mergedDraft;

    this.setData(
      {
        template,
        draft,
        safeTopStyle: getSafeTopStyle(6),
        editorVisible: options.resume === '1',
      },
      () => {
        this.initDateTimePicker(draft.text.time);
        this.refreshComputedData();
      },
    );
  },

  initDateTimePicker(rawValue: string) {
    const parsed = parseDateTime(rawValue) || new Date();
    const range = buildDateTimeRange(parsed.getFullYear(), parsed.getMonth() + 1);
    const yearIndex = Math.max(range[0].indexOf(`${parsed.getFullYear()}`), 0);
    const monthIndex = parsed.getMonth();
    const dayIndex = parsed.getDate() - 1;
    const hourIndex = parsed.getHours();
    const minuteIndex = parsed.getMinutes();

    this.setData({
      dateTimeRange: range,
      dateTimeIndex: [yearIndex, monthIndex, dayIndex, hourIndex, minuteIndex],
    });
  },

  onReady() {
    this.renderPreview();
  },

  onShow() {
    this.syncThemeMode();
    if (this.data.isRouting) {
      this.setData({ isRouting: false });
    }
    this.renderPreview();
  },

  onResize() {
    cachedCanvasWidth = 0;
    cachedCanvasHeight = 0;
    this.resetGestureState();
    this.renderPreview();
  },

  onHide() {
    if (cropRenderTimer) {
      clearTimeout(cropRenderTimer);
      cropRenderTimer = null;
    }
    this.resetGestureState();
    this.persistDraft();
  },

  onUnload() {
    if (textDebounceTimer) {
      clearTimeout(textDebounceTimer);
      textDebounceTimer = null;
    }
    this.resetGestureState();
    if (cropRenderTimer) {
      clearTimeout(cropRenderTimer);
      cropRenderTimer = null;
    }
    this.persistDraft();
  },

  async renderPreview(options?: { renderBase?: boolean }): Promise<boolean> {
    const { template, draft } = this.data;
    if (!template || !draft) {
      return false;
    }

    const token = ++previewLayerRenderToken;
    const shouldRenderBase = options?.renderBase ?? true;

    try {
      const nextData: Partial<TemplateDetailPageData> = {};
      if (shouldRenderBase || !this.data.previewBaseImagePath) {
        await RendererService.renderBaseLayerToCanvas({
          scope: this,
          canvasId: 'previewBaseCanvas',
          template,
          draft,
        });
        const previewBaseImagePath = await RendererService.exportCanvasImage({
          scope: this,
          canvasId: 'previewBaseCanvas',
          template,
          outputWidth: 1080,
        });
        if (token !== previewLayerRenderToken) {
          return false;
        }
        nextData.previewBaseImagePath = previewBaseImagePath;
      }

      const renderResult = await RendererService.renderTextLayerToCanvas({
        scope: this,
        canvasId: 'previewTextCanvas',
        template,
        draft,
      });
      const previewTextImagePath = await RendererService.exportCanvasImage({
        scope: this,
        canvasId: 'previewTextCanvas',
        template,
        outputWidth: 1080,
      });
      if (token !== previewLayerRenderToken) {
        return false;
      }
      nextData.previewTextImagePath = previewTextImagePath;
      this.setData(nextData as Pick<TemplateDetailPageData, 'previewBaseImagePath' | 'previewTextImagePath'>);
      this.syncOverflowKeys(renderResult.overflowTextKeys);
      return true;
    } catch (_error) {
      return false;
    }
  },

  async renderExportCanvas(): Promise<boolean> {
    const { template, draft } = this.data;
    if (!template || !draft) {
      return false;
    }
    try {
      const renderResult = await RendererService.renderTemplateToCanvas({
        scope: this,
        canvasId: 'detailCanvas',
        template,
        draft,
      });
      this.syncOverflowKeys(renderResult.overflowTextKeys);
      return true;
    } catch (_error) {
      return false;
    }
  },

  syncOverflowKeys(overflowKeys: string[]) {
    const nextKeys = Array.from(new Set(overflowKeys));
    const prevKeys = this.data.overflowKeys;
    if (prevKeys.length === nextKeys.length && prevKeys.every((key, index) => key === nextKeys[index])) {
      return;
    }
    this.setData({ overflowKeys: nextKeys }, () => {
      this.refreshComputedData();
    });
  },

  async flushPreviewSnapshot() {
    const { template } = this.data;
    if (!template || previewSnapshotInFlight) {
      return;
    }

    previewSnapshotInFlight = true;
    try {
      const rendered = await this.renderExportCanvas();
      if (!rendered) {
        return;
      }
      const previewImagePath = await RendererService.exportCanvasImage({
        scope: this,
        canvasId: 'detailCanvas',
        template,
        outputWidth: 720,
      });
      this.setData({ previewImagePath });
    } catch (_error) {
      // Keep previous preview image on export failure.
    } finally {
      previewSnapshotInFlight = false;
    }
  },

  persistDraft() {
    const { template, draft } = this.data;
    if (!template || !draft) {
      return;
    }

    CacheService.saveTemplateDraft(template.id, draft, true);
  },

  onTapBack() {
    if (this.data.isFullPreview) {
      this.setData({ isFullPreview: false });
      return;
    }
    this.persistDraft();
    wx.navigateBack();
  },

  onTapOutsideEditor() {
    if (!this.data.editorVisible || this.data.isFullPreview) {
      return;
    }
    this.onCloseEditor();
  },

  onTapEditorPanel() {
    // Prevent panel taps from bubbling to page root.
  },

  onPanelTouchMove() {
    // Prevent panel touchmove from bubbling to preview scroll area.
  },

  onOpenEditor() {
    if (this.data.editorVisible) {
      return;
    }

    this.setData(
      {
        editorVisible: true,
        showEntryAction: false,
        isFullPreview: false,
      },
      () => {
        this.refreshComputedData();
      },
    );
  },

  onCloseEditor() {
    if (!this.data.editorVisible) {
      return;
    }

    this.setData(
      {
        editorVisible: false,
        showEntryAction: true,
        isFullPreview: false,
      },
      () => {
        this.refreshComputedData();
      },
    );
  },

  onSwitchTab(event: WechatMiniprogram.BaseEvent) {
    const tab = event.currentTarget.dataset.tab as 'text' | 'image' | 'font' | 'bg';
    if (tab !== 'image') {
      this.resetGestureState();
      if (this.data.draft?.image) {
        this.persistDraft();
      }
    }
    this.setData({ activeTab: tab }, () => {
      this.refreshComputedData();
    });
  },

  onSelectRemarkFont(event: WechatMiniprogram.BaseEvent) {
    const fontKey = event.currentTarget.dataset.fontKey as string;
    if (!fontKey || !this.data.draft) {
      return;
    }
    const preset = getRemarkFontPreset(fontKey);
    if (this.data.draft.remarkFontPresetKey === preset.key) {
      return;
    }

    const nextDraft: TemplateDetailPageData['draft'] = {
      ...this.data.draft,
      remarkFontPresetKey: preset.key,
    };
    this.setData({ draft: nextDraft }, () => {
      this.refreshComputedData();
    });
    this.renderPreview({ renderBase: false });
    this.persistDraft();
  },

  onTextInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const key = event.currentTarget.dataset.key as string;
    const value = event.detail.value;

    if (!key) {
      return;
    }

    if (key === 'name') {
      const prev = this.data.draft?.text.name || '';
      const isAppending = value.length > prev.length;
      if (isAppending && !canTitleFitTwoLines(value)) {
        if (!titleLimitToastTimer) {
          wx.showToast({
            title: '标题最多显示两行',
            icon: 'none',
          });
          titleLimitToastTimer = setTimeout(() => {
            titleLimitToastTimer = null;
          }, 1200) as unknown as number;
        }
        return;
      }
    }

    this.patchTextField(key, value, false);
  },

  patchTextField(key: string, value: string, persistNow: boolean) {
    if (!this.data.draft) {
      return;
    }

    const nextDraft: TemplateDetailPageData['draft'] = {
      ...this.data.draft,
      text: {
        ...this.data.draft.text,
        [key]: value,
      },
    };

    this.setData(
      {
        draft: nextDraft,
      },
      () => {
        this.refreshComputedData();
      },
    );

    if (persistNow) {
      this.renderPreview({ renderBase: false });
      this.persistDraft();
      return;
    }
    this.renderPreview({ renderBase: false });

    if (textDebounceTimer) {
      clearTimeout(textDebounceTimer);
    }

    textDebounceTimer = setTimeout(() => {
      this.persistDraft();
    }, TEXT_CACHE_DELAY) as unknown as number;
  },

  onDateTimeColumnChange(event: WechatMiniprogram.CustomEvent<{ column: number; value: number }>) {
    const { column, value } = event.detail;
    const nextIndex = [...this.data.dateTimeIndex];
    nextIndex[column] = value;

    if (column === 0 || column === 1) {
      const nextYear = Number(this.data.dateTimeRange[0][nextIndex[0]]);
      const nextMonth = Number(this.data.dateTimeRange[1][nextIndex[1]]);
      const nextDays = Array.from({ length: getDayCount(nextYear, nextMonth) }, (_, index) => pad2(index + 1));
      const nextRange: string[][] = [
        this.data.dateTimeRange[0],
        this.data.dateTimeRange[1],
        nextDays,
        this.data.dateTimeRange[3],
        this.data.dateTimeRange[4],
      ];
      if (nextIndex[2] >= nextDays.length) {
        nextIndex[2] = nextDays.length - 1;
      }
      this.setData({
        dateTimeRange: nextRange,
        dateTimeIndex: nextIndex,
      });
      return;
    }

    this.setData({
      dateTimeIndex: nextIndex,
    });
  },

  onPickDateTime(event: WechatMiniprogram.CustomEvent<{ value: number[] }>) {
    const selected = event.detail.value || this.data.dateTimeIndex;
    const range = this.data.dateTimeRange;
    if (range.length < 5 || !range[0].length) {
      return;
    }
    const textValue = `${range[0][selected[0]]}-${range[1][selected[1]]}-${range[2][selected[2]]} ${range[3][selected[3]]}:${range[4][selected[4]]}`;
    this.setData({ dateTimeIndex: selected });
    this.patchTextField('time', textValue, true);
  },

  async onChooseFromAlbum() {
    await this.chooseImage(['album']);
  },

  async chooseImage(sourceType: Array<'album' | 'camera'>) {
    const { template, draft } = this.data;
    if (!template || !draft) {
      return;
    }

    try {
      const imagePath = await chooseSingleImage(sourceType);
      const imageInfo = await getImageInfoByPath(imagePath);
      const canvasSize = await this.getCanvasSize();
      const slotWidth = canvasSize.width * template.imageSlot.width;
      const slotHeight = canvasSize.height * template.imageSlot.height;
      const cropParams = ImageEditService.computeCropTransform(imageInfo.width, imageInfo.height, slotWidth, slotHeight);

      const nextDraft: TemplateDetailPageData['draft'] = {
        ...draft,
        image: {
          tempPath: imagePath,
          cropParams,
        },
      };

      this.setData(
        {
          draft: nextDraft,
        },
        () => {
          this.refreshComputedData();
        },
      );

      this.persistDraft();
      this.renderPreview();
    } catch (_error) {
      wx.showToast({
        title: '图片选择失败',
        icon: 'none',
      });
    }
  },

  resetGestureState() {
    gestureMode = 'idle';
    lastTouchX = 0;
    lastTouchY = 0;
    gestureCrop = null;
    gestureSlotWidth = 0;
    gestureSlotHeight = 0;
    gestureSlotLeftClient = 0;
    gestureSlotTopClient = 0;
    gestureCanvasPerClientX = 1;
    gestureCanvasPerClientY = 1;
    pinchStartDistance = 0;
    pinchStartCenterX = 0;
    pinchStartCenterY = 0;
    pinchStartCrop = null;
  },

  scheduleCropRender() {
    if (cropRenderTimer) {
      return;
    }
    cropRenderTimer = setTimeout(() => {
      cropRenderTimer = null;
      this.renderPreview();
    }, CROP_RENDER_THROTTLE_MS) as unknown as number;
  },

  flushCropRender() {
    if (cropRenderTimer) {
      clearTimeout(cropRenderTimer);
      cropRenderTimer = null;
    }
    this.renderPreview();
  },

  setCropParams(cropParams: CropParams, persistNow = false, immediateRender = false) {
    const draft = this.data.draft;
    if (!draft?.image) {
      return;
    }

    gestureCrop = cropParams;
    const nextDraft: TemplateDetailPageData['draft'] = {
      ...draft,
      image: {
        ...draft.image,
        cropParams,
      },
    };
    this.setData({ draft: nextDraft });

    if (immediateRender) {
      this.flushCropRender();
    } else {
      this.scheduleCropRender();
    }

    if (persistNow) {
      this.persistDraft();
    }
  },

  async getPreviewRect(): Promise<PreviewRect | null> {
    return new Promise((resolve) => {
      wx.createSelectorQuery()
        .in(this)
        .select('.ticket-preview')
        .boundingClientRect((rect) => {
          const nextRect = rect as PreviewRect | null;
          if (!nextRect?.width || !nextRect?.height) {
            resolve(null);
            return;
          }
          resolve(nextRect);
        })
        .exec();
    });
  },

  async ensureGestureContext(): Promise<boolean> {
    const { template, draft } = this.data;
    if (!template || !draft?.image) {
      return false;
    }

    const [canvasSize, previewRect] = await Promise.all([this.getCanvasSize(), this.getPreviewRect()]);
    if (!previewRect) {
      return false;
    }

    const slotWidth = canvasSize.width * template.imageSlot.width;
    const slotHeight = canvasSize.height * template.imageSlot.height;
    const slotWidthInPreview = previewRect.width * template.imageSlot.width;
    const slotHeightInPreview = previewRect.height * template.imageSlot.height;
    if (slotWidth <= 0 || slotHeight <= 0 || slotWidthInPreview <= 0 || slotHeightInPreview <= 0) {
      return false;
    }

    gestureSlotWidth = slotWidth;
    gestureSlotHeight = slotHeight;
    gestureSlotLeftClient = previewRect.left + previewRect.width * template.imageSlot.x;
    gestureSlotTopClient = previewRect.top + previewRect.height * template.imageSlot.y;
    gestureCanvasPerClientX = slotWidth / slotWidthInPreview;
    gestureCanvasPerClientY = slotHeight / slotHeightInPreview;
    gestureCrop = {
      ...draft.image.cropParams,
    };
    return true;
  },

  toSlotPoint(clientX: number, clientY: number): { x: number; y: number } {
    return {
      x: (clientX - gestureSlotLeftClient) * gestureCanvasPerClientX,
      y: (clientY - gestureSlotTopClient) * gestureCanvasPerClientY,
    };
  },

  startPinchGesture(touches: WechatMiniprogram.TouchDetail[]) {
    if (touches.length < 2 || !gestureCrop) {
      return;
    }
    const [touchA, touchB] = touches;
    pinchStartDistance = getTouchDistance(touchA, touchB);
    if (pinchStartDistance <= 0) {
      return;
    }
    const center = getTouchCenter(touchA, touchB);
    gestureMode = 'pinch';
    pinchStartCenterX = center.x;
    pinchStartCenterY = center.y;
    pinchStartCrop = { ...gestureCrop };
  },

  async onPreviewTouchStart(event: WechatMiniprogram.TouchEvent) {
    if (this.data.activeTab !== 'image' || !this.data.draft?.image) {
      return;
    }

    const hasContext = await this.ensureGestureContext();
    if (!hasContext) {
      return;
    }

    if (event.touches.length >= 2) {
      this.startPinchGesture(event.touches);
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const point = getTouchXY(touch);
    gestureMode = 'drag';
    lastTouchX = point.x;
    lastTouchY = point.y;
    pinchStartDistance = 0;
    pinchStartCrop = null;
  },

  async onPreviewTouchMove(event: WechatMiniprogram.TouchEvent) {
    if (this.data.activeTab !== 'image' || !this.data.draft?.image) {
      return;
    }

    if (!gestureCrop || gestureSlotWidth <= 0 || gestureSlotHeight <= 0) {
      const hasContext = await this.ensureGestureContext();
      if (!hasContext) {
        return;
      }
    }

    if (event.touches.length >= 2) {
      if (gestureMode !== 'pinch') {
        this.startPinchGesture(event.touches);
      }

      const baseCrop = pinchStartCrop;
      if (!baseCrop || pinchStartDistance <= 0 || baseCrop.scale <= 0) {
        return;
      }
      const [touchA, touchB] = event.touches;
      const distance = getTouchDistance(touchA, touchB);
      if (distance <= 0) {
        return;
      }
      const center = getTouchCenter(touchA, touchB);
      const nextScale = (distance / pinchStartDistance) * baseCrop.scale;
      const startCenterInSlot = this.toSlotPoint(pinchStartCenterX, pinchStartCenterY);
      const currentCenterInSlot = this.toSlotPoint(center.x, center.y);
      const scaleRatio = nextScale / baseCrop.scale;
      const nextX = currentCenterInSlot.x - (startCenterInSlot.x - baseCrop.x) * scaleRatio;
      const nextY = currentCenterInSlot.y - (startCenterInSlot.y - baseCrop.y) * scaleRatio;
      const nextCrop = ImageEditService.applyCropToRenderState(
        baseCrop,
        {
          x: nextX,
          y: nextY,
          scale: nextScale,
        },
        gestureSlotWidth,
        gestureSlotHeight,
      );
      this.setCropParams(nextCrop);
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    if (gestureMode !== 'drag') {
      const point = getTouchXY(touch);
      gestureMode = 'drag';
      lastTouchX = point.x;
      lastTouchY = point.y;
      pinchStartDistance = 0;
      pinchStartCrop = null;
      return;
    }

    const point = getTouchXY(touch);
    const deltaX = (point.x - lastTouchX) * gestureCanvasPerClientX;
    const deltaY = (point.y - lastTouchY) * gestureCanvasPerClientY;
    lastTouchX = point.x;
    lastTouchY = point.y;

    const baseCrop = gestureCrop;
    if (!baseCrop) {
      return;
    }
    const nextCrop = ImageEditService.applyCropToRenderState(
      baseCrop,
      {
        x: baseCrop.x + deltaX,
        y: baseCrop.y + deltaY,
      },
      gestureSlotWidth,
      gestureSlotHeight,
    );
    this.setCropParams(nextCrop);
  },

  onPreviewTouchEnd(event: WechatMiniprogram.TouchEvent) {
    if (this.data.activeTab !== 'image' || !this.data.draft?.image) {
      return;
    }

    if (event.touches.length >= 2) {
      this.startPinchGesture(event.touches);
      return;
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const point = getTouchXY(touch);
      gestureMode = 'drag';
      lastTouchX = point.x;
      lastTouchY = point.y;
      pinchStartDistance = 0;
      pinchStartCrop = null;
      return;
    }

    if (gestureMode === 'idle') {
      return;
    }

    gestureMode = 'idle';
    pinchStartDistance = 0;
    pinchStartCrop = null;
    this.flushCropRender();
    this.persistDraft();
  },

  onPreviewTouchCancel(event: WechatMiniprogram.TouchEvent) {
    this.onPreviewTouchEnd(event);
  },

  onTapColor(event: WechatMiniprogram.BaseEvent) {
    const color = event.currentTarget.dataset.color as string;
    if (!color || !this.data.draft) {
      return;
    }

    const nextDraft: TemplateDetailPageData['draft'] = {
      ...this.data.draft,
      bgColor: color,
    };

    this.setData({ draft: nextDraft }, () => {
      this.refreshComputedData();
    });
    this.persistDraft();
    this.renderPreview();
  },

  async onTapFullPreview() {
    if (this.data.isSaving) {
      return;
    }
    await this.flushPreviewSnapshot();
    this.setData({ isFullPreview: true });
  },

  onExitFullPreview() {
    if (!this.data.isFullPreview) {
      return;
    }
    this.setData({ isFullPreview: false });
  },

  async onTapSaveAlbum() {
    const { template } = this.data;
    if (!template || this.data.isSaving) {
      return;
    }

    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存中...' });
    try {
      const rendered = await this.renderExportCanvas();
      if (!rendered) {
        throw new Error('render failed');
      }
      const imagePath = await RendererService.exportCanvasImage({
        scope: this,
        canvasId: 'detailCanvas',
        template,
      });
      await saveToAlbum(imagePath);
      CacheService.clearTemplateDraft(template.id);
      wx.hideLoading();
      this.setData({ isSaving: false });
      wx.navigateTo({
        url: `/pages/save-result/index?templateId=${template.id}&imagePath=${encodeURIComponent(imagePath)}`,
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

  async getCanvasSize(): Promise<{ width: number; height: number }> {
    if (cachedCanvasWidth > 0 && cachedCanvasHeight > 0) {
      return { width: cachedCanvasWidth, height: cachedCanvasHeight };
    }

    return new Promise((resolve) => {
      wx.createSelectorQuery()
        .in(this)
        .select('#previewBaseCanvas')
        .fields({ size: true })
        .exec((res) => {
          const size = res?.[0];
          if (!size?.width || !size?.height) {
            const template = this.data.template;
            const fallbackWidth = 320;
            const fallbackRatio = template ? template.canvasSize.height / template.canvasSize.width : 1.6;
            resolve({ width: fallbackWidth, height: Math.round(fallbackWidth * fallbackRatio) });
            return;
          }
          cachedCanvasWidth = size.width;
          cachedCanvasHeight = size.height;
          resolve({ width: size.width, height: size.height });
        });
    });
  },
});
