figma.showUI(__html__, { width: 420, height: 360 });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'import' || !msg.spec) return;

  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  } catch (_) {
    await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
  }

  const spec = msg.spec;
  const page = figma.currentPage;
  page.name = spec.canvas?.name || `AI Office — ${spec.mission || 'Design'}`;

  let offsetX = 0;
  for (const frameSpec of spec.frames || []) {
    const frame = figma.createFrame();
    frame.name = frameSpec.name || 'Frame';
    frame.x = (frameSpec.x || 0) + offsetX;
    frame.y = frameSpec.y || 0;
    frame.resize(frameSpec.width || 400, frameSpec.height || 200);
    frame.fills = [{ type: 'SOLID', color: hexToRgb(frameSpec.fill || '#FFFFFF') }];
    frame.cornerRadius = frameSpec.radius || 0;

    for (const child of frameSpec.children || []) {
      if (child.type === 'text') {
        const text = figma.createText();
        try {
          text.fontName = { family: 'Inter', style: 'Bold' };
        } catch (_) {
          text.fontName = { family: 'Roboto', style: 'Regular' };
        }
        text.characters = child.text || '';
        text.x = child.x || 0;
        text.y = child.y || 0;
        text.fontSize = child.fontSize || 14;
        text.fills = [{ type: 'SOLID', color: hexToRgb(child.color || '#333333') }];
        frame.appendChild(text);
      }
      if (child.type === 'rect') {
        const rect = figma.createRectangle();
        rect.x = child.x || 0;
        rect.y = child.y || 0;
        rect.resize(child.width || 120, child.height || 40);
        rect.cornerRadius = child.radius || 8;
        rect.fills = [{ type: 'SOLID', color: hexToRgb(child.fill || '#7BA87B') }];
        frame.appendChild(rect);
        if (child.text) {
          const label = figma.createText();
          try {
            label.fontName = { family: 'Inter', style: 'Regular' };
          } catch (_) {
            label.fontName = { family: 'Roboto', style: 'Regular' };
          }
          label.characters = child.text;
          label.fontSize = 12;
          label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
          label.x = (child.x || 0) + 16;
          label.y = (child.y || 0) + 12;
          frame.appendChild(label);
        }
      }
    }

    page.appendChild(frame);
    offsetX += (frameSpec.width || 400) + 40;
  }

  figma.viewport.scrollAndZoomIntoView(page.children);
  figma.notify(`✅ ${spec.frames?.length || 0} frames created for: ${spec.mission || 'mission'}`);
  figma.closePlugin();
};

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255,
  };
}
