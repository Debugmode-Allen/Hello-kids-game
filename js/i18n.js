let messages = null;

export async function loadUI() {
  if (!messages) messages = await fetch("content/ui.zh-CN.json").then((response) => response.json());
  return messages;
}

export function t(key, values = {}) {
  const source = messages?.[key] ?? key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), source);
}
