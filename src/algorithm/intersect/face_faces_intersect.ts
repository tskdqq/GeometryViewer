import { Face } from '../../geometry/brep/face';
import { Loop } from '../../geometry/brep/loop';
import { Polyline } from '../../geometry/brep/polyline';
import { Line3d } from '../../geometry/line3d';
import { Plane } from '../../geometry/plane';
import { DebugWarn } from '../../util/debug_warn';
import { CalculateIntersect } from '../calculate_intersect';
import { SearchPolyline } from '../search_graph/search_polyline';
import { GeometryType } from '../../geometry/geometry_type';
import { Line2d } from '../../geometry/line2d';

/**
 * Face 与 多个Face分别求交，然后将交线封装成Polyline[]
 */
class FaceFacesIntersect {

    /**
     * Face 与 多个Face分别求交，然后将交线封装成Polyline[]
     * @param face1 
     * @param faces 
     * @returns 返回Loop的数组
     */
    public static execute(face: Face, faces: Face[]): (Polyline | Loop)[] {
        DebugWarn.assert(face.getSurface().getType() === GeometryType.enPlane, 'just suport plane type');
        const plane = face.getSurface() as Plane;
        const curve2ds: Line2d[] = [];
        for (const f of faces) {
            const intcurves = CalculateIntersect.faceFace(face, f);
            if (intcurves.length < 1) {
                continue;
            }
            intcurves.forEach((cur3d) => {
                DebugWarn.assert(cur3d.getType() === GeometryType.enLine3D, 'just suport line3d type');
                const cv2 = plane.getLine2D(cur3d as Line3d);
                if (cv2) { curve2ds.push(cv2); }
            });
        }

        // 搜环
        const loops = SearchPolyline.execute(curve2ds);

        return loops;
    }
}

export { FaceFacesIntersect };
