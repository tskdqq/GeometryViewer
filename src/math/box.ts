import { ErrorSystem } from './error_system';
import { Interval } from './interval';
import { Vector } from './vector';

/**
 *  AABB包围盒
 */
class Box<PointType extends Vector> {

    // 右上角的点 
    public max: PointType = new Vector() as PointType;
    // 左下角的点
    public min: PointType = new Vector() as PointType;

    constructor(points?: PointType[]) {
        this.reset(points);
    }

    /**
     * 根据传入的点重置包围盒
     * @param points 
     */
    public reset(points?: PointType[]): this {
        this.makeEmpty();
        if (points === undefined) {//
            return this;
        }

        for (const p of points) {
            this.expandByPoint(p);
        }
        return this;
    }

    /**
     * 根据传入的中心点和包围盒尺寸重置包围盒
     * @param points 
     */
    public resetFromCenterAndSize(center: PointType, size: PointType): this {
        const halfSize = size.clone().div(2);

        this.max = center.clone().add(halfSize) as PointType;
        this.min = center.clone().sub(halfSize) as PointType;

        return this;
    }

    /**
     * 重置包围盒
     * @param point
     */
    public makeEmpty(): this {
        if (!this.min || !this.max) {
            return this;
        }
        const minData = this.min.data;
        for (let i = 0; i < minData.length; i++) {
            minData[i] = Infinity;
        }

        const maxData = this.max.data;
        for (let i = 0; i < minData.length; i++) {
            maxData[i] = -Infinity;
        }
        return this;
    }

    /**
     * 包围盒是否是空的（不合法）
     * @param point 
     */
    public isEmpty(): boolean {
        const minData = this.min.data;
        const maxData = this.max.data;
        for (let i = 0; i < minData.length; i++) {
            if (maxData[i] <= minData[i]) { //
                return true;
            }
        }
        return false;
    }

    /**
     * 获取中点
     */
    public getCenterPt(): PointType {
        return this.min.clone().add(this.max).div(2) as PointType;
    }

    /**
     * 获取size
     */
    public getSize(): PointType {
        return this.max.clone().sub(this.min) as PointType;
    }

    /**
     *  将包围盒扩展为方形
     * @param box 
     */
    public expandToSqure() {
        const center = this.getCenterPt();
        const delta = this.max.clone().sub(this.min);
        const max = Math.max(...delta.data);

        const data: number[] = [];
        const size = this.min.clone().resetFromArray(data);
        for (let i = delta.data.length - 1; i >= 0; i--) {
            data.push(max);
        }

        this.resetFromCenterAndSize(center, size as PointType);
    }

    /**
     * 包围盒扩展
     * @param point 
     */
    public expandByPoint(point: PointType): this {
        if (!this.max) {
            this.max = point.clone() as PointType;
        }
        if (!this.min) {
            this.min = point.clone() as PointType;
        }
        const minData = this.min.data;
        for (let i = 0; i < minData.length; i++) {
            minData[i] = Math.min(minData[i], point.data[i]);
        }

        const maxData = this.max.data;
        for (let i = 0; i < minData.length; i++) {
            maxData[i] = Math.max(maxData[i], point.data[i]);
        }
        return this;
    }

    /**
     * 是否包含点
     * @param point 
     */
    public containsPoint(point: PointType, tolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        const t = tolerance;
        const data = point.data;
        const minData = this.min.data;
        const maxData = this.max.data;

        for (let i = 0; i < minData.length; i++) {
            const range = new Interval(minData[i], maxData[i]);
            if (!range.containsPoint(data[i], t)) {//
                return false;
            }
        }
        return true;
    }

    // /**
    //  * 是否包含另一个包围盒,another在this内部
    //  * @param another 
    //  */
    // containsBox(another: Box<PointType>): boolean {
    //     if (!this.min.greaterThan(another.min) && !this.max.lessThan(another.max)) {
    //         return true;
    //     }
    //     return false;
    // }

    /**
     * 是否和另一个包围盒有交
     * @param box 
     */
    public intersectsBox(box: Box<PointType>, tolerance: number = ErrorSystem.DOUBLE_EPS): boolean {
        const { min, max } = box;
        const { length } = min.data;
        for (let i = 0; i < length; i++) {
            // 在某个轴距离过大
            const range1 = new Interval(this.min.data[i], this.max.data[i]);
            const range2 = new Interval(min.data[i], max.data[i]);
            if (range1.distanceTo(range2) > tolerance) {
                return false;
            }
        }

        return true;
    }

    /**
     * 包围盒的合并
     * @param box 
     */
    public union(box: Box<PointType>): this {
        if (!box.isValid()) {
            return this;
        }
        this.expandByPoint(box.min);
        this.expandByPoint(box.max);
        return this;
    }

    /**
     * 包围盒是否合法，max >= min
     */
    public isValid() {
        for (let i = 0; i < this.max.data.length; i++) {
            if (isNaN(this.min.data[i]) || isNaN(this.max.data[i])) {
                debugger;
                return false;
            }
            if (Math.abs(this.min.data[i] - this.max.data[i]) < ErrorSystem.DOUBLE_EPS) {
                continue;
            }
            if (this.min.data[i] > this.max.data[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * 包围盒的平移
     * @param offset 
     */
    public translate(offset: PointType) {
        this.min.add(offset);
        this.max.add(offset);
        return this;
    }

    public copy(another: Box<PointType>): this {
        this.min = another.min.clone() as PointType;
        this.max = another.min.clone() as PointType;
        return this;
    }

    public clone(): Box<PointType> {
        return new Box<PointType>([this.min, this.max]);
    }
}

export { Box };

