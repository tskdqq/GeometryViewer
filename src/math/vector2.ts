import { RenderObject } from '../algorithm/discrete/render_object';
import { GeometryType } from '../geometry/geometry_type';
import { MathUtil } from '../util/math_util';
import { ErrorSystem } from './error_system';
import { Matrix3 } from './matrix3';
import { Vector } from './vector';
import { Vector3 } from './vector3';
import { XY } from './xy';
import { Matrix4 } from './matrix4';
import { MathType } from './math_type';

/**
 *  既是向量，也是点
 */
class Vector2 extends Vector {

    set x(x: number) { this._data[0] = x; }
    get x() { return this._data[0]; }

    set y(y: number) { this._data[1] = y; }
    get y() { return this._data[1]; }

    /**
     *  定义常量
     */
    public static zero() { return new Vector2(0, 0); }
    public static unitX() { return new Vector2(1, 0); }
    public static unitY() { return new Vector2(0, 1); }

    /**
     * 空的构造方法，默认都是0
     * @param x 
     * @param y 
     */
    constructor();

    /**
     * 根据x值与y值构造
     * @param x 
     * @param y 
     */
    constructor(x: number, y: number);

    /**
     * 根据XY接口(xy都是小写)来构造
     */
    constructor(xy: XY);

    /**
     * 根据XY接口(XY都是大写)来构造
     */
    constructor(xy: { X: number; Y: number });

    /**
     * 两点构造一个向量
     * @param pointA 
     * @param pointB 
     */
    constructor(pointA: XY, pointB: XY);

    /**
     * 根据数组构造，默认取数组的前2个元素
     */
    constructor(xy: number[]);

    constructor(a?: any, b?: any) {
        super();

        if (typeof (a) === 'number' && typeof (b) === 'number') {
            // 两点构造
            this._data.push(a, b);
            return;
        }

        if (a instanceof Array && a.length > 1 && b === undefined) {
            // 数组构造
            this._data.push(a[0], a[1]);
            return;
        }

        if (typeof (a) === 'object') {
            if (a.x !== undefined && typeof (a.x) === 'number'
                && a.y !== undefined && typeof (a.y) === 'number') {
                if (b === undefined
                    || b.x === undefined || b.y === undefined
                    || typeof (b.x) !== 'number' || typeof (b.y) !== 'number') {
                    // xy接口构造
                    this._data.push(a.x, a.y);
                } else {
                    // 两点构造一个向量
                    this._data.push(b.x - a.x, b.y - a.y);
                }
                return;
            }

            // 根据XY接口(XY都是大写)来构造
            if (a.X !== undefined && typeof (a.X) === 'number' && a.Y !== undefined && typeof (a.Y) === 'number') {
                this._data.push(a.X, a.Y);
                return;
            }
        }
        this.x = 0;
        this.y = 0;
    }

    /**
     * 二维向量的叉乘 a X b = |a|·|b|·sinAB，
     * 该值其实是第三个轴的分量
     * @param another 
     */
    public cross(another: XY): number {
        return this.x * another.y - this.y * another.x;
    }

    /**
     *  与X轴正向的有向夹角，区间[0,2*PI)
     */
    public angleFromX(): number {
        const norm = this.clone().normlize();
        let angle = Math.atan2(norm.y, norm.x);

        if (angle < 0) {
            angle += 2 * Math.PI;
        }

        return angle;
    }
    /**
     *  从anotherVector转到this的有向角，区间[0,2*PI)
     */
    public angleFrom(anotherVector: XY): number {
        return new Vector2(anotherVector).angleTo(this);
    }

    /**
     *  从this转到anotherVector的有向角，区间[0,2*PI)
     */
    public angleTo(anotherVector: XY): number {
        const v1 = this.clone();
        const v2 = new Vector2(anotherVector);
        v1.normlize();
        v2.normlize();

        let dot = v1.dot(v2);
        if (dot > 1) {
            dot = 1;
        }
        if (dot < -1) {
            dot = -1;
        }

        let angle = Math.acos(dot);

        const Y = v1.rotate(MathUtil.PI_2);

        const yd = Y.dot(v2);

        if (!MathUtil.isNearlyZero(yd) && yd < 0) {//
            angle = MathUtil.PI2 - angle;
        }

        return angle;
    }

    /**
     * 点绕点的旋转，（向量的旋转不依赖于旋转轴，可以认为向量只能绕坐标轴原点旋转）
     * 若不传第二个参数则表示当前点绕坐标轴原点的旋转
     * 若传第二个参数，则表示当前点绕某一点的旋转
     * @param angle 弧度制
     */
    public rotate(angle: number, origin: XY = Vector2.zero()): this {
        // 90°的倍数时，特殊处理，提高效率
        const isRotateZero = MathUtil.isNearlyEqual(origin.x, 0) && MathUtil.isNearlyEqual(origin.y, 0);
        const mod = angle % MathUtil.PI2;
        if (isRotateZero && MathUtil.isNearlyZero(mod)) {
            // 旋转0°±360°
            return this;
        } else if (isRotateZero && MathUtil.isNearlyEqual(MathUtil.PI_2, mod)) {
            // 旋转90°±360°
            [this.x, this.y] = [-this.y, this.x];
            return this;
        } else if (isRotateZero && MathUtil.isNearlyEqual(-MathUtil.PI_2, mod)) {
            // 旋转-90°±360°
            [this.x, this.y] = [this.y, -this.x];
            return this;
        } else if (isRotateZero && MathUtil.isNearlyEqual(MathUtil.PI, Math.abs(mod))) {
            // 旋转±180°±360°
            [this.x, this.y] = [-this.x, -this.y];
            return this;
        } else if (isRotateZero && MathUtil.isNearlyEqual(3 * MathUtil.PI_2, mod)) {
            // 旋转270°±360°
            [this.x, this.y] = [this.y, -this.x];
            return this;
        } else if (isRotateZero && MathUtil.isNearlyEqual(-3 * MathUtil.PI_2, mod)) {
            // 旋转-270°±360°
            [this.x, this.y] = [-this.y, this.x];
            return this;
        } else {
            const matrix3 = new Matrix3().applyRotate(origin, angle);
            return this.applyTransform(matrix3);
        }
    }

    public applyTransform(matrix3: Matrix3 | Matrix4) {
        if (matrix3.getType() === MathType.enMatrix3D) {
            return super.applyTransform(matrix3);
        } else {
            const v2 = new Vector3(this.x, this.y, 0).applyTransform(matrix3 as Matrix4).toVector2();
            this.x = v2.x;
            this.y = v2.y;
            return this;
        }
    }

    /**
     * 向量的变换，向量变换没有平移量
     */
    public vecApplyTransform(matrix3: Matrix3): this {
        return super.vecApplyTransform(matrix3);
    }

    /**
     * 两向量是否平行（同向或反向）
     * @param another 
     * @param tolerance  角度容差
     */
    public isParalellTo(another: XY, tolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        const v1 = this.clone();
        const v2 = new Vector2(another);

        v1.normlize();
        v2.normlize();

        const cross = Math.abs(this.cross(another));

        return cross < tolerance;
    }

    public isParallelTo(another: XY, tolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        console.error('拼写错误，请使用 isParalellTo,该方法近期会清理掉');
        return this.isParalellTo(another, tolerance);
    }

    /**
     * 两向量是否同向(平行且方向相同)
     * @param another 
     * @param tolerance  角度容差
     */
    public isSameDirectionWith(another: XY, tolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        return this.isParalellTo(another, tolerance) && this.dot(another) > 0;
    }

    public clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    public copy(another: XY) {
        return super.copy(another);
    }

    public toMetaData() {
        return {
            type: GeometryType.enPoint2D,
            x: this.x,
            y: this.y
        };
    }

    public toXY(): XY {
        return {
            x: this.x,
            y: this.y
        };
    }

    public discrete(): RenderObject {
        const render = new RenderObject(0, 'Vector2');
        render.geoId = (this as any).refId;
        render.vertices = [Vector3.fromXY(this.clone())];
        render.points = [0];
        return render;
    }

    public getType() {
        return MathType.enVector2D;
    }
}

export { Vector2 };

