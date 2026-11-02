import { GeometryType } from '../geometry/geometry_type';
import { Plane } from './plane';
import { Surface } from './surface';
import { Cylinder } from './cylinder';

// 反射Surface
export class ReflectSurface {
    public static execute(jsObject: any): Surface {
        if (jsObject.type === GeometryType.enPlane) {
            return Plane.loadFromAny(jsObject);
        }
        if (jsObject.type === GeometryType.enCylinder) {
            return Cylinder.loadFromAny(jsObject);
        }
        console.error(jsObject);
        console.error('不支持的类型');
        return undefined as any;
    }
}
