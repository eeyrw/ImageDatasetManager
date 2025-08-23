import { RangeSliderStatus } from './RangeSlider';

/**
 * 批量把多个 RangeSliderStatus 转换为 MeiliSearch filter
 * @param fields 一个对象，键为字段名，值为 RangeSliderStatus
 * @returns MeiliSearch filter 字符串，多个条件用 AND 连接
 */
export function buildMeiliFilters(fields: Record<string, RangeSliderStatus>): string {
  const filters: string[] = [];

  for (const [field, status] of Object.entries(fields)) {
    if (!status.enabled) continue;

    const [min, max] = status.value;
    switch (status.sliderMode) {
      case "range":
        filters.push(`${field} >= ${min} AND ${field} <= ${max}`);
        break;
      case "gte":
        filters.push(`${field} >= ${min}`);
        break;
      case "lte":
        filters.push(`${field} <= ${max}`);
        break;
    }
  }

  return filters.join(" AND ");
}
