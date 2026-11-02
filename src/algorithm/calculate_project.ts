import { Face } from '../geometry/brep/face';
import { Polygon } from '../geometry/brep/polygon';
import { Polyline } from '../geometry/brep/polyline';
import { Line2d } from '../geometry/line2d';
import { Coordinate3 } from '../math/coordinate3';
import { Interval } from '../math/interval';
import { FaceProject } from './project/face_project';
import { FacesProject } from './project/faces_project';
import { Line1ProjectToLine2 } from './project/line_line_project';
import { Curve2d } from '../geometry/curve2d';
import { Vector2 } from '../math/vector2';
import { DebugWarn } from '../util/debug_warn';
import { GeometryType } from '../geometry/geometry_type';
import { Plane } from '../geometry/plane';
import { Curve3d } from '../geometry/curve3d';
import { Line3d } from '../geometry/line3d';

/**
 * 投影算法
 * - face向coordinate投影
 * - faces向coordinate投影
 * - line1向line2投影
 */
class CalculateProjecet {

    /**
     * face沿coordinate z轴向coordinateXOY面投影，投影出的线成环，返回Polygon，否则返回Polyline[]
     */
    public static face(face: Face, coordinate: Coordinate3): Polyline[] | Polygon {
        return FaceProject.execute(face, coordinate);
    }

    /**
     * face沿coordinate z轴向coordinateXOY面投影，投影出的线成环，返回Polygon，否则返回Polyline[]
     */
    public static curve3d(curve: Curve3d, coordinate: Coordinate3): Curve2d | Vector2 {
        DebugWarn.assert(curve.getType() === GeometryType.enLine3D, '只支持直线');

        const plane = new Plane(coordinate);
        const p1 = plane.getUVAt(curve.getStartPt());
        const p2 = plane.getUVAt(curve.getEndPt());
        if (p1.equals(p2)) {
            return p1.add(p2).div(2);
        }

        return new Line2d(p1, p2);
    }

    /**
     * faces沿coordinate z轴向coordinateXOY面投影，投影出的线成环，返回Polygon，否则返回Polyline[]
     */
    public static faces(faces: Face[], coordinate: Coordinate3): (Polyline[] | Polygon)[] {
        return FacesProject.execute(faces, coordinate);
    }

    /**
     * line1向line2投影，返回一个区间，该区间代表投影后的线在line2参数域上的区间
     */
    public static line1ToLine2(line1: Line2d, line2: Line2d): Interval;
    public static line1ToLine2(line1: Line3d, line2: Line3d): Interval;

    public static line1ToLine2(line1: Line2d | Line3d, line2: Line2d | Line3d): Interval {
        return Line1ProjectToLine2.execute(line1, line2);
    }
}

export { CalculateProjecet };
