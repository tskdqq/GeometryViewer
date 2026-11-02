import { SqureMatrix } from './squre_matrix';
import { XYZ } from './xy';
import { MathUtil } from '../util/math_util';
import { Vector3 } from './vector3';
import { Matrix3 } from './matrix3';
import { DebugWarn } from '../util/debug_warn';
import { MathType } from './math_type';

/**
 * 4X4的方阵
 */
class Matrix4 extends SqureMatrix {
    constructor() {
        super(4);
    }

    public static fromMatrix3(m3: number[][]) {
        DebugWarn.assert(m3.length === 3);
        m3.forEach(_ => DebugWarn.assert(_.length === 3));

        const m = new Matrix4();
        m.copy([
            [m3[0][0], m3[0][1], 0, m3[0][2]],
            [m3[1][0], m3[1][1], 0, m3[1][2]],
            [0, 0, 1, 0],
            [m3[2][0], m3[2][1], 0, m3[2][2]]
        ]);
        return m;
    }

    /**
     * @param axisDir 旋转轴
     * @param ptOnAxis 旋转轴上的某个点
     * @param angle 旋转角度
     */
    public applyRotate(ptOnAxis: XYZ, axisDir: XYZ, angle: number) {
        const ax = axisDir.x;
        const ay = axisDir.y;
        const az = axisDir.z;

        let cos = Math.cos(angle);
        let sin = Math.sin(angle);

        if (MathUtil.isNearlyZero(ay * ay + az * az)) {
            if (ax < 0) {
                cos = Math.cos(MathUtil.PI2 - angle);
                sin = Math.sin(MathUtil.PI2 - angle);
            }

            const dy = ptOnAxis.y * (1 - cos) + ptOnAxis.z * sin;
            const dz = ptOnAxis.z * (1 - cos) - ptOnAxis.y * sin;

            return this.multi([
                [1, 0, 0, 0],
                [0, cos, sin, 0],
                [0, -sin, cos, 0],
                [0, dy, dz, 1]
            ]);
        }

        if (MathUtil.isNearlyZero(ax * ax + az * az)) {
            if (ay < 0) {
                cos = Math.cos(MathUtil.PI2 - angle);
                sin = Math.sin(MathUtil.PI2 - angle);
            }

            const dx = ptOnAxis.x * (1 - cos) - ptOnAxis.z * sin;
            const dz = ptOnAxis.z * (1 - cos) + ptOnAxis.x * sin;

            return this.multi([
                [cos, 0, -sin, 0],
                [0, 1, 0, 0],
                [sin, 0, cos, 0],
                [dx, 0, dz, 1]
            ]);
        }

        if (MathUtil.isNearlyZero(ax * ax + ay * ay)) {
            if (az < 0) {
                cos = Math.cos(MathUtil.PI2 - angle);
                sin = Math.sin(MathUtil.PI2 - angle);
            }

            const dx = ptOnAxis.x * (1 - cos) + ptOnAxis.y * sin;
            const dy = ptOnAxis.y * (1 - cos) - ptOnAxis.x * sin;
            return this.multi([
                [cos, sin, 0, 0],
                [-sin, cos, 0, 0],
                [0, 0, 1, 0],
                [dx, dy, 0, 1]
            ]);
        }

        const v = Math.sqrt(ay * ay + az * az);
        const s = Math.sqrt(ax * ax + ay * ay + az * az);

        const matTa = new Matrix4();
        matTa._data[3][0] = -ptOnAxis.x;
        matTa._data[3][1] = -ptOnAxis.y;
        matTa._data[3][2] = -ptOnAxis.z;
        matTa._data[3][3] = 1;

        const inverseMatTa = new Matrix4();
        inverseMatTa._data[3][0] = ptOnAxis.x;
        inverseMatTa._data[3][1] = ptOnAxis.y;
        inverseMatTa._data[3][2] = ptOnAxis.z;
        inverseMatTa._data[3][3] = 1;

        const cos1 = az / v;
        const sin1 = ay / v;

        const matRx = new Matrix4();
        matRx._data[1][1] = cos1;
        matRx._data[1][2] = sin1;
        matRx._data[2][1] = -sin1;
        matRx._data[2][2] = cos1;

        const inverseMatRx = new Matrix4();

        inverseMatRx._data[1][1] = cos1;
        inverseMatRx._data[1][2] = -sin1;
        inverseMatRx._data[2][1] = sin1;
        inverseMatRx._data[2][2] = cos1;

        const cos2 = v / s;
        const sin2 = ax / s;

        const matRy = new Matrix4();
        matRy._data[0][0] = cos2;
        matRy._data[0][2] = sin2;
        matRy._data[2][0] = -sin2;
        matRy._data[2][2] = cos2;

        const inverseMatRy = new Matrix4();

        inverseMatRy._data[0][0] = cos2;
        inverseMatRy._data[0][2] = -sin2;
        inverseMatRy._data[2][0] = sin2;
        inverseMatRy._data[2][2] = cos2;

        const matRz = new Matrix4();
        matRz._data[0][0] = cos;
        matRz._data[0][1] = sin;
        matRz._data[1][0] = -sin;
        matRz._data[1][1] = cos;

        return this.multi(matTa)
            .multi(matRx)
            .multi(matRy)
            .multi(matRz)
            .multi(inverseMatRy)
            .multi(inverseMatRx)
            .multi(inverseMatTa);
    }

    /**
     * 三维向量平移时的矩阵变化，右乘
     * @param param0 
     */
    public applyTranslate({ x, y, z }: XYZ): this {
        const trans = new Matrix4();
        trans.copy([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [x, y, z, 1]
        ]);

        return this.multi(trans);
    }

    /**
     * 等比缩放
     * @param pos 
     * @param scale 
     */
    public applyScale(pos: XYZ, scale: number): this;

    /**
     * 非等比缩放
     */
    public applyScale(pos: XYZ, scales: XYZ): this;

    public applyScale(pos: XYZ, param2: number | XYZ) {
        const matrix4 = new Matrix4();
        if (typeof (param2) === 'number') {
            const scale = param2;
            DebugWarn.assert(scale > 0);

            matrix4._data[0][0] = scale;
            matrix4._data[1][1] = scale;
            matrix4._data[2][2] = scale;
            matrix4._data[3][0] = pos.x * (1 - scale);
            matrix4._data[3][1] = pos.y * (1 - scale);
            matrix4._data[3][2] = pos.z * (1 - scale);
        } else {
            const scales = param2;
            DebugWarn.assert(scales.x > 0);
            DebugWarn.assert(scales.y > 0);
            DebugWarn.assert(scales.z > 0);

            matrix4._data[0][0] = scales.x;
            matrix4._data[1][1] = scales.y;
            matrix4._data[2][2] = scales.z;
            matrix4._data[3][0] = pos.x * (1 - scales.x);
            matrix4._data[3][1] = pos.y * (1 - scales.y);
            matrix4._data[3][2] = pos.z * (1 - scales.z);
        }
        this.multi(matrix4);
        return this;
    }

    /** 
     * 获取平移分量
     */
    public getTranslation() {
        return new Vector3(this.data[3][0], this.data[3][1], this.data[3][2]);
    }

    /**
     * 设置平移分量
     */
    public setTranslation(translation: Vector3): this {
        this.data[3][0] = translation.x;
        this.data[3][1] = translation.y;
        this.data[3][2] = translation.z;
        return this;
    }

    /**
     * 获取旋转分量
     */
    public getRotation(): Matrix3 {
        const mat3 = new Matrix3();
        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 3; ++j) {
                mat3.set(i, j, this._data[i][j]);
            }
        }
        return mat3;
    }

    /**
     * 指定旋转轴的顺序，获取欧拉角
     * @param order 
     */
    public getEuler(order: 'XYZ' | 'YZX' | 'ZXY' | 'XZY' | 'YXZ' | 'ZYX'): Vector3 {
        // copy From threejs
        const clamp = (value: any, min: any, max: any) => {
            return Math.max(min, Math.min(max, value));
        };

        // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
        /*
        var m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ];
		var m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ];
		var m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ];
         */
        const te = this._data;
        const m11 = te[0][0]; const m12 = te[0][1]; const m13 = te[0][2];
        const m21 = te[1][0]; const m22 = te[1][1]; const m23 = te[1][2];
        const m31 = te[2][0]; const m32 = te[2][1]; const m33 = te[2][2];

        const result = new Vector3();

        if (order === 'XYZ') {
            result.y = Math.asin(clamp(m13, - 1, 1));
            if (Math.abs(m13) < 0.99999) {
                result.x = Math.atan2(- m23, m33);
                result.z = Math.atan2(- m12, m11);
            } else {
                result.x = Math.atan2(m32, m22);
                result.z = 0;
            }

        } else if (order === 'YXZ') {
            result.x = Math.asin(- clamp(m23, - 1, 1));
            if (Math.abs(m23) < 0.99999) {
                result.y = Math.atan2(m13, m33);
                result.z = Math.atan2(m21, m22);
            } else {
                result.y = Math.atan2(- m31, m11);
                result.z = 0;
            }

        } else if (order === 'ZXY') {
            result.x = Math.asin(clamp(m32, - 1, 1));
            if (Math.abs(m32) < 0.99999) {
                result.y = Math.atan2(- m31, m33);
                result.z = Math.atan2(- m12, m22);
            } else {
                result.y = 0;
                result.z = Math.atan2(m21, m11);
            }

        } else if (order === 'ZYX') {
            result.y = Math.asin(- clamp(m31, - 1, 1));
            if (Math.abs(m31) < 0.99999) {
                result.x = Math.atan2(m32, m33);
                result.z = Math.atan2(m21, m11);
            } else {
                result.x = 0;
                result.z = Math.atan2(- m12, m22);
            }

        } else if (order === 'YZX') {
            result.z = Math.asin(clamp(m21, - 1, 1));
            if (Math.abs(m21) < 0.99999) {
                result.x = Math.atan2(- m23, m22);
                result.y = Math.atan2(- m31, m11);
            } else {
                result.x = 0;
                result.y = Math.atan2(m13, m33);
            }

        } else if (order === 'XZY') {
            result.z = Math.asin(- clamp(m12, - 1, 1));
            if (Math.abs(m12) < 0.99999) {
                result.x = Math.atan2(m32, m22);
                result.y = Math.atan2(m13, m11);
            } else {
                result.x = Math.atan2(- m23, m33);
                result.y = 0;
            }
        } else {
            throw new Error('not support order:' + order);
        }

        return result;
    }

    /**
     * clone
     */
    public clone() {
        const newMatrix4 = new Matrix4();
        newMatrix4.copy(this._data);
        return newMatrix4;
    }

    public getType() {
        return MathType.enMatrix4D;
    }
}

export { Matrix4 };

