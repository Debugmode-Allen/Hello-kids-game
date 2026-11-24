// Deferring the first tap prevents a dialog from intercepting the second tap.
export function createDoubleClick(single, double, schedule = setTimeout, cancel = clearTimeout) {
  let timer = null;
  let pendingId = null;
  return {
    click(id, boss = false) {
      if (timer !== null && pendingId === id && !boss) {
        cancel(timer); timer = null; pendingId = null; double(id); return;
      }
      if (timer !== null) cancel(timer);
      pendingId = id;
      timer = schedule(() => { timer = null; pendingId = null; single(id); }, 320);
    },
    clear() { if (timer !== null) cancel(timer); timer = null; pendingId = null; }
  };
}
