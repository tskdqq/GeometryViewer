import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { BrepBody } from './brep/brep_body';
import { Coedge } from './brep/coedge';
import { Face } from './brep/face';
import { Loop } from './brep/loop';
import { Polygon } from './brep/polygon';
import { Polyline } from './brep/polyline';
import { Geomtry } from './geometry';
import { GeometryType } from '../geometry/geometry_type';
import { Line2d } from './line2d';
import { Line3d } from './line3d';
import { Plane } from './plane';
import { Shell } from './brep/shell';
import { Arc3d } from './arc3d';
import { Arc2d } from './arc2d';
import { Cylinder } from './cylinder';

/**
 * 将字符串反射为几何
 */
class ReflectUtil {

    /**
     *  将字符串反序列化为几何，调试用
     * @returns 返回几何元素或点
     */
    public static reflect(metaString: string): (Geomtry | Vector2 | Vector3)[] {

        const result = [];

        const strs: string[] = metaString.split('\n');
        for (let s of strs) {
            s = s.trim();
            if (s.length < 10) {
                continue;
            }

            // 反射出几何对象
            try {
                const jsObj = JSON.parse(s);
                const geo = ReflectUtil.loadFromAny(jsObj);
                result.push(geo);
            } catch (error) {
                console.error(error);
            }
        }

        return result;
    }


    /**
     *  根据元数据对象构造几何对象
     * @returns 返回几何元素
     */
    public static loadFromAny(jsObj: any): Geomtry | Vector2 | Vector3 {
        switch (jsObj.type) {
            // 点
            case GeometryType.enPoint2D:
                return new Vector2(jsObj.x, jsObj.y);
            case GeometryType.enPoint3D:
                return new Vector3(jsObj.x, jsObj.y, jsObj.z);

            // 二维曲线
            case GeometryType.enLine2D:
                return Line2d.loadFromAny(jsObj);

            // 二维曲线
            case GeometryType.enArc2D:
                return Arc2d.loadFromAny(jsObj);

            // 三维曲线
            case GeometryType.enLine3D:
                return Line3d.loadFromAny(jsObj);

            // 三维曲线
            case GeometryType.enArc3D:
                return Arc3d.loadFromAny(jsObj);

            // 拓扑
            case GeometryType.enPolygon:
                return Polygon.loadFromAny(jsObj);

            case GeometryType.enLoop:
                return Loop.loadFromAny(jsObj);

            case GeometryType.enPolyline:
                return Polyline.loadFromAny(jsObj);

            case GeometryType.enCoedge:
                return Coedge.loadFromAny(jsObj);

            case GeometryType.enEdge:
                return Coedge.loadFromAny(jsObj);

            // face
            case GeometryType.enFace:
                return Face.loadFromAny(jsObj);

            // plane
            case GeometryType.enPlane:
                return Plane.loadFromAny(jsObj);

            // Cylinder
            case GeometryType.enCylinder:
                return Cylinder.loadFromAny(jsObj);

            // body
            case GeometryType.enShell:
                return Shell.loadFromAny(jsObj);

            // body
            case GeometryType.enBrepBody:
                return BrepBody.loadFromAny(jsObj);
        }
        throw new Error('不支持的类型');
    }
}

export { ReflectUtil };
