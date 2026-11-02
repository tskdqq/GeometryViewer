import { Line2d } from '../../geometry/line2d';
import { Arc2d } from '../../geometry/arc2d';
import { Vector2 } from '../../math/vector2';
import { CurveCueveIntersectInfo } from './curve_cueve_intersect_info';
import { CalculatDistance } from '../../algorithm';
import { ErrorSystem } from '../../math/error_system';

/**
 * 求直线段和弧线段相交
 */
class LineArcIntersect {

    public static line2dAndArc2d(line1: Line2d, line2: Arc2d,
                                 tolerance: number = ErrorSystem.LENGTH_EPS): CurveCueveIntersectInfo<Vector2>[]  {
        const result: CurveCueveIntersectInfo<Vector2>[] = [];
        // 1.先判断圆心到直线的最近距离
        const footPoint = new Vector2();
        const center = line2.getCenter();
        const distance = CalculatDistance.ptToCurve(center, line1, false, footPoint);
        if (distance > line2.radius) {  // 最近距离都大于弧线半径的一定没交点
            return [];

        } else if (distance === line2.radius) { // 最近距离等于圆弧的，相当于跟圆弧相切，判断切点是否在圆弧上
            if (line2.containsPoint(footPoint)) {
                result.push({point: footPoint,
                             param1: line1.getParamAt(footPoint),
                             param2: line2.getParamAt(footPoint),
                             isOverlap: false});
            } else {
                return [];
            }
        } else { // 最近距离小于圆弧的， 判断是否起始点都小于圆弧半径
            const line1Start = line1.getStartPt().sub(center).getLength();
            const line1End = line1.getEndPt().sub(center).getLength();
            if (line2.radius > line1Start && line2.radius > line1End) { // 起始点距离都小于弧半径，一定不相交
                return [];
            }

            // 计算交点，判断交点是否在弧和线段上
            const intersects = this.computeLineArcIntersects(line1.getDirection(), line1.getOrigin(), center, line2.radius);
            intersects.forEach(point => {
                if (line1.containsPoint(point) && line2.containsPoint(point)) {
                    result.push({point: point,
                                 param1: line1.getParamAt(point),
                                 param2: line2.getParamAt(point),
                                 isOverlap: false});
                }
            });
        }
        return result;
    }


    public static computeLineArcIntersects(dir: Vector2, origin: Vector2, center: Vector2, radius: number): Vector2[] {
        let k = 0;
        if (dir.y !== 0) {
            k = dir.y / dir.x;
        }
        const b = origin.y - origin.x * k;
        const ax = 1 + k * k;
        const bx = 2 * k * (b - center.y) - 2 * center.x;
        const cx = center.x * center.x + (b - center.y) * (b - center.y) - radius * radius;
        const d = Math.pow(b, 2) - 4 * ax * cx;
        const intersects = [];
        if (d > 0) {
            const x1 = (-bx + Math.sqrt(d)) / (2 * ax);
            const y1 = k * x1 + b;
            intersects.push(new Vector2(x1, y1));
            const x2 = (-bx - Math.sqrt(d)) / (2 * ax);
            const y2 = k * x2 + b;
            intersects.push(new Vector2(x2, y2));

        } else if (d === 0) {
            const x1 = -bx / (2 * ax);
            const y1 = k * x1 + b;
            intersects.push(new Vector2(x1, y1));
        }
        return intersects;
    }
}

export { LineArcIntersect };
