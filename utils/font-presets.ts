export type RemarkFontPresetKey = 'style1' | 'style2' | 'style3' | 'style4';

export interface RemarkFontPreset {
  key: RemarkFontPresetKey;
  label: string;
  family: string;
  source?: string;
}

export const DEFAULT_REMARK_FONT_PRESET_KEY: RemarkFontPresetKey = 'style1';

export const REMARK_FONT_PRESETS: RemarkFontPreset[] = [
  {
    key: 'style1',
    label: '字体1',
    family: 'TicketRemarkFontStyle1',
    source: 'url("/assets/fonts/remark-style-1.ttf")',
  },
  {
    key: 'style2',
    label: '字体2',
    family: 'TicketRemarkFontStyle2',
    source: 'url("/assets/fonts/remark-style-2.ttf")',
  },
  {
    key: 'style3',
    label: '字体3',
    family: 'TicketRemarkFontStyle3',
    source: 'url("/assets/fonts/remark-style-3.ttf")',
  },
  {
    key: 'style4',
    label: '字体4',
    family: 'TicketRemarkFontStyle4',
    source: 'url("/assets/fonts/remark-style-4.ttf")',
  },
];

export const getRemarkFontPreset = (key: string | undefined): RemarkFontPreset =>
  REMARK_FONT_PRESETS.find((item) => item.key === key) || REMARK_FONT_PRESETS[0];
