import { Curve2d } from './curve2d';
import { GeometryType } from '../geometry/geometry_type';
import { XY } from '../math/xy';
import { Vector2 } from '../math/vector2';
import { Interval } from '../math/interval';
import { Matrix3 } from '../math/matrix3';
import { Box2 } from '../math/box2';
import { MathUtil } from '../util/math_util';
import { Arc2dInterface } from './geo_interfaces';
import { RenderObject } from '../algorithm/discrete/render_object';
import { Vector3 } from '../math/vector3';
import { Matrix4 } from '../math/matrix4';
import { discreteArrow } from '../algorithm/discrete_arrow';

/**
 * 二维弧线 
 */
class Arc2d extends Curve2d {

    private center: Vector2 = Vector2.zero();
    public radius: number = 1;
    private startAngle: number = 0; // [0, 2π]
    private angleExtent: number = 0; // [0, 2π]
    public anticlockwise: boolean = true;

    public static loadFromAny(arcData: Arc2dInterface): Arc2d {
        if (arcData.anticlockwise) {
            return new Arc2d(
                arcData.center, arcData.radius, arcData.startAngle + arcData.range[0] / arcData.radius,
                (arcData.range[1] - arcData.range[0]) / arcData.radius, arcData.anticlockwise);
        } else {
            return new Arc2d(
                arcData.center, arcData.radius, arcData.startAngle - arcData.range[0] / arcData.radius,
                (arcData.range[1] - arcData.range[0]) / arcData.radius, arcData.anticlockwise);
        }
    }

    /**
     * 根据三个点确定一个圆弧
     * @param points 
     */
    public static createByThreePoints(start: XY, ref: XY, end: XY) {
        const result = Arc2d.getArcParamByThreePoints(start, ref, end);
        return Arc2d.loadFromAny(result);
    }

    /**
     * 构造函数
     * @param center 
     * @param radius 
     * @param startAngle 
     * @param angleExtent 要求不小于0
     * @param anticlockwise 
     */
    constructor(center?: XY, radius?: number, startAngle?: number, angleExtent?: number, anticlockwise?: boolean) {
        super();
        if (center !== undefined) {
            this.center = new Vector2(center);
        }
        if (radius !== undefined && radius > 0) {
            this.radius = radius;
        }
        if (anticlockwise !== undefined) {
            this.anticlockwise = anticlockwise;
        }
        if (angleExtent !== undefined && angleExtent >= 0) {
            this.angleExtent = Math.min(angleExtent, MathUtil.PI2);
        }
        if (startAngle !== undefined) {
            this.startAngle = startAngle % MathUtil.PI2;
        }

        this.range = new Interval(0, this.angleExtent * this.radius);
        this.resetAngle();
    }

    public getClockSign() {
        if (!this.anticlockwise) {
            return -1;
        }
        return 1;
    }

    public resetAngle() {
        this.startAngle = this.startAngle % MathUtil.PI2;
        if (this.startAngle + this.angleExtent * this.getClockSign() < 0) {
            this.startAngle += MathUtil.PI2;
        }
    }

    /**
     *  获取中心点
     */
    public getCenter(): Vector2 {
        return this.center.clone();
    }

    /**
     *  设置中心点
     */
    public setCenter(center: Vector2) {
        return this.center = center.clone();
    }

    /**
     * 几何对象的类型
     */
    public getType() {
        return GeometryType.enArc2D;
    }

    /**
     * 获取某个角度的位置
     */
    public getPtAtAngle(angle: number): Vector2 {
        return new Vector2(
            this.center.x + this.radius * Math.cos(angle),
            this.center.y + this.radius * Math.sin(angle));
    }

    /**
     * 获取某段弧长对应的位置 
     */
    public getPtAt(t: number): Vector2 {
        // 先计算该弧长对应的角度跨度
        const angleExtent = t / this.radius;
        return this.getPtAtAngle(this.startAngle + angleExtent * this.getClockSign());
    }

    /**
     *  获取某参数对应的点, 获取该弧上一点对应的角度
     */
    public getAngleFromStart(point: XY): number {
        const vec1 = this.getStartPt().sub(this.center);
        const vec2 = new Vector2(point.x - this.center.x, point.y - this.center.y);

        return vec1.angleTo(vec2);
    }

    /**
     * todo:需判断是否跨周期
     *  获取该点对应的参数
     */
    public getParamAt(point: XY): number {
        const OA = this.getPtAtAngle(this.startAngle).sub(this.getCenter());
        const OX = new Vector2(point).sub(this.getCenter());
        if (this.anticlockwise) {
            return OA.angleTo(OX) * this.radius;
        }
        return OX.angleTo(OA) * this.radius;
    }

    public static getArcParamByThreePoints(start: XY, ref: XY, end: XY): Arc2dInterface {
        const points = [new Vector2(start), new Vector2(ref), new Vector2(end)];
        const result = {
            type: GeometryType.enArc2D,
            center: new Vector2(),
            radius: 0,
            range: [0, 0],
            startAngle: 0,
            anticlockwise: true
        };
        if (points.length !== 3) {
            return result;
        }
        const p1 = points[0];
        const p2 = points[1];
        const p3 = points[2];
        const a = p1.x - p2.x;
        const b = p1.y - p2.y;
        const c = p1.x - p3.x;
        const d = p1.y - p3.y;
        const e = ((p1.x * p1.x - p2.x * p2.x) - (p2.y * p2.y - p1.y * p1.y)) * 0.5;
        const f = ((p1.x * p1.x - p3.x * p3.x) - (p3.y * p3.y - p1.y * p1.y)) * 0.5;
        const x0 = -(d * e - b * f) / (b * c - a * d);
        const y0 = -(a * f - c * e) / (b * c - a * d);

        result.center = new Vector2(x0, y0);
        result.radius = new Vector2(x0 - p1.x, y0 - p1.y).getLength();

        const OA = new Vector2(p1).sub(result.center);
        const OB = new Vector2(p3).sub(result.center);
        const OC = new Vector2(p2).sub(result.center);
        const startAngle = OA.angleFromX();

        let angleExtent;
        if (OC.clone().sub(OA).cross(OB.clone().sub(OC)) < 0) {
            result.anticlockwise = false;
            angleExtent = OB.angleTo(OA);
        } else {
            result.anticlockwise = true;
            angleExtent = OA.angleTo(OB);
        }

        result.range = [0, angleExtent * result.radius];
        result.startAngle = startAngle;

        return result;
    }

    // 根据圆弧上3点，重新确定center, radius, startAngle, angleExtent
    public applyTransform(m: Matrix3 | Matrix4): this {
        const p1 = this.getStartPt().applyTransform(m);
        const p2 = this.getMidPt().applyTransform(m);
        const p3 = this.getEndPt().applyTransform(m);
        const result = Arc2d.getArcParamByThreePoints(p1, p2, p3);
        this.center = new Vector2(result.center.x, result.center.y);
        this.radius = result.radius;
        this.range = new Interval(result.range[0], result.range[1]);
        this.anticlockwise = result.anticlockwise;
        if (!this.anticlockwise) {
            this.startAngle = result.range[1];
        } else {
            this.startAngle = result.range[0];
        }
        this.angleExtent = (result.range[1] - result.range[0]) / this.radius;
        if (!this.anticlockwise) {
            this.angleExtent = -this.angleExtent;
        }
        return this;
    }

    public clone() {
        return new Arc2d(this.center.clone(), this.radius, this.startAngle, this.angleExtent, this.anticlockwise);
    }

    /**
     * 获取某弧长处的切线，此处返回的切线已经考虑anticlockwise
     */
    public getTangentAt(t: number): Vector2 {
        const position = this.getPtAt(t).sub(this.center).normalize();
        if (this.anticlockwise) {
            return position.rotate(MathUtil.PI_2);
        }
        return position.rotate(-MathUtil.PI_2);
    }

    /**
     *  Curve2d
     *  曲线按给定距离进行偏移
     * @param dDist 等距量：>0 = 远离圆心; < 0 = 靠近圆心
     * @returns 是否等距成功：true = 是；false = 否
     */
    public offset(dDist: number): boolean {
        const middlePoint = this.getMidPt();
        const offset = middlePoint.sub(this.center).normalize().multi(dDist);
        this.center.add(offset);
        return true;
    }

    /**
     * 反向
     */
    public reverse(): this {
        this.startAngle = this.startAngle + this.angleExtent * this.getClockSign();
        this.anticlockwise = !this.anticlockwise;
        this.resetAngle();
        return this;
    }

    /**
     * 绕点的旋转
     */
    public rotate(angle: number, pivot: Vector2): this {
        this.center.rotate(angle, pivot);
        this.startAngle += angle * this.getClockSign();
        this.resetAngle();
        return this;
    }

    /**
     * 平移
     */
    public translate(offset: Vector2): this {
        this.center.add(offset);
        return this;
    }

    /**
     *  缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector2): this {
        this.center.scale(factor, center);
        this.radius *= factor;
        this.range.multi(factor);
        return this;
    }

    /**
     * 弧形包围盒
     */
    public getBoundingBox(): Box2 {
        const p1 = this.getStartPt();
        const p2 = this.getEndPt();
        const pointArray = [p1, p2];
        const maxAngle = Math.max(this.startAngle, this.startAngle + this.angleExtent * this.getClockSign());
        const minAngle = Math.min(this.startAngle, this.startAngle + this.angleExtent * this.getClockSign());
        const index = Math.floor(minAngle * 2 / MathUtil.PI);

        if (maxAngle > MathUtil.PI_2 + (index > 0 ? MathUtil.PI2 : 0)) {
            const top = this.getPtAtAngle(MathUtil.PI_2);
            pointArray.push(top);
        }
        if (maxAngle > MathUtil.PI + (index > 1 ? MathUtil.PI2 : 0)) {
            const left = this.getPtAtAngle(Math.PI);
            pointArray.push(left);
        }
        if (maxAngle > MathUtil.PI + MathUtil.PI_2 + (index > 2 ? MathUtil.PI2 : 0)) {
            const down = this.getPtAtAngle(Math.PI + MathUtil.PI_2);
            pointArray.push(down);
        }
        if (maxAngle > MathUtil.PI2) {
            const right = this.getPtAtAngle(MathUtil.PI2);
            pointArray.push(right);
        }
        return new Box2(pointArray);
    }

    /**
     * 抽取元数据，用于序列化
     */
    public toMetaData(): Arc2dInterface {
        return {
            type: this.getType(),
            center: this.center.toMetaData(),
            radius: this.radius,
            range: [this.range.min, this.range.max],
            startAngle: this.startAngle,
            anticlockwise: this.anticlockwise
        };
    }

    public toRenderObject(showDebugInfo: boolean): RenderObject {
        const render = new RenderObject(this.refId, 'Arc2d');

        const arr = this.discrete(0.1);
        const edgesArr = [];

        for (let i = 0; i < arr.length - 1; ++i) {
            edgesArr.push([i, i + 1]);
        }
        if (showDebugInfo) {
            const middleArcLength = this.range.getMid();
            const arrow = discreteArrow(
                this.getMidPt(),
                this.getTangentAt(middleArcLength),
                this.getLength() * 0.02) as Vector2[];
            arr.push(...arrow);
            edgesArr.push([arr.length - 3, arr.length - 2]);
            edgesArr.push([arr.length - 2, arr.length - 1]);

            // 画个包围盒，测试下包围盒大小是否正确
            // const box = this.getBoundingBox();
            // arr.push(box.min);
            // arr.push(box.max);
            // edgesArr.push([arr.length - 2, arr.length - 1]);
        }

        render.edges = edgesArr;
        render.vertices = arr.map((v) => {
            return Vector3.fromXY(v).toXYZ();
        });

        return render;
    }

    /**
     * 离散最大64段，最小32段
     * @param stepLength
     */
    public discrete(stepLength: number = 0.1): Vector2[] {
        const agl = stepLength / this.radius;
        let unitAngle = Math.max(Math.PI / 32, agl);
        unitAngle = Math.min(Math.PI / 16, unitAngle);

        let beginExtent = 0;
        const arr = [];
        while (beginExtent < this.angleExtent) {
            const p = this.getPtAtAngle(this.startAngle + beginExtent * this.getClockSign());
            arr.push(p);
            beginExtent += unitAngle;
        }
        const endPoint = this.getEndPt();
        arr.push(endPoint);
        return arr;
    }

    /**
     * 是否包含某个点, 即某点是否在该弧上
     */
    public containsPoint(point: Vector2 | XY): boolean {
        const pointArcLength = this.getParamAt(point);
        return this.getRange().containsPoint(pointArcLength);
    }

    /**
     * 获取角度的范围
     */
    public getAngleRange(): Interval {
        return new Interval(this.startAngle, this.startAngle + this.angleExtent * this.getClockSign(), true);
    }


    public getArea(): number {
        let area = 0;
        if (this.angleExtent < Math.PI) {
            area = this.radius * this.radius * (this.angleExtent * 0.5 - Math.cos(this.angleExtent * 0.5) * Math.sin(this.angleExtent * 0.5));
        } else {
            area = this.radius * this.radius * (this.angleExtent * 0.5 + Math.cos(this.angleExtent * 0.5) * Math.sin(this.angleExtent * 0.5));
        }
        return area * this.getClockSign();
    }

    // 构造直线两端点和坐标轴圆心点构成的三角形的重心点坐标和面积
    public getCentroidPoint(): { pt: Vector2; area: number } {
        throw new Error('not implement');
    }


}

export { Arc2d };
