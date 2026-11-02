import { RenderObject } from '../algorithm/discrete/render_object';
import { Box2 } from '../math/box2';
import { Box3 } from '../math/box3';
import { Matrix3 } from '../math/matrix3';
import { Matrix4 } from '../math/matrix4';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { GeometryType } from '../geometry/geometry_type';
import { MathType } from '../math/math_type';

/**
 * @author tiansk
 *  所有几何对象的基类
 */
abstract class Geomtry {

    protected static idGenerator: number = 100;
    public readonly refId: number;

    constructor() {
        this.refId = Geomtry.idGenerator++;
    }

    // 可以绑定用户的信息
    public userData: any;

    public setUserData(key: string, value: any) {
        if (!this.userData) {
            this.userData = {};
        }
        this.userData[key] = value;
    }

    /**
     * 
     *  几何对象的类型
     */
    public abstract getType(): GeometryType;

    /**
     * 
     *  计算包围盒
     */
    public abstract getBoundingBox(): Box2 | Box3;

    /**
     * 
     *  平移
     */
    public translate(offset: Vector2 | Vector3): this {
        let m;
        if (offset.getType() === MathType.enVector2D) {
            m = new Matrix3().applyTranslate(offset);
        } else {
            m = new Matrix4().applyTranslate(offset as Vector3);
        }
        return this.applyTransform(m);
    }

    /**
     *  绕坐标轴/点的旋转
     * @param angle 旋转的角度
     * @param pivot 绕哪个点旋转
     * @param axis  绕哪个轴旋转
     */
    public rotate(angle: number, pivot: Vector2 | Vector3, axis?: Vector3): this {
        let m;
        if (pivot.getType() === MathType.enVector2D) {
            m = new Matrix3()
                .applyRotate(pivot, angle);
        } else {
            if (!axis) {
                throw new Error('不能确定旋转轴');
            }
            m = new Matrix4()
                .applyRotate(pivot as Vector3, axis, angle);
        }
        return this.applyTransform(m);
    }

    /**
     *  缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center?: Vector2 | Vector3): this {
        let m;
        if (center instanceof Vector2) {
            m = new Matrix3().applyScale(center, factor);
        } else if (center instanceof Vector3) {
            m = new Matrix4().applyScale(center, factor);
        } else {
            throw new Error('必须传center');
        }
        return this.applyTransform(m);
    }

    /**
     *  乘上一个变换矩阵
     */
    public abstract applyTransform(m: Matrix3 | Matrix4): this;

    /**
     *  离散为可渲染的对象
     * @returns 返回js对象
     */
    public abstract toRenderObject(showDebugInfo: boolean): RenderObject;

    /**
     *  抽取元数据，用于序列化
     * @returns 返回js对象
     */
    public abstract toMetaData(): any;

    /**
     *  深拷贝
     */
    public abstract clone(): Geomtry;

    // -----以下为非抽象方法-------------

    /**
     *  序列化为字符串，调试用
     */
    public asString(): string {
        const obj = this.toMetaData();
        return JSON.stringify(obj);
    }
}

export { Geomtry };
