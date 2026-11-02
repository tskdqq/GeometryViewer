import { Curve } from '../../geometry/curve';
import { ErrorSystem } from '../../math/error_system';
import { Vector } from '../../math/vector';
import { CalculatDistance } from '../calculate_distance';
import { PtCurvePostionType } from './position_judge_type';

/**
 *  点与Loop的位置关系判断
 * 
 */
class PtCurvePositionJudge {

    public static execute<PointType extends Vector>(
        point: PointType,
        curve: Curve<PointType>,
        tolerance: number = ErrorSystem.LENGTH_EPS): PtCurvePostionType {

        if (point.distanceTo(curve.getStartPt()) < tolerance) {
            return PtCurvePostionType.ON_START;
        }
        if (point.distanceTo(curve.getEndPt()) < tolerance) {
            return PtCurvePostionType.ON_END;
        }
        const d = CalculatDistance.ptToCurve(point, curve, false);
        if (d < tolerance) {
            return PtCurvePostionType.IN;
        }
        return PtCurvePostionType.NOT_ON;
    }

    /**
     * 点是否在曲线右边
     * 
     * 如下图，p1在曲线右侧，p2在曲线左侧
     * ```
     *      p1
     * ————<——————
     *      p2
     * ```
     * @param point 任意一点
     * @param curve 任意曲线
     */
    public static isPtOnCurveRight<PointType extends Vector>(point: PointType, curve: Curve<PointType>): boolean {
        return CalculatDistance.ptToCurveSignedDistance(point, curve) > 0;
    }
}

export { PtCurvePositionJudge };
