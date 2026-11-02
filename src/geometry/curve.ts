import { ErrorSystem } from '../math/error_system';
import { Interval } from '../math/interval';
import { Vector } from '../math/vector';
import { XY, XYZ } from '../math/xy';
import { Geomtry } from './geometry';

/**
 * @author tiansk
 * 参数曲线的基类
 */
abstract class Curve<PointType extends Vector> extends Geomtry {

    // 参数域
    protected range: Interval = new Interval(-ErrorSystem.MODEL_MAX_LENGTH, ErrorSystem.MODEL_MAX_LENGTH);

    /**
     *  获取某参数对应的点
     */
    public abstract getPtAt(t: number): PointType;

    /**
     *  获取某参数对应的点
     */
    public abstract getParamAt(point: PointType | XY | XYZ): number;

    /**
     *  获取某参数处的切线
     */
    public abstract getTangentAt(t: number): PointType;

    /**
     *  反向
     */
    public abstract reverse(): this;

    /**
     *  获取曲线长度
     */
    public getLength(): number {
        return this.range.getLength();
    }

    // -----------非抽象方法-------------

    /**
     *  获取曲线起点
     */
    public getStartPt(): PointType {
        const startT = this.getStartParam();
        return this.getPtAt(startT);
    }

    /**
     *  获取曲线末点
     */
    public getEndPt(): PointType {
        const endT = this.getEndParam();
        return this.getPtAt(endT);
    }

    /**
     * 离散
     */
    public discrete(stepLength: number = 0.1): PointType[] {
        return [this.getStartPt(), this.getEndPt()];
    }

    /**
     * 获取曲线中点
     */
    public getMidPt(): PointType {
        return this.getPtAt(this.range.getMid());
    }

    /**
     *  获取另一个端点
     * @param point  传入的端点
     * @returns 如果传入的是起点，则返回末点，否则返回起点
     */
    public getAnotherEndPt(point: PointType, tolerance: number = ErrorSystem.LENGTH_EPS): PointType {
        if (this.isStartPt(point, tolerance)) {
            return this.getEndPt();
        } else {
            return this.getStartPt();
        }
    }

    /**
     *  获取曲线起点处参数值
     */
    public getStartParam(): number {
        return this.getRange().min;
    }

    /**
     *  获取曲线末点处参数值
     */
    public getEndParam(): number {
        return this.getRange().max;
    }

    /**
     * 获取起点处的切线
     */
    public getStartTangent(): PointType {
        return this.getTangentAt(this.getStartParam());
    }

    /**
     * 获取末点处的切线
     */
    public getEndTangent(): PointType {
        return this.getTangentAt(this.getEndParam());
    }

    /**
     *  从几何上判断该点是否是起点
     * @param point 
     */
    public isStartPt(point: PointType, tolerance = ErrorSystem.DOUBLE_EPS): boolean {
        return this.getStartPt().equals(point, tolerance);
    }

    /**
     *  从几何上判断该点是否是末点
     * @param point
     */
    public isEndPt(point: PointType, tolerance = ErrorSystem.DOUBLE_EPS): boolean {
        return this.getEndPt().equals(point, tolerance);
    }

    /**
     *  point投影在curve上的点p是否在曲线上
     * @param point 
     */
    public containsProjectedPt(point: PointType | XY, tolerance = ErrorSystem.DOUBLE_EPS): boolean {
        const param = this.getParamAt(point);
        return this.range.distanceTo(param) < tolerance;
    }

    /**
     * 是否包含某个点, 即某点是否在该曲线段上
     */
    public containsPoint(point: PointType | XY, tolerance = ErrorSystem.DOUBLE_EPS): boolean {
        // 1.判断端点的距离
        if (this.getStartPt().distanceTo(point) < tolerance
            || this.getEndPt().distanceTo(point) < tolerance) {
            return true;
        }
        // 2.判断垂直距离
        const param = this.getParamAt(point);
        const d = this.getPtAt(param).distanceTo(point);
        if (d > tolerance) {
            return false;
        }

        // 3.判断参数域
        return this.containsProjectedPt(point, tolerance);
    }

    /**
     * 点到曲线的垂足
     */
    public getProjectedPtBy(point: PointType | XY | XYZ) {
        const p = this.getParamAt(point);
        return this.getPtAt(p);
    }

    /**
     * 延伸曲线,若曲线参数域为[0,1]
     * > 从尾部增加1，参数域变为[0,2]
     * 
     * > 从头部增加1，参数域变为[-1,1]
     * @param howLong 延伸长度
     * @param bTail 是否从尾部增加
     */
    public extend(howLong: number, bTail: boolean = true): this {
        if (bTail) {
            this.range.max += howLong;
        } else {
            this.range.min -= howLong;
        }
        return this;
    }

    /**
     * 从参数域的2端延伸曲线
     * @param howLong 延伸长度
     */
    public extendDouble(howLong: number): this {
        this.range.max += howLong;
        this.range.min -= howLong;

        return this;
    }

    /**
     * 获取参数域的拷贝
     */
    public getRange(): Interval {
        return this.range.clone();
    }

    /**
     * 重设参数域
     */
    public setRange(min: number, max: number): this;

    /**
     * 重设参数域
     */
    public setRange(range: Interval): this;

    /**
     * 重设参数域
     */
    public setRange(a: any, b?: any): this {
        if (typeof (a) === 'number' && typeof (b) === 'number') {
            this.range = new Interval(a, b);
        } else if (typeof (a) === 'object'
            && a.min !== undefined && typeof (a.min) === 'number') {
            this.range = new Interval(a.min, a.max);
        } else {
            // 
            throw new Error('params error');
        }
        return this;
    }

    /**
     * 2曲线是否在几何上相等
     * > 返回值：
     * - 0不相等
     * - 1相等且方向相同
     * - -1相等且方向相反
     * @param another 
     * @param torlerance 
     */
    public equals(another: Curve<PointType>, torlerance: number = ErrorSystem.DOUBLE_EPS): 0 | 1 | -1 {
        if (this.getType() !== another.getType()) {
            return 0;
        }

        // 比较中点
        if (!this.getMidPt().equals(another.getMidPt(), torlerance)) {
            return 0;
        }

        if (this.getStartPt().equals(another.getStartPt(), torlerance) && this.getEndPt().equals(another.getEndPt(), torlerance)) {
            return 1;
        }

        if (this.getStartPt().equals(another.getEndPt(), torlerance) && this.getEndPt().equals(another.getStartPt(), torlerance)) {
            return -1;
        }
        return 0;
    }
}

export { Curve };
