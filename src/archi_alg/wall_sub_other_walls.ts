import { Curve2d } from '../geometry/curve2d';
import { ErrorSystem } from '../math/error_system';
import { DebugWarn } from '../util/debug_warn';
import { BoolOperateClipper } from '../algorithm/bool_operate/bool_operate_clipper';
import { Line2d } from '../geometry/line2d';
import { Vector2 } from '../math/vector2';
import { Loop } from '../geometry/brep/loop';
import { Line1ProjectToLine2 } from '../algorithm/project/line_line_project';
import { CalculateProjecet, CurveCuvePositonType, SearchGraph } from '../algorithm';
import { Interval } from '../math/interval';
import { LogUtil } from '../util/log_util';
import { CurveCurvePositionJudge } from '../algorithm/curve_curve_position_judge';
import { GeometryType } from '../geometry/geometry_type';

/**
 * 曲线减矩形
 */
class WallSubOtherWalls {

    /**
     * 差 polylines - polygons
     * @param loopOrPolygons1 
     * @param loopOrPolygons2 
     */
    public static execute(curve: Curve2d, _rects: Vector2[][], torlerance: number = ErrorSystem.DOUBLE_EPS): Curve2d[] {
        DebugWarn.assert(curve.getType() === GeometryType.enLine2D, '只支持直线');

        const thisLine = curve as Line2d;
        const rangesToSub: Interval[] = [];
        const onResult: Interval[] = [];

        for (const _rect of _rects) {
            DebugWarn.assert(_rect.length === 4);

            const candidates = _rect.map((p, idx) => {
                return new Line2d(p, _rect[(idx === 3) ? 0 : (idx + 1)]);
            });

            // 1.先处理边界情况
            for (const candidate of candidates) {
                const type = CurveCurvePositionJudge.execute(thisLine, candidate, torlerance);
                if (type === CurveCuvePositonType.OVERLAP_EQUAL || type === CurveCuvePositonType.OVERLAP_IN) {
                    if (thisLine.getLength() > candidate.getLength()) {
                        continue;
                    } else {
                        return [];
                    }
                }
                if (type === CurveCuvePositonType.OVERLAP_CONTAIN || type === CurveCuvePositonType.OVERLAP) {
                    // 裁剪
                    const r = Line1ProjectToLine2.execute(candidate as Line2d, thisLine);
                    rangesToSub.push(r);
                    if (thisLine.getLength() > candidate.getLength()) {
                        const intR = r.intersect(thisLine.getRange());
                        if (intR && intR.getLength() > ErrorSystem.LENGTH_EPS) {
                            onResult.push(intR);
                        }
                    }
                }
            }
        }

        let boolSubjectSrc: Curve2d[] = undefined as any;
        if (rangesToSub.length) {
            const newLineRanges = thisLine.getRange().sub(...rangesToSub);
            boolSubjectSrc = newLineRanges.map(r => {
                return thisLine.clone().setRange(r);
            });
        }

        if (!boolSubjectSrc) {
            boolSubjectSrc = [curve];
        }

        const rectLoops = _rects.map(r => {
            return new Loop(r);
        });

        const result: Curve2d[] = [];
        for (const cv of boolSubjectSrc) {
            // 真正扣减
            const ptsArr = BoolOperateClipper.curvePolygon(cv, rectLoops, false);
            ptsArr.forEach(pts => {
                if (pts.length !== 2) {
                    console.warn('直线减polygon方法异常');
                }
                if (!pts[0].equals(pts[1])) {
                    result.push(new Line2d(pts[0], pts[1]));
                }
            });
        }

        if (onResult.length) {
            Interval.merge(onResult).forEach(r => {
                result.push(thisLine.clone().setRange(r));
            });
        }

        LogUtil.d(curve);
        LogUtil.d(
            [..._rects.map(r => {
                return new Loop(r);
            })],
            'curve');

        const polylines = SearchGraph.simpleLoop(result);
        const returnResult: Curve2d[] = [];
        polylines.forEach(sl => {
            sl.merge();
            returnResult.push(...sl.copyAllCurves());
        });

        return returnResult.map(r => {
            const range = CalculateProjecet.line1ToLine2(r as any, curve as any);
            return curve.clone().setRange(range);
        });
    }
}

export { WallSubOtherWalls };

