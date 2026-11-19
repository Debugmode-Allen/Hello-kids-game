# 村庄与龙影素材

使用内置 image_gen 生成透明 PNG；不是视频。

最新引用 `dragon-village-v8.png`：游乐场向左下移到用户箭头附近；右上拱桥与其右侧两层屋互换。保留用户手动设置的页面坐标及 scale(.6)。以下旧版本说明仅作历史参考。

v8 编辑提示词：

undefined

最新引用 `dragon-village-v7.png`：在 v6 基础上减少约一半房屋，保持单屋比例、游乐场及透明地面。CSS 保持 50% 缩放，按可见村庄尺寸向左下各移动半张；龙影大小保持不变。下文 v3–v6 提示词为历史参考。

v7 编辑提示词：

Edit this transparent miniature fantasy village overlay. Reduce house count by HALF: keep approximately 18 cottages total instead of about 36. Remove roughly every other cottage across all clusters evenly, creating a natural quieter small hamlet rather than a dense town. Preserve the existing distant bird's-eye perspective, size of each retained house, warm roofs, same square canvas and transparent margins and overall object bounds. Preserve the small baby-dragon playground with training hoops and log at exactly its current position; keep one or two wells, a couple modest market stalls, three small bridges, and a restrained number of barrels, trees and fences. Do not fill removed-house gaps with anything: these gaps must be genuinely transparent. Preserve transparent winding river corridor through center and empty pond area. NO terrain base, no grass backdrop, no water painting, no sky, no dragon characters, no text, no colored outlines. Return local transparent PNG with about 18 well-spaced houses. Do not zoom, reframe, shift the village or change the canvas; position is adjusted later in CSS.

当前页面引用 `dragon-village-v6.png`。保留已确认的村庄整体位置，对照底图河道与用户截图重新分布房屋，三座小桥连接两岸，避开中央水面。石柱广场替换为稍大的小龙游乐场；龙影层由 CSS 单独定位到游乐场上空。v3/v4/v5 为本地参考稿，不属于当前页面依赖。

v5 布局编辑提示词：

Edit image 1 (transparent village overlay) using image 2 (unchanged full world map) and image 3 (user screenshot of the CURRENT composite) as alignment references. OUTPUT ONLY the revised TRANSPARENT overlay with EXACTLY image 1 canvas and the SAME overall village location/scale. Do not output screenshot or terrain. Rearrange cottages so no building covers the existing river or central little pond seen in image 3. Preserve roughly 35-40 varied-height cottages, wells, stalls and objects, distribute in bank-side clusters on DRY LAND. CRITICAL ALIGNMENT: Overlay square occupies world map x=9.5% to34.5%, and y=83.8% to105%; map aspect1155/1362. Thus the existing winding river runs diagonally through overlay: from near (70%,28%) down toward (55%,45%) then (63%,53%) then (49%,65%) then (42%,70%). Leave a generous transparent corridor along the actual blue river and widen at the small pond near center; use screenshot to refine, no cottage or plaza on water. Add THREE tiny arched footbridges positioned across that corridor at upper/middle/lower crossings, oriented across the banks, with open transparent space under arches. Keep bridge ends on grass, water underneath transparent. Replace stiff square four-column plaza with a slightly larger charming rounded BABY DRAGON PLAYGROUND on dry land WEST/LEFT of the pond near overlay (39%,49%): small soft oval sandy play area with low curved stones, two little wooden training hoops, a low log balance beam and tiny colorful pennants. Playful organic shape, no imposing stone columns, no dragon characters (shadows animate separately). Keep distant aerial miniature painterly map style, roof colors, transparent margins, maintain original square canvas. All ground outside tiny playground and bridge surfaces must be genuinely transparent; no grass base, no river or lake painting, no terrain replacement. NO red outlines, text, border, sky. Return a local PNG.

v6 河道校准提示词：

undefined

- dragon-village-v4.png：在 v3 基础上再增加约 20 户高低错落的房屋，补充两口水井、集市摊位、木桶和推车；保留四石柱广场与透明地面。v3 为上次参考稿，当前页面引用 v4。
- dragon-shadows-sheet-v1.png：4×2 八帧，每帧三只微小低对比龙影，位置与翼姿不同。CSS 分帧并循环漂移。

v4 最终编辑提示词（内置 image_gen）：

Edit the supplied transparent fantasy village map overlay. Make this hamlet lively and densely inhabited by ADDING ABOUT TWENTY ADDITIONAL HOUSES to the existing roughly seventeen, yielding around 37 cottages total. Fill the large empty gaps and center with organic clusters, not a hollow ring. Preserve existing small central stone plaza with four short stone columns, keep it readable. Add two tiny stone water wells, wooden buckets, barrels, stacked crates, a handcart, a few modest market stalls and short fences among houses. Varied building heights: mostly single-story with some two-story cottages, different roof heights and orientations, staggered placement with restrained overlap. Keep distant aerial bird's-eye perspective and miniature scale, warm terracotta and straw roofs, painterly fantasy world-map style. Keep overall village bounds within the same oval footprint and original square canvas with same transparent margins, don't enlarge individual houses or zoom in. Critical: genuinely transparent alpha background, all ground and inter-building gaps transparent except the tiny stone plaza. NO grass terrain base, no water/river terrain, no continuous dirt paths, no sky, no text, no dragons. Only the village objects and small plaza should be opaque. Clean natural edges without red outlines, no selection borders. Return a local PNG file.

v3 参考稿编辑提示词：

Edit this transparent fantasy map village overlay. Keep all existing tiny outer cottages and trees exactly in their current positions and scale. In the currently empty center add 4 more small cottages in the same distant aerial style, positioned loosely around a SMALL central stone-paved plaza with FOUR short weathered stone columns along its edges. Plaza occupies only about 12% of canvas width. Cottages same miniature size as existing cottages, don't enlarge anything, don't zoom in. Keep the original high distant aerial perspective, roof colors, lighting, original canvas size and outer silhouette. Very important: preserve genuinely transparent alpha everywhere between buildings, outside the small plaza, and around the entire village. NO grass base, no river, no dirt ground tile, no paths filling gaps, no solid background, no dragons no text. Only the plaza itself may have a small pale stone paved surface.
