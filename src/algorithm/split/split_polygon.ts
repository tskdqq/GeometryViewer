import { Polygon } from '../../geometry/brep/polygon';
import { Curve2d } from '../../geometry/curve2d';
import { SplitPolyline } from './split_polyline';
import { Line2d } from '../../geometry/line2d';
import { CalculateIntersect } from '../calculate_intersect';
import { DebugWarn } from '../../util/debug_warn';
import { PositionJudge } from '../position_judge';
import { PtLoopPositonType } from '../position_judge/position_judge_type';
import { ErrorSystem } from '../../math/error_system';
import { Loop } from '../../geometry/brep/loop';
import { BoolOperate2d } from '../bool_operate_2d';
import { LogUtil } from '../../util/log_util';
import { SearchGraph } from '../search_graph';
import { CalculatDistance } from '../calculate_distance';

/**
 * SplitPolygon的打断算法, 打断规则：
 * - 有交
 * - 重叠
 */
class SplitPolygon {

    public static execute(polygon: Polygon, curves: Curve2d[]) {
        for (const ce of polygon.getLoops()) {
            SplitPolyline.execute(ce, curves);
        }
    }

    public static LineSplitPolygon(splitLines: Line2d[], polygon: Polygon): Polygon[] {
        const result: Polygon[] = [];
        if (splitLines.length < 1) {
            result.push(polygon.clone());
            return result;
        }

        // 剪切线间不能有相交
        for (let nSplitLineIndex = 0; nSplitLineIndex < splitLines.length - 1; nSplitLineIndex++) {
            const intersectResults = CalculateIntersect.curveCurve(splitLines[nSplitLineIndex], splitLines[nSplitLineIndex + 1]);
            if (intersectResults.length === 0) {
                continue;
            } else {
                DebugWarn.assert(!intersectResults[0].isOverlap, '线拆环时，打断线间不能有重合（包含部分重合）！' + LogUtil.asString([splitLines[nSplitLineIndex], splitLines[nSplitLineIndex + 1]]));
                DebugWarn.assert(PtLoopPositonType.OUT === PositionJudge.ptToPolygon(intersectResults[0].point, polygon), '线拆环时，打断线不能有相交于环内部！' + LogUtil.asString([intersectResults[0].point, polygon]));
            }
        }

        result.push(polygon.clone());
        for (const splitLine of splitLines) {
            for (let nPolygonIndex = 0; nPolygonIndex < result.length;) {
                if (splitLine.getBoundingBox().intersectsBox(result[nPolygonIndex].getBoundingBox())) {
                    // 打断线与当前polygon有交，将当前polygon拆成两个
                    const splitedPolygons = this.splitPolygonByInfinityLine(splitLine, result[nPolygonIndex]);
                    result.splice(nPolygonIndex, 1, ...splitedPolygons);
                    nPolygonIndex += splitedPolygons.length;
                } else {
                    nPolygonIndex++;
                }
            }
        }

        // 将result中能有公共边，但公共边不在打断线（有限长）上的polygon合并
        if (result.length > 1) {
            for (let index = 0; index < result.length; index++) {
                if (result[index].getBoundingBox().intersectsBox(result[(index + 1) % result.length].getBoundingBox())) {
                    const sameLine = this.isPolygonHasSameCurve(result[index], result[(index + 1) % result.length], ErrorSystem.LENGTH_EPS);
                    if (sameLine && !this.isSplitLineHasSameLine(splitLines, sameLine, ErrorSystem.LENGTH_EPS)) {
                        result[(index + 1) % result.length] = BoolOperate2d.union([result[index], result[(index + 1) % result.length]]);
                        result.splice(index, 1);
                    }
                }
            }
        }

        return result;
    }

    private static isSplitLineHasSameLine(splitLines: Line2d[], sameLine: Line2d, lengthEps: number): boolean {
        if (splitLines.length < 1) {
            return false;
        }

        for (const splitLine of splitLines) {
            if (CalculatDistance.ptToCurve(sameLine.getStartPt(), splitLine, false) < lengthEps
                && CalculatDistance.ptToCurve(sameLine.getEndPt(), splitLine, false) < lengthEps) {
                return true;
            }
        }

        return false;
    }

    private static isPolygonHasSameCurve(firPolygon: Polygon, secPolygon: Polygon, lengthEps: number): Line2d | undefined {

        if (firPolygon.getAllCurves().length < 1 || secPolygon.getAllCurves().length < 1) {
            return undefined;
        }

        if (!firPolygon.isOnlyLines() || !secPolygon.isOnlyLines()) {
            return undefined;
        }

        for (const firCurve of firPolygon.getAllCurves()) {
            for (const secCurve of secPolygon.getAllCurves()) {
                if ((firCurve.getStartPt().equals(secCurve.getStartPt()) && firCurve.getEndPt().equals(secCurve.getEndPt()))
                    || (firCurve.getStartPt().equals(secCurve.getEndPt()) && firCurve.getEndPt().equals(secCurve.getStartPt()))) {
                    // 返回公共边
                    return firCurve.clone() as Line2d;
                }
            }
        }

        return undefined;
    }

    private static splitPolygonByInfinityLine(line: Line2d, polygon: Polygon): Polygon[] {
        const lineClone = line.clone();
        lineClone.extend(ErrorSystem.MODEL_MAX_LENGTH / 3, true);
        lineClone.extend(ErrorSystem.MODEL_MAX_LENGTH / 3, false);
        const leftLoop = Loop.createByOffset(lineClone, ErrorSystem.MODEL_MAX_LENGTH, 0);
        const intLeftpolygon = BoolOperate2d.intersect([new Polygon(leftLoop), polygon.clone()]);
        const rightLoop = Loop.createByOffset(lineClone, 0, ErrorSystem.MODEL_MAX_LENGTH);
        const intRightpolygon = BoolOperate2d.intersect([new Polygon(rightLoop), polygon.clone()]);

        const leftSinglePolygons = SearchGraph.polygonToPolygonExs(intLeftpolygon);
        const rightSinglePolygons = SearchGraph.polygonToPolygonExs(intRightpolygon);

        // LogUtil.d(line, 'splitPolygonByInfinityLine line:');
        // LogUtil.d(polygon, 'splitPolygonByInfinityLine polygon:');
        // LogUtil.d([...leftSinglePolygons, ...rightSinglePolygons], 'splitPolygonByInfinityLine result:');

        return [...leftSinglePolygons, ...rightSinglePolygons];
    }
}

export { SplitPolygon };
