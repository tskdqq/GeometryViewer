import { ErrorSystem } from '../math/error_system';
import { Curve3d } from '../geometry/curve3d';
import { GeometryType } from '../geometry/geometry_type';
import { Vector3 } from '../math/vector3';

/**
 * 二维曲线的工具函数类
 */
class Curve3dsUtil {

    /**
     * 判断多条三维曲线是否共面
     * @param curves       三维曲线数组
     * @param distanceTol  距离容差
     * @returns 共面返回true，否则返回false
     */
    public static isCoplanar(
        curves: Curve3d[],
        planNor: Vector3,
        distanceTol: number = ErrorSystem.LENGTH_EPS): boolean {

        if (curves.length < 2) {
            return false;
        }

        for (const curve of curves) {
            if (curve.getType() !== GeometryType.enLine3D) {
                throw new Error('三维曲线是否共面函数暂时只支持直线！');
            }
        }

        const baseDir = curves[0].getStartTangent().normalize();
        let normal: Vector3 | undefined;
        for (let index = 1; index < curves.length; index++) {
            if (!normal) {
                // 找出共面平面
                if (baseDir.isParalellTo(curves[index].getStartTangent())) {
                    continue;
                } else {
                    normal = baseDir.cross(curves[index].getStartTangent());
                }
            } else {
                // 已找出共面平面，判断剩余直线是否在共面平面内
                if (!normal.isPerpendicularTo(curves[index].getStartTangent())) {
                    return false;
                }
            }
        }

        if (!normal) {
            return false; // 所有线全共线
        }

        planNor.x = (normal as Vector3).x;
        planNor.y = (normal as Vector3).y;
        planNor.z = (normal as Vector3).z;
        return true;
    }
}

export { Curve3dsUtil };
