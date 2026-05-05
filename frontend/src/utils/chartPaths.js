export function buildChartPaths(data, W, H, padX = 6, padY = 12) {
  const min = Math.min(...data) - 20
  const max = Math.max(...data) + 20
  const range = max - min
  const pts = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * (W - padX * 2),
    y: padY + (1 - (v - min) / range) * (H - padY * 2),
  }))
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i]
    const cx = ((p.x + c.x) / 2).toFixed(1)
    line += ` C ${cx} ${p.y.toFixed(1)} ${cx} ${c.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`
  }
  const bY = (H - padY).toFixed(1)
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${bY} L ${padX} ${bY} Z`
  return { line, area, pts, min, max }
}
