import { Line2d } from '../../geometry/line2d';
import { Line3d } from '../../geometry/line3d';
import { Vector2 } from '../../math/vector2';
import { Vector3 } from '../../math/vector3';
import { MathUtil } from '../../util/math_util';

/**
 * 点到直线的有向距离
 */
class PtToLineSignedDistance {

    /**
     * 点到二维直线的有向距离，（直线无限长）
     * 点在直线右侧距离为正，否则为负
     * @param point 任一点
     * @param line  直线
     * @param footPoint [out] 输出参数(可选)，若用户想要获取垂足点，则传入该参数
     */
    public static ptToLine2d(point: Vector2, line: Line2d, footPoint?: Vector2): number {
        const dir: Vector2 = line.getDirection();
        dir.rotate(-MathUtil.PI_2);

        const A = point.clone();

        const B = line.getPtAt(0);
        const BA = A.clone().sub(B);

        const d = BA.dot(dir);

        if (footPoint !== undefined) {
            A.sub(dir.clone().multi(d));
            [footPoint.x, footPoint.y] = [A.x, A.y];
        }
        return d;
    }

    /**
     * 点到三维直线的有向距离，（直线无限长）
     * 点在直线右侧距离为正，否则为负
     * @param point 
     * @param line 
     * @param footPoint 
     */
    public static ptToLine3d(p: Vector3, line: Line3d, footPoint?: Vector3): number {
        const oX = line.getDirection();
        const a = line.getPtAt(0);
        const pA = a.sub(p);

        if (oX.isParalellTo(pA)) {
            if (footPoint) {
                footPoint.copy(p);
            }
            return 0;
        }

        const oZ = oX.cross(pA);
        oZ.normlize();

        const oY = oZ.cross(oX);

        const d = pA.dot(oY);

        if (footPoint) {
            const fp = oY.clone().multi(d).add(p);
            footPoint.copy(fp);
        }

        return d;
    }

}

export { PtToLineSignedDistance };

