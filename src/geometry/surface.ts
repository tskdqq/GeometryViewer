import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { XY, XYZ } from '../math/xy';
import { Geomtry } from './geometry';
import { Matrix4 } from '../math/matrix4';
import { Curve2d } from './curve2d';
import { Curve3d } from './curve3d';

/**
 * 曲面基类
 */
abstract class Surface extends Geomtry {
    /**
     * 获取uv处的三维点
     * @param uv 
     */
    public abstract getPtAt(uv: XY): Vector3;

    /**
     * 获取三维点处的uv值，（反求参数）
     * @param pt 
     */
    public abstract getUVAt(pt: XYZ): Vector2;

    /**
     *  获取uv处的法矢
     * @param uv 
     */
    public abstract getNormAt(uv: XY): Vector3;

    /**
     * 平移
     * @param offset 平移量
     */
    public translate(offset: Vector3): this {
        return super.translate(offset);
    }

    /**
     * 旋转
     * @param angle 旋转角度
     * @param pivot 旋转轴上的一个点
     * @param axis 旋转轴方向
     */
    public rotate(angle: number, pivot: Vector3, axis: Vector3): this {
        return super.rotate(angle, pivot, axis);
    }

    /**
     * 几何变换
     * @param m 
     */
    public abstract applyTransform(m: Matrix4): this;

    /**
     *  反向
     */
    public abstract reverse(): this;

    /**
     *  克隆
     */
    public abstract clone(): Surface;

    /**
     * 点到曲面的垂足
     */
    public getProjectedPtBy(point: XYZ) {
        const p = this.getUVAt(point);
        return this.getPtAt(p);
    }

    /**
     * 将三维曲线，转成参数域中的二维曲线
     * @param curve 
     */
    public abstract getCurve2d(curveOnSurface: Curve3d): Curve2d | undefined;

    /**
     * 将参数域中的二维曲线转成三维曲线
     * @param curve 
     */
    public abstract getCurve3d(curve: Curve2d): Curve3d;
}

export { Surface };
