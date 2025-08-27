import { FieldConfig } from './components/ImageDetails';

export const fields: FieldConfig[] = [
  { key: 'url', type: 'image', label: '图片' },
  { key: 'caption_hq', type: 'texts', label: '描述-HQ', editable: true },
  { key: 'caption_generic', type: 'texts', label: '描述-GENERIC', editable: true },
  { key: 'size', type: 'size', label: '尺寸' },
  { key: 'tags', type: 'tags', label: '标签', editable: true },
  { key: 'quality_score', type: 'hist', label: '画质评分' },
  { key: 'aesthetic_eat', type: 'hist', label: '美学评分' },
  { key: 'watermark_prob', type: 'prob', label: '含水印概率' },
  { key: 'path', type: 'text', label: '路径' },
];
