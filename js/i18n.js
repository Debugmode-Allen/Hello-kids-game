let messages = null;

export async function loadUI() {
  if (!messages) {
    const response = await fetch("content/ui.zh-CN.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load UI content: ${response.status}`);
    messages = await response.json();
  }
  return messages;
}

export function t(key, values = {}) {
  const source = messages?.[key] ?? key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), source);
}
