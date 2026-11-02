import { RenderObject } from '../algorithm/discrete/render_object';
import { GeometryType } from '../geometry/geometry_type';
import { ErrorSystem } from './error_system';
import { Vector } from './vector';
import { Vector2 } from './vector2';
import { XY, XYZ } from './xy';
import { Matrix4 } from './matrix4';
import { MathUtil } from '../util/math_util';
import { MathType } from './math_type';

/**
 *  既是向量，也是点，
 */
class Vector3 extends Vector {

    /**
     * 根据二维点构造三维点
     * @param xy 
     */
    public static fromXY(xy: XY, z = 0) {
        return new Vector3(xy.x, xy.y, z);
    }

    /**
     *  定义常量
     */
    public static zero(): Vector3 { return new Vector3(0, 0, 0); }
    public static unitX(): Vector3 { return new Vector3(1, 0, 0); }
    public static unitY(): Vector3 { return new Vector3(0, 1, 0); }
    public static unitZ(): Vector3 { return new Vector3(0, 0, 1); }

    set x(x: number) { this._data[0] = x; }
    get x() { return this._data[0]; }

    set y(y: number) { this._data[1] = y; }
    get y() { return this._data[1]; }

    set z(y: number) { this._data[2] = y; }
    get z() { return this._data[2]; }

    /**
     * 返回zero
     */
    constructor();

    /**
     * 根据x值y值z值构造
     * @param x 
     * @param y 
     */
    constructor(x: number, y: number, z: number);

    /**
     * 根据XYZ接口(xyz都是小写)来构造
     */
    constructor(xyz: XYZ);

    /**
     * 根据XYZ接口(XYZ都是大写)来构造
     */
    constructor(xyz: { X: number; Y: number; Z: number });

    /**
     * 两点构造一个向量
     * @param pointA 
     * @param pointB 
     */
    constructor(pointA: XYZ, pointB: XYZ);

    /**
     * 根据数组构造，默认取数组的前3个元素
     */
    constructor(xyz: number[]);

    constructor(a?: any, b?: any, c?: any) {
        super();

        if (typeof (a) === 'number' && typeof (b) === 'number' && typeof (c) === 'number') {
            // 两点构造
            this._data.push(a, b, c);
            return;
        }

        if (a instanceof Array && a.length > 2 && b === undefined && c === undefined) {
            // 数组构造
            this._data.push(a[0], a[1], a[2]);
            return;
        }

        if (typeof (a) === 'object') {
            if (a.x !== undefined && typeof (a.x) === 'number'
                && a.y !== undefined && typeof (a.y) === 'number'
                && a.z !== undefined && typeof (a.z) === 'number'
            ) {
                if (b === undefined
                    || b.x === undefined
                    || b.y === undefined
                    || b.z === undefined
                    || typeof (b.x) !== 'number'
                    || typeof (b.y) !== 'number'
                    || typeof (b.z) !== 'number') {
                    // 根据XYZ接口(xyz都是小写)来构造
                    this._data.push(a.x, a.y, a.z);
                } else {
                    // 两点构造一个向量
                    this._data.push(b.x - a.x, b.y - a.y, b.z - a.z);
                }
                return;
            }

            // 根据XYZ接口(XYZ都是大写)来构造
            if (a.X !== undefined && typeof (a.X) === 'number'
                && a.Y !== undefined && typeof (a.Y) === 'number'
                && a.Z !== undefined && typeof (a.Z) === 'number'
            ) {
                this._data.push(a.X, a.Y, a.Z);
                return;
            }
        }
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }


    /**
     * 通过点来构造向量
     * @param point 
     */
    public toXYZ(): XYZ {
        const { x, y, z } = this;
        return { x, y, z };
    }

    /**
     * | i  j  k  |
     * | ux uy uv |
     * | vx vy vz |
     * @param another 
     */
    public cross(another: XYZ): Vector3 {
        // DebugWarn.assert(!this.isParalellTo(another));
        const x = this.y * another.z - this.z * another.y;
        const y = this.z * another.x - this.x * another.z;
        const z = this.x * another.y - this.y * another.x;
        return new Vector3(x, y, z);
    }

    /**
     *  点绕点的旋转，（向量的旋转不依赖于旋转轴，可以认为向量只能绕通过坐标原点的轴旋转）
     * 若不传第3个参数则表示当前点绕经过坐标轴原点的轴旋转
     * 若传第3个参数，则表示当前点绕某个轴的旋转
     * @param theta 旋转的角度
     * @param axis  绕哪个方向旋转 
     * @param pos  轴上的某个点,默认是原点
     */
    public rotate(theta: number, axisDir: XYZ, pos: XYZ = { x: 0, y: 0, z: 0 }) {
        const ptOnAixs = new Vector3(pos);
        if (ptOnAixs.isZero()) {
            return this.vecRotate(axisDir, theta);
        } else {
            return this.ptRotate(pos, axisDir, theta);
        }
    }

    public applyTransform(matrix4: Matrix4) {
        return super.applyTransform(matrix4);
    }

    /**
     * 向量的变换，向量变换没有平移量
     */
    public vecApplyTransform(matrix4: Matrix4): this {
        return super.vecApplyTransform(matrix4);
    }

    /**
     * 两向量是否平行（同向或反向）
     * @param another 
     * @param tolerance  角度容差
     */
    public isParalellTo(another: XYZ, tolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        const t = tolerance;
        const v1 = this.clone();
        const v2 = new Vector3(another);

        v1.normlize();
        v2.normlize();

        const cross = this.cross(another).getSqLength();

        return cross < t * t;
    }

    /**
     * 两向量是否同向(平行且方向相同)
     * @param another 
     * @param tolerance  角度容差
     */
    public isSameDirectionWith(another: XYZ, tolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        return this.isParalellTo(another, tolerance) && this.dot(another) > 0;
    }

    /**
     * 获取当前向量逆时针旋转至另一向量的夹角
     * @param other   另一个向量
     * @param refVec  参考向量（逆时针方向的确定依赖于观察方向，观察方向由该参数在平面法向上的分量确定）
     * @return 夹角[0, 2 * PI]
     */
    public getAnticlockAngleTo(other: XYZ, refVec: XYZ) {
        const vecUnit = this.clone();
        const otherUnitVec = new Vector3(other);
        const refUnitVec = new Vector3(refVec);
        vecUnit.normalize();
        otherUnitVec.normalize();
        refUnitVec.normalize();

        const angle = Math.acos(vecUnit.dot(otherUnitVec));
        const tmpUnitNormal = vecUnit.cross(otherUnitVec);
        tmpUnitNormal.normalize();
        if (tmpUnitNormal.dot(refVec) < 0) {
            return MathUtil.PI2 - angle;
        }

        return angle;
    }

    public clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    public copy(another: XYZ) {
        return super.copy(another);
    }

    public toMetaData() {
        return {
            type: GeometryType.enPoint3D,
            x: this.x,
            y: this.y,
            z: this.z
        };
    }

    public toVector2() {
        return new Vector2(this);
    }

    public discrete(): RenderObject {
        const render = new RenderObject(0, 'Vector3');
        render.geoId = (this as any).refId;
        render.vertices = [this.clone()];
        render.points = [0];
        return render;
    }

    /**
     *  向量的旋转罗德里格旋转公式
     *  Vrot = Vcosθ + (K x V)sinθ + K(K·V)(1-cosθ)
     * @param axis  旋转轴
     * @param theta  旋转角度
     */
    private vecRotate(axis: XYZ, theta: number) {
        const k = new Vector3(axis).normlize();

        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        const v = this.clone();

        const result = this.clone().multi(cos)
            .add(k.clone().cross(v).multi(sin))
            .add(k.clone().multi(k.dot(v) * (1 - cos)));
        this.copy(result);
        return this;
    }

    /**
     * 点的旋转
     * @param pos   绕哪个点旋转
     * @param axis  旋转轴
     * @param theta  旋转角度
     */
    private ptRotate(pos: XYZ, axis: XYZ, theta: number) {
        const matrix4 = new Matrix4();
        matrix4.applyRotate(pos, axis, theta);
        return this.applyTransform(matrix4);
    }

    public getType() {
        return MathType.enVector3D;
    }
}

export { Vector3 };
