(function (global) {
  function clear(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
  }
  function grid(ctx, w, h, pad) {
    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ((h - pad.top - pad.bottom) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }
  function drawLine(canvas, labels, series, opts = {}) {
    const { ctx, w, h } = fitCanvas(canvas);
    clear(ctx, w, h);
    const pad = { left: 48, right: 18, top: 16, bottom: 28 };
    const values = series.flatMap(s => s.values);
    const max = Math.max(1, ...values) * 1.1;
    grid(ctx, w, h, pad);
    ctx.fillStyle = 'rgba(226,232,240,.85)';
    ctx.font = '11px Inter, system-ui, sans-serif';

    for (let i = 0; i <= 4; i++) {
      const value = max * (1 - i / 4);
      const y = pad.top + ((h - pad.top - pad.bottom) * i) / 4;
      ctx.fillText(global.ERP_DB.money(value).replace('S/ ', ''), 6, y + 4);
    }

    labels.forEach((lab, i) => {
      const x = pad.left + ((w - pad.left - pad.right) * i) / Math.max(1, labels.length - 1);
      ctx.fillText(lab, x - 10, h - 8);
    });

    series.forEach((s, index) => {
      ctx.beginPath();
      s.values.forEach((v, i) => {
        const x = pad.left + ((w - pad.left - pad.right) * i) / Math.max(1, s.values.length - 1);
        const y = pad.top + (h - pad.top - pad.bottom) * (1 - v / max);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      ctx.stroke();

      s.values.forEach((v, i) => {
        const x = pad.left + ((w - pad.left - pad.right) * i) / Math.max(1, s.values.length - 1);
        const y = pad.top + (h - pad.top - pad.bottom) * (1 - v / max);
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      });
    });

    if (opts.legend) {
      let x = pad.left;
      const y = 12;
      opts.legend.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(x, y - 8, 10, 10);
        ctx.fillStyle = 'rgba(226,232,240,.9)';
        ctx.fillText(item.label, x + 14, y);
        x += 90;
      });
    }
  }

  function drawBar(canvas, items, opts = {}) {
    const { ctx, w, h } = fitCanvas(canvas);
    clear(ctx, w, h);
    const pad = { left: 38, right: 18, top: 18, bottom: 32 };
    const max = Math.max(1, ...items.map(i => Math.abs(i.value))) * 1.15;
    grid(ctx, w, h, pad);

    ctx.fillStyle = 'rgba(226,232,240,.9)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    items.forEach((it, i) => {
      const x = pad.left + ((w - pad.left - pad.right) * i) / Math.max(1, items.length);
      const barW = Math.min(48, (w - pad.left - pad.right) / Math.max(items.length * 1.35, 1));
      const barH = ((h - pad.top - pad.bottom) * Math.abs(it.value)) / max;
      const y = h - pad.bottom - barH;
      ctx.fillStyle = it.color || '#60a5fa';
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = 'rgba(226,232,240,.9)';
      ctx.fillText(it.label, x - 2, h - 10);
    });
  }

  function drawDoughnut(canvas, items, opts = {}) {
    const { ctx, w, h } = fitCanvas(canvas);
    clear(ctx, w, h);
    const total = Math.max(1, items.reduce((s, it) => s + Math.abs(it.value), 0));
    const cx = w * 0.42;
    const cy = h * 0.52;
    const r = Math.min(w, h) * 0.28;
    let angle = -Math.PI / 2;

    items.forEach(it => {
      const slice = (Math.abs(it.value) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = it.color || '#60a5fa';
      ctx.fill();
      angle += slice;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.fillStyle = 'rgba(226,232,240,.95)';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText(opts.centerTitle || 'Resumen', cx, cy - 6);
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,.95)';
    ctx.fillText(opts.centerSubtitle || 'ERP Pocket', cx, cy + 14);

    ctx.textAlign = 'left';
    let y = 18;
    items.forEach(it => {
      ctx.fillStyle = it.color || '#60a5fa';
      ctx.fillRect(w * 0.68, y - 9, 10, 10);
      ctx.fillStyle = 'rgba(226,232,240,.95)';
      const pct = ((Math.abs(it.value) / total) * 100).toFixed(0);
      ctx.fillText(`${it.label}: ${pct}%`, w * 0.68 + 16, y);
      y += 18;
    });
  }

  function drawRadar(canvas, items) {
    const { ctx, w, h } = fitCanvas(canvas);
    clear(ctx, w, h);
    const max = Math.max(1, ...items.map(i => i.value)) * 1.1;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;
    const steps = 5;

    ctx.strokeStyle = 'rgba(148,163,184,.14)';
    for (let s = 1; s <= steps; s++) {
      const rr = (radius * s) / steps;
      ctx.beginPath();
      for (let i = 0; i < items.length; i++) {
        const ang = (-Math.PI / 2) + (i * 2 * Math.PI) / items.length;
        const x = cx + rr * Math.cos(ang);
        const y = cy + rr * Math.sin(ang);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.beginPath();
    items.forEach((it, i) => {
      const ang = (-Math.PI / 2) + (i * 2 * Math.PI) / items.length;
      const rr = radius * (Math.abs(it.value) / max);
      const x = cx + rr * Math.cos(ang);
      const y = cy + rr * Math.sin(ang);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(96,165,250,.18)';
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(226,232,240,.9)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    items.forEach((it, i) => {
      const ang = (-Math.PI / 2) + (i * 2 * Math.PI) / items.length;
      const x = cx + (radius + 12) * Math.cos(ang);
      const y = cy + (radius + 12) * Math.sin(ang);
      ctx.fillText(it.label, x - 10, y);
    });
  }

  global.ERP_Charts = { drawLine, drawBar, drawDoughnut, drawRadar };
})(window);
