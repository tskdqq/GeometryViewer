import { Curve } from '../../geometry/curve';
import { Line2d } from '../../geometry/line2d';
import { ErrorSystem } from '../../math/error_system';
import { Vector } from '../../math/vector';
import { CurveCueveIntersectInfo } from './curve_cueve_intersect_info';
import { LineLineIntersect } from './line_line_intersect';
import { LineArcIntersect } from './line_arc_intersect';
import { ArcArcIntersect } from './arc_arc_intersect';
import { Arc2d } from '../../geometry/arc2d';

/**
 * 曲线与曲线的交点，目前只支持Line2d与Line2d的交点,
 * 若两曲线重合，则交点为重合段内的某个交点
 * > 此接口是求两曲线段的交点，曲线段是有限长的，若求无限长的曲线的交点，可将曲线extend至无限长
 * @param curve1 
 * @param curve2 
 * @param extraInfo [out]如果需要知道交点的额外信息（交点在各个曲线上的参数），则传入该参数,
 */
class CurveCurveIntersect {

    public static execute<PointType extends Vector>(
        curve1: Curve<PointType>,
        curve2: Curve<PointType>,
        distanceTol: number = ErrorSystem.LENGTH_EPS,
        angleTol: number = ErrorSystem.ANGLE_EPS,
        overlapTol: number = ErrorSystem.LENGTH_EPS): CurveCueveIntersectInfo<PointType>[] {

        if ((curve1 instanceof Line2d) && (curve2 instanceof Line2d)) {
            const interInfo = LineLineIntersect.line2dAndLine2d(curve1, curve2, distanceTol, angleTol, overlapTol);
            return interInfo as any;

        } else if ((curve1 instanceof Line2d) && (curve2 instanceof Arc2d)) {
            const interInfo = LineArcIntersect.line2dAndArc2d(curve1 as Line2d, curve2 as Arc2d, distanceTol);
            return interInfo as any;

        } else if ((curve1 instanceof Arc2d) && (curve2 instanceof Arc2d)) {
            const interInfo = ArcArcIntersect.Arc2dAndArc2d(curve1 as Arc2d, curve2 as Arc2d, distanceTol);
            return interInfo as any;
        }

        throw new Error('不支持的类型');
    }
}

export { CurveCurveIntersect };
