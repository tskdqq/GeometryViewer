import { Box2 } from '../math/box2';
import { Matrix3 } from '../math/matrix3';
import { Matrix4 } from '../math/matrix4';
import { Vector2 } from '../math/vector2';
import { XY } from '../math/xy';
import { Curve } from './curve';

/**
 *  二维曲线的基类，所有二维曲线都是参数曲线，且是弧长参数化曲线
 */
abstract class Curve2d extends Curve<Vector2> {

    /**
     *  曲线按给定距离进行偏移
     * @param distance 等距量：>0 = 右侧；<0 = 左侧
     * @returns 是否等距成功：true = 是；false = 否
     */
    public abstract offset(distance: number): boolean;


    /**
     *  获取某参数对应的点
     */
    public abstract getParamAt(point: XY): number;

    /**
     *  计算包围盒
     */
    public abstract getBoundingBox(): Box2;

    // 构造直线两端点和坐标轴圆心点构成的三角形的重心点坐标和面积
    public abstract getCentroidPoint(): { pt: Vector2; area: number };

    /**
     *  平移
     */
    public translate(offset: Vector2): this {
        return super.translate(offset);
    }

    /**
     * 
     *  绕坐标轴/点的旋转
     * @param angle 旋转的角度
     * @param pivot 绕哪个点旋转
     */
    public rotate(angle: number, pivot: Vector2): this {
        return super.rotate(angle, pivot);
    }

    /**
     *  缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector2 = Vector2.zero()): this {
        return super.scale(factor, center);
    }

    /**
     *  乘上一个变换矩阵
     */
    public abstract applyTransform(m: Matrix3 | Matrix4): this;


    public abstract clone(): Curve2d;
}

export { Curve2d };

