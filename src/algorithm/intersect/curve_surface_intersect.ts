import { Curve3d } from '../../geometry/curve3d';
import { Line3d } from '../../geometry/line3d';
import { Plane } from '../../geometry/plane';
import { Surface } from '../../geometry/surface';
import { Vector3 } from '../../math/vector3';
import { MathUtil } from '../../util/math_util';
import { GeometryType } from '../../geometry/geometry_type';

/**
 * 三维曲线与曲面的交点, 交点可能不止一个，故返回交点的数组
 * @returns 
 */
class CurveSurfaceIntersect {

    /**
     * 三维曲线与曲面的交点,
     * @param curve  曲线
     * @param surface 曲面
     * @returns 交点可能不止一个，故返回交点的数组
     */
    public static execute(
        curve: Curve3d,
        surface: Surface): Vector3[] {

        if (curve.getType() === GeometryType.enLine3D && surface.getType() === GeometryType.enPlane) {
            const line = curve as Line3d;
            const plane = surface as Plane;

            const dir = line.getDirection();

            if (MathUtil.isNearlyZero(dir.dot(plane.getNorm()))) {
                return [];
            }

            const OP = plane.getOrigin().sub(line.getOrigin());

            const t = OP.dot(plane.getNorm()) / (dir.dot(plane.getNorm()));

            const p = line.getPtAt(t);
            return [p];
        }

        throw new Error('不支持的类型');
    }
}

export { CurveSurfaceIntersect };

