import * as numeric from 'numeric';

import { Line2d } from '../../geometry/line2d';
import { ErrorSystem } from '../../math/error_system';
import { Vector2 } from '../../math/vector2';
import { DebugWarn } from '../../util/debug_warn';
import { CurveCueveIntersectInfo } from './curve_cueve_intersect_info';
import { Line1ProjectToLine2 } from '../project/line_line_project';
import { PtToLineSignedDistance } from '../distance/pt_to_line_signed_distance';

/**
 * 两直线段求交
 */
class LineLineIntersect {

    /**
     * 求两直线段的交点,若直线重合，则返回某一个交点+重合段
     * > 此接口是求两直线段的交点，直线段是有限长的，若求无限长的直线的交点，可将直线extend至无限长
     * @param line1 
     * @param line2 
     */
    public static line2dAndLine2d(
        line1: Line2d,
        line2: Line2d,
        distanceTol: number = ErrorSystem.LENGTH_EPS,
        angleTol: number = ErrorSystem.ANGLE_EPS,
        overlapTol: number = ErrorSystem.LENGTH_EPS): CurveCueveIntersectInfo<Vector2>[] {

        if (line1.isParalellTo(line2, angleTol)) {
            if (Math.abs(PtToLineSignedDistance.ptToLine2d(line1.getMidPt(), line2)) > distanceTol) {
                return [];
            }
            const r1 = Line1ProjectToLine2.execute(line2, line1);
            const r2 = line1.getRange();
            const overlap1 = r1.intersect(r2);
            if (!overlap1) {
                return [];
            }

            const param1 = overlap1.getMid();
            const point = line1.getPtAt(param1);
            const param2 = line2.getParamAt(point);

            // 重合段过短，认为是只有一个交点
            if (!(overlap1.getLength() > overlapTol)) {
                return [{
                    point,
                    param1,
                    param2,
                    isOverlap: false
                }];
            }

            const overlap2 = Line1ProjectToLine2.execute(line1, line2).intersect(line2.getRange())!;
            DebugWarn.assert(overlap2 && overlap2.getLength() > overlapTol);

            return [{
                point,
                param1,
                param2,
                isOverlap: true,
                overlap1,
                overlap2
            }];

        } else {// 求交
            const d1 = line1.getDirection();
            const d2 = line2.getDirection();

            const A = [
                [d1.x, -d2.x],
                [d1.y, -d2.y]
            ];
            const p12: Vector2 = line2.getOrigin().sub(line1.getOrigin());
            const b = [p12.x, p12.y];

            // Ax = b
            const x = numeric.solve(A, b);
            if (!line1.getRange().containsPoint(x[0], overlapTol) ||
                !line2.getRange().containsPoint(x[1], overlapTol)) {
                return [];
            }

            const p1 = line1.getPtAt(x[0]);
            // const p2 = line1.getPtAt(x[1]);

            return [{
                point: p1,
                param1: x[0],
                param2: x[1],
                isOverlap: false
            }];
        }
    }
}

export { LineLineIntersect };
