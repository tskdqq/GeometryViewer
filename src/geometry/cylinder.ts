import { RenderObject } from '../algorithm/discrete/render_object';
import { XY, XYZ } from '../math/xy';
import { Box3 } from '../math/box3';
import { Matrix4 } from '../math/matrix4';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { Coordinate3 } from '../math/coordinate3';
import { CylinderInterface } from './geo_interfaces';
import { GeometryType } from '../geometry/geometry_type';
import { Surface } from './surface';
import { Arc2d } from './arc2d';
import { Line2d } from './line2d';
import { Line3d } from './line3d';
import { Curve3d } from './curve3d';
import { Arc3d } from './arc3d';
import { DebugWarn } from '../util/debug_warn';

/**
 * 圆柱面 = 平面 + 2d圆弧 拉伸方向
 */
export class Cylinder extends Surface {

    public static loadFromAny(jsObj: CylinderInterface): Cylinder {
        const coord = new Coordinate3(jsObj.coord.origin, jsObj.coord.xDir, jsObj.coord.yDir);
        const cylinder = new Cylinder(coord, Arc2d.loadFromAny(jsObj.arc2d));
        return cylinder;
    }

    /**
     * 局部坐标系，代表的是平面及拉伸方向
     */
    private _coordinate3: Coordinate3;

    /**
     * 2d圆弧
     */
    private _arc2d: Arc2d;


    /**
     * 原点+UV方向,当uv方向不垂直时，以U向为准，调整v向
     * @param origin 
     * @param dirU 
     * @param dirV 
     */
    constructor(coordinate3: Coordinate3, arc2d: Arc2d) {
        super();
        this._coordinate3 = coordinate3.clone();
        this._arc2d = arc2d;
    }

    public reverse(): this {
        throw new Error('not implement');
    }

    public getPtAt(uv: XY): Vector3 {
        const { x, y } = this._arc2d.getPtAt(uv.x);
        return this._coordinate3.getWorldPtAt({ x, y, z: uv.y });
    }

    public getNormAt(uv: Vector2) {
        const { x, y } = this._arc2d.getPtAt(uv.x);
        return this._coordinate3.getWorldVectorAt({ x, y, z: uv.y });
    }

    /**
     * 获取三维点处的uv值，（反求参数）
     * @param uv 
     */
    public getUVAt(pt: XYZ): Vector2 {
        const uvw = this._coordinate3.getLocalPtAt(pt);

        const x = this._arc2d.getParamAt(uvw);
        const y = uvw.z;

        return new Vector2(x, y);
    }

    public getType(): GeometryType.enCylinder {
        return GeometryType.enCylinder;
    }

    public getCurve2d(curveOnSurface: Curve3d): Line2d {
        if (curveOnSurface.getType() === GeometryType.enLine3D) {
            DebugWarn.assert((curveOnSurface as Line3d).getDirection().isParalellTo(this._coordinate3.zDir), '暂不支持');
        } else if (curveOnSurface.getType() === GeometryType.enArc3D) {
            DebugWarn.assert((curveOnSurface as Arc3d).coordinate.zDir.isParalellTo(this._coordinate3.zDir), '暂不支持');
        }

        const s = this._coordinate3.getLocalPtAt(curveOnSurface.getStartPt());
        const e = this._coordinate3.getLocalPtAt(curveOnSurface.getEndPt());

        const uv1 = new Vector2(this._arc2d.getParamAt(s.toVector2()), s.z);
        const uv2 = new Vector2(this._arc2d.getParamAt(e.toVector2()), e.z);

        return new Line2d(uv1, uv2);
    }


    public getCurve3d(line2d: Line2d): Curve3d {
        const uv0 = line2d.getStartPt();
        const uv05 = line2d.getMidPt();
        const uv1 = line2d.getEndPt();

        const { x: x1, y: y1 } = this._arc2d.getPtAt(uv0.x);
        const start = this._coordinate3.getWorldPtAt({ x: x1, y: y1, z: uv0.y });
        const { x: x2, y: y2 } = this._arc2d.getPtAt(uv1.x);
        const end = this._coordinate3.getWorldPtAt({ x: x2, y: y2, z: uv1.y });

        if (line2d.getDirection().isParalellTo(Vector2.unitY())) {
            return new Line3d(start, end);
        }

        if (line2d.getDirection().isParalellTo(Vector2.unitX())) {
            const { x: x05, y: y05 } = this._arc2d.getPtAt(uv05.x);
            const mid = this._coordinate3.getWorldPtAt({ x: x05, y: y05, z: uv05.y });

            return Arc3d.createArc3dBy3Pts(start, end, mid)!;
        }

        throw new Error('暂时不支持该类型');
    }

    /**
     * 
     *  计算包围盒
     */
    public getBoundingBox(): Box3 {
        throw new Error('not implement');
    }

    public applyTransform(m: Matrix4): this {
        throw new Error('not implement');
    }

    /** 
     * 缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector3 = Vector3.zero()): this {
        throw new Error('not implement');
    }

    public toRenderObject() {
        return new RenderObject(this.refId, '柱面');
    }

    public clone() {
        return new Cylinder(this._coordinate3.clone(), this._arc2d.clone());
    }

    public toMetaData(): CylinderInterface {
        return {
            type: GeometryType.enCylinder,
            coord: this._coordinate3.toMetaData(),
            arc2d: this._arc2d.toMetaData()
        };
    }
}
