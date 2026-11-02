import * as numeric from 'numeric';

import { Matrix } from './matrix';

/**
 * 方阵的基类
 */
class SqureMatrix extends Matrix {

    constructor(dim: number) {
        super(dim, dim);
        this.makeIdentity();
    }

    /**
     * 行列式
     */
    public determinant(): number {
        return numeric.det(this._data);
    }

    /**
     * 将当前矩阵重置为逆矩阵,若矩阵行列式为0，没有逆矩阵，则返回undefined，否则返回this
     */
    public makeInverse(): this | undefined {
        try {
            const data = numeric.inv(this._data);
            return this.copy(data);
        } catch (e) {
            return;
        }
    }

    public clone(): SqureMatrix {
        const newMatrix = new SqureMatrix(this.row);
        return newMatrix.copy(this);
    }
}

export { SqureMatrix };
