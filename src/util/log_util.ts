import { Geomtry } from '../geometry/geometry';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';

export declare type GeomtryOrVector = (Vector2 | Vector3 | Geomtry);

/**
 * 调试信息工具类
 */
class LogUtil {
    public static showError = true;
    /**
     * 传入几何对象或者几何对象的数组，打印出几何的字符串
     * @param geos 
     * @param prefix 
     * @param postfix 
     */
    public static d(geos: (Geomtry | Vector2 | Vector3)[] | Geomtry, prefix: string = '', postfix: string = '') {
        let s = prefix + '\n';
        s += LogUtil.asString(geos);
        s += '\n' + postfix;
        console.log(s);
    }

    public static e(geos: (Geomtry | Vector2 | Vector3)[] | Geomtry, prefix: string = '', postfix: string = '') {
        let s = prefix + '\n';
        s += LogUtil.asString(geos);
        s += '\n' + postfix;
        console.error(s);
    }

    public static w(geos: (Geomtry | Vector2 | Vector3)[] | Geomtry, prefix: string = '', postfix: string = '') {
        let s = prefix + '\n';
        s += LogUtil.asString(geos);
        s += '\n' + postfix;
        console.warn(s);
    }

    public static asString(geos: (GeomtryOrVector)[] | GeomtryOrVector) {
        let s = '';
        if (geos instanceof Array) {
            geos.forEach(l => {
                s += JSON.stringify(l.toMetaData());
                s += '\n';

            });
        } else {
            s += JSON.stringify(geos.toMetaData());
        }
        return s;
    }
}

export { LogUtil };
