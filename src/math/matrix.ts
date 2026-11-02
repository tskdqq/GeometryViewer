import * as numeric from 'numeric';
import { DebugWarn } from '../util/debug_warn';
import { MathUtil } from '../util/math_util';
import { ErrorSystem } from './error_system';

/**
 * 矩阵的基类
 */
class Matrix {

    protected readonly _data: number[][] = [];

    /**
     *  指定维度
     * @param row 行 
     * @param colum 列
     */
    constructor(protected row: number, protected colum: number) {
        this.makeZero();
    }

    /**
     * 返回矩阵的维度
     * @property dim
     */
    get dim(): number[] {
        return [this.row, this.colum];
    }

    /**
     * 返回矩阵内部的数据
     */
    get data(): number[][] {
        return this._data;
    }

    /**
     * 设置某个特定值
     * @param row 行
     * @param colum 列
     * @param value 值
     */
    public set(row: number, colum: number, value: number) {
        DebugWarn.assert(row <= this.row && colum <= this.colum, 'error! out of range');
        this._data[row][colum] = value;
    }

    /**
     * 使当前矩阵变为单位阵
     */
    public makeIdentity(): this {
        this.clear();
        for (let i = 0; i < this.row; i++) {
            const rowArr = new Array(this.colum).fill(0);
            rowArr[i] = 1;
            this._data.push(rowArr);
        }

        return this;
    }

    /**
     * 是否是单位阵
     */
    public isIdentity(): boolean {
        for (let i = 0; i < this.row; i++) {
            for (let j = 0; j < this.colum; j++) {
                if (i === j) {
                    if (!MathUtil.isNearlyEqual(this.data[i][j], 1, ErrorSystem.DOUBLE_EPS)) {
                        return false;
                    }
                } else {
                    if (!MathUtil.isNearlyZero(this.data[i][j], ErrorSystem.DOUBLE_EPS)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * 将矩阵内部所有数据置0
     */
    public makeZero(): this {
        this.clear();
        for (let i = 0; i < this.row; i++) {
            const rowArr = new Array(this.colum).fill(0);
            this._data.push(rowArr);
        }

        return this;
    }

    /**
     * 乘以另外一个矩阵，m右乘this，改变this
     * @param m 
     */
    public multi(m: Matrix | number[][]): this {

        if (Array.isArray(m)) {
            DebugWarn.assert(this.row === m.length, `${this.row} !=== ${m.length}, cant multipy!`);

            const data = numeric.dot(this._data, m) as number[][];
            this.copy(data);
        } else {
            DebugWarn.assert(this.row === m.colum, `${this.row} !=== ${m.colum}, cant multipy!`);

            const data = numeric.dot(this._data, m._data) as number[][];
            this.copy(data);
        }

        return this;
    }

    /**
     * 乘等于一个标量
     * @param s 
     */
    public multiplyScalar(s: number): this {
        for (const row of this._data) {
            for (let i = 0; i < this.colum; i++) {
                row[i] *= s;
            }
        }
        return this;
    }

    /**
     * 矩阵转置
     */
    public transpose(): Matrix {
        const data = numeric.transpose(this._data);
        return this.copy(data);
    }

    /**
     * 深拷贝
     */
    public clone() {
        const newMatrix = new Matrix(this.row, this.colum);
        return newMatrix.copy(this);
    }

    /**
     * 将二维数组拷贝到矩阵内部
     * @param elements 
     */
    public copy(another: Matrix | number[][]): this {
        const elements = (another as any)._data || another;
        const dim = numeric.dim(elements);

        DebugWarn.warn(this.row === dim[0] && this.colum === dim[1], 'matrix dimension are different');

        this.row = dim[0];
        this.colum = dim[1];

        this.clear();
        for (const row of elements) {
            const rowCopy = [];
            rowCopy.push(...row);
            this._data.push(rowCopy);
        }

        return this;
    }

    protected clear() {
        this._data.splice(0, this._data.length);
    }
}

export { Matrix };
