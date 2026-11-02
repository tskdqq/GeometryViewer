import { Line2d } from '../../geometry/line2d';
import { ErrorSystem } from '../../math/error_system';
import { DebugWarn } from '../../util/debug_warn';
import { CurveCuvePositonType } from './position_judge_type';
import { LineLineIntersect } from '../intersect/line_line_intersect';

/**
 * 两2d直线间的位置关系判断：重叠，相交，不相交
 */
class LineLinePositionJudge {

    /**
     * 两2d直线间的位置关系判断
     * 使用距离容差判断，角度容差会将误差放大
     * @param line1 
     * @param line2 
     * @param distanceTol 距离容差
     */
    public static execute(
        line1: Line2d,
        line2: Line2d,
        distanceTol = ErrorSystem.LENGTH_EPS,
        angleTol = ErrorSystem.ANGLE_EPS,
        overlapTol = ErrorSystem.LENGTH_EPS): CurveCuvePositonType {
        // todo 用更快的方法检查
        const infos = LineLineIntersect.line2dAndLine2d(line1, line2, distanceTol, angleTol, overlapTol);
        if (infos.length < 1) {
            return CurveCuvePositonType.NOT_INTERSECT;
        }
        DebugWarn.assert(infos.length === 1);
        if (!infos[0].isOverlap) {
            // 
            if (line1.getRange().containsPointAtStartOrEnd(infos[0].param1, overlapTol) ||
                line2.getRange().containsPointAtStartOrEnd(infos[0].param2, overlapTol)) {
                return CurveCuvePositonType.INTERSECT_ON;
            }
            return CurveCuvePositonType.INTERSECT_IN;
        }

        DebugWarn.assert(line1.getRange().distanceTo(infos[0].overlap1!)
            && line2.getRange().containsInterval(infos[0].overlap2!));

        let sub1Len = 0;
        line1.getRange().sub(infos[0].overlap1!).forEach(itv => {
            sub1Len += itv.getLength();
        });
        let sub2Len = 0;
        line2.getRange().sub(infos[0].overlap2!).forEach(itv => {
            sub2Len += itv.getLength();
        });

        if (sub1Len < overlapTol && sub2Len < overlapTol) {
            return CurveCuvePositonType.OVERLAP_EQUAL;
        }

        if (sub1Len < overlapTol) {
            return CurveCuvePositonType.OVERLAP_IN;
        }

        if (sub2Len < overlapTol) {
            return CurveCuvePositonType.OVERLAP_CONTAIN;
        }

        return CurveCuvePositonType.OVERLAP;
    }
}

export { LineLinePositionJudge };
