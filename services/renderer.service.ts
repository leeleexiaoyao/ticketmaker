import { TemplateDraft } from '../models/draft';
import { TemplateConfig } from '../models/template';
import { getRemarkFontPreset } from '../utils/font-presets';

interface RenderTemplateParams {
  scope: WechatMiniprogram.Component.TrivialInstance | WechatMiniprogram.Page.TrivialInstance;
  canvasId: string;
  template: TemplateConfig;
  draft: TemplateDraft;
}

interface ExportCanvasParams {
  scope: WechatMiniprogram.Component.TrivialInstance | WechatMiniprogram.Page.TrivialInstance;
  canvasId: string;
  template: TemplateConfig;
  outputWidth?: number;
}

interface CanvasBundle {
  canvas: any;
  ctx: any;
  width: number;
  height: number;
}

interface RenderTemplateResult {
  overflowTextKeys: string[];
}

interface TextLayoutResult {
  lines: string[];
  overflow: boolean;
}

interface TextBlock {
  key: string;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  maxLines: number;
  font: string;
  align?: CanvasTextAlign;
}

const encodeSvg = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const stripHash = (value: string): string => value.replace(/^#/, '').trim().toLowerCase();
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sanitizeColor = (value: string, fallback: string): string =>
  /^#[\da-f]{3}([\da-f]{3})?$/i.test(value) ? value : fallback;
const INTERNAL_RENDER_SCALE = 2;

const loadImage = (canvas: any, src: string): Promise<any> =>
  new Promise((resolve, reject) => {
    const image = canvas.createImage();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('load image failed'));
    image.src = src;
  });

const getCanvasBundle = (
  scope: WechatMiniprogram.Component.TrivialInstance | WechatMiniprogram.Page.TrivialInstance,
  canvasId: string,
  resetSize = true,
): Promise<CanvasBundle> =>
  new Promise((resolve, reject) => {
    wx.createSelectorQuery()
      .in(scope)
      .select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvasNode = res?.[0];
        if (!canvasNode?.node || !canvasNode?.width || !canvasNode?.height) {
          reject(new Error('canvas node not found'));
          return;
        }

        const canvas = canvasNode.node as any;
        const ctx = canvas.getContext('2d') as any;
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const effectiveScale = dpr * INTERNAL_RENDER_SCALE;

        if (resetSize) {
          canvas.width = canvasNode.width * effectiveScale;
          canvas.height = canvasNode.height * effectiveScale;
        }
        ctx.setTransform(effectiveScale, 0, 0, effectiveScale, 0, 0);
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        resolve({
          canvas,
          ctx,
          width: canvasNode.width,
          height: canvasNode.height,
        });
      });
  });

const applyTintColor = (svg: string, placeholderColor: string, targetColor: string): string => {
  const safeColor = sanitizeColor(targetColor, '#FF5E5E');
  const placeholderHex = stripHash(placeholderColor);
  const placeholderRegex = new RegExp(`#${escapeRegExp(placeholderHex)}\\b`, 'gi');

  if (svg.includes('{{COLOR}}')) {
    return svg.replace(/\{\{COLOR\}\}/g, safeColor);
  }

  return svg.replace(placeholderRegex, safeColor);
};

const drawBaseLayers = async (params: {
  canvas: any;
  ctx: any;
  width: number;
  height: number;
  template: TemplateConfig;
  draft: TemplateDraft;
  safeBgColor: string;
  tintSvg: string;
}): Promise<void> => {
  const { canvas, ctx, width, height, template, draft, safeBgColor, tintSvg } = params;
  ctx.clearRect(0, 0, width, height);

  try {
    const tintLayer = await loadImage(canvas, encodeSvg(tintSvg));
    ctx.drawImage(tintLayer, 0, 0, width, height);
  } catch (_error) {
    ctx.fillStyle = safeBgColor;
    ctx.fillRect(0, 0, width, height);
  }

  try {
    const fixedLayer = await loadImage(canvas, encodeSvg(template.layers.fixedSvg));
    ctx.drawImage(fixedLayer, 0, 0, width, height);
  } catch (_error) {
    // Keep only tint layer if fixed layer load failed.
  }

  const slotX = width * template.imageSlot.x;
  const slotY = height * template.imageSlot.y;
  const slotWidth = width * template.imageSlot.width;
  const slotHeight = height * template.imageSlot.height;

  ctx.fillStyle = '#efefef';
  ctx.fillRect(slotX, slotY, slotWidth, slotHeight);

  if (draft.image?.tempPath && draft.image.cropParams) {
    try {
      const image = await loadImage(canvas, draft.image.tempPath);
      const crop = draft.image.cropParams;
      const renderWidth = crop.width * crop.scale;
      const renderHeight = crop.height * crop.scale;

      ctx.save();
      ctx.beginPath();
      ctx.rect(slotX, slotY, slotWidth, slotHeight);
      ctx.clip();
      ctx.drawImage(image, slotX + crop.x, slotY + crop.y, renderWidth, renderHeight);
      ctx.restore();
    } catch (_error) {
      // Keep slot placeholder when user image load fails.
    }
  }
};

const splitTextByWidth = (ctx: any, text: string, maxWidth: number, maxLines: number): TextLayoutResult => {
  if (!text.trim()) {
    return {
      lines: [],
      overflow: false,
    };
  }

  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];
  let overflow = false;

  for (let i = 0; i < paragraphs.length; i += 1) {
    const paragraph = paragraphs[i];
    let currentLine = '';
    for (const char of paragraph) {
      const candidate = `${currentLine}${char}`;
      if (currentLine && ctx.measureText(candidate).width > maxWidth) {
        lines.push(currentLine);
        currentLine = char;
        if (lines.length >= maxLines) {
          overflow = true;
          break;
        }
      } else {
        currentLine = candidate;
      }
    }

    if (overflow) {
      break;
    }

    if (currentLine || paragraph.length === 0) {
      lines.push(currentLine);
      if (lines.length >= maxLines && i < paragraphs.length - 1) {
        overflow = true;
        break;
      }
    }

    if (lines.length > maxLines) {
      overflow = true;
      break;
    }
  }

  if (lines.length > maxLines) {
    return {
      lines: lines.slice(0, maxLines),
      overflow: true,
    };
  }

  return {
    lines,
    overflow,
  };
};

const drawTextBlock = (ctx: any, block: TextBlock): boolean => {
  ctx.font = block.font;
  const align = block.align || 'left';
  ctx.textAlign = align;
  const layoutResult = splitTextByWidth(ctx, block.text, block.maxWidth, block.maxLines);
  const anchorX =
    align === 'center' ? block.x + block.maxWidth / 2 : align === 'right' ? block.x + block.maxWidth : block.x;

  layoutResult.lines.forEach((line, lineIndex) => {
    ctx.fillText(line, anchorX, block.y + lineIndex * block.lineHeight);
  });

  ctx.textAlign = 'left';
  return layoutResult.overflow;
};

const getRemarkFontFamily = (draft: TemplateDraft): string => {
  const preset = getRemarkFontPreset(draft.remarkFontPresetKey);
  if (!preset.source) {
    return preset.family;
  }
  const app = getApp<IAppOption>();
  const family = app.globalData.remarkFontFamilyMap[preset.key] || preset.family;
  const loaded = !!app.globalData.remarkFontLoadedMap[preset.key];
  return loaded ? family : 'sans-serif';
};

const drawConcertText = (ctx: any, width: number, height: number, draft: TemplateDraft): string[] => {
  const remarkFamily = getRemarkFontFamily(draft);
  const overflowKeys = new Set<string>();
  const leftPadding = width * (24 / 440);
  const rightPadding = width * (24 / 440);
  const contentMaxWidth = width - leftPadding - rightPadding;

  const blocks: TextBlock[] = [
    {
      key: 'name',
      text: draft.text.name || '',
      x: leftPadding,
      y: height * (610 / 904),
      maxWidth: contentMaxWidth,
      lineHeight: Math.floor(height * 0.044),
      maxLines: 2,
      font: `700 ${Math.floor(width * 0.062)}px sans-serif`,
    },
    {
      key: 'remark',
      text: draft.text.remark || '',
      x: leftPadding,
      y: height * (778 / 904),
      maxWidth: contentMaxWidth,
      lineHeight: Math.floor(height * 0.041),
      maxLines: 3,
      font: `500 ${Math.floor(width * 0.048)}px ${remarkFamily}`,
    },
    {
      key: 'source',
      text: draft.text.source || '',
      x: leftPadding,
      y: height * (840 / 904),
      maxWidth: contentMaxWidth,
      lineHeight: Math.floor(height * 0.039),
      maxLines: 1,
      font: `500 ${Math.floor(width * 0.045)}px ${remarkFamily}`,
      align: 'right',
    },
  ];

  ctx.fillStyle = '#111111';
  blocks.forEach((block) => {
    if (drawTextBlock(ctx, block)) {
      overflowKeys.add(block.key);
    }
  });

  const timeText = draft.text.time || '';
  const addressText = draft.text.address || '';
  const rowY = height * (692 / 904);
  const rowStartX = leftPadding;
  const rowEndX = width - rightPadding;
  const minGap = width * (24 / 440);
  const timeFont = `500 ${Math.floor(width * 0.047)}px sans-serif`;

  ctx.font = timeFont;
  ctx.textAlign = 'left';
  const timeLayout = splitTextByWidth(ctx, timeText, width * 0.5, 1);
  const timeLine = timeLayout.lines[0] || '';
  if (timeLine) {
    ctx.fillText(timeLine, rowStartX, rowY);
  }
  if (timeLayout.overflow) {
    overflowKeys.add('time');
  }

  const timeWidth = ctx.measureText(timeLine).width;
  const addressX = Math.min(rowStartX + timeWidth + minGap, rowEndX - width * 0.16);
  const availableAddressWidth = Math.max(rowEndX - addressX, width * 0.16);
  const addressLayout = splitTextByWidth(ctx, addressText, availableAddressWidth, 1);
  const addressLine = addressLayout.lines[0] || '';
  if (addressLine) {
    ctx.fillText(addressLine, addressX, rowY);
  }
  if (addressLayout.overflow) {
    overflowKeys.add('address');
  }

  return Array.from(overflowKeys);
};

const drawTransportText = (ctx: any, width: number, height: number, draft: TemplateDraft): string[] => {
  const remarkFamily = getRemarkFontFamily(draft);
  const overflowKeys = new Set<string>();

  ctx.fillStyle = '#111111';
  ctx.font = `700 ${Math.floor(width * 0.06)}px sans-serif`;
  ctx.fillText('→', width * 0.455, height * 0.70);

  const blocks: TextBlock[] = [
    {
      key: 'from',
      text: draft.text.from || '',
      x: width * 0.09,
      y: height * 0.69,
      maxWidth: width * 0.34,
      lineHeight: Math.floor(height * 0.043),
      maxLines: 1,
      font: `700 ${Math.floor(width * 0.06)}px sans-serif`,
    },
    {
      key: 'to',
      text: draft.text.to || '',
      x: width * 0.54,
      y: height * 0.69,
      maxWidth: width * 0.34,
      lineHeight: Math.floor(height * 0.043),
      maxLines: 1,
      font: `700 ${Math.floor(width * 0.06)}px sans-serif`,
    },
    {
      key: 'time',
      text: draft.text.time || '',
      x: width * 0.09,
      y: height * 0.78,
      maxWidth: width * 0.82,
      lineHeight: Math.floor(height * 0.041),
      maxLines: 1,
      font: `500 ${Math.floor(width * 0.047)}px sans-serif`,
    },
    {
      key: 'trainNo',
      text: draft.text.trainNo || '',
      x: width * 0.09,
      y: height * 0.84,
      maxWidth: width * 0.36,
      lineHeight: Math.floor(height * 0.041),
      maxLines: 1,
      font: `500 ${Math.floor(width * 0.047)}px sans-serif`,
    },
    {
      key: 'seatNo',
      text: draft.text.seatNo || '',
      x: width * 0.50,
      y: height * 0.84,
      maxWidth: width * 0.41,
      lineHeight: Math.floor(height * 0.041),
      maxLines: 1,
      font: `500 ${Math.floor(width * 0.047)}px sans-serif`,
    },
    {
      key: 'remark',
      text: draft.text.remark || '',
      x: width * 0.09,
      y: height * 0.90,
      maxWidth: width * 0.82,
      lineHeight: Math.floor(height * 0.041),
      maxLines: 3,
      font: `500 ${Math.floor(width * 0.048)}px ${remarkFamily}`,
    },
  ];

  blocks.forEach((block) => {
    if (drawTextBlock(ctx, block)) {
      overflowKeys.add(block.key);
    }
  });

  return Array.from(overflowKeys);
};

const drawTextContent = (ctx: any, width: number, height: number, template: TemplateConfig, draft: TemplateDraft): string[] => {
  if (template.category === 'concert') {
    return drawConcertText(ctx, width, height, draft);
  }

  return drawTransportText(ctx, width, height, draft);
};

const eraseCircleHole = (ctx: any, centerX: number, centerY: number, radius: number): void => {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.restore();
};

const applyTicketShapeMask = (ctx: any, width: number, height: number): void => {
  const sideCenterY = height * (747.411 / 904);
  const bottomCenterY = height * (903.856 / 904);
  // Slightly enlarge to hide anti-alias seams from layered SVG rendering.
  const radius = width * (14.732 / 440) + 0.8;
  const bottomStartX = width * (26.5186 / 440);
  const bottomStep = width * ((69.7324 - 26.5186) / 440);

  eraseCircleHole(ctx, 0, sideCenterY, radius);
  eraseCircleHole(ctx, width, sideCenterY, radius);

  for (let i = 0; i < 10; i += 1) {
    eraseCircleHole(ctx, bottomStartX + bottomStep * i, bottomCenterY, radius);
  }
};

const applyPerforationLineMask = (ctx: any, width: number, height: number): void => {
  const startX = width * (21.6064 / 440);
  const endX = width * (418.393 / 440);
  const y = height * (745.446 / 904);
  const dash = width * (5.835 / 440);
  const gap = width * (5.835 / 440);
  const lineWidth = Math.max(1, width * (1.964 / 440));

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.setLineDash([dash, gap]);
  ctx.lineDashOffset = 0;
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = '#000000';
  ctx.lineCap = 'butt';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
};

export const RendererService = {
  async renderBaseLayerToCanvas({ scope, canvasId, template, draft }: RenderTemplateParams): Promise<void> {
    const { canvas, ctx, width, height } = await getCanvasBundle(scope, canvasId, true);
    const safeBgColor = sanitizeColor(draft.bgColor || template.defaultBgColor, template.defaultBgColor);
    const tintSvg = applyTintColor(template.layers.tintSvg, template.layers.tintPlaceholderColor, safeBgColor);
    await drawBaseLayers({
      canvas,
      ctx,
      width,
      height,
      template,
      draft,
      safeBgColor,
      tintSvg,
    });
    applyPerforationLineMask(ctx, width, height);
    applyTicketShapeMask(ctx, width, height);
  },

  async renderTextLayerToCanvas({ scope, canvasId, template, draft }: RenderTemplateParams): Promise<RenderTemplateResult> {
    const { ctx, width, height } = await getCanvasBundle(scope, canvasId, true);
    ctx.clearRect(0, 0, width, height);
    const overflowTextKeys = drawTextContent(ctx, width, height, template, draft);
    applyTicketShapeMask(ctx, width, height);
    return { overflowTextKeys };
  },

  async renderTemplateToCanvas({ scope, canvasId, template, draft }: RenderTemplateParams): Promise<RenderTemplateResult> {
    const { canvas, ctx, width, height } = await getCanvasBundle(scope, canvasId, true);
    const safeBgColor = sanitizeColor(draft.bgColor || template.defaultBgColor, template.defaultBgColor);
    const tintSvg = applyTintColor(template.layers.tintSvg, template.layers.tintPlaceholderColor, safeBgColor);
    await drawBaseLayers({
      canvas,
      ctx,
      width,
      height,
      template,
      draft,
      safeBgColor,
      tintSvg,
    });
    applyPerforationLineMask(ctx, width, height);
    const overflowTextKeys = drawTextContent(ctx, width, height, template, draft);
    applyTicketShapeMask(ctx, width, height);
    return { overflowTextKeys };
  },

  async exportCanvasImage({ scope, canvasId, template, outputWidth = 1080 }: ExportCanvasParams): Promise<string> {
    const { canvas, width, height } = await getCanvasBundle(scope, canvasId, false);
    const safeOutputWidth = Math.max(Math.floor(outputWidth), 1080);
    const ratio = template.canvasSize.height / template.canvasSize.width;
    const destHeight = Math.max(Math.floor(safeOutputWidth * ratio), 1);

    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        x: 0,
        y: 0,
        width,
        height,
        destWidth: safeOutputWidth,
        destHeight,
        fileType: 'png',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: reject,
      });
    });
  },
};
