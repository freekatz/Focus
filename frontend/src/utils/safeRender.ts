/**
 * 安全地将任意值转换为可渲染的字符串
 * 防止 React Error #300 (objects as children)
 *
 * 专门处理 react-markdown 和 rehype-katex 可能生成的特殊对象
 */
export function safeRenderText(value: any): string {
  // null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // 字符串（正常情况）
  if (typeof value === 'string') {
    return value;
  }

  // 数字、布尔值
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // React 元素 (rehype-katex 可能创建)
  if (value && typeof value === 'object' && value.$$typeof) {
    console.warn('[safeRenderText] Encountered React element, returning placeholder');
    return '[React Element]';
  }

  // 数组 (react-markdown 可能传递)
  if (Array.isArray(value)) {
    return value.map(safeRenderText).join('');
  }

  // 对象（异常情况）
  if (typeof value === 'object') {
    // 尝试提取常见字段
    if ('text' in value && typeof value.text === 'string') {
      return value.text;
    }
    if ('content' in value && typeof value.content === 'string') {
      return value.content;
    }
    if ('value' in value && typeof value.value === 'string') {
      return value.value;
    }
    if ('props' in value && value.props && typeof value.props.children === 'string') {
      return value.props.children;
    }

    // 回退：JSON 序列化（用于调试）
    console.warn('[safeRenderText] Rendering object as JSON:', value);
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return '[Object]';
    }
  }

  // 其他类型
  return String(value);
}
