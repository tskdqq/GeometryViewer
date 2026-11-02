import { SqureMatrix } from './squre_matrix';
import { XY } from './xy';
import { Vector2 } from './vector2';
import { MathType } from './math_type';
import { MathUtil } from '../util/math_util';
import { DebugWarn } from '../util/debug_warn';

/**
 * 3X3的方阵
 */
class Matrix3 extends SqureMatrix {

    constructor() {
        super(3);
    }

    public static fromMatrix4(m4: number[][]) {
        DebugWarn.assert(m4.length === 4);
        m4.forEach(_ => DebugWarn.assert(_.length === 4));

        const m = new Matrix3();
        m.copy([
            [m4[0][0], m4[0][1], m4[0][3]],
            [m4[1][0], m4[1][1], m4[1][3]],
            [m4[3][0], m4[3][1], m4[3][3]]
        ]);
        return m;
    }


    /**
     * 二维向量平移时的矩阵变化，右乘
     * @param param0 
     */
    public applyTranslate({ x, y }: XY): this {
        const trans = new Matrix3();
        trans.copy([
            [1, 0, 0],
            [0, 1, 0],
            [x, y, 1]
        ]);

        return this.multi(trans);
    }

    /** 
     * 二维向量旋转时的矩阵变化，右乘
     * @param param0 
     */
    public applyRotate(pivot: XY, theta: number): this {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        const roa = new Matrix3();
        roa.copy([
            [c, s, 0],
            [-s, c, 0],
            [0, 0, 1]
        ]);

        const _pivot = new Vector2(pivot);
        const iszero = _pivot.isZero();

        if (!iszero) {
            this.applyTranslate(_pivot.clone().reverse());
        }

        this.multi(roa);

        if (!iszero) {
            this.applyTranslate(pivot);
        }

        return this;
    }

    /**
     * 镜像变换
     * @param origin 轴上一点
     * @param dir 轴的方向
     */
    public applyMirror(origin: XY, dir: XY): this {
        // 构造局部坐标系
        const xDir = new Vector2(dir).normalize();
        const yDir = new Vector2(dir).rotate(MathUtil.PI_2);

        // 局部坐标系变换到世界坐标系的变换矩阵
        const localToWorld = new Matrix3().copy([
            [xDir.x, xDir.y, 0],
            [yDir.x, yDir.y, 0],
            [origin.x, origin.y, 1]
        ]);

        // 世界坐标系到局部坐标
        const worldToLocal = localToWorld.clone().makeInverse()!;
        DebugWarn.assert(worldToLocal, '求逆矩阵失败');

        const mirrorX = new Matrix3();
        mirrorX.data[1][1] = -1;

        // 1.变换到局部坐标系
        return this.multi(worldToLocal)
            // 2.局部坐标系下的镜像变换
            .multi(mirrorX)
            // 3.局部坐标变换成世界坐标
            .multi(localToWorld);
    }

    public isMirror() {
        const vx = new Vector2(this._data[0]);
        const vy = new Vector2(this._data[1]);
        return vx.cross(vy) < 0;
    }
    /**
     * 等比缩放
     * @param pos 
     * @param scale 
     */
    public applyScale(pos: XY, scale: number): this;

    /**
     * 非等比缩放
     */
    public applyScale(pos: XY, scales: XY): this;

    public applyScale(pos: XY, param2: number | XY): this {
        this.applyTranslate(new Vector2(pos).reverse());
        if (typeof (param2) === 'number') {
            this.multi([
                [param2, 0, 0],
                [0, param2, 0],
                [0, 0, 1]
            ]);
        } else {
            this.multi([
                [param2.x, 0, 0],
                [0, param2.y, 0],
                [0, 0, 1]
            ]);
        }
        this.applyTranslate(pos);

        return this;
    }

    /**
     * clone
     */
    public clone() {
        const newMatrix3 = new Matrix3();
        newMatrix3.copy(this._data);
        return newMatrix3;
    }

    public getType() {
        return MathType.enMatrix3D;
    }
}


export { Matrix3 };
