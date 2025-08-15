import { PropertySafetyFilled } from "@ant-design/icons";
import React, { useMemo, useState } from "react";

type Pose = {
  pose_index: number;
  bbox: [number, number, number, number];
  invalid_kpts_idx: number[];
  kpts_x: number[];
  kpts_y: number[];
};

export type Props = {
  poses: Pose[];
  imgSrc: string;
  imgWidth: number;   // 原图宽
  imgHeight: number;  // 原图高
  showBBox?: boolean;
  showFaceEdges?: boolean; // 是否绘制脸部 68 点拓扑（默认 true）
  pointRadius?: number;    // 基础点半径，默认 2.2
};


/** ---------- 工具：RGB数组 -> hex ---------- */
const rgbToHex = (rgb: [number, number, number]) =>
  `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/** ---------- 关键点名称 -> 全局索引（来自你的 keypoint_info） ---------- */
const NAME_TO_ID: Record<string, number> = {
  nose: 0, left_eye: 1, right_eye: 2, left_ear: 3, right_ear: 4,
  left_shoulder: 5, right_shoulder: 6, left_elbow: 7, right_elbow: 8,
  left_wrist: 9, right_wrist: 10, left_hip: 11, right_hip: 12,
  left_knee: 13, right_knee: 14, left_ankle: 15, right_ankle: 16,
  left_big_toe: 17, left_small_toe: 18, left_heel: 19,
  right_big_toe: 20, right_small_toe: 21, right_heel: 22,

  // face-0..67 => 23..90
  ...Object.fromEntries(Array.from({ length: 68 }, (_, i) => [`face-${i}`, 23 + i])),

  // left hand (root+20) => 91..111
  left_hand_root: 91,
  left_thumb1: 92, left_thumb2: 93, left_thumb3: 94, left_thumb4: 95,
  left_forefinger1: 96, left_forefinger2: 97, left_forefinger3: 98, left_forefinger4: 99,
  left_middle_finger1: 100, left_middle_finger2: 101, left_middle_finger3: 102, left_middle_finger4: 103,
  left_ring_finger1: 104, left_ring_finger2: 105, left_ring_finger3: 106, left_ring_finger4: 107,
  left_pinky_finger1: 108, left_pinky_finger2: 109, left_pinky_finger3: 110, left_pinky_finger4: 111,

  // right hand (root+20) => 112..132
  right_hand_root: 112,
  right_thumb1: 113, right_thumb2: 114, right_thumb3: 115, right_thumb4: 116,
  right_forefinger1: 117, right_forefinger2: 118, right_forefinger3: 119, right_forefinger4: 120,
  right_middle_finger1: 121, right_middle_finger2: 122, right_middle_finger3: 123, right_middle_finger4: 124,
  right_ring_finger1: 125, right_ring_finger2: 126, right_ring_finger3: 127, right_ring_finger4: 128,
  right_pinky_finger1: 129, right_pinky_finger2: 130, right_pinky_finger3: 131, right_pinky_finger4: 132,
};

/** ---------- 关键点颜色（来自 keypoint_info.color） ---------- */
const KEYPOINT_COLORS: Record<number, string> = {
  0: rgbToHex([51,153,255]), 1: rgbToHex([51,153,255]), 2: rgbToHex([51,153,255]),
  3: rgbToHex([51,153,255]), 4: rgbToHex([51,153,255]),
  5: rgbToHex([0,255,0]), 6: rgbToHex([255,128,0]), 7: rgbToHex([0,255,0]), 8: rgbToHex([255,128,0]),
  9: rgbToHex([0,255,0]), 10: rgbToHex([255,128,0]),
  11: rgbToHex([0,255,0]), 12: rgbToHex([255,128,0]),
  13: rgbToHex([0,255,0]), 14: rgbToHex([255,128,0]),
  15: rgbToHex([0,255,0]), 16: rgbToHex([255,128,0]),
  17: rgbToHex([255,128,0]), 18: rgbToHex([255,128,0]), 19: rgbToHex([255,128,0]),
  20: rgbToHex([255,128,0]), 21: rgbToHex([255,128,0]), 22: rgbToHex([255,128,0]),

  // face-0..67 (23..90): all white
  ...Object.fromEntries(Array.from({ length: 68 }, (_, i) => [23 + i, rgbToHex([255,255,255])])),

  // left hand colors
  91: rgbToHex([255,255,255]),
  92: rgbToHex([255,128,0]), 93: rgbToHex([255,128,0]), 94: rgbToHex([255,128,0]), 95: rgbToHex([255,128,0]),
  96: rgbToHex([255,153,255]), 97: rgbToHex([255,153,255]), 98: rgbToHex([255,153,255]), 99: rgbToHex([255,153,255]),
  100: rgbToHex([102,178,255]), 101: rgbToHex([102,178,255]), 102: rgbToHex([102,178,255]), 103: rgbToHex([102,178,255]),
  104: rgbToHex([255,51,51]), 105: rgbToHex([255,51,51]), 106: rgbToHex([255,51,51]), 107: rgbToHex([255,51,51]),
  108: rgbToHex([0,255,0]), 109: rgbToHex([0,255,0]), 110: rgbToHex([0,255,0]), 111: rgbToHex([0,255,0]),

  // right hand colors
  112: rgbToHex([255,255,255]),
  113: rgbToHex([255,128,0]), 114: rgbToHex([255,128,0]), 115: rgbToHex([255,128,0]), 116: rgbToHex([255,128,0]),
  117: rgbToHex([255,153,255]), 118: rgbToHex([255,153,255]), 119: rgbToHex([255,153,255]), 120: rgbToHex([255,153,255]),
  121: rgbToHex([102,178,255]), 122: rgbToHex([102,178,255]), 123: rgbToHex([102,178,255]), 124: rgbToHex([102,178,255]),
  125: rgbToHex([255,51,51]), 126: rgbToHex([255,51,51]), 127: rgbToHex([255,51,51]), 128: rgbToHex([255,51,51]),
  129: rgbToHex([0,255,0]), 130: rgbToHex([0,255,0]), 131: rgbToHex([0,255,0]), 132: rgbToHex([0,255,0]),
};

/** ---------- 骨架（按你的 skeleton_info，用名称映射到索引；并保留颜色） ---------- */
type Edge = { a: number; b: number; color: string };

// skeleton_info.links（名称） + 颜色
const SKELETON_BY_NAME: Array<{ link: [string, string]; color: [number, number, number] }> = [
  { link: ['left_ankle','left_knee'], color: [0,255,0] },
  { link: ['left_knee','left_hip'], color: [0,255,0] },
  { link: ['right_ankle','right_knee'], color: [255,128,0] },
  { link: ['right_knee','right_hip'], color: [255,128,0] },
  { link: ['left_hip','right_hip'], color: [51,153,255] },
  { link: ['left_shoulder','left_hip'], color: [51,153,255] },
  { link: ['right_shoulder','right_hip'], color: [51,153,255] },
  { link: ['left_shoulder','right_shoulder'], color: [51,153,255] },
  { link: ['left_shoulder','left_elbow'], color: [0,255,0] },
  { link: ['right_shoulder','right_elbow'], color: [255,128,0] },
  { link: ['left_elbow','left_wrist'], color: [0,255,0] },
  { link: ['right_elbow','right_wrist'], color: [255,128,0] },
  { link: ['left_eye','right_eye'], color: [51,153,255] },
  { link: ['nose','left_eye'], color: [51,153,255] },
  { link: ['nose','right_eye'], color: [51,153,255] },
  { link: ['left_eye','left_ear'], color: [51,153,255] },
  { link: ['right_eye','right_ear'], color: [51,153,255] },
  { link: ['left_ear','left_shoulder'], color: [51,153,255] },
  { link: ['right_ear','right_shoulder'], color: [51,153,255] },
  { link: ['left_ankle','left_big_toe'], color: [0,255,0] },
  { link: ['left_ankle','left_small_toe'], color: [0,255,0] },
  { link: ['left_ankle','left_heel'], color: [0,255,0] },
  { link: ['right_ankle','right_big_toe'], color: [255,128,0] },
  { link: ['right_ankle','right_small_toe'], color: [255,128,0] },
  { link: ['right_ankle','right_heel'], color: [255,128,0] },

  // left hand
  { link: ['left_hand_root','left_thumb1'], color: [255,128,0] },
  { link: ['left_thumb1','left_thumb2'], color: [255,128,0] },
  { link: ['left_thumb2','left_thumb3'], color: [255,128,0] },
  { link: ['left_thumb3','left_thumb4'], color: [255,128,0] },
  { link: ['left_hand_root','left_forefinger1'], color: [255,153,255] },
  { link: ['left_forefinger1','left_forefinger2'], color: [255,153,255] },
  { link: ['left_forefinger2','left_forefinger3'], color: [255,153,255] },
  { link: ['left_forefinger3','left_forefinger4'], color: [255,153,255] },
  { link: ['left_hand_root','left_middle_finger1'], color: [102,178,255] },
  { link: ['left_middle_finger1','left_middle_finger2'], color: [102,178,255] },
  { link: ['left_middle_finger2','left_middle_finger3'], color: [102,178,255] },
  { link: ['left_middle_finger3','left_middle_finger4'], color: [102,178,255] },
  { link: ['left_hand_root','left_ring_finger1'], color: [255,51,51] },
  { link: ['left_ring_finger1','left_ring_finger2'], color: [255,51,51] },
  { link: ['left_ring_finger2','left_ring_finger3'], color: [255,51,51] },
  { link: ['left_ring_finger3','left_ring_finger4'], color: [255,51,51] },
  { link: ['left_hand_root','left_pinky_finger1'], color: [0,255,0] },
  { link: ['left_pinky_finger1','left_pinky_finger2'], color: [0,255,0] },
  { link: ['left_pinky_finger2','left_pinky_finger3'], color: [0,255,0] },
  { link: ['left_pinky_finger3','left_pinky_finger4'], color: [0,255,0] },

  // right hand
  { link: ['right_hand_root','right_thumb1'], color: [255,128,0] },
  { link: ['right_thumb1','right_thumb2'], color: [255,128,0] },
  { link: ['right_thumb2','right_thumb3'], color: [255,128,0] },
  { link: ['right_thumb3','right_thumb4'], color: [255,128,0] },
  { link: ['right_hand_root','right_forefinger1'], color: [255,153,255] },
  { link: ['right_forefinger1','right_forefinger2'], color: [255,153,255] },
  { link: ['right_forefinger2','right_forefinger3'], color: [255,153,255] },
  { link: ['right_forefinger3','right_forefinger4'], color: [255,153,255] },
  { link: ['right_hand_root','right_middle_finger1'], color: [102,178,255] },
  { link: ['right_middle_finger1','right_middle_finger2'], color: [102,178,255] },
  { link: ['right_middle_finger2','right_middle_finger3'], color: [102,178,255] },
  { link: ['right_middle_finger3','right_middle_finger4'], color: [102,178,255] },
  { link: ['right_hand_root','right_ring_finger1'], color: [255,51,51] },
  { link: ['right_ring_finger1','right_ring_finger2'], color: [255,51,51] },
  { link: ['right_ring_finger2','right_ring_finger3'], color: [255,51,51] },
  { link: ['right_ring_finger3','right_ring_finger4'], color: [255,51,51] },
  { link: ['right_hand_root','right_pinky_finger1'], color: [0,255,0] },
  { link: ['right_pinky_finger1','right_pinky_finger2'], color: [0,255,0] },
  { link: ['right_pinky_finger2','right_pinky_finger3'], color: [0,255,0] },
  { link: ['right_pinky_finger3','right_pinky_finger4'], color: [0,255,0] },
];

// 转为索引版
const SKELETON_EDGES: Edge[] = SKELETON_BY_NAME.map(({ link, color }) => ({
  a: NAME_TO_ID[link[0]],
  b: NAME_TO_ID[link[1]],
  color: rgbToHex(color),
}));

/** ---------- 脸部 68 点常用拓扑（本地索引0..67），再整体 +23 偏移成全局 ---------- */
const makeFaceEdges68 = (): [number, number][] => {
  const E: [number, number][] = [];
  const seq = (s: number, e: number, close = false) => {
    for (let i = s; i < e; i++) E.push([i, i + 1]);
    if (close) E.push([e, s]);
  };
  // 0-16 下颌线
  seq(0, 16);
  // 17-21 右眉, 22-26 左眉
  seq(17, 21); seq(22, 26);
  // 27-30 鼻梁
  seq(27, 30);
  // 31-35 鼻翼
  seq(31, 35);
  // 36-41 右眼闭环, 42-47 左眼闭环
  seq(36, 40, true); seq(42, 46, true);
  // 48-59 外唇闭环, 60-67 内唇闭环
  seq(48, 59, true); seq(60, 67, true);
  return E;
};
// 偏移到全局（face-0 的全局索引是 23）
const FACE_EDGES_GLOBAL: Edge[] = makeFaceEdges68().map(([i, j]) => ({
  a: 23 + i,
  b: 23 + j,
  color: "#ff66cc", // 给脸部连线一个不与手脚冲突的高亮色
}));

/** ---------- 组件 ---------- */
export default function WholeBodyOverlay({
  poses,
  imgSrc,
  imgWidth,
  imgHeight,
  showBBox = true,
  showFaceEdges = true,
  pointRadius = 2.2,
}: Props) {
  const [hoverPose, setHoverPose] = useState<number | null>(null);
  const [hoverKp, setHoverKp] = useState<{ pose: number; kp: number } | null>(null);

  // 组合骨架（官方 skeleton_info + 可选脸部68点拓扑）
  const edges: Edge[] = useMemo(
    () => (showFaceEdges ? [...SKELETON_EDGES, ...FACE_EDGES_GLOBAL] : SKELETON_EDGES),
    [showFaceEdges]
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        // 保持与原图一致的宽高比，SVG 与 IMG 完美贴合
        aspectRatio: `${imgWidth} / ${imgHeight}`,
        overflow: "hidden"
      }}
    >
      {/* 背景原图 */}
      <img
        src={imgSrc}
        alt="pose"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        draggable={false}
      />
      {/* 叠加层：SVG，坐标系直接用原图像素，响应式靠 viewBox 缩放 */}
      <svg
        viewBox={`0 0 ${imgWidth} ${imgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {poses && poses.length > 0 && poses.map((pose, pIdx) => {
          const isHover = hoverPose === pIdx;

          // 组装点
          const pts = pose.kpts_x.map((x, i) => ({
            x,
            y: pose.kpts_y[i],
            valid: !pose.invalid_kpts_idx.includes(i),
            color: KEYPOINT_COLORS[i] ?? "#ff0000",
          }));

          // 画骨架
          const skeletonLines = edges.map(({ a, b, color }, ei) => {
            const A = pts[a], B = pts[b];
            if (!A || !B || !A.valid || !B.valid) return null;
            return (
              <line
                key={`e-${pIdx}-${ei}`}
                x1={A.x*imgWidth}
                y1={A.y*imgHeight}
                x2={B.x*imgWidth}
                y2={B.y*imgHeight}
                stroke={color}
                strokeOpacity={isHover ? 0.95 : 0.75}
                strokeWidth={isHover ? 3 : 2}
                vectorEffect="non-scaling-stroke"
              />
            );
          });

          // 画关键点
          const points = pts.map((pt, i) => {
            if (!pt.valid) return null;
            const active = hoverKp?.pose === pIdx && hoverKp.kp === i;
            const r = active ? pointRadius * 1.9 : pointRadius;
            return (
              <g key={`p-${pIdx}-${i}`}>
                <circle
                  cx={pt.x*imgWidth}
                  cy={pt.y*imgHeight}
                  r={r}
                  fill={pt.color}
                  stroke="#000"
                  strokeWidth={active ? 0.9 : 0.5}
                  opacity={isHover ? 1 : 0.95}
                  onMouseEnter={() => setHoverKp({ pose: pIdx, kp: i })}
                  onMouseLeave={() => setHoverKp(null)}
                />
                {/* 小标签（hover时显示 名称+索引） */}
                {active && (
                  <g transform={`translate(${pt.x + 6}, ${pt.y - 6})`}>
                    <rect x={-3} y={-10} width={120} height={18} rx={4} ry={4} fill="rgba(0,0,0,0.6)" />
                    <text x={3} y={3} fontSize={10} fill="#fff">
                      {indexToName(i)} ({i})
                    </text>
                  </g>
                )}
              </g>
            );
          });

          // bbox
          const bbox =
            showBBox && pose.bbox
              ? (
                <rect
                  x={pose.bbox[0]*imgWidth}
                  y={pose.bbox[1]*imgHeight}
                  width={pose.bbox[2]*imgWidth}
                  height={pose.bbox[3]*imgHeight}
                  fill="none"
                  stroke={isHover ? "#00e0ff" : "#00ff88"}
                  strokeWidth={isHover ? 2.5 : 1.5}
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                />
              )
              : null;

          return (
            <g
              key={`pose-${pIdx}`}
              onMouseEnter={() => setHoverPose(pIdx)}
              onMouseLeave={() => setHoverPose(null)}
            >
              {bbox}
              {skeletonLines}
              {points}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** ---------- 索引 -> 名称（用于 hover 标签显示） ---------- */
function indexToName(idx: number): string {
  // inverse of NAME_TO_ID for readability on hover
  // 快速逆映射：先查 face 再其他
  if (idx >= 23 && idx <= 90) return `face-${idx - 23}`;
  for (const [name, id] of Object.entries(NAME_TO_ID)) if (id === idx) return name;
  return `kp-${idx}`;
}
