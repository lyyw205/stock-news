'use client';

interface VisualScores {
  impact: number;
  urgency: number;
  certainty: number;
  durability: number;
  attention: number;
  relevance: number;
}

interface RadarChartProps {
  scores: VisualScores;
  size?: number;
}

const LABELS: { key: keyof VisualScores; label: string }[] = [
  { key: 'impact', label: '영향력' },
  { key: 'urgency', label: '긴급성' },
  { key: 'certainty', label: '확실성' },
  { key: 'durability', label: '지속성' },
  { key: 'attention', label: '관심도' },
  { key: 'relevance', label: '연관성' },
];

export default function RadarChart({ scores, size = 200 }: RadarChartProps) {
  const center = size / 2;
  const maxRadius = size / 2 - 30;
  const numAxes = LABELS.length;
  const angleStep = (2 * Math.PI) / numAxes;
  const startAngle = -Math.PI / 2; // 12시 방향에서 시작

  // 점수를 좌표로 변환 (1-10 스케일)
  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const radius = (value / 10) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // 축 끝점 좌표 (라벨 위치용)
  const getLabelPoint = (index: number) => {
    const angle = startAngle + index * angleStep;
    const radius = maxRadius + 18;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // 육각형 그리드 생성 (2, 4, 6, 8, 10 레벨)
  const gridLevels = [2, 4, 6, 8, 10];

  const gridPaths = gridLevels.map((level) => {
    const points = LABELS.map((_, i) => getPoint(i, level));
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  });

  // 데이터 경로 생성
  const dataPoints = LABELS.map((item, i) => getPoint(i, scores[item.key]));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // 축 라인 생성
  const axisLines = LABELS.map((_, i) => ({
    start: { x: center, y: center },
    end: getPoint(i, 10),
  }));

  return (
    <svg width={size} height={size} className="select-none">
      {/* 배경 그리드 (육각형) */}
      {gridPaths.map((path, i) => (
        <polygon
          key={i}
          points={path}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}

      {/* 축 라인 */}
      {axisLines.map((line, i) => (
        <line
          key={i}
          x1={line.start.x}
          y1={line.start.y}
          x2={line.end.x}
          y2={line.end.y}
          stroke="#d1d5db"
          strokeWidth="1"
        />
      ))}

      {/* 데이터 영역 */}
      <polygon
        points={dataPath}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3b82f6"
        strokeWidth="2"
      />

      {/* 데이터 포인트 */}
      {dataPoints.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="#3b82f6"
          stroke="#fff"
          strokeWidth="2"
        />
      ))}

      {/* 축 라벨 */}
      {LABELS.map((item, i) => {
        const labelPoint = getLabelPoint(i);
        const score = scores[item.key];
        return (
          <text
            key={i}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] fill-gray-600 font-medium"
          >
            <tspan x={labelPoint.x} dy="-0.5em">
              {item.label}
            </tspan>
            <tspan x={labelPoint.x} dy="1.2em" className="fill-blue-600 font-bold">
              {score}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
