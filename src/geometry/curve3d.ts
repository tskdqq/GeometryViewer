import { Box3 } from '../math/box3';
import { Matrix4 } from '../math/matrix4';
import { Vector3 } from '../math/vector3';
import { Curve } from './curve';
import { XYZ } from '../math/xy';

/**
 * 三维参数曲线
 */
abstract class Curve3d extends Curve<Vector3> {

    /**
     *  获取某参数对应的点
     */
    public abstract getParamAt(point: XYZ | Vector3): number;
    /**
     *  计算包围盒
     */
    public abstract getBoundingBox(): Box3;

    /**
     *  平移
     */
    public translate(offset: Vector3): this {
        return super.translate(offset);
    }

    /**
     *  绕坐标轴/点的旋转
     * @param angle 旋转的角度
     * @param pivot 绕哪个点旋转
     */
    public rotate(angle: number, pivot: Vector3, axis: Vector3): this {
        return super.rotate(angle, pivot, axis);
    }


    /**
     *  缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector3 = Vector3.zero()): this {
        return super.scale(factor, center);
    }

    /**
     *  乘上一个变换矩阵
     */
    public abstract applyTransform(m: Matrix4): this;

    /**
     *  深拷贝
     */
    public abstract clone(): Curve3d;
}

export { Curve3d };
