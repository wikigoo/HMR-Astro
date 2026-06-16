/* ============================================================
   HMR — Neural particle background
   AI / chatbot-themed ambient field: drifting nodes connected by
   thin lines that brighten as they near each other (a living neural
   graph), plus a few brighter "signal" pulses travelling along edges.
   Cyan→blue palette, low opacity so it sits behind glass content.

   Usage:  <canvas id="particles"></canvas>
           <script src="assets/particles.js"></script>
   Respects prefers-reduced-motion (renders a single static frame).
   ============================================================ */
(function () {
  var canvas = document.getElementById('particles');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var nodes = [], W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var LINK = 150;                       // px distance to draw an edge
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var target = Math.round(Math.min(90, (W * H) / 16000));
    nodes = [];
    for (var i = 0; i < target; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.6 + 0.8,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      if (!reduce) {
        a.x += a.vx; a.y += a.vy; a.pulse += 0.02;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
      }
      // edges
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK) {
          var o = (1 - d / LINK) * 0.5;
          ctx.strokeStyle = 'rgba(0, 212, 255,' + o.toFixed(3) + ')';
          ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    // nodes (drawn last so they sit above edges)
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      var glow = 0.55 + 0.45 * Math.sin(n.pulse);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(92, 225, 255,' + (0.35 + glow * 0.45).toFixed(3) + ')';
      ctx.shadowColor = 'rgba(0,212,255,0.8)';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (!reduce) requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
