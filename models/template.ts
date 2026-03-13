import { CONCERT_TEMPLATE_FIXED_SVG } from '../assets/templates/concert-template-1/fixed-svg';
import { CONCERT_TEMPLATE_TINT_SVG } from '../assets/templates/concert-template-1/tint-svg';

export type TemplateCategory = 'concert' | 'train' | 'other';

export type TemplateId =
  | 'concert-template-1'
  | 'concert-template-2'
  | 'train-template-1'
  | 'train-template-2'
  | 'other-template-1'
  | 'other-template-2';

export interface TemplateFieldSchema {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  customFont?: boolean;
}

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  category: TemplateCategory;
  preview: {
    src: string;
    width: number;
    height: number;
  };
  fields: TemplateFieldSchema[];
  defaultText: Record<string, string>;
  defaultBgColor: string;
  presetColors: string[];
  canvasSize: {
    width: number;
    height: number;
  };
  imageSlot: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  layers: {
    tintSvg: string;
    fixedSvg: string;
    tintPlaceholderColor: string;
  };
}

const COMMON_PRESET_COLORS = ['#FF5E5E', '#FF8F33', '#FFD43B', '#6EC1FF', '#66CDAA', '#A78BFA', '#95A5A6'];
const TINT_PLACEHOLDER_COLOR = '#FF8989';
const DEFAULT_CANVAS_SIZE = {
  width: 440,
  height: 904,
};
const HOME_TEMPLATE_PREVIEW = {
  src: '/assets/templates/concert-template-1/preview-concert-1.png',
  width: 880,
  height: 1808,
};
const DEFAULT_IMAGE_SLOT = {
  x: 20 / 440,
  y: 20 / 904,
  width: 400 / 440,
  height: 565 / 904,
};

export const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    id: 'concert-template-1',
    name: '演唱会模板一',
    category: 'concert',
    preview: HOME_TEMPLATE_PREVIEW,
    fields: [
      { key: 'name', label: '名称', placeholder: '请选择演唱会名称', required: true },
      { key: 'time', label: '时间', placeholder: '请选择时间', required: true },
      { key: 'address', label: '地点', placeholder: '请填写演唱会举办场地', required: true },
      { key: 'remark', label: '备注', placeholder: '可以填写您想说的内容', customFont: true },
      { key: 'source', label: '来源', placeholder: '备注的来源，可以不填' },
    ],
    defaultText: {
      name: '周杰伦无与伦比',
      time: '2026-04-19',
      address: '深圳大运体育场',
      remark: '吹着前奏望着天空\n我想起花瓣试着掉落',
      source: '《晴天》',
    },
    defaultBgColor: '#FF5E5E',
    presetColors: COMMON_PRESET_COLORS,
    canvasSize: DEFAULT_CANVAS_SIZE,
    imageSlot: DEFAULT_IMAGE_SLOT,
    layers: {
      tintSvg: CONCERT_TEMPLATE_TINT_SVG,
      fixedSvg: CONCERT_TEMPLATE_FIXED_SVG,
      tintPlaceholderColor: TINT_PLACEHOLDER_COLOR,
    },
  },
  {
    id: 'concert-template-2',
    name: '演唱会模板二',
    category: 'concert',
    preview: HOME_TEMPLATE_PREVIEW,
    fields: [
      { key: 'name', label: '名称', placeholder: '请选择演唱会名称', required: true },
      { key: 'time', label: '时间', placeholder: '请选择时间', required: true },
      { key: 'address', label: '地点', placeholder: '请填写演唱会举办场地', required: true },
      { key: 'remark', label: '备注', placeholder: '可以填写您想说的内容', customFont: true },
      { key: 'source', label: '来源', placeholder: '备注的来源，可以不填' },
    ],
    defaultText: {
      name: '林俊杰JJ20',
      time: '2026-07-11',
      address: '广州奥体中心',
      remark: '把想说的话写在票根里\n把回忆留在这一夜',
      source: '修炼爱情',
    },
    defaultBgColor: '#A78BFA',
    presetColors: COMMON_PRESET_COLORS,
    canvasSize: DEFAULT_CANVAS_SIZE,
    imageSlot: DEFAULT_IMAGE_SLOT,
    layers: {
      tintSvg: CONCERT_TEMPLATE_TINT_SVG,
      fixedSvg: CONCERT_TEMPLATE_FIXED_SVG,
      tintPlaceholderColor: TINT_PLACEHOLDER_COLOR,
    },
  },
  {
    id: 'train-template-1',
    name: '车票模板一',
    category: 'train',
    preview: HOME_TEMPLATE_PREVIEW,
    fields: [
      { key: 'from', label: '出发地', placeholder: '请填写出发地', required: true },
      { key: 'to', label: '目的地', placeholder: '请填写目的地', required: true },
      { key: 'time', label: '时间', placeholder: '请选择出发时间', required: true },
      { key: 'trainNo', label: '车次', placeholder: '请填写车次', required: true },
      { key: 'seatNo', label: '座位号', placeholder: '请填写座位号', required: true },
      { key: 'remark', label: '备注', placeholder: '记录你的旅行心情', customFont: true },
    ],
    defaultText: {
      from: '上海虹桥',
      to: '杭州东',
      time: '2026-05-01 08:30',
      trainNo: 'G7313',
      seatNo: '08车12A',
      remark: '一张车票，开启新的故事',
    },
    defaultBgColor: '#6EC1FF',
    presetColors: COMMON_PRESET_COLORS,
    canvasSize: DEFAULT_CANVAS_SIZE,
    imageSlot: DEFAULT_IMAGE_SLOT,
    layers: {
      tintSvg: CONCERT_TEMPLATE_TINT_SVG,
      fixedSvg: CONCERT_TEMPLATE_FIXED_SVG,
      tintPlaceholderColor: TINT_PLACEHOLDER_COLOR,
    },
  },
  {
    id: 'train-template-2',
    name: '车票模板二',
    category: 'train',
    preview: HOME_TEMPLATE_PREVIEW,
    fields: [
      { key: 'from', label: '出发地', placeholder: '请填写出发地', required: true },
      { key: 'to', label: '目的地', placeholder: '请填写目的地', required: true },
      { key: 'time', label: '时间', placeholder: '请选择出发时间', required: true },
      { key: 'trainNo', label: '车次', placeholder: '请填写车次', required: true },
      { key: 'seatNo', label: '座位号', placeholder: '请填写座位号', required: true },
      { key: 'remark', label: '备注', placeholder: '记录你的旅行心情', customFont: true },
    ],
    defaultText: {
      from: '北京南',
      to: '天津西',
      time: '2026-08-15 09:12',
      trainNo: 'C2567',
      seatNo: '03车08F',
      remark: '风景在路上，心情也在路上',
    },
    defaultBgColor: '#FFD43B',
    presetColors: COMMON_PRESET_COLORS,
    canvasSize: DEFAULT_CANVAS_SIZE,
    imageSlot: DEFAULT_IMAGE_SLOT,
    layers: {
      tintSvg: CONCERT_TEMPLATE_TINT_SVG,
      fixedSvg: CONCERT_TEMPLATE_FIXED_SVG,
      tintPlaceholderColor: TINT_PLACEHOLDER_COLOR,
    },
  },
  {
    id: 'other-template-1',
    name: '其他票根模板一',
    category: 'other',
    preview: HOME_TEMPLATE_PREVIEW,
    fields: [
      { key: 'from', label: '出发地', placeholder: '请输入起点', required: true },
      { key: 'to', label: '目的地', placeholder: '请输入终点', required: true },
      { key: 'time', label: '时间', placeholder: '请输入时间', required: true },
      { key: 'trainNo', label: '编号', placeholder: '请输入编号', required: true },
      { key: 'seatNo', label: '座位号', placeholder: '请输入位置', required: true },
      { key: 'remark', label: '备注', placeholder: '记录此刻的心情', customFont: true },
    ],
    defaultText: {
      from: '起点',
      to: '终点',
      time: '2026-05-01',
      trainNo: 'NO.2026',
      seatNo: 'A-01',
      remark: '把这份回忆，留在票根里',
    },
    defaultBgColor: '#66CDAA',
    presetColors: COMMON_PRESET_COLORS,
    canvasSize: DEFAULT_CANVAS_SIZE,
    imageSlot: DEFAULT_IMAGE_SLOT,
    layers: {
      tintSvg: CONCERT_TEMPLATE_TINT_SVG,
      fixedSvg: CONCERT_TEMPLATE_FIXED_SVG,
      tintPlaceholderColor: TINT_PLACEHOLDER_COLOR,
    },
  },
  {
    id: 'other-template-2',
    name: '其他票根模板二',
    category: 'other',
    preview: HOME_TEMPLATE_PREVIEW,
    fields: [
      { key: 'from', label: '出发地', placeholder: '请输入起点', required: true },
      { key: 'to', label: '目的地', placeholder: '请输入终点', required: true },
      { key: 'time', label: '时间', placeholder: '请输入时间', required: true },
      { key: 'trainNo', label: '编号', placeholder: '请输入编号', required: true },
      { key: 'seatNo', label: '座位号', placeholder: '请输入位置', required: true },
      { key: 'remark', label: '备注', placeholder: '记录此刻的心情', customFont: true },
    ],
    defaultText: {
      from: '展馆A',
      to: '展馆B',
      time: '2026-09-09',
      trainNo: 'EXPO-09',
      seatNo: 'N-18',
      remark: '看见喜欢的展，就是幸运的一天',
    },
    defaultBgColor: '#FF8F33',
    presetColors: COMMON_PRESET_COLORS,
    canvasSize: DEFAULT_CANVAS_SIZE,
    imageSlot: DEFAULT_IMAGE_SLOT,
    layers: {
      tintSvg: CONCERT_TEMPLATE_TINT_SVG,
      fixedSvg: CONCERT_TEMPLATE_FIXED_SVG,
      tintPlaceholderColor: TINT_PLACEHOLDER_COLOR,
    },
  },
];
