import { RenderObject } from '../algorithm/discrete/render_object';
import { Box3 } from '../math/box3';
import { Coordinate3 } from '../math/coordinate3';
import { Matrix4 } from '../math/matrix4';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { XY, XYZ } from '../math/xy';
import { DebugWarn } from '../util/debug_warn';
import { PlaneInterface } from './geo_interfaces';
import { GeometryType } from '../geometry/geometry_type';
import { Line2d } from './line2d';
import { Line3d } from './line3d';
import { Surface } from './surface';
import { Curve2d } from './curve2d';
import { Arc2d } from './arc2d';
import { Arc3d } from './arc3d';
import { Curve3d } from './curve3d';
import { MathUtil } from '../util/math_util';

/**
 * 平面
 */
class Plane extends Surface {

    public static XOY(z: number = 0) {
        return new Plane(new Vector3(0, 0, z), Vector3.unitX(), Vector3.unitY());
    }

    public static loadFromAny(jsObj: PlaneInterface): Plane {
        const origin = new Vector3(jsObj.origin);
        const dirU = new Vector3(jsObj.dirU);
        const dirV = new Vector3(jsObj.dirV);

        return new Plane(origin, dirU, dirV);
    }

    // u 向
    public dirU: Vector3 = Vector3.unitX();
    // v向 与U向正交
    public dirV: Vector3 = Vector3.unitY();
    // 基点，U、V 向参数在该点都是 0

    // 平面法向，计算出来的数据
    public readonly norm: Vector3;

    private origin: Vector3 = Vector3.zero();


    /**
     * 原点+UV方向,当uv方向不垂直时，以U向为准，调整v向
     * @param origin 
     * @param dirU 
     * @param dirV 
     */
    constructor(origin: XYZ, dirU: XYZ, dirV: XYZ);

    /**
     * 原点+法向， UV方向会自动计算出来
     * @param origin 
     * @param norm 
     */
    constructor(origin: XYZ, norm: XYZ);

    /**
     * 坐标系 当uv方向不垂直时，以U向为准，调整v向
     * @param origin 
     * @param dirU 
     * @param dirV 
     */
    constructor(coordinate: Coordinate3);

    constructor(a?: any, b?: XYZ, c?: XYZ) {
        super();

        if (a instanceof Coordinate3) {
            this.origin = new Vector3(a.origin);
            this.dirU = new Vector3(a.xDir);
            this.dirV = new Vector3(a.yDir);
        } else if (a && b && !c) {
            this.origin = new Vector3(a);
            this.norm = new Vector3(b);
            this.norm.normalize();
            let ref = Vector3.unitX();
            if (this.norm.isParalellTo(Vector3.unitX())) {
                ref = Vector3.unitY();
            }
            this.dirU = this.norm.cross(ref);
            this.dirU.normalize();

            this.dirV = this.norm.cross(this.dirU);
            this.dirV.normalize();

            return;
        } else if (a && b && c) {
            this.origin = new Vector3(a);
            this.dirU = new Vector3(b);
            this.dirV = new Vector3(c);
        }

        this.dirU.normlize();
        this.dirV.normlize();
        DebugWarn.assert(!this.dirU.isParalellTo(this.dirV), '无法确定法向');

        this.norm = this.dirU.cross(this.dirV);
        this.norm.normlize();
        this.dirV = this.norm.cross(this.dirU);
        this.dirV.normlize();
    }

    /**
     * 平面原点
     */
    public getOrigin(): Vector3 {
        return this.origin.clone();
    }

    /**
     * 平面原点
     */
    public setOrigin(origin: Vector3) {
        this.origin = origin.clone();
    }

    /**
     * 获取平面的局部坐标系
     */
    public toCoordinate(): Coordinate3 {
        return new Coordinate3(this.origin.clone(), this.dirU.clone(), this.dirV.clone());
    }

    /**
     * 将局部坐标系下的（u,v,w）转换到世界坐标
     */
    public toMatrix4(): Matrix4 {
        return this.toCoordinate().toMatrix4();
    }

    public reverse(): this {
        this.dirV.reverse();
        this.norm.reverse();
        return this;
    }

    public getPtAt(uv: XY): Vector3 {
        const { x, y } = uv;
        const du = this.dirU.clone();
        const dv = this.dirV.clone();

        return du.multi(x)
            .add(dv.multi(y))
            .add(this.origin);
    }

    public getNorm() {
        return this.norm.clone();
    }

    public getNormAt(uv: Vector2) {
        return this.norm.clone();
    }

    /** 
     * 缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector3 = Vector3.zero()): this {
        const m = new Matrix4().applyScale(center, factor);
        this.origin.applyTransform(m);
        this.dirU.normalize();
        this.dirV.normalize();
        this.norm.normalize();

        DebugWarn.assert(this.dirU.isPerpendicularTo(this.dirV));
        return this;
    }

    /**
     * 获取三维点处的uv值，（反求参数）
     * @param uv 
     */
    public getUVAt(pt: XYZ): Vector2 {
        const OA = new Vector3(pt).sub(this.origin);

        const x = OA.dot(this.dirU);
        const y = OA.dot(this.dirV);

        return new Vector2(x, y);
    }

    public getLine3DByPts(uv1: XY, uv2: XY): Line3d {
        const p1 = this.getPtAt(uv1);
        const p2 = this.getPtAt(uv2);
        if (p1.equals(p2, 1e-8)) {
            throw new Error('cant create line');
        }
        return new Line3d(p1, p2);
    }

    public getLine3D(line2d: Curve2d): Line3d {
        return this.getLine3DByPts(line2d.getStartPt(), line2d.getEndPt());
    }

    public isCoplanar(other: Plane): boolean {
        if (this.norm.isParalellTo(other.getNorm()) && MathUtil.isNearlyZero(new Vector3(this.origin.clone().sub(other.getOrigin())).dot(this.norm))) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * 返回undefined说明line3d投影成了1个点
     * @param line3d 
     */
    public getLine2D(line3d: Line3d): Line2d | undefined {
        const p1 = this.getUVAt(line3d.getStartPt());
        const p2 = this.getUVAt(line3d.getEndPt());
        if (p1.equals(p2)) {
            return;
        }

        return new Line2d(p1, p2);
    }

    /**
     * 将三维曲线，转成参数域中的二维曲线
     * @param curveOnSurface 
     */
    public getCurve2d(curveOnSurface: Curve3d): Curve2d | undefined {
        if (curveOnSurface.getType() === GeometryType.enLine3D) {
            return this.getLine2D(curveOnSurface as Line3d);
        } else if (curveOnSurface.getType() === GeometryType.enArc3D) {
            DebugWarn.assert(this.norm.isParalellTo((curveOnSurface as Arc3d).coordinate.zDir));
            // todo:改成矩阵变换
            const s = this.getUVAt(curveOnSurface.getStartPt());
            const m = this.getUVAt(curveOnSurface.getMidPt());
            const e = this.getUVAt(curveOnSurface.getEndPt());

            return Arc2d.createByThreePoints(s, m, e);
        }
        throw new Error('暂不支持该种类型');
    }

    /**
     * 将参数域中的二维曲线转成三维曲线
     * @param curve 
     */
    public getCurve3d(curve: Curve2d): Curve3d {
        if (curve.getType() === GeometryType.enLine2D) {
            return this.getLine3D(curve);
        } else if (curve.getType() === GeometryType.enArc2D) {
            return new Arc3d(this.toCoordinate(), curve as Arc2d);
        }
        throw new Error('暂不支持该种类型');
    }


    public getType(): GeometryType.enPlane {
        return GeometryType.enPlane;
    }

    /**
     * 
     *  计算包围盒
     */
    public getBoundingBox(): Box3 {
        throw new Error('not implement');
    }

    /**
     *  乘上一个变换矩阵
     */
    public applyTransform(m: Matrix4): this {
        this.origin.applyTransform(m);
        this.dirU.vecApplyTransform(m);
        this.dirV.vecApplyTransform(m);
        (this as any).norm = this.dirU.cross(this.dirV);

        DebugWarn.assert(this.dirU.getLength() > 1e-6);
        DebugWarn.assert(this.dirV.getLength() > 1e-6);
        DebugWarn.assert(this.norm.getLength() > 1e-6);
        this.dirU.normalize();
        this.dirV.normalize();
        this.norm.normalize();

        DebugWarn.assert(this.dirU.isPerpendicularTo(this.dirV));
        return this;
    }

    /**
     *  深拷贝
     */
    public clone(): Plane {
        return new Plane(this.origin, this.dirU, this.dirV);
    }

    /**
     *  抽取元数据，用于序列化
     * @returns 返回js对象
     */
    public toMetaData(): PlaneInterface {
        return {
            type: this.getType(),
            origin: this.origin.toMetaData(),
            dirU: this.dirU.toMetaData(),
            dirV: this.dirV.toMetaData()
        };
    }

    public toRenderObject(showDebugInfo: boolean): RenderObject {
        return new RenderObject(this.refId, 'Plane');
    }
}

export { Plane };
