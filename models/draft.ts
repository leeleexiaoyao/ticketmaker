import { TemplateId } from './template';

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
}

export interface DraftStore {
  lastEditTemplate: TemplateId | '';
  templateData: Partial<Record<TemplateId, TemplateDraft>>;
}
