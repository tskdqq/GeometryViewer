import { Face } from '../../geometry/brep/face';
import { DebugWarn } from '../../util/debug_warn';
import { GeometryType } from '../../geometry/geometry_type';


class FaceOffset {

    /**
     *  face的偏移，正值沿法向向外偏，负值向里偏
     * @param face           待偏移的面
     * @param offsetValue    偏移值
     */
    public static execute(face: Face, offsetValue: number): boolean {
        if (!face) {
            DebugWarn.assert(false, '传入的face为空 !');
            return false;
        }

        if (face.getSurface().getType() !== GeometryType.enPlane) {
            DebugWarn.assert(false, 'Face 偏移仅支持平面 !');
            return false;
        }

        face.translate(face.getCenterNorm().normalize().multi(offsetValue));

        return true;
    }
}

export { FaceOffset };
