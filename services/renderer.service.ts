import { TemplateDraft } from '../models/draft';
import { TemplateConfig } from '../models/template';

interface RenderTemplateParams {
  scope: WechatMiniprogram.Component.TrivialInstance | WechatMiniprogram.Page.TrivialInstance;
  canvasId: string;
  template: TemplateConfig;
  draft: TemplateDraft;
}

interface CanvasBundle {
  canvas: any;
  ctx: any;
  width: number;
  height: number;
}

const loadImage = (canvas: any, src: string): Promise<any> =>
  new Promise((resolve, reject) => {
    const image = canvas.createImage();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('load image failed'));
    image.src = src;
  });

const encodeSvg = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

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

        if (resetSize) {
          canvas.width = canvasNode.width * dpr;
          canvas.height = canvasNode.height * dpr;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        resolve({
          canvas,
          ctx,
          width: canvasNode.width,
          height: canvasNode.height,
        });
      });
  });

const drawWrappedText = (
  ctx: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLine = 2,
) => {
  const lines = text.split('\n');
  let lineCursor = 0;

  for (let i = 0; i < lines.length && lineCursor < maxLine; i += 1) {
    let line = '';
    for (const char of lines[i]) {
      const candidate = line + char;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        ctx.fillText(line, x, y + lineCursor * lineHeight);
        line = char;
        lineCursor += 1;
        if (lineCursor >= maxLine) {
          break;
        }
      } else {
        line = candidate;
      }
    }
    if (line && lineCursor < maxLine) {
      ctx.fillText(line, x, y + lineCursor * lineHeight);
      lineCursor += 1;
    }
  }
};

const drawTextContent = (
  ctx: any,
  width: number,
  height: number,
  template: TemplateConfig,
  draft: TemplateDraft,
) => {
  const bodyX = width * 0.12;
  const bodyY = height * 0.58;
  const app = getApp<IAppOption>();
  const remarkFamily = app.globalData.remarkFontLoaded ? app.globalData.remarkFontFamily : 'sans-serif';

  ctx.fillStyle = '#111111';

  if (template.category === 'concert') {
    const line1 = draft.text.name || '';
    const line2 = draft.text.source ? `${line1}\n${draft.text.source}` : line1;

    ctx.font = `700 ${Math.floor(width * 0.058)}px sans-serif`;
    drawWrappedText(ctx, line2.trim(), bodyX, bodyY, width * 0.7, Math.floor(height * 0.045), 2);

    ctx.font = `${Math.floor(width * 0.053)}px sans-serif`;
    ctx.fillText(draft.text.time || '', bodyX, height * 0.74);
    ctx.fillText(draft.text.address || '', width * 0.47, height * 0.74);

    ctx.font = `500 ${Math.floor(width * 0.05)}px ${remarkFamily}`;
    drawWrappedText(ctx, draft.text.remark || '', bodyX, height * 0.82, width * 0.75, Math.floor(height * 0.046), 3);

    ctx.font = `500 ${Math.floor(width * 0.052)}px sans-serif`;
    const source = draft.text.source ? `--《${draft.text.source.replace(/[《》]/g, '')}》` : '';
    ctx.fillText(source, width * 0.66, height * 0.94);
    return;
  }

  const topLine = `${draft.text.from || ''}  →  ${draft.text.to || ''}`;
  const bottomLine = `${draft.text.time || ''}`;
  const trainLine = `${draft.text.trainNo || ''}   ${draft.text.seatNo || ''}`;

  ctx.font = `700 ${Math.floor(width * 0.062)}px sans-serif`;
  drawWrappedText(ctx, topLine, bodyX, bodyY, width * 0.78, Math.floor(height * 0.045), 2);

  ctx.font = `${Math.floor(width * 0.05)}px sans-serif`;
  ctx.fillText(bottomLine, bodyX, height * 0.72);
  ctx.fillText(trainLine, bodyX, height * 0.77);

  ctx.font = `500 ${Math.floor(width * 0.05)}px ${remarkFamily}`;
  drawWrappedText(ctx, draft.text.remark || '', bodyX, height * 0.84, width * 0.76, Math.floor(height * 0.045), 3);
};

export const RendererService = {
  async renderTemplateToCanvas({ scope, canvasId, template, draft }: RenderTemplateParams): Promise<void> {
    const { canvas, ctx, width, height } = await getCanvasBundle(scope, canvasId, true);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = template.fixedLayerColor;
    ctx.fillRect(0, 0, width, height);

    const colorSvg = template.colorLayerSvg.replace(/\{\{COLOR\}\}/g, draft.bgColor || template.defaultBgColor);

    try {
      const fixedLayer = await loadImage(canvas, encodeSvg(template.fixedLayerSvg));
      ctx.drawImage(fixedLayer, 0, 0, width, height);
    } catch (_error) {
      // fallback already rendered by fixed color
    }

    try {
      const colorLayer = await loadImage(canvas, encodeSvg(colorSvg));
      ctx.drawImage(colorLayer, 0, 0, width, height);
    } catch (_error) {
      // if svg layer fails, keep base style
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
        // keep placeholder if image load failed
      }
    }

    drawTextContent(ctx, width, height, template, draft);
  },

  async exportCanvasImage(
    scope: WechatMiniprogram.Component.TrivialInstance | WechatMiniprogram.Page.TrivialInstance,
    canvasId: string,
  ): Promise<string> {
    const { canvas } = await getCanvasBundle(scope, canvasId, false);

    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        fileType: 'png',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: reject,
      });
    });
  },
};
