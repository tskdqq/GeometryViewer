import { DebugWarn } from '../../util/debug_warn';
import { Face } from '../../geometry/brep/face';
import { GeometryType } from '../../geometry/geometry_type';
import { Plane } from '../../geometry/plane';
import { BoolOperate2d } from '../bool_operate_2d';
import { CalculateProjecet } from '../calculate_project';
import { Polygon } from '../../geometry/brep/polygon';
import { ErrorSystem } from '../../math/error_system';

export class BoolBodyTopologyTrackMap {

    /**
     * 布尔运算拓扑追踪
     * @param sourceBodies
     * @param resultBodies
     * @param faceToFaces 
     */
    public static execute(sourceFaces: Face[], resultFaces: Face[], faceToFaces: Map<string, string[]>): boolean {
        faceToFaces.clear();

        resultFaces.forEach(resultFace => {
                const sourceFaceTags: string[] = [];
                sourceFaces.forEach(sourceFace => {
                        if (this.isTwoFacesCoincidence(resultFace, sourceFace)) { //  有重合部分 
                            sourceFaceTags.push(sourceFace.tag);
                        }
                    });

                DebugWarn.warn(sourceFaceTags.length > 0, '当前结果面未找到来源面，结果面为： \n\n' + resultFace.asString());
                if (sourceFaceTags.length > 0) {
                    faceToFaces.set(resultFace.tag, sourceFaceTags);
                }
            });

        return true;
    }

    public static isTwoFacesCoincidence(firstFace: Face, secondFace: Face): boolean {
        if (!firstFace || !secondFace || !firstFace.getBoundingBox().intersectsBox(secondFace.getBoundingBox(), ErrorSystem.LENGTH_EPS)) {
            return false;
        }

        DebugWarn.assert(firstFace.getSurface().getType() === GeometryType.enPlane && secondFace.getSurface().getType() === GeometryType.enPlane, '布尔运算的拓扑追踪只支持平面！');

        const firstPlane = firstFace.getSurface() as Plane;
        const secondPlane = secondFace.getSurface() as Plane;
        if (firstPlane.isCoplanar(secondPlane)
            && (firstFace.getCenterNorm().normalize().equals(secondFace.getCenterNorm().normalize()))) {

            if (firstFace.getPolygon().calcArea() < 0.01 || secondFace.getPolygon().calcArea() < 0.01) {
                return false;
            }

            let proPolygon: Polygon | undefined;
            try {
                proPolygon = CalculateProjecet.face(firstFace, secondPlane.toCoordinate()) as Polygon;
            } catch (error) {
                DebugWarn.warn(false, '面向坐标系投影失败 \n\n' + firstFace.asString());
            }
            if (proPolygon) {

                // console.log(BoolOperate2d.intersect([proPolygon, secondFace.getPolygon()]).getAllCurves().length);
                // LogUtil.d(BoolOperate2d.intersect([proPolygon, secondFace.getPolygon()]).getAllCurves());

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
}
