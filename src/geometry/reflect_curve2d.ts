import { Curve2d } from './curve2d';
import { Curve3d } from './curve3d';
import { GeometryType } from '../geometry/geometry_type';
import { Line2d } from './line2d';
import { Line3d } from './line3d';
import { Plane } from './plane';
import { Surface } from './surface';
import { Arc2d } from './arc2d';
import { Arc3d } from './arc3d';

/**
 * 将字符串反射为几何
 */
export class ReflectCurve2d {
    // 反射Curve2d
    public static loadCurve2dFromAny(jsObject: any): Curve2d {
        if (jsObject.type === GeometryType.enLine2D) {
            return Line2d.loadFromAny(jsObject);
        } else if (jsObject.type === GeometryType.enArc2D) {
            return Arc2d.loadFromAny(jsObject);
        }

        throw new Error('不支持的类型');
    }

    // 反射Curve3d
    public static reflectCurve3d(jsObject: any): Curve3d {
        if (jsObject.type === GeometryType.enLine2D) {
            return Line3d.loadFromAny(jsObject);
        } else if (jsObject.type === GeometryType.enArc2D) {
            return Arc3d.loadFromAny(jsObject);
        }

        throw new Error('不支持的类型');
    }

    // 反射Surface
    public static reflectSurfaceFromAny(jsObject: any): Surface {
        if (jsObject.type !== GeometryType.enPlane) {
            console.error(jsObject);
            console.error('不支持的类型');
        }
        return Plane.loadFromAny(jsObject);
    }
}
