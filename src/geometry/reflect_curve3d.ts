import { Curve3d } from './curve3d';
import { GeometryType } from '../geometry/geometry_type';
import { Line3d } from './line3d';

/**
 *  反射Curve3d
 */
export class ReflectCurve3d {
    public static execute(jsObject: any): Curve3d {
        if (jsObject.type !== GeometryType.enLine3D) {
            console.error(jsObject);
            console.error('不支持的类型');
        }
        return Line3d.loadFromAny(jsObject);
    }
}
