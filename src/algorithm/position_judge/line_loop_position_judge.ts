import { Loop } from '../../geometry/brep/loop';
import { Curve2d } from '../../geometry/curve2d';
import { Line2d } from '../../geometry/line2d';
import { ErrorSystem } from '../../math/error_system';
import { Interval } from '../../math/interval';
import { LogUtil } from '../../util/log_util';
import { PositionJudge } from '../position_judge';
import { Line1ProjectToLine2 } from '../project/line_line_project';
import {
    CurveCuvePositonType, CurveLoopPositonType, PtLoopPositonType
} from './position_judge_type';
import { CurveCurvePositionJudge } from '../curve_curve_position_judge';

/**
 *  直线与Loop的位置关系判断 相交、内部、外部、在边界上
 */
class LineLoopPositionJudge {

    public static execute(line: Line2d, loop: Loop, _tolerance: number = ErrorSystem.LENGTH_EPS): CurveLoopPositonType {
        const tolerance = _tolerance + ErrorSystem.DELTA_EPS;
        // 包围盒粗判
        const box1 = loop.getBoundingBox();
        const box2 = loop.getBoundingBox();
        if (!box1.intersectsBox(box2, tolerance)) {
            return CurveLoopPositonType.OUT;
        }

        // 共线合并
        const loopCopy = loop.clone().merge();

        const set = new Set<CurveCuvePositonType>();
        const overlapedLine: Curve2d[] = [];
        // 搜集交点信息
        for (const ce of loopCopy.getCoedges()) {
            const ccType = CurveCurvePositionJudge.execute(line, ce.curve, tolerance);

            // 交于曲线内部，则返回相交
            if (ccType === CurveCuvePositonType.INTERSECT_IN) {
                return CurveLoopPositonType.INTERSECT;
            }

            // 在曲线内部，返回on
            if (ccType === CurveCuvePositonType.OVERLAP_IN) {
                return CurveLoopPositonType.ON;
            }

            // 与曲线相等，返回on
            if (ccType === CurveCuvePositonType.OVERLAP_EQUAL) {
                return CurveLoopPositonType.ON;
            }

            // 部分相交或相切
            if (ccType) {
                set.add(ccType);
            }

            // 部分相交，或者包含
            if (ccType === CurveCuvePositonType.OVERLAP
                || ccType === CurveCuvePositonType.OVERLAP_CONTAIN) {
                overlapedLine.push(ce.curve);
            }
        }

        // 只有INTERSECT_ON，或者都是不相交，用中点来判断
        if (set.size === 1 && set.has(CurveCuvePositonType.INTERSECT_ON)
            || set.size < 1) {
            const midType = PositionJudge.ptToLoop(line.getMidPt(), loop, tolerance);
            if (midType === PtLoopPositonType.IN) {
                if (set.size < 1) {
                    return CurveLoopPositonType.IN;
                }
                return CurveLoopPositonType.TANGENT_INNER;
            }
            if (midType === PtLoopPositonType.OUT) {
                if (set.size < 1) {
                    return CurveLoopPositonType.OUT;
                }
                return CurveLoopPositonType.TANGENT_OUTTER;
            }
        }

        const rs = overlapedLine.map(l => {
            return Line1ProjectToLine2.execute(l as Line2d, line);
        });

        const ranges = line.getRange().sub(...rs);

        if (ranges.length > 0) {
            let max = -1;
            let range;
            ranges.forEach(r => {
                if (r.getLength() > max) {
                    max = r.getLength();
                    range = r;
                }
            });

            if (max > 0) {
                const pt = (range as any as Interval).getMid();
                const midType = PositionJudge.ptToLoop(line.getPtAt(pt), loop);
                if (midType === PtLoopPositonType.IN) {
                    return CurveLoopPositonType.TANGENT_INNER;
                }
                if (midType === PtLoopPositonType.OUT) {
                    return CurveLoopPositonType.TANGENT_OUTTER;
                }
            }
        }

        // console.error(ranges);
        LogUtil.w([line, loop], '无法判断内外关系');
        return CurveLoopPositonType.ON;
    }
}

export { LineLoopPositionJudge };

