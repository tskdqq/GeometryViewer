import { DebugWarn } from '../util/debug_warn';
import { Face } from '../geometry/brep/face';
import { GeometryType } from '../geometry/geometry_type';
import { Plane } from '../geometry/plane';
import { CalculateProjecet } from './calculate_project';
import { Polygon } from '../geometry/brep/polygon';
import { BoolOperate2d } from './bool_operate_2d';

/**
 * Face与Face的阴阳角关系
 */
export enum FaceAngleType {
    UNKNOW = -1,
    // 阴角
    CONCAVE = 0,
    // 阳角
    CONVEX = 1,
    // 平
    FLAT
}

export class FaceUtil {

    // 判断两个面是否有重合（部分重合或完全重合），面的方向可以是反向
    public static isTwoFacesCoincidence(firstFace: Face, secondFace: Face): boolean {
        if (!firstFace || !secondFace || !firstFace.getBoundingBox().intersectsBox(secondFace.getBoundingBox())) {
            return false;
        }

        DebugWarn.assert(firstFace.getSurface().getType() === GeometryType.enPlane && secondFace.getSurface().getType() === GeometryType.enPlane, '只支持平面！');

        const firstPlane = firstFace.getSurface() as Plane;
        const secondPlane = secondFace.getSurface() as Plane;
        if (firstPlane.isCoplanar(secondPlane)) {
            const proPolygon = CalculateProjecet.face(firstFace, secondPlane.toCoordinate());
            if (proPolygon instanceof Polygon) {
                if (proPolygon.getBoundingBox().intersectsBox(secondFace.getPolygon().getBoundingBox()) && BoolOperate2d.intersect([proPolygon, secondFace.getPolygon()]).getAllCurves().length > 2) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }

        return false;
    }

    // 判断两个面是阴角还是阳角
    public static judgeConvexOrConcave(firstFace: Face, secondFace: Face): FaceAngleType {
        if (!firstFace || !secondFace) {
            return FaceAngleType.UNKNOW;
        }

        if (firstFace.getSurface().getType() !== GeometryType.enPlane || secondFace.getSurface().getType() !== GeometryType.enPlane) {
            DebugWarn.assert(false, '只支持平面！');
            return FaceAngleType.UNKNOW;
        }

        if (secondFace.getCentroidPoint().sub(firstFace.getCentroidPoint()).dot(firstFace.getCenterNorm()) > 0) {
            return FaceAngleType.CONCAVE;
        } else if (secondFace.getCentroidPoint().sub(firstFace.getCentroidPoint()).dot(firstFace.getCenterNorm()) < 0) {
            return FaceAngleType.CONVEX;
        } else {
            return FaceAngleType.FLAT;
        }
    }
}
