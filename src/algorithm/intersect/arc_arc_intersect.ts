import { Arc2d } from '../../geometry/arc2d';
import { ErrorSystem } from '../../math/error_system';
import { Vector2 } from '../../math/vector2';
import { CurveCueveIntersectInfo } from './curve_cueve_intersect_info';
import { LineArcIntersect } from './line_arc_intersect';
import { Interval } from '../../math/interval';
import { MathUtil } from '../../util/math_util';

/**
 * 两条弧线相交
 */
class ArcArcIntersect {

    /**
     * 求两个弧线段的相交，弱弧线重合，返回某一个交点+重合段
     */
    public static Arc2dAndArc2d(
        arc1: Arc2d,
        arc2: Arc2d,
        tolerance: number = ErrorSystem.LENGTH_EPS): CurveCueveIntersectInfo<Vector2>[] {
        // 1.判断两个圆心之间距离
        const center1 = arc1.getCenter();
        const center2 = arc2.getCenter();
        const centerVector = center1.clone().sub(center2);
        const distance = centerVector.getLength();
        const result: CurveCueveIntersectInfo<Vector2>[] = [];

        if (distance > (arc1.radius + arc2.radius)) {
            return [];
        }
        // 2.包围盒判断
        const box1 = arc1.getBoundingBox();
        const box2 = arc2.getBoundingBox();
        if (!box1.intersectsBox(box2, tolerance)) {
            return [];
        }
        // 3.判断是否在同一个圆上，是否有重叠
        if (Math.abs(arc1.radius - arc2.radius) < ErrorSystem.DELTA_EPS && distance < ErrorSystem.DELTA_EPS) { // 如果在同一个圆上
            const angle1Range = arc1.getAngleRange();
            const angle2Range = arc2.getAngleRange();
            const range1s = this.getRealRange(angle1Range);
            const range2s = this.getRealRange(angle2Range);
            let intersectRanges = [];
            for (const range1 of range1s) {
                for (const range2 of range2s) {
                    const intersectRange = range1.intersect(range2);
                    if (intersectRange) {
                        intersectRanges.push(intersectRange);
                    }
                }
            }
            if (intersectRanges.length === 0) {
                return [];
            }
            intersectRanges = this.getMergedRange(intersectRanges);
            for (const range of intersectRanges) {
                const point1 = arc1.getPtAtAngle(range.min);
                const point2 = arc1.getPtAtAngle(range.max);
                result.push({
                    point: point1,
                    param1: arc1.getParamAt(point1),
                    param2: arc2.getParamAt(point1),
                    isOverlap: true,
                    overlap1: range,
                    overlap2: new Interval(arc2.getParamAt(point1), arc2.getParamAt(point2))
                });
            }
            return result;
        } else if (Math.abs(arc1.radius - arc2.radius) < ErrorSystem.DELTA_EPS) { // 如果在同心圆上，半径不等，则永不相交
            return [];

        } else { // 如果不在同一个圆上，求两个圆交点，本质上是求与两个圆心相连的直线相垂直的直线与圆弧的交点
            // 先求该直线
            const dir = new Vector2(-centerVector.y, centerVector.x).normalize();
            const c = arc1.radius * arc1.radius - arc2.radius * arc2.radius - center1.getSqLength() + center2.getSqLength();
            const origin = new Vector2();

            if (Math.abs(center1.x - center2.x) < ErrorSystem.DELTA_EPS) {
                origin.x = 0;
                origin.y = c * 0.5 / (center2.y - center1.y);
            } else {
                origin.y = 0;
                origin.x = c * 0.5 / (center2.x - center1.x);
            }
            const intersects = LineArcIntersect.computeLineArcIntersects(dir, origin, center1, arc1.radius);
            // 判断交点是否在两条弧上
            intersects.forEach(point => {
                if (arc1.containsPoint(point) && arc2.containsPoint(point)) {
                    result.push({
                        point: point,
                        param1: arc1.getParamAt(point),
                        param2: arc2.getParamAt(point),
                        isOverlap: false
                    });
                }
            });

        }

        return result;
    }

    private static getRealRange(range: Interval) {
        if (range.max > MathUtil.PI2) {
            return [new Interval(range.min, MathUtil.PI2), new Interval(0, range.max - MathUtil.PI2)];
        }
        return [range];
    }

    private static getMergedRange(ranges: Interval[]) {
        let maxRange;
        let minRange;
        const resultRanges = [];
        for (const range of ranges) {
            if (Math.abs(range.max - MathUtil.PI2) < ErrorSystem.DELTA_EPS) {
                maxRange = range;
            } else if (Math.abs(range.min) < ErrorSystem.DELTA_EPS) {
                minRange = range;
            } else {
                resultRanges.push(range);
            }
        }
        if (maxRange !== undefined && minRange !== undefined) {
            resultRanges.push(new Interval(maxRange.min, minRange.max + MathUtil.PI2));
        } else if (maxRange !== undefined) {
            resultRanges.push(maxRange);
        } else if (minRange !== undefined) {
            resultRanges.push(minRange);
        }
        return resultRanges;
    }
}

export { ArcArcIntersect };
