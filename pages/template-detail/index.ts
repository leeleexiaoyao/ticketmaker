import { CacheService } from '../../services/cache.service';
import { DraftService } from '../../services/draft.service';
import { ImageEditService } from '../../services/image-edit.service';
import { RendererService } from '../../services/renderer.service';
import { TemplateService } from '../../services/template.service';
import { TemplateDraft } from '../../models/draft';
import { TemplateConfig, TemplateId } from '../../models/template';
import { TEXT_CACHE_DELAY } from '../../utils/constants';
import { getSafeTopStyle } from '../../utils/safe-area';

interface FieldViewModel {
  key: string;
  label: string;
  placeholder: string;
  isRemark: boolean;
  isTimeField: boolean;
  isAddressField: boolean;
  maxLength: number;
  value: string;
}

interface ColorViewModel {
  value: string;
  className: string;
}

interface TemplateDetailPageData {
  template: TemplateConfig | null;
  templateName: string;
  draft: TemplateDraft | null;
  safeTopStyle: string;
  isRouting: boolean;
  activeTab: 'text' | 'image' | 'bg';
  editorVisible: boolean;
  pageClass: string;
  editorPanelClass: string;
  textTabClass: string;
  imageTabClass: string;
  bgTabClass: string;
  showTextTab: boolean;
  showImageTab: boolean;
  showBgTab: boolean;
  showScaleSlider: boolean;
  showEntryAction: boolean;
  isSaving: boolean;
  fieldsForRender: FieldViewModel[];
  colorsForRender: ColorViewModel[];
  scaleSliderValue: number;
  previewImagePath: string;
  dateTimeRange: string[][];
  dateTimeIndex: number[];
  regionValue: string[];
  hasAddressField: boolean;
  addressPlaceholder: string;
}

let textDebounceTimer: number | null = null;
let previewRenderToken = 0;
let previewSnapshotTimer: number | null = null;
let previewSnapshotInFlight = false;
let previewSnapshotPending = false;
let dragging = false;
let lastTouchX = 0;
let lastTouchY = 0;
let cachedCanvasWidth = 0;
let cachedCanvasHeight = 0;

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

Page<TemplateDetailPageData, WechatMiniprogram.IAnyObject>({
  data: {
    template: null,
    templateName: '',
    draft: null,
    safeTopStyle: 'padding-top: 48px;',
    isRouting: false,
    activeTab: 'text',
    editorVisible: false,
    pageClass: 'container detail-page',
    editorPanelClass: 'editor-panel',
    textTabClass: 'tab-item active',
    imageTabClass: 'tab-item',
    bgTabClass: 'tab-item',
    showTextTab: false,
    showImageTab: false,
    showBgTab: false,
    showScaleSlider: false,
    showEntryAction: true,
    isSaving: false,
    fieldsForRender: [],
    colorsForRender: [],
    scaleSliderValue: 100,
    previewImagePath: '',
    dateTimeRange: [[], [], [], [], []],
    dateTimeIndex: [0, 0, 0, 0, 0],
    regionValue: [],
    hasAddressField: false,
    addressPlaceholder: '请选择城市',
  },

  refreshComputedData() {
    const { template, draft, activeTab, editorVisible } = this.data;
    const hasAddressField = !!template?.fields.some((field) => field.key === 'address');
    const addressPlaceholder = '请选择城市';

    const fieldsForRender: FieldViewModel[] =
      template && draft
        ? template.fields.map((field) => ({
            key: field.key,
            label: field.key === 'name' ? '主题' : field.key === 'remark' ? '留言' : field.key === 'source' ? '来自' : field.label,
            placeholder:
              field.key === 'name'
                ? '请输入不超过20个字的标题内容'
                : field.key === 'remark'
                  ? '请输入留言内容，不超过50字'
                  : field.key === 'source'
                    ? '请输入来自内容，不超过50字'
                    : field.key === 'address'
                      ? '请选择城市'
                    : field.placeholder,
            isRemark: field.key === 'remark',
            isTimeField: field.key === 'time',
            isAddressField: field.key === 'address',
            maxLength: field.key === 'name' ? 20 : field.key === 'remark' || field.key === 'source' ? 50 : 120,
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

    this.setData({
      templateName: template ? template.name : '',
      pageClass: editorVisible ? 'container detail-page editor-open' : 'container detail-page',
      editorPanelClass: editorVisible ? 'editor-panel open' : 'editor-panel',
      textTabClass: activeTab === 'text' ? 'tab-item active' : 'tab-item',
      imageTabClass: activeTab === 'image' ? 'tab-item active' : 'tab-item',
      bgTabClass: activeTab === 'bg' ? 'tab-item active' : 'tab-item',
      showTextTab: activeTab === 'text' && !!template && !!draft,
      showImageTab: activeTab === 'image',
      showBgTab: activeTab === 'bg' && !!template && !!draft,
      showScaleSlider: activeTab === 'image' && !!draft?.image,
      showEntryAction: !editorVisible,
      fieldsForRender,
      colorsForRender,
      hasAddressField,
      addressPlaceholder,
    });
  },

  onLoad(options) {
    cachedCanvasWidth = 0;
    cachedCanvasHeight = 0;
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
        scaleSliderValue: draft.image?.cropParams ? Math.round(draft.image.cropParams.scale * 100) : 100,
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
    if (this.data.isRouting) {
      this.setData({ isRouting: false });
    }
    this.renderPreview();
  },

  onResize() {
    cachedCanvasWidth = 0;
    cachedCanvasHeight = 0;
    this.renderPreview();
  },

  onHide() {
    this.persistDraft();
  },

  onUnload() {
    if (textDebounceTimer) {
      clearTimeout(textDebounceTimer);
      textDebounceTimer = null;
    }
    if (previewSnapshotTimer) {
      clearTimeout(previewSnapshotTimer);
      previewSnapshotTimer = null;
    }
    previewSnapshotInFlight = false;
    previewSnapshotPending = false;
    this.persistDraft();
  },

  async renderPreview(): Promise<boolean> {
    const { template, draft } = this.data;
    if (!template || !draft) {
      return false;
    }

    try {
      await RendererService.renderTemplateToCanvas({
        scope: this,
        canvasId: 'detailCanvas',
        template,
        draft,
      });
      this.schedulePreviewSnapshot();
      return true;
    } catch (_error) {
      return false;
    }
  },

  schedulePreviewSnapshot(delay = 60) {
    previewRenderToken += 1;
    if (previewSnapshotTimer) {
      clearTimeout(previewSnapshotTimer);
      previewSnapshotTimer = null;
    }
    previewSnapshotTimer = setTimeout(() => {
      previewSnapshotTimer = null;
      this.flushPreviewSnapshot();
    }, delay) as unknown as number;
  },

  async flushPreviewSnapshot() {
    if (previewSnapshotInFlight) {
      previewSnapshotPending = true;
      return;
    }

    const token = previewRenderToken;
    previewSnapshotInFlight = true;
    try {
      const previewImagePath = await RendererService.exportCanvasImage(this, 'detailCanvas');
      if (token !== previewRenderToken) {
        return;
      }
      this.setData({ previewImagePath });
    } catch (_error) {
      // Keep previous preview image on export failure.
    } finally {
      previewSnapshotInFlight = false;
      if (previewSnapshotPending) {
        previewSnapshotPending = false;
        this.schedulePreviewSnapshot(16);
      }
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
    this.persistDraft();
    wx.navigateBack();
  },

  onOpenEditor() {
    if (this.data.editorVisible) {
      return;
    }

    this.setData(
      {
        editorVisible: true,
        showEntryAction: false,
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
      },
      () => {
        this.refreshComputedData();
      },
    );
  },

  onSwitchTab(event: WechatMiniprogram.BaseEvent) {
    const tab = event.currentTarget.dataset.tab as 'text' | 'image' | 'bg';
    this.setData({ activeTab: tab }, () => {
      this.refreshComputedData();
    });
  },

  onTextInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const key = event.currentTarget.dataset.key as string;
    const value = event.detail.value;

    if (!key) {
      return;
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

    this.renderPreview();

    if (persistNow) {
      this.persistDraft();
      return;
    }

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

  onPickAddress(event: WechatMiniprogram.CustomEvent<{ value: string[] }>) {
    const region = event.detail.value || [];
    const textValue = region[1] || region[0] || '';
    this.setData({ regionValue: region });
    this.patchTextField('address', textValue, true);
  },

  async onChooseFromAlbum() {
    await this.chooseImage(['album']);
  },

  async onChooseFromCamera() {
    await this.chooseImage(['camera']);
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
          scaleSliderValue: Math.round(cropParams.scale * 100),
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

  onScaleSliderChange(event: WechatMiniprogram.CustomEvent<{ value: number }>) {
    const sliderValue = Number(event.detail.value || 100);
    this.applyCropPatch({ scale: sliderValue / 100 }, true);
  },

  async applyCropPatch(patch: Partial<{ x: number; y: number; scale: number }>, persistNow = false) {
    const { template, draft } = this.data;
    if (!template || !draft?.image) {
      return;
    }

    const canvasSize = await this.getCanvasSize();
    const slotWidth = canvasSize.width * template.imageSlot.width;
    const slotHeight = canvasSize.height * template.imageSlot.height;

    const cropParams = ImageEditService.applyCropToRenderState(draft.image.cropParams, patch, slotWidth, slotHeight);

    const nextDraft: TemplateDetailPageData['draft'] = {
      ...draft,
      image: {
        ...draft.image,
        cropParams,
      },
    };

    this.setData(
      {
        draft: nextDraft,
        scaleSliderValue: Math.round(cropParams.scale * 100),
      },
      () => {
        this.refreshComputedData();
      },
    );

    this.renderPreview();

    if (persistNow) {
      this.persistDraft();
    }
  },

  onPreviewTouchStart(event: WechatMiniprogram.TouchEvent) {
    if (this.data.activeTab !== 'image' || !this.data.draft?.image) {
      return;
    }

    const touch = event.changedTouches[0];
    dragging = true;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  },

  onPreviewTouchMove(event: WechatMiniprogram.TouchEvent) {
    if (!dragging || this.data.activeTab !== 'image' || !this.data.draft?.image) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - lastTouchX;
    const deltaY = touch.clientY - lastTouchY;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;

    const currentCrop = this.data.draft.image.cropParams;
    this.applyCropPatch({
      x: currentCrop.x + deltaX,
      y: currentCrop.y + deltaY,
    });
  },

  onPreviewTouchEnd() {
    if (!dragging) {
      return;
    }

    dragging = false;
    this.persistDraft();
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

  onTapFullPreview() {
    const { template } = this.data;
    if (!template || this.data.isRouting || this.data.isSaving) {
      return;
    }

    this.persistDraft();
    this.setData({ isRouting: true }, () => {
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/preview/index?templateId=${template.id}`,
          fail: () => {
            this.setData({ isRouting: false });
          },
        });
      }, 16);
    });
  },

  async onTapSaveAlbum() {
    const { template } = this.data;
    if (!template || this.data.isSaving) {
      return;
    }

    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存中...' });
    try {
      if (previewSnapshotTimer) {
        clearTimeout(previewSnapshotTimer);
        previewSnapshotTimer = null;
      }
      previewSnapshotPending = false;
      const rendered = await this.renderPreview();
      if (!rendered) {
        throw new Error('render failed');
      }
      const imagePath = await RendererService.exportCanvasImage(this, 'detailCanvas');
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

  async getCanvasSize(): Promise<{ width: number; height: number }> {
    if (cachedCanvasWidth > 0 && cachedCanvasHeight > 0) {
      return { width: cachedCanvasWidth, height: cachedCanvasHeight };
    }

    return new Promise((resolve) => {
      wx.createSelectorQuery()
        .in(this)
        .select('#detailCanvas')
        .fields({ size: true })
        .exec((res) => {
          const size = res?.[0];
          if (!size?.width || !size?.height) {
            resolve({ width: 320, height: 510 });
            return;
          }
          cachedCanvasWidth = size.width;
          cachedCanvasHeight = size.height;
          resolve({ width: size.width, height: size.height });
        });
    });
  },
});
