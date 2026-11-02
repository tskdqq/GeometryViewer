import { RenderObject } from '../algorithm/discrete/render_object';
import { PtToLineSignedDistance } from '../algorithm/distance/pt_to_line_signed_distance';
import { Box2 } from '../math/box2';
import { ErrorSystem } from '../math/error_system';
import { Interval } from '../math/interval';
import { Matrix3 } from '../math/matrix3';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { XY } from '../math/xy';
import { DebugWarn } from '../util/debug_warn';
import { MathUtil } from '../util/math_util';
import { Curve2d } from './curve2d';
import { GeometryType } from '../geometry/geometry_type';
import { Line2dInterface } from './geo_interfaces';
import { discreteArrow } from '../algorithm/discrete_arrow';
import { LogUtil } from '../util/log_util';

/**
 * 二维直线
 */
class Line2d extends Curve2d {

    public static loadFromAny(lineData: Line2dInterface): Line2d {
        const geo = Line2d.createByOriginAndDir(
            lineData.origin,
            lineData.dir,
            lineData.range);

        return geo;
    }

    /**
     * 根据起点、方向和参数域构造直线
     * @param origin 
     * @param dir 
     * @param range 
     */
    public static createByOriginAndDir(origin: XY, dir: XY, range?: number[]) {
        const line = new Line2d();
        line.origin = new Vector2(origin);
        line.dir = new Vector2(dir);
        line.dir.normlize();

        if (range) {
            DebugWarn.assert(range.length === 2, "range's length must be 2");
            line.setRange(range[0], range[1]);
        } else {
            line.setRange(-ErrorSystem.MODEL_MAX_LENGTH, ErrorSystem.MODEL_MAX_LENGTH);
        }
        return line;
    }

    // 方向,单位向量
    private dir: Vector2 = Vector2.unitX();
    // 原点
    private origin: Vector2 = Vector2.zero();

    constructor(startPt?: XY, endPt?: XY) {
        super();
        if (startPt && endPt) {
            this.resetByTwoPoint(startPt, endPt);
        }
        // 默认是x射线
    }

    /**
     *  获取原点
     */
    public getOrigin() {
        return this.origin.clone();
    }

    /**
     *   
     */
    public setOrigin(origin: Vector2) {
        return this.origin = origin.clone();
    }

    /**
     *  获取直线方向,单位向量,返回方向的拷贝
     */
    public getDirection(): Vector2 {
        return this.dir.clone();
    }

    public setDirection(dir: XY) {
        this.dir = new Vector2(dir).normlize();
    }

    /**
     * 是否和另一条直线平行
     * @param another 
     * @param torlerance 
     */
    public isParalellTo(another: Line2d, torlerance = ErrorSystem.ANGLE_EPS) {
        return this.dir.isParalellTo(another.dir, torlerance);
    }

    /**
     * 是否和另一条直线共线，使用距离容差判断，
     * 
     * 共线：
     * 直线1的2个端点都在直线2上，或者直线2的2个端点都在直线1上
     * @param another
     * @param torlerance
     */
    public isColinearWith(another: Line2d, tolerance = ErrorSystem.LENGTH_EPS) {
        const ptOnLine = (point: Vector2, curve: Line2d) => {
            return Math.abs(PtToLineSignedDistance.ptToLine2d(point, curve)) < tolerance;
        };

        const thisOnAnother = ptOnLine(this.getStartPt(), another)
            && ptOnLine(this.getEndPt(), another);

        if (thisOnAnother) {
            return true;
        }

        return ptOnLine(another.getStartPt(), this)
            && ptOnLine(another.getEndPt(), this);
    }

    /**
     * 是否和另一条直线垂直
     * @param another 
     * @param torlerance 
     */
    public isPerpendicularTo(another: Line2d, torlerance = ErrorSystem.ANGLE_EPS) {
        return this.dir.isPerpendicularTo(another.dir, torlerance);
    }

    /**
     * 获取某参数对应的点
     */
    public getPtAt(t: number): Vector2 {
        return this.dir.clone().multi(t).add(this.origin);
    }

    /**
     *  获取某参数对应的点
     */
    public getParamAt(point: XY): number {
        const ab = new Vector2(point).sub(this.origin);
        return ab.dot(this.dir);
    }

    /**
     * 获取某参数处的切线
     */
    public getTangentAt(t: number): Vector2 {
        return this.getDirection();
    }

    /**
     * 反向
     */
    public reverse(): this {
        this.dir.reverse();
        [this.range.min, this.range.max] = [-this.range.max, -this.range.min];
        return this;
    }

    /**
     *  Curve2d
     *  曲线按给定距离进行偏移
     * @param dDist 等距量：>0 = 右侧；<0 = 左侧
     * @returns 是否等距成功：true = 是；false = 否
     */
    public offset(dDist: number): boolean {
        const dir = this.getDirection();
        dir.rotate(-MathUtil.PI_2);
        const offset = dir.clone().multi(dDist);
        this.origin.add(offset);
        return true;
    }


    /**
     * 几何对象的类型
     */
    public getType() {
        return GeometryType.enLine2D;
    }

    public applyTransform(m: Matrix3): this {
        this.origin.applyTransform(m);
        this.dir.vecApplyTransform(m);

        const scale = this.dir.getLength();
        this.dir.normalize();
        this.range.multi(scale);

        return this;
    }

    /**
     * 计算包围盒
     */
    public getBoundingBox(): Box2 {
        return new Box2([this.getStartPt(), this.getEndPt()]);
    }

    /**
     * 抽取元数据，用于序列化
     */
    public toMetaData(): Line2dInterface {
        return {
            type: this.getType(),
            origin: this.origin.toMetaData(),
            dir: this.dir.toMetaData(),
            range: [this.getRange().min, this.getRange().max]
        };
    }

    public toRenderObject(showDebugInfo: boolean): RenderObject {
        const render = new RenderObject(this.refId, 'Line2d');
        const v1 = this.getStartPt();
        const v2 = this.getEndPt();

        const arr = [v1, v2];
        render.edges = [[0, 1]];

        if (showDebugInfo) {
            const arrow = discreteArrow(this.getMidPt(), this.getDirection(), this.getLength() * 0.02) as Vector2[];
            arr.push(...arrow);
            render.edges.push([2, 4]);
        }

        render.vertices = arr.map((v) => {
            return Vector3.fromXY(v).toXYZ();
        });

        return render;
    }

    public clone() {
        const line = Line2d.createByOriginAndDir(this.origin, this.dir, [this.range.min, this.range.max]);
        return line;
    }

    // 构造直线两端点和坐标轴圆心点构成的三角形的重心点坐标和面积
    public getCentroidPoint(): { pt: Vector2; area: number } {
        let twicearea: number = 0;
        const stPt = this.getStartPt();
        const endPt = this.getEndPt();
        twicearea = stPt.cross(endPt);
        // 方便理解
        // let x: number = 0;
        // let y: number = 0;
        // let f: number = 0;
        // f = stPt.cross(endPt);
        // twicearea += f;
        // x += (stPt.x + endPt.x) * f;
        // y += (stPt.y + endPt.y) * f;
        // f = twicearea * 3;
        // return { pt: new Vector2(x / f, y / f), area: twicearea / 2 };
        return { pt: stPt.add(endPt).div(3), area: twicearea / 2 };
    }

    private resetByTwoPoint(start: XY, end: XY) {
        const p0 = new Vector2(start);
        const p1 = new Vector2(end);
        if (p0.equals(p1, 1e-8)) {
            if (LogUtil.showError) {
                console.error('two points are too near to determine line direction');
            }
        }
        //  p0p1
        const p0p1 = p1.clone().sub(p0);
        const len = p0p1.getLength();

        this.dir = p0p1.normlize();
        this.origin = p0;
        this.range = new Interval(0, len);
    }
}

export { Line2d };

