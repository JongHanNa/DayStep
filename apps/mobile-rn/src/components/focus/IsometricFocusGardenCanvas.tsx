/**
 * IsometricFocusGardenCanvas — Skia 기반 아이소메트릭 집중 정원
 * 청소 정원(IsometricGardenCanvas)과 동일한 5×5 그리드 구조.
 * 차이점:
 *   - tab 개념 제거 → primaryColor 기반 단일 팔레트
 *   - 성공(!interrupted) → 성장 나무, 실패(abandoned) → 시든 나무
 */
import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {Canvas, Path, Skia, Group} from '@shopify/react-native-skia';
import type {FocusTreeInfo} from '@/stores/pomodoroStore';

interface IsometricFocusGardenCanvasProps {
  trees: FocusTreeInfo[];
  width: number;
  primaryColor: string;
}

const GRID_SIZE = 5;
const TILE_WIDTH = 52;
const TILE_HEIGHT = TILE_WIDTH * 0.5;

const GRASS_DEPTH = 5;
const SOIL_DEPTH = 18;
const TOTAL_DEPTH = GRASS_DEPTH + SOIL_DEPTH;

/** 성장 단계: 0=씨앗(<2분), 1=새싹(2-5분), 2=작은나무(5-10분), 3=큰나무(10분+) */
function getGrowthLevel(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  if (minutes >= 10) return 3;
  if (minutes >= 5) return 2;
  if (minutes >= 2) return 1;
  return 0;
}

/** hex 보조 — # 제거 */
function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const h = hex.replace('#', '');
  const normalized = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  const n = parseInt(normalized, 16);
  return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** primaryColor를 단계별로 변주해 크라운 색상 생성 (레벨이 낮을수록 옅음) */
function getCrownColor(primaryColor: string, growthLevel: number, isAbandoned: boolean): string {
  if (isAbandoned) return '#9CA3AF';
  const {r, g, b} = hexToRgb(primaryColor);
  // 레벨별 혼합 비율 (white와의 lerp): 0=가장 옅음, 3=원색
  const mix = [0.55, 0.3, 0.1, 0][growthLevel] ?? 0.55;
  const lr = r + (255 - r) * mix;
  const lg = g + (255 - g) * mix;
  const lb = b + (255 - b) * mix;
  return rgbToHex(lr, lg, lb);
}

function getTrunkColor(growthLevel: number, isAbandoned: boolean): string {
  if (isAbandoned) return '#9CA3AF';
  switch (growthLevel) {
    case 3:
    case 2:
      return '#92400E';
    case 1:
      return '#A16207';
    default:
      return '#D97706';
  }
}

function tilePosition(row: number, col: number, centerX: number, topY: number) {
  return {
    x: centerX + (col - row) * (TILE_WIDTH / 2),
    y: topY + (col + row) * (TILE_HEIGHT / 2),
  };
}

// ─── 바닥 그라운드 Path 생성 ───

function buildGroundPaths(tw: number, th: number) {
  const topTiles: {path: string; color: string}[] = [];
  const grassLight = '#86EFAC';
  const grassDark = '#6EE7A0';

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const isEven = (row + col) % 2 === 0;
      const cx = tw / 2 + (col - row) * (TILE_WIDTH / 2);
      const cy = GRID_SIZE * TILE_HEIGHT / 2 + (col + row) * (TILE_HEIGHT / 2) - th / 2;

      const p = Skia.Path.Make();
      p.moveTo(cx, cy);
      p.lineTo(cx + TILE_WIDTH / 2, cy + TILE_HEIGHT / 2);
      p.lineTo(cx, cy + TILE_HEIGHT);
      p.lineTo(cx - TILE_WIDTH / 2, cy + TILE_HEIGHT / 2);
      p.close();
      topTiles.push({path: p.toSVGString(), color: isEven ? grassLight : grassDark});
    }
  }

  const leftGrass = Skia.Path.Make();
  leftGrass.moveTo(0, th / 2);
  leftGrass.lineTo(tw / 2, th);
  leftGrass.lineTo(tw / 2, th + GRASS_DEPTH);
  leftGrass.lineTo(0, th / 2 + GRASS_DEPTH);
  leftGrass.close();

  const leftSoil = Skia.Path.Make();
  leftSoil.moveTo(0, th / 2 + GRASS_DEPTH);
  leftSoil.lineTo(tw / 2, th + GRASS_DEPTH);
  leftSoil.lineTo(tw / 2, th + TOTAL_DEPTH);
  leftSoil.lineTo(0, th / 2 + TOTAL_DEPTH);
  leftSoil.close();

  const rightGrass = Skia.Path.Make();
  rightGrass.moveTo(tw, th / 2);
  rightGrass.lineTo(tw / 2, th);
  rightGrass.lineTo(tw / 2, th + GRASS_DEPTH);
  rightGrass.lineTo(tw, th / 2 + GRASS_DEPTH);
  rightGrass.close();

  const rightSoil = Skia.Path.Make();
  rightSoil.moveTo(tw, th / 2 + GRASS_DEPTH);
  rightSoil.lineTo(tw / 2, th + GRASS_DEPTH);
  rightSoil.lineTo(tw / 2, th + TOTAL_DEPTH);
  rightSoil.lineTo(tw, th / 2 + TOTAL_DEPTH);
  rightSoil.close();

  return {
    topTiles,
    leftGrass: leftGrass.toSVGString(),
    leftSoil: leftSoil.toSVGString(),
    rightGrass: rightGrass.toSVGString(),
    rightSoil: rightSoil.toSVGString(),
  };
}

function buildGrassBlades(tw: number, th: number): {path: string; color: string}[] {
  const blades: {path: string; color: string}[] = [];
  const gColor = '#3DBE7B';
  const bh = TILE_HEIGHT * 0.22;
  const sp = TILE_WIDTH * 0.035;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const tcx = tw / 2 + (col - row) * (TILE_WIDTH / 2);
      const tcy =
        GRID_SIZE * TILE_HEIGHT / 2 +
        (col + row) * (TILE_HEIGHT / 2) -
        th / 2 +
        TILE_HEIGHT / 2;

      const rex = tcx + TILE_WIDTH / 4;
      const rey = tcy + TILE_HEIGHT / 4;
      for (let i = -1; i <= 1; i++) {
        const bx = rex + i * sp;
        const lean = i * sp * 1.5;
        const p = Skia.Path.Make();
        p.moveTo(bx, rey);
        p.quadTo(bx + lean * 0.6, rey - bh * 0.55, bx + lean, rey - bh);
        blades.push({path: p.toSVGString(), color: gColor});
      }

      const lex = tcx - TILE_WIDTH / 4;
      const ley = tcy + TILE_HEIGHT / 4;
      for (const offset of [-0.5, 0.5]) {
        const bx = lex + offset * sp;
        const lean = offset * sp * 2.4;
        const p = Skia.Path.Make();
        p.moveTo(bx, ley);
        p.quadTo(bx + lean * 0.6, ley - bh * 0.55, bx + lean, ley - bh);
        blades.push({path: p.toSVGString(), color: gColor});
      }
    }
  }
  return blades;
}

// ─── 나무 Paths 생성 ───

interface TreePathData {
  paths: {path: string; color: string; opacity?: number; stroke?: boolean; strokeWidth?: number}[];
}

function buildTreePaths(
  tree: FocusTreeInfo,
  cx: number,
  groundY: number,
  treeSize: number,
  primaryColor: string,
): TreePathData {
  const w = treeSize;
  const h = treeSize;
  const growthLevel = getGrowthLevel(tree.durationSeconds);
  const isAbandoned = tree.outcome === 'abandoned';
  const crownColor = getCrownColor(primaryColor, growthLevel, isAbandoned);
  const trunkColor = getTrunkColor(growthLevel, isAbandoned);
  const groundColor = isAbandoned ? '#D1D5DB' : '#92400E';

  const paths: TreePathData['paths'] = [];

  // 땅 타원
  paths.push({
    path: `M ${cx - w * 0.3} ${groundY + h * 0.04} A ${w * 0.3} ${h * 0.05} 0 1 0 ${cx + w * 0.3} ${groundY + h * 0.04} A ${w * 0.3} ${h * 0.05} 0 1 0 ${cx - w * 0.3} ${groundY + h * 0.04}`,
    color: groundColor,
    opacity: isAbandoned ? 1 : 0.3,
  });

  if (isAbandoned) {
    const trunkH = h * 0.35;
    const trunkW = w * 0.10;
    const tilt = w * 0.06;
    const trunkTop = groundY - trunkH;

    const trunk = Skia.Path.Make();
    trunk.moveTo(cx - trunkW * 0.6, groundY);
    trunk.lineTo(cx - trunkW * 0.3 + tilt, trunkTop);
    trunk.lineTo(cx + trunkW * 0.3 + tilt, trunkTop);
    trunk.lineTo(cx + trunkW * 0.6, groundY);
    trunk.close();
    paths.push({path: trunk.toSVGString(), color: '#9CA3AF'});

    const crownR = w * 0.26;
    paths.push({
      path: `M ${cx - crownR + tilt} ${trunkTop - crownR * 0.5 + crownR * 0.6} A ${crownR} ${crownR * 0.6} 0 1 0 ${cx + crownR + tilt} ${trunkTop - crownR * 0.5 + crownR * 0.6} A ${crownR} ${crownR * 0.6} 0 1 0 ${cx - crownR + tilt} ${trunkTop - crownR * 0.5 + crownR * 0.6}`,
      color: '#9CA3AF',
      opacity: 0.6,
    });
  } else {
    switch (growthLevel) {
      case 0: {
        const seedSize = w * 0.18;
        paths.push({
          path: `M ${cx - seedSize / 2} ${groundY - seedSize * 0.1} A ${seedSize / 2} ${seedSize / 2} 0 1 0 ${cx + seedSize / 2} ${groundY - seedSize * 0.1} A ${seedSize / 2} ${seedSize / 2} 0 1 0 ${cx - seedSize / 2} ${groundY - seedSize * 0.1}`,
          color: trunkColor,
        });
        const tipY = groundY - seedSize * 0.6 - w * 0.08;
        const sprout = Skia.Path.Make();
        sprout.moveTo(cx, groundY - seedSize * 0.6);
        sprout.lineTo(cx, tipY);
        paths.push({path: sprout.toSVGString(), color: crownColor, stroke: true, strokeWidth: Math.max(1, w * 0.04)});
        break;
      }
      case 1: {
        const stemHeight = h * 0.35;
        const stemTop = groundY - stemHeight;
        const stemWidth = Math.max(1.5, w * 0.06);

        const stem = Skia.Path.Make();
        stem.moveTo(cx, groundY);
        stem.lineTo(cx, stemTop);
        paths.push({path: stem.toSVGString(), color: trunkColor, stroke: true, strokeWidth: stemWidth});

        const leafW = w * 0.22;
        const leafH = w * 0.12;
        const leafY = stemTop + stemHeight * 0.3;
        paths.push({
          path: ellipsePath(cx - leafW - stemWidth / 2 + leafW / 2, leafY, leafW / 2, leafH / 2),
          color: crownColor,
        });
        paths.push({
          path: ellipsePath(cx + stemWidth / 2 + leafW / 2, leafY - leafH * 0.3, leafW / 2, leafH / 2),
          color: crownColor,
        });
        const topLeafW = w * 0.16;
        const topLeafH = w * 0.20;
        paths.push({
          path: ellipsePath(cx, stemTop - topLeafH * 0.2, topLeafW / 2, topLeafH / 2),
          color: crownColor,
        });
        break;
      }
      case 2: {
        const trunkH = h * 0.32;
        const trunkW = w * 0.10;
        const trunkTop = groundY - trunkH;

        const trunk = Skia.Path.Make();
        trunk.moveTo(cx - trunkW * 0.7, groundY);
        trunk.lineTo(cx - trunkW * 0.4, trunkTop);
        trunk.lineTo(cx + trunkW * 0.4, trunkTop);
        trunk.lineTo(cx + trunkW * 0.7, groundY);
        trunk.close();
        paths.push({path: trunk.toSVGString(), color: trunkColor});

        const crownR = w * 0.28;
        paths.push({
          path: ellipsePath(cx, trunkTop - crownR * 0.4, crownR, crownR * 0.9),
          color: crownColor,
        });
        const hlR = crownR * 0.5;
        paths.push({
          path: ellipsePath(cx - hlR * 0.1, trunkTop - crownR * 0.7, hlR / 2, hlR * 0.4),
          color: crownColor,
          opacity: 0.4,
        });
        break;
      }
      default: {
        const trunkH = h * 0.42;
        const trunkW = w * 0.12;
        const trunkTop = groundY - trunkH;

        const trunk = Skia.Path.Make();
        trunk.moveTo(cx - trunkW * 0.8, groundY);
        trunk.lineTo(cx - trunkW * 0.4, trunkTop);
        trunk.lineTo(cx + trunkW * 0.4, trunkTop);
        trunk.lineTo(cx + trunkW * 0.8, groundY);
        trunk.close();
        paths.push({path: trunk.toSVGString(), color: trunkColor});

        const branchY = trunkTop + trunkH * 0.3;
        const lb = Skia.Path.Make();
        lb.moveTo(cx - trunkW * 0.3, branchY);
        lb.quadTo(cx - w * 0.22, branchY + h * 0.02, cx - w * 0.28, branchY - h * 0.12);
        paths.push({path: lb.toSVGString(), color: trunkColor, stroke: true, strokeWidth: Math.max(1.5, w * 0.04)});

        const rb = Skia.Path.Make();
        rb.moveTo(cx + trunkW * 0.3, branchY - h * 0.05);
        rb.quadTo(cx + w * 0.2, branchY - h * 0.02, cx + w * 0.26, branchY - h * 0.16);
        paths.push({path: rb.toSVGString(), color: trunkColor, stroke: true, strokeWidth: Math.max(1.5, w * 0.04)});

        const crownR = w * 0.38;
        paths.push({
          path: ellipsePath(cx, trunkTop - crownR * 0.35, crownR, crownR * 0.85),
          color: crownColor,
        });
        const subR = crownR * 0.55;
        paths.push({
          path: ellipsePath(cx - crownR * 0.25, trunkTop + crownR * 0.05, subR * 0.8, subR * 0.65),
          color: crownColor,
        });
        paths.push({
          path: ellipsePath(cx + crownR * 0.5, trunkTop - crownR * 0.1, subR * 0.75, subR * 0.6),
          color: crownColor,
        });
        const hlR = crownR * 0.35;
        paths.push({
          path: ellipsePath(cx, trunkTop - crownR * 0.65, hlR / 2, hlR * 0.35),
          color: '#FFFFFF',
          opacity: 0.15,
        });
        break;
      }
    }
  }

  return {paths};
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
}

// ─── 메인 컴포넌트 ───

export function IsometricFocusGardenCanvas({trees, width, primaryColor}: IsometricFocusGardenCanvasProps) {
  const scale = width / (TILE_WIDTH * GRID_SIZE + 20);
  const tw = TILE_WIDTH * GRID_SIZE;
  const th = TILE_HEIGHT * GRID_SIZE;

  const canvasWidth = tw + 20;
  const canvasHeight = th + TOTAL_DEPTH + 110;

  const scaledHeight = canvasHeight * scale;

  const ground = useMemo(() => buildGroundPaths(tw, th), [tw, th]);
  const grassBlades = useMemo(() => buildGrassBlades(tw, th), [tw, th]);

  const displayTrees = useMemo(() => {
    if (trees.length <= 25) return trees;
    return [...trees].sort((a, b) => b.durationSeconds - a.durationSeconds).slice(0, 25);
  }, [trees]);

  const treeRenderData = useMemo(() => {
    const centerX = tw / 2 + 10;
    const topY = 30;
    const treeSize = TILE_WIDTH * 0.65;

    return displayTrees.map((tree, index) => {
      const row = Math.floor(index / GRID_SIZE);
      const col = index % GRID_SIZE;
      const pos = tilePosition(row, col, centerX, topY);

      const treeCx = pos.x;
      const treeGroundY = pos.y + TILE_HEIGHT / 2 - TILE_HEIGHT * 0.45;

      return {
        key: `${tree.sessionId}-${index}`,
        ...buildTreePaths(tree, treeCx, treeGroundY, treeSize, primaryColor),
      };
    });
  }, [displayTrees, tw, primaryColor]);

  const groundOffsetX = 10;
  const groundOffsetY = 30;

  return (
    <View style={[styles.container, {height: scaledHeight}]}>
      <Canvas style={{width, height: scaledHeight}}>
        <Group transform={[{scale}]}>
          <Group transform={[{translateX: groundOffsetX}, {translateY: groundOffsetY}]}>
            {ground.topTiles.map((tile, i) => (
              <Path
                key={`tile-${i}`}
                path={tile.path}
                color={Skia.Color(tile.color)}
                opacity={0.77}
              />
            ))}

            {grassBlades.map((blade, i) => (
              <Path
                key={`blade-${i}`}
                path={blade.path}
                color={Skia.Color(blade.color)}
                style="stroke"
                strokeWidth={Math.max(0.7, TILE_WIDTH * 0.018)}
                opacity={0.8}
              />
            ))}

            <Path path={ground.leftGrass} color={Skia.Color('#4ADE80')} />
            <Path path={ground.leftSoil} color={Skia.Color('#92400E')} opacity={0.7} />

            <Path path={ground.rightGrass} color={Skia.Color('#22C55E')} />
            <Path path={ground.rightSoil} color={Skia.Color('#A16207')} opacity={0.7} />
          </Group>

          {treeRenderData.map(treeData =>
            treeData.paths.map((p, pi) => (
              <Path
                key={`${treeData.key}-${pi}`}
                path={p.path}
                color={Skia.Color(p.color)}
                style={p.stroke ? 'stroke' : 'fill'}
                strokeWidth={p.strokeWidth}
                opacity={p.opacity ?? 1}
              />
            )),
          )}
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
