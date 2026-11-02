import { Loop } from '../../geometry/brep/loop';
import { ErrorSystem } from '../../math/error_system';
import { Vector2 } from '../../math/vector2';
import { DebugWarn } from '../../util/debug_warn';
import { MathUtil } from '../../util/math_util';
import { PtLoopPositonType } from './position_judge_type';
import { Line2d } from '../../geometry/line2d';
import { CalculateIntersect } from '../calculate_intersect';
import { Curve2d } from '../../geometry/curve2d';
import { ClipperFormatConverter } from '../../util/clipper_format_converter';
import * as ClipperLib from '../../lib/clipperlib/clipperlib';
/**
 *  点与Loop的位置关系判断，0 外部， +1内部， -1在loop上
 * 
 *  returns 0 if false, +1 if true, -1 if pt ON polygon boundary
 *  See 'The Point in Polygon Problem for Arbitrary Polygons' by Hormann & Agathos
 * 
 * 
 *  [参考文献](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.88.5498&rep=rep1&type=pdf)
 */
class PtLoopPositionJudge {

    /**
     * 点与Loop的位置关系判断:ON，IN，OUT,
     * 逆时针的环为外环，顺时针的环为内环
     * 
     * @param point
     * @param loop
     * @param tolerance 
     * @returns `CurveCuvePositonType`
     */
    public static execute(pt: Vector2, loop: Loop, tolerance: number = ErrorSystem.LENGTH_EPS, isDiffInOrOutloop: boolean = true): PtLoopPositonType {

        // DebugWarn.assert(loop.isValid(), 'Loop is invalid,error');
        const tmpLoop = loop.clone();
        if (isDiffInOrOutloop) {
            DebugWarn.assert(tmpLoop.isAnticlockwise(), 'just support outter loop，please reverse the loop');
        } else {
            if (!tmpLoop.isAnticlockwise()) {
                tmpLoop.reverse();
            }
        }

        // 包围盒粗判
        const box2d = tmpLoop.getBoundingBox();
        if (!box2d.containsPoint(pt, tolerance)) {
            return PtLoopPositonType.OUT;
        }

        if (tolerance > ErrorSystem.DOUBLE_EPS) {
            for (const ce of tmpLoop.getCoedges()) {
                if (ce.curve.containsPoint(pt, tolerance)) {  // 如果在边上直接返回
                    return PtLoopPositonType.ON;
                }
            }
        }

        if (!tmpLoop.isOnlyLines()) {
            return this.rayIntersectsJudge(pt, tmpLoop.copyAllCurves());
        }

        // returns 0 if false, +1 if true, -1 if pt ON polygon boundary
        const flag = ClipperLib.Clipper.PointInPolygon(
            ClipperFormatConverter.vector2ToXY(pt), ClipperFormatConverter.loopToPath(tmpLoop));

        if (flag === 1) {
            return PtLoopPositonType.IN;
        } else if (flag === -1) {
            return PtLoopPositonType.ON;
        }
        return PtLoopPositonType.OUT;

    }

    /**
     * 射线法判断，支持带圆弧的多边形等
     * @param pt 
     * @param loop 
     * @param tolerance 
     */
    public static rayIntersectsJudge(pt: Vector2, curve2ds: Curve2d[]): PtLoopPositonType {
        // 计算交点，因为是个loop，计算交点的时候要防止交点是两个coedge直接的相接点，这种点在两个coedge上计算的时候只作为一个coedge的start点计算
        while (true) {
            // 先随机选择一条射线
            const randomAngle = Math.random() * MathUtil.PI2;
            const randomLine = Line2d.createByOriginAndDir(pt, new Vector2(Math.cos(randomAngle), Math.sin(randomAngle)), [0, ErrorSystem.MODEL_MAX_LENGTH]);
            let intersectNum = 0;
            let isOverlap = false;
            for (const curve of curve2ds) {
                const intersectResults = CalculateIntersect.curveCurve(randomLine, curve);
                if (intersectResults.length === 0) {
                    continue;

                } else {
                    // 判断是否重叠，判断交点是否为end的端点，如果是则不计入相交点的计算
                    for (const intersectInfo of intersectResults) {
                        if (intersectInfo.isOverlap) { // 先判断是否重合, 如果重合，则需要重新选择一条射线
                            isOverlap = true;
                            break;
                        } else { // 再判断是否为endpoint
                            if (Math.abs(intersectInfo.param2 - curve.getEndParam()) < ErrorSystem.LENGTH_EPS) {
                                continue;
                            } else {
                                intersectNum += 1;
                            }
                        }
                    }
                    if (isOverlap) {
                        break;
                    }
                }
            }
            if (isOverlap) {
                continue;
            }
            if (intersectNum % 2 === 1) {
                return PtLoopPositonType.IN;
            } else {
                return PtLoopPositonType.OUT;
            }
        }
    }
}

export { PtLoopPositionJudge };

