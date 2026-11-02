import { ErrorSystem } from '../../math/error_system';
import { Vector2 } from '../../math/vector2';
import { PtLoopPositonType } from './position_judge_type';
import { Polygon } from '../../geometry/brep/polygon';
import { PtLoopPositionJudge } from './pt_loop_position_judge';

export class PtPolygonPositionJudge {

    /**
     * 点与Loop的位置关系判断:ON，IN，OUT,
     * 逆时针的环为外环，顺时针的环为内环
     * 
     * @param point
     * @param polygon
     * @param tolerance 
     * @returns `CurveCuvePositonType`
     */
    public static execute(pt: Vector2, polygon: Polygon, tolerance: number = ErrorSystem.LENGTH_EPS): PtLoopPositonType {

        if (polygon.getLoops().length === 1) {
            return PtLoopPositionJudge.execute(pt, polygon.getLoops()[0], tolerance, false);
        }

        // DebugWarn.assert(polygon.isValid(), 'Loop is invalid,error');

        // 包围盒粗判
        const box2d = polygon.getBoundingBox();
        if (!box2d.containsPoint(pt, tolerance)) {
            return PtLoopPositonType.OUT;
        }

        if (tolerance > ErrorSystem.DOUBLE_EPS) {
            for (const ce of polygon.getCoedges()) {
                if (ce.curve.containsPoint(pt, tolerance)) {  // 如果在边上直接返回
                    return PtLoopPositonType.ON;
                }
            }
        }

        return PtLoopPositionJudge.rayIntersectsJudge(pt, polygon.copyAllCurves());
    }
}
