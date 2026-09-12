"use client";

interface Point {
  round: number;
  label: string;
  value: number;
}

/** 压力曲线:纯 SVG,类似运动心率图。峰值即压力触发点。 */
export function PressureChart({ data }: { data: Point[] }) {
  const W = 360;
  const H = 190;
  const PAD_X = 34;
  const PAD_TOP = 22;
  const PAD_BOTTOM = 46;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) =>
    data.length <= 1 ? PAD_X + innerW / 2 : PAD_X + (i * innerW) / (data.length - 1);
  const y = (v: number) => PAD_TOP + innerH - (v / 100) * innerH;

  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `M ${x(0)},${y(data[0]?.value ?? 0)} L ${pts
    .split(" ")
    .map((p) => p.replace(",", " "))
    .join(" L ")} L ${x(data.length - 1)},${PAD_TOP + innerH} L ${x(0)},${
    PAD_TOP + innerH
  } Z`;

  const peakIdx = data.reduce(
    (best, d, i) => (d.value > data[best].value ? i : best),
    0
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="压力曲线"
    >
      <defs>
        <linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d41111" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d41111" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* 网格线 */}
      {[25, 50, 75].map((v) => (
        <g key={v}>
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={y(v)}
            y2={y(v)}
            stroke="#e7e5e4"
            strokeDasharray="3 4"
            strokeWidth="1"
          />
          <text x={PAD_X - 6} y={y(v) + 3} fontSize="8" fill="#78716c" textAnchor="end">
            {v}
          </text>
        </g>
      ))}

      {/* 面积 + 曲线 */}
      <path d={area} fill="url(#pcGrad)" />
      <polyline
        points={pts}
        fill="none"
        stroke="#d41111"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 数据点 */}
      {data.map((d, i) => (
        <g key={i}>
          <circle
            cx={x(i)}
            cy={y(d.value)}
            r={i === peakIdx ? 5.5 : 3.5}
            fill={i === peakIdx ? "#d41111" : "#ffffff"}
            stroke="#d41111"
            strokeWidth="2"
          />
          {i === peakIdx && (
            <text
              x={x(i)}
              y={y(d.value) - 12}
              fontSize="9"
              fill="#d41111"
              textAnchor="middle"
              fontWeight="700"
            >
              触发点
            </text>
          )}
        </g>
      ))}

      {/* X 轴标签 */}
      {data.map((d, i) => (
        <g key={i}>
          <text
            x={x(i)}
            y={PAD_TOP + innerH + 16}
            fontSize="9"
            fill="#78716c"
            textAnchor="middle"
          >
            {d.label}
          </text>
          <text
            x={x(i)}
            y={PAD_TOP + innerH + 30}
            fontSize="8"
            fill="#78716c"
            textAnchor="middle"
          >
            第{d.round}轮
          </text>
        </g>
      ))}
    </svg>
  );
}
