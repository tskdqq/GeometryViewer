import { RenderObject } from '../algorithm/discrete/render_object';
import { PtToLineSignedDistance } from '../algorithm/distance/pt_to_line_signed_distance';
import { Box3 } from '../math/box3';
import { ErrorSystem } from '../math/error_system';
import { Interval } from '../math/interval';
import { Matrix4 } from '../math/matrix4';
import { Vector3 } from '../math/vector3';
import { XYZ } from '../math/xy';
import { DebugWarn } from '../util/debug_warn';
import { Curve3d } from './curve3d';
import { Line3dInterface } from './geo_interfaces';
import { GeometryType } from '../geometry/geometry_type';
import { discreteArrow } from '../algorithm/discrete_arrow';

/**
 * 三维直线
 */
class Line3d extends Curve3d {

    public static loadFromAny(jsObject: Line3dInterface): Line3d {
        const geo = Line3d.createByOriginAndDir(jsObject.origin, jsObject.dir, jsObject.range);
        return geo;
    }

    /**
     * 根据起点、方向和参数域构造直线
     * @param origin 
     * @param dir 
     * @param range 
     */
    public static createByOriginAndDir(origin: XYZ, dir: XYZ, range?: number[]) {
        const line = new Line3d();
        line.origin = new Vector3(origin);
        line.dir = new Vector3(dir);
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
    private dir: Vector3 = Vector3.unitX();
    // 原点
    private origin: Vector3 = Vector3.zero();

    constructor(startPt?: XYZ, endPt?: XYZ) {
        super();
        if (startPt && endPt) {
            this.resetByTwoPoint(startPt, endPt);
        }
    }

    /**
     * 获取原点
     */
    public getOrigin() {
        return this.origin.clone();
    }

    public setDirection(dir: XYZ) {
        this.dir = new Vector3(dir).normlize();
    }

    /**
     * 是否和另一条直线共线，使用距离容差判断，
     *
     * 共线：
     * 直线1的2个端点都在直线2上，或者直线2的2个端点都在直线1上
     * @param another
     * @param torlerance
     */
    public isColinearWith(another: Line3d, tolerance = ErrorSystem.LENGTH_EPS) {
        const ptOnLine = (point: Vector3, curve: Line3d) => {
            return Math.abs(PtToLineSignedDistance.ptToLine3d(point, curve)) < tolerance;
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
     * 是否与另一条直线平行
     * @param another 
     * @param torlerance 
     */
    public isParalellTo(another: Line3d, torlerance = ErrorSystem.DOUBLE_EPS) {
        return this.dir.isParalellTo(another.dir, torlerance);
    }

    /**
     * 是否与另一条直线垂直
     * @param another 
     * @param torlerance 
     */
    public isPerpendicularTo(another: Line3d, torlerance = ErrorSystem.DOUBLE_EPS) {
        return this.dir.isPerpendicularTo(another.dir, torlerance);
    }

    /**
     * 几何对象的类型
     */
    public getType() {
        return GeometryType.enLine3D;
    }

    /**
     * 获取某参数对应的点
     */
    public getPtAt(t: number): Vector3 {
        return this.dir.clone().multi(t).add(this.origin);
    }

    /**
     *  获取某参数对应的点
     */
    public getParamAt(point: XYZ | Vector3): number {
        let param;
        if (point instanceof Vector3) {
            param = point;
        } else {
            param = new Vector3(point);
        }
        const footPt = Vector3.zero();
        PtToLineSignedDistance.ptToLine3d(param, this, footPt);

        footPt.sub(this.origin);

        return footPt.dot(this.dir);
    }

    /**
     * 获取某参数处的切线
     */
    public getTangentAt(t: number): Vector3 {
        return this.getDirection();
    }

    /**
     * 获取直线方向,单位向量,返回方向的拷贝
     */
    public getDirection(): Vector3 {
        return this.dir.clone();
    }

    /**
     *  反向
     */
    public reverse(): this {
        this.dir.reverse();
        [this.range.min, this.range.max] = [-this.range.max, -this.range.min];
        return this;
    }

    /**
     * 变换
     */
    public applyTransform(m: Matrix4): this {
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
    public getBoundingBox(): Box3 {
        return new Box3([this.getStartPt(), this.getEndPt()]);
    }

    public clone(): Line3d {
        return new Line3d(this.getStartPt(), this.getEndPt());
    }

    /**
     * 抽取元数据，用于序列化
     */
    public toMetaData(): Line3dInterface {
        return {
            type: this.getType(),
            origin: this.origin.toMetaData(),
            dir: this.dir.toMetaData(),
            range: this.getRange().toMetaData()
        };
    }

    public toRenderObject(showDebugInfo: boolean): RenderObject {
        const render = new RenderObject(this.refId, 'Line3d');

        const v1 = this.getStartPt();
        const v2 = this.getEndPt();
        const arr = [v1, v2];
        render.edges = [[0, 1]];

        if (showDebugInfo) {
            const arrow = discreteArrow(this.getMidPt(), this.getDirection(), this.getLength() * 0.02) as Vector3[];
            arr.push(...arrow);
            render.edges.push([2, 4]);
        }

        render.vertices = arr.map((v) => {
            return v.toXYZ();
        });
        return render;
    }

    private resetByTwoPoint(start: XYZ, end: XYZ) {
        const p0 = new Vector3(start);
        const p1 = new Vector3(end);
        //  p0p1
        const p0p1 = p1.clone().sub(p0);
        const len = p0p1.getLength();
        p0p1.normlize();

        this.dir = p0p1;
        this.origin = p0;
        this.range = new Interval(0, len);
    }
}

export { Line3d };
