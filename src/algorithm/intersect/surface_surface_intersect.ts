import { Curve3d } from '../../geometry/curve3d';
import { Line3d } from '../../geometry/line3d';
import { Plane } from '../../geometry/plane';
import { Surface } from '../../geometry/surface';
import { DebugWarn } from '../../util/debug_warn';
import { CurveSurfaceIntersect } from './curve_surface_intersect';
import { GeometryType } from '../../geometry/geometry_type';
import { MathUtil } from '../../util/math_util';

/**
 * face 与 face求交，返回值为交线
 */
class SurfaceSurfaceIntersect {

    /**
     * 曲面与曲面相交为交线
     * @param surface 曲面
     * @param surface 曲面
     * @returns 交线可能不止一条，故返回交线的数组
     */
    public static execute(
        surface1: Surface,
        surface2: Surface): Curve3d[] {

        if (surface1.getType() === GeometryType.enPlane && surface2.getType() === GeometryType.enPlane) {
            const plane1 = surface1 as Plane;
            const plane2 = surface2 as Plane;

            if (plane1.getNorm().isParalellTo(plane2.getNorm())) {
                return [];
            }

            // 直线的方向向量
            const resultLineDir = plane1.getNorm().cross(plane2.getNorm());

            // 用于求交的直线方向
            const lineDirToIntersect = resultLineDir.clone().rotate(MathUtil.PI_2, plane1.getNorm());

            // 直线上的点
            const line1 = Line3d.createByOriginAndDir(plane1.getOrigin(), lineDirToIntersect);

            const pts = CurveSurfaceIntersect.execute(line1, plane2);

            DebugWarn.assert(pts.length === 1, 'intersect info error!');


            const result = Line3d.createByOriginAndDir(pts[0], resultLineDir);

            return [result];
        }

        throw new Error('不支持的类型');
    }
}

export { SurfaceSurfaceIntersect };
