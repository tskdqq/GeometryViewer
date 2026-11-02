import { Curve } from '../geometry/curve';
import { Line2d } from '../geometry/line2d';
import { ErrorSystem } from '../math/error_system';
import { Vector } from '../math/vector';
import { LineLinePositionJudge } from './position_judge/line_line_pj';
import { CurveCuvePositonType } from './position_judge/position_judge_type';

/**
 * #### 2.两曲线间的位置关系`curveToCurve`：重叠，相交，不相交
 */
class CurveCurvePositionJudge {
    /**
     * 曲线与曲线的位置关系判断:相交，重叠，不相交
     * 
     * 支持 Line2d Line2d
     * @param curve1
     * @param curve2
     * @param tolerance 
     * @returns `CurveCuvePositonType`
     */
    public static execute<PointType extends Vector>(
        curve1: Curve<PointType>,
        curve2: Curve<PointType>,
        distanceTol = ErrorSystem.LENGTH_EPS,
        angleTol = ErrorSystem.ANGLE_EPS,
        overlapTol = ErrorSystem.LENGTH_EPS): CurveCuvePositonType {

        if (curve1 instanceof Line2d) {
            if (curve2 instanceof Line2d) {
                return LineLinePositionJudge.execute(curve1 as Line2d, curve2 as Line2d, distanceTol, angleTol, overlapTol);
            }
        }
        throw new Error('不支持的类型');
    }
}

export { CurveCurvePositionJudge };
