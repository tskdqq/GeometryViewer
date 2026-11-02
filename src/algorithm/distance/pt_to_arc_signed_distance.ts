import { Arc2d } from '../../geometry/arc2d';
import { Vector2 } from '../../math/vector2';
import { Vector3 } from '../../math/vector3';
import { Arc3d } from '../../geometry/arc3d';

/**
 * 点到弧线的有向距离
 */
class PtToArcSignedDistance {

    /**
     * 点到二维直弧线的有向距离
     * 点在弧线右侧距离为正，否则为负
     * @param point 任一点
     * @param arc  弧线
     * @param footPoint [out] 输出参数(可选)，若用户想要获取垂足点，则传入该参数
     */
    public static ptToArc2d(point: Vector2, arc: Arc2d, footPoint?: Vector2): number {
        let distance = (arc.getCenter().sub(point)).getLength() - arc.radius;

        if (footPoint !== undefined) {
            const dir = (arc.getCenter().sub(point)).normalize();
            const A = point.clone().add(dir.multi(distance));
            [footPoint.x, footPoint.y] = [A.x, A.y];
        }
        if (!arc.anticlockwise) {
            distance = -distance;
        }
        return distance;
    }

    /**
     * 点到三维弧线的有向距离
     * 点在弧线右侧距离为正，否则为负
     * @param point 
     * @param line 
     * @param footPoint 
     */
    public static ptToArc3d(p: Vector3, arc: Arc3d, footPoint?: Vector3): number {
        // 首先计算该点到此平面的距离
        const normal = arc.getNormal();
        const pA = p.clone().sub(arc.getCenter());
        const normalDistance = normal.dot(pA);

        // 先计算点到平面的垂足pM，然后连接m和center，
        const pM = p.clone().sub(normal.multi(normalDistance));
        const pMVector = arc.getCenter().sub(pM);
        // 如果pM就是圆心，则圆弧上任意一点都是垂足
        let fp;
        if (pMVector.isZero()) {
            fp = arc.getPtAtAngle(0);
        } else {
            const realDistance = pMVector.getLength() - arc.radius;
            fp = pM.clone().sub(pMVector.normalize().multi(realDistance));
        }

        if (footPoint) {
            [footPoint.x, footPoint.y] = [fp.x, fp.y];
        }
        return Math.sign(normalDistance) * (fp.sub(p).getLength());
    }
}

export { PtToArcSignedDistance };
