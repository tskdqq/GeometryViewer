import { Line2d } from '../../geometry/line2d';
import { ErrorSystem } from '../../math/error_system';
import { Vector2 } from '../../math/vector2';
import { XY } from '../../math/xy';
import { DebugWarn } from '../../util/debug_warn';
import { CalculatDistance } from '../calculate_distance';

/**
 * 搜索点的凸包,返回凸包上的点，外部可直接封装成loop
 */
class SearchConvexHull {
    public static execute(points: XY[]): Vector2[] {
        DebugWarn.assert(points.length > 2);
        // 1.找到Y方向最小值
        let p0Idx = 0;
        for (let i = 1; i < points.length; i++) {
            const xy = points[i];
            if (xy.y < points[p0Idx].y) {
                p0Idx = i;
            }
        }

        const p0 = new Vector2(points[p0Idx]);

        const angleAndVecArr = [];
        // 2.计算角度
        for (let i = 0; i < points.length; i++) {
            if (p0Idx === i) {
                continue;
            }
            const vec = new Vector2(points[i]).sub(p0);
            angleAndVecArr.push({
                angle: vec.angleFromX(),
                vec: new Vector2(points[i])
            });
        }

        angleAndVecArr.sort((a, b) => {
            return a.angle - b.angle;
        });

        const andidates: Vector2[] = [];
        angleAndVecArr.forEach(ang => {
            try {
                andidates.push(ang.vec);
            } catch (error) {
                console.warn(error);
            }
        });

        const result = [new Vector2(points[p0Idx]), new Vector2(andidates[0])];
        andidates.splice(0, 1);

        // 
        for (const pt of andidates) {
            let addPoint = false;
            while (true) {
                DebugWarn.assert(points.length >= 2);
                const line = new Line2d(result[result.length - 2], result[result.length - 1]);
                const distance = CalculatDistance.ptToCurveSignedDistance(pt, line);
                if (Math.abs(distance) < ErrorSystem.LENGTH_EPS) {
                    if (!line.containsPoint(pt)) {
                        addPoint = true;
                    }
                    break;
                }
                if (distance < 0) {
                    addPoint = true;
                    break;
                }
                result.pop();
            }
            if (addPoint) {
                result.push(pt);
            }
        }

        return result;
    }

}

export { SearchConvexHull };
