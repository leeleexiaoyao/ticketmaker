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
  fields: TemplateFieldSchema[];
  defaultText: Record<string, string>;
  defaultBgColor: string;
  presetColors: string[];
  imageSlot: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fixedLayerColor: string;
  fixedLayerSvg: string;
  colorLayerSvg: string;
}

const COMMON_PRESET_COLORS = ['#FF5E5E', '#FF8F33', '#FFD43B', '#6EC1FF', '#66CDAA', '#A78BFA', '#95A5A6'];

const FIXED_LAYER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1600" preserveAspectRatio="none">
  <rect x="0" y="0" width="1000" height="1600" fill="#D9D9D9" />
  <rect x="70" y="70" width="860" height="760" fill="#EFEFEF" />
  <rect x="70" y="990" width="860" height="4" fill="#BFBFBF" />
</svg>`;

const COLOR_LAYER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1600" preserveAspectRatio="none">
  <rect x="0" y="0" width="1000" height="1600" fill="{{COLOR}}" fill-opacity="0.16" />
  <rect x="0" y="1080" width="1000" height="520" fill="{{COLOR}}" fill-opacity="0.12" />
</svg>`;

export const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    id: 'concert-template-1',
    name: '演唱会模板一',
    category: 'concert',
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
    imageSlot: {
      x: 0.09,
      y: 0.055,
      width: 0.82,
      height: 0.47,
    },
    fixedLayerColor: '#D9D9D9',
    fixedLayerSvg: FIXED_LAYER_SVG,
    colorLayerSvg: COLOR_LAYER_SVG,
  },
  {
    id: 'concert-template-2',
    name: '演唱会模板二',
    category: 'concert',
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
    imageSlot: {
      x: 0.09,
      y: 0.07,
      width: 0.82,
      height: 0.44,
    },
    fixedLayerColor: '#D9D9D9',
    fixedLayerSvg: FIXED_LAYER_SVG,
    colorLayerSvg: COLOR_LAYER_SVG,
  },
  {
    id: 'train-template-1',
    name: '车票模板一',
    category: 'train',
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
    imageSlot: {
      x: 0.09,
      y: 0.055,
      width: 0.82,
      height: 0.47,
    },
    fixedLayerColor: '#D9D9D9',
    fixedLayerSvg: FIXED_LAYER_SVG,
    colorLayerSvg: COLOR_LAYER_SVG,
  },
  {
    id: 'train-template-2',
    name: '车票模板二',
    category: 'train',
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
    imageSlot: {
      x: 0.09,
      y: 0.065,
      width: 0.82,
      height: 0.45,
    },
    fixedLayerColor: '#D9D9D9',
    fixedLayerSvg: FIXED_LAYER_SVG,
    colorLayerSvg: COLOR_LAYER_SVG,
  },
  {
    id: 'other-template-1',
    name: '其他票根模板一',
    category: 'other',
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
    imageSlot: {
      x: 0.09,
      y: 0.055,
      width: 0.82,
      height: 0.47,
    },
    fixedLayerColor: '#D9D9D9',
    fixedLayerSvg: FIXED_LAYER_SVG,
    colorLayerSvg: COLOR_LAYER_SVG,
  },
  {
    id: 'other-template-2',
    name: '其他票根模板二',
    category: 'other',
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
    imageSlot: {
      x: 0.09,
      y: 0.065,
      width: 0.82,
      height: 0.45,
    },
    fixedLayerColor: '#D9D9D9',
    fixedLayerSvg: FIXED_LAYER_SVG,
    colorLayerSvg: COLOR_LAYER_SVG,
  },
];
