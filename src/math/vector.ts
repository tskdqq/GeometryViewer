import { DebugWarn } from '../util/debug_warn';
import { ErrorSystem } from './error_system';
import { XY, XYZ } from './xy';
import { Matrix } from './matrix';
import * as numeric from 'numeric';
import { MathUtil } from '../util/math_util';

/**
 *  向量
 */
class Vector {
    protected readonly _data: number[] = [];

    constructor(array?: number[]) {
        this.resetFromArray(array);
    }

    /**
     * 获取内部数据
     */
    public get data() {
        return this._data;
    }

    //  重置向量
    public resetFromArray(array: number[] | undefined): this {
        this._data.splice(0, this._data.length);
        if (array) {
            this._data.push(...array);
        }
        return this;
    }

    /**
     * 向量反向
     */
    public reverse(): this {
        for (let i = 0; i < this._data.length; i++) {
            this._data[i] = -this._data[i];
        }
        return this;
    }

    /**
     * 向量加等于，会改变this，返回this
     * @param anotherVector 
     */
    public add(another: Vector | XY | XYZ): this {
        const param = this._paramToVector(another);

        for (let i = 0; i < this._data.length; i++) {
            this._data[i] += param.data[i];
        }
        return this;
    }

    /**
     * 向量减等于，会改变this，返回this
     * @param anotherVector 
     */
    public sub(another: Vector | XY | XYZ): this {
        const param = this._paramToVector(another);

        for (let i = 0; i < this._data.length; i++) {
            this._data[i] -= param.data[i];
        }
        return this;
    }

    /**
     * 向量乘等于，会改变this，返回this
     * @param scale 
     */
    public multi(scale: number): this {
        for (let i = 0; i < this._data.length; i++) {
            this._data[i] *= scale;
        }
        return this;
    }

    /**
     * 点的变换，包括平移、选择、缩放
     * @param matrix 
     */
    public applyTransform(matrix: Matrix | number[][]): this {
        const data: number[] = (matrix as any).data || matrix;
        const result = numeric.dot([...this.data, 1], data) as number[];
        result.pop();

        this.copy(result);
        return this;
    }

    /**
     * 向量的变换，会自动忽略平移量
     * @param matrix 
     */
    public vecApplyTransform(matrix: Matrix | number[][]): this {
        const data: number[] = (matrix as any).data || matrix;
        const result = numeric.dot([...this.data, 0], data) as number[];
        result.pop();

        this.copy(result);
        return this;
    }

    /**
     * 向量除等于,会改变this，返回this
     * @param scale 
     */
    public div(scale: number): this {
        for (let i = 0; i < this._data.length; i++) {
            this._data[i] /= scale;
        }
        return this;
    }

    /**
     *  缩放
     * @param factor 缩放比例
     */
    public scale(factor: number, center?: Vector | XY | XYZ): this {
        if (!center) {
            return this.multi(factor);
        }
        const param = this._paramToVector(center);
        return this.sub(param)
            .multi(factor)
            .add(param);
    }

    /**
     *  计算向量的模长
     */
    public getLength(): number {
        return Math.sqrt(this.getSqLength());
    }

    /**
     *  与另外一个向量的距离
     */
    public distanceTo(another: Vector | XY | XYZ): number {
        const param = this._paramToVector(another);
        return this.clone().sub(param).getLength();
    }

    /**
     *  与另外一个向量的平方距离
     */
    public sqDistanceTo(another: Vector | XY | XYZ): number {
        const param = this._paramToVector(another);
        return this.clone().sub(param).getSqLength();
    }

    /**
     *  计算平方距离
     */
    public getSqLength(): number {
        let sum = 0;
        for (const d of this._data) {
            sum += d * d;
        }
        return sum;
    }

    /**
     *  单位化向量
     * @deprecated 拼写错误，请使用`nomalize`
     * @returns 返回this
     */
    public normlize(): this {
        const len = this.getLength();
        this.div(len);
        return this;
    }

    /**
     *  单位化向量
     * @returns 返回this
     */
    public normalize(): this {
        const len = this.getLength();
        this.div(len);
        return this;
    }

    /**
     *  向量点乘
     * @param param 
     */
    public dot(another: Vector | XY | XYZ): number {
        const param = this._paramToVector(another);
        let sum = 0;
        for (let i = 0; i < this._data.length; i++) {
            sum += this._data[i] * param.data[i];
        }
        return sum;
    }

    /**
     *  两向量之间的夹角，区间[0,PI]
     * @param
     */
    public angleWith(another: Vector | XY | XYZ): number {
        const param = this._paramToVector(another);
        const v1 = this.clone();
        v1.normlize();

        param.normlize();
        const dot = v1.dot(param);

        return Math.acos(dot);
    }

    /**
     * 获取两个向量的夹角（锐角，向量不考虑方向)
     * @param other  另一个向量
     * @return 夹角[0, PI/2]
     */
    public getAcuteAngle(other: Vector | XY | XYZ): number {
        const vecUnit = this.clone();
        const otherUnitVec = this._paramToVector(other);
        vecUnit.normalize();
        otherUnitVec.normalize();

        const angle = Math.acos(vecUnit.dot(otherUnitVec));
        if (angle > MathUtil.PI_2) {
            return MathUtil.PI - angle;
        }

        return angle;
    }

    /**
     * 两向量是否垂直
     * @param param 
     * @param tolerance 角度容差
     */
    public isPerpendicularTo(another: Vector | XY | XYZ, tolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        const param = this._paramToVector(another);
        const v1 = this.clone();
        const v2 = param.clone();

        v1.normlize();
        v2.normlize();

        const dot = this.dot(param);

        return Math.abs(dot) < tolerance ;
    }

    /**
     * 向量的长度是否为0
     * @param param 
     * @param tolerance 角度容差
     */
    public isZero(tolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        return this.getSqLength() < tolerance * tolerance ;
    }

    /**
     * 向量是否相等
     * @param param 
     */
    public equals(another: Vector | XY | XYZ, torlerance: number = ErrorSystem.DOUBLE_EPS) {
        const param = this._paramToVector(another);

        const t = torlerance ;
        const v = this.clone().sub(param);
        let sum = 0;
        for (const d of v.data) {
            sum += d * d;
        }
        return sum <= t * t;
    }

    /**
     * 向量是否大于，每一个分量都大于
     * @param param 
     */
    public greaterThan(another: Vector | XY | XYZ) {
        const param = this._paramToVector(another);

        for (let i = 0; i < this._data.length; i++) {
            if (this._data[i] <= param.data[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * 向量是否小于，每一个分量都小于
     * @param param 
     */
    public lessThan(another: Vector | XY | XYZ) {
        const param = this._paramToVector(another);
        for (let i = 0; i < this._data.length; i++) {
            if (this._data[i] >= param.data[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     *  赋值操作
     */
    public copy(another: Vector | XY | XYZ | number[]): this {
        const param = this._paramToVector(another);

        this.resetFromArray(param.data);
        return this;
    }

    /**
     *  深拷贝
     */
    public clone(): Vector {
        const newV = new Vector();
        newV._data.push(...this._data);
        return newV;
    }

    public asString(): string {
        let s = '';
        for (const d of this._data) {
            s += d + ', ';
        }
        return s;
    }

    private _paramToVector(xy: Vector | XY | XYZ | number[]): Vector {
        let param;
        if (Array.isArray(xy)) {
            param = new Vector();
            param._data.push(...xy);
        } else if (xy instanceof Vector) {
            param = xy;
        } else {
            param = new Vector();
            param._data.push((xy as XY).x, (xy as XY).y);

            if ((xy as any).z !== undefined) {
                param._data.push((xy as XYZ).z);
            }
        }

        DebugWarn.assert(
            this._data.length === param.data.length,
            `The dimensions of the two vectors are different ${this._data.length} ,${param.data.length}`);

        return param;
    }
}

export { Vector };
