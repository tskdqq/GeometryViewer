import { ErrorSystem } from '../math/error_system';

/**
 * 定义一些工具类方法
 */
class MathUtil {

    public static readonly PI = Math.PI;
    public static readonly PI2 = Math.PI * 2;
    public static readonly PI_2 = Math.PI / 2;
    public static readonly PI_4 = Math.PI / 4;

    // 角度转弧度
    public static degreeToRadius(angle: number) {
        return angle * Math.PI / 180;
    }

    // 弧度转角度
    public static radiusToDegree(radius: number) {
        return radius * 180 / Math.PI;
    }

    // 误差范围内相等
    public static isNearlyEqual(a: number, b: number, optTolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        return Math.abs(a - b) <= optTolerance;
    }

    // 误差范围内为0
    public static isNearlyZero(a: number, optTolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        return Math.abs(a) <= optTolerance;
    }

    // 指定范围内的随机数
    public static randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    public static sum(array: number[]) {
        return array.reduce(
            (total, num) => {
                return total + num;
            },
            0);
    }
}

export { MathUtil };

