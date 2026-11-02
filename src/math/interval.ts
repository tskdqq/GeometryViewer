import { DebugWarn } from '../util/debug_warn';
import { MathUtil } from '../util/math_util';
import { ErrorSystem } from './error_system';

/**
 * 区间
 */
class Interval {

    /**
     * 加上一组区间 
     * @param another 
     */
    public static merge(ranges: Interval[]): Interval[] {
        if (ranges.length < 1) {
            return [];
        }

        if (ranges.length > 1) {
            ranges.sort((a, b) => {
                return a.min - b.min;
            });
        }

        const result = [ranges[0]];
        let cur = result[0];
        for (let i = 1; i < ranges.length; i++) {
            if (cur.intersect(ranges[i])) {
                cur._add(ranges[i]);
            } else {
                cur = ranges[i];
                result.push(cur);
            }
        }
        return result;
    }

    public min: number;
    public max: number;

    /**
     * 构造方法，若min > max,内部会自动调换
     * @param min 
     * @param max 
     * @param autoReset 若min>max 是否自动交换min与max
     */
    constructor(min: number, max: number, autoReset = false) {
        if (Math.abs(min - max) < ErrorSystem.DOUBLE_EPS) {
            if (min > max) {
                this.min = min;
                this.max = max;
            } else {
                this.min = min;
                this.max = max;
            }
            return;
        }
        if (min > max) {
            if (!autoReset) {
                throw new Error(`invalid interval[ ${min}, ${max}]`);
            }
            this.min = max;
            this.max = min;
        } else {
            this.max = max;
            this.min = min;
        }
    }

    /**
     * 包含坐标轴上的一个点
     * @param param 
     * @param tolerance 
     */
    public containsPoint(param: number, tolerance: number = ErrorSystem.DOUBLE_EPS) {
        const t = tolerance ;
        return param + t >= this.min && param - t <= this.max;
    }

    /**
     * 点在区间端点上
     * @param param 
     * @param tolerance 
     */
    public containsPointAtStartOrEnd(param: number, tolerance: number = ErrorSystem.DOUBLE_EPS) {
        return Math.abs(this.min - param) < tolerance
            || Math.abs(this.max - param) < tolerance;
    }

    /**
     * 完全包含另一个区间
     * @param param 
     * @param tolerance 
     */
    public containsInterval(another: Interval, tolerance: number = ErrorSystem.DOUBLE_EPS) {
        const t = tolerance ;
        return this.containsPoint(another.min, t) && this.containsPoint(another.max, t);
    }

    /**
     * 完全在另一个区间内部
     * @param param 
     * @param tolerance 
     */
    public in(another: Interval, tolerance: number = ErrorSystem.DOUBLE_EPS) {
        return another.containsInterval(this, tolerance);
    }

    /**
     * 与另一个区间相等
     * @param param 
     * @param tolerance 
     */
    public equals(another: Interval, tolerance: number = ErrorSystem.DOUBLE_EPS) {
        return this.containsInterval(another, tolerance) && another.containsInterval(this, tolerance);
    }

    /**
     * 返回区间长度
     */
    public getLength(): number {
        return this.max - this.min;
    }

    /**
     * 返回区间中点
     */
    public getMid(): number {
        return (this.max + this.min) / 2;
    }

    /**
     * 与区间/点的距离，可使用该距离判断位置关系
     * @param another 
     */
    public distanceTo(another: Interval): number;
    public distanceTo(another: number): number;
    public distanceTo(another: Interval | number): number {
        if (typeof (another) === 'number') {
            if (another >= this.min && another <= this.max) {
                return -Math.min(another - this.min, this.max - another);
            }
            if (another >= this.max) {
                return another - this.max;
            }
            if (another <= this.min) {
                return this.min - another;
            }
            return ErrorSystem.MODEL_MAX_LENGTH;
        } else {
            // 有交，返回相交的部分
            const r = this.intersect(another);
            if (r) {
                return -r.getLength();
            }
            return Math.min(this.distanceTo(another.min), this.distanceTo(another.max));
        }
    }

    /**
     * 两个区间求交集，若区间没有交，则返回undefined
     * @param another 
     */
    public intersect(another: Interval): Interval | undefined {
        const min = Math.max(this.min, another.min);
        const max = Math.min(this.max, another.max);
        if (min > max) {
            return;
        }
        return new Interval(min, max);
    }

    /**
     * 减掉一组区间,若区间长度小于1e-6则自动舍掉
     * @param another 
     */
    public sub(...ranges: Interval[]): Interval[] {
        let result: Interval[] = [this];

        for (const r of ranges) {
            const tmp: Interval[] = [];
            for (const sum of result) {
                const ts = sum._sub(r);
                ts.forEach(t => {
                    if (t.getLength() > ErrorSystem.DOUBLE_EPS) {
                        tmp.push(t);
                    }
                });
            }
            result = tmp;
        }
        return result;
    }

    /**
     * 扩展
     * @param another 
     */
    public expandByPt(pt: number): this {
        if (pt < this.min) {
            this.min = pt;
        }
        if (pt > this.max) {
            this.max = pt;
        }

        return this;
    }

    /**
     * 区间的缩放
     * @param another 
     */
    public multi(scale: number): this {
        this.min *= scale;
        this.max *= scale;
        return this;
    }

    /**
     * 区间的打断算法
     * @param another 
     */
    public split(...ranges: (Interval | number)[]): Interval[] {
        const points = [this.min, this.max];
        for (const r of ranges) {
            if (typeof (r) === 'number') {
                points.push(r);
            } else {
                points.push(r.min, r.max);
            }
        }

        points.sort((a, b) => {
            return a - b;
        });

        const min = points.findIndex(a => {
            return MathUtil.isNearlyEqual(a, this.min);
        });

        const max = points.findIndex(a => {
            return MathUtil.isNearlyEqual(a, this.max);
        });

        DebugWarn.assert(min > -1 && max > -1, 'logic error');

        const pts = points.slice(min, max + 1);

        const result = [];
        for (let i = 0; i < pts.length - 1; i++) {
            if (pts[i + 1] - pts[i] > ErrorSystem.DOUBLE_EPS) {
                result.push(new Interval(pts[i], pts[i + 1], true));
            }
        }

        return result;
    }

    public toMetaData() {
        return [this.min, this.max];
    }

    public clone() {
        return new Interval(this.min, this.max);
    }

    /**
     * 减掉另一个区间
     * @param another 
     */
    private _sub(another: Interval): Interval[] {
        const intRange = this.intersect(another);
        if (!intRange) {
            return [this];
        }
        const result = [];
        const min1 = this.min;
        const max1 = intRange.min;
        if (max1 > min1) {
            result.push(new Interval(min1, max1));
        }

        const min2 = intRange.max;
        const max2 = this.max;
        if (max2 > min2) {
            result.push(new Interval(min2, max2));
        }
        return result;
    }

    /**
     * 加上另一个区间
     * @param another 
     */
    private _add(another: Interval): this {
        // 没有交
        if (!this.intersect(another)) {
            throw new Error('no intersection cant add');
        }

        this.min = Math.min(this.min, another.min);
        this.max = Math.max(this.max, another.max);
        return this;
    }
}

export { Interval };

