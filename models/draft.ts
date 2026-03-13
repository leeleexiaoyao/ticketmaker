import { TemplateId } from './template';
import { RemarkFontPresetKey } from '../utils/font-presets';

export interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface ImageDraft {
  tempPath: string;
  cropParams: CropParams;
}

export interface TextDraft {
  [key: string]: string;
}

export interface TemplateDraft {
  text: TextDraft;
  image: ImageDraft | null;
  bgColor: string;
  remarkFontPresetKey: RemarkFontPresetKey;
}

export interface DraftStore {
  lastEditTemplate: TemplateId | '';
  templateData: Partial<Record<TemplateId, TemplateDraft>>;
}
