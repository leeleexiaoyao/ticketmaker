import { DraftStore, TemplateDraft } from '../models/draft';
import { TemplateId } from '../models/template';
import { STORAGE_KEY } from '../utils/constants';

const createEmptyStore = (): DraftStore => ({
  lastEditTemplate: '',
  templateData: {},
});

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const safeStore = (value: unknown): DraftStore => {
  if (!isObject(value)) {
    return createEmptyStore();
  }

  const templateData = isObject(value.templateData)
    ? (value.templateData as DraftStore['templateData'])
    : createEmptyStore().templateData;

  const lastEditTemplate = typeof value.lastEditTemplate === 'string' ? (value.lastEditTemplate as TemplateId | '') : '';

  return {
    lastEditTemplate,
    templateData,
  };
};

const writeStore = (store: DraftStore) => {
  wx.setStorageSync(STORAGE_KEY, store);
};

export const CacheService = {
  loadDraftStore(): DraftStore {
    try {
      const cache = wx.getStorageSync(STORAGE_KEY);
      return safeStore(cache);
    } catch (_error) {
      return createEmptyStore();
    }
  },

  saveTemplateDraft(templateId: TemplateId, draft: TemplateDraft, updateLastTemplate = true): DraftStore {
    const store = this.loadDraftStore();
    store.templateData[templateId] = draft;
    if (updateLastTemplate) {
      store.lastEditTemplate = templateId;
    }
    writeStore(store);
    return store;
  },

  getTemplateDraft(templateId: TemplateId): TemplateDraft | null {
    const store = this.loadDraftStore();
    return store.templateData[templateId] ?? null;
  },

  setLastEditTemplate(templateId: TemplateId | ''): DraftStore {
    const store = this.loadDraftStore();
    store.lastEditTemplate = templateId;
    writeStore(store);
    return store;
  },

  clearTemplateDraft(templateId: TemplateId): DraftStore {
    const store = this.loadDraftStore();
    delete store.templateData[templateId];
    if (store.lastEditTemplate === templateId) {
      store.lastEditTemplate = '';
    }
    writeStore(store);
    return store;
  },

  clearAllDrafts() {
    wx.removeStorageSync(STORAGE_KEY);
  },
};
