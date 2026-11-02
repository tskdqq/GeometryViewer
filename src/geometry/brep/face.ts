/* tslint:disable:no-void-expression */
import { RenderObject } from '../../algorithm/discrete/render_object';
import { DiscreteUtil } from '../../algorithm/discrete_util';
import { Box3 } from '../../math/box3';
import { Vector2 } from '../../math/vector2';
import { Vector3 } from '../../math/vector3';
import { XY, XYZ } from '../../math/xy';
import { FaceInterface } from '../geo_interfaces';
import { GeometryType } from '../../geometry/geometry_type';
import { Plane } from '../plane';
import { Surface } from '../surface';
import { Edge } from './edge';
import { Polygon } from './polygon';
import { TopoObject } from './topo_objecet';
import { Matrix4 } from '../../math/matrix4';
import { Loop } from './loop';
import { Coedge } from './coedge';
import { ErrorSystem } from '../../math/error_system';
import { ReflectSurface } from '../reflect_surface';
import { DebugWarn } from '../../util/debug_warn';
import { Line3d } from '../line3d';
import { Shell } from './shell';
import { TopoTrackType } from './topo_track_type';
import { Line2d } from '../line2d';

/**
 * @author tiansk
 *  拓扑面（有边界的面）
 */
class Face extends TopoObject {

    public static loadFromAny(jsObj: FaceInterface) {
        const surface = ReflectSurface.execute(jsObj.surface);
        const polygon = Polygon.loadFromAny(jsObj.polygon);
        const face = new Face(surface, jsObj.sameDirWithSurface, polygon);
        face.copyInternalDataFrom(jsObj);
        return face;
    }

    /**
     * 根据一条直线拉伸出一个face，
     * @param startPt 
     * @param endPt 
     * @param dir 
     * @param height 
     * @param reverseWhenHeightPositive  当拉伸高度小于0，face是否反向。拉伸体操作为true，挤压操作为false
     */
    public static createByExtrude(startPt: Vector3, endPt: Vector3, dir: Vector3, height: number, reverseWhenHeightPositive = false) {
        const extrudeDir = dir.clone().normlize();

        const len = extrudeDir.clone().multi(height);
        const pts = [startPt, endPt, endPt.clone().add(len), startPt.clone().add(len)];

        // x 方向
        const xDir = endPt.clone().sub(startPt);
        xDir.normlize();

        // z 方向
        const zDir = xDir.cross(extrudeDir);

        // y 方向
        const yDir = zDir.cross(xDir);
        if (height < 0 && reverseWhenHeightPositive) {
            yDir.reverse();
        }

        const plane: Plane = new Plane(startPt, xDir, yDir);

        const polygon = new Polygon(pts.map((pt) => {
            return plane.getUVAt(pt);
        }));

        if (polygon.calcArea() < 0) {
            polygon.reverse();
        }

        return new Face(plane, true, polygon);
    }

    // 确定face的边界
    private polygon: Polygon;
    // 确定face的形状
    private surface: Surface;
    // face与Surface方向是否一致
    private sameDirWithSurface: boolean;

    constructor(surface: Surface, sameDirWithSurface: boolean, polygon: Polygon);
    constructor(loop3d: Line3d[], norm: Vector3);

    constructor(parm1: any, parm2: any, parm3?: any) {
        super();
        let surface: Surface;
        let sameDirWithSurface: boolean;
        let polygon: Polygon;
        if (Array.isArray(parm1)) {
            DebugWarn.assert(parm1.length);
            const origin = parm1[0].getStartPt();
            surface = new Plane(origin, parm2);
            const pts: Line2d[] = [];
            parm1.map(l => {
                const l2 = (surface as Plane).getLine2D(l);
                if (l2) { pts.push(l2); }
            });
            const loop = new Loop(pts);
            if (!loop.isAnticlockwise()) {
                loop.reverse();
            }
            polygon = new Polygon(loop);
            sameDirWithSurface = true;
        } else {
            surface = parm1;
            sameDirWithSurface = parm2;
            polygon = parm3;
        }

        this.surface = surface;
        this.sameDirWithSurface = sameDirWithSurface;
        this.polygon = polygon;
        this.polygon.setParent(this);
    }

    /**
     * 获取任意点的法矢
     * @param uv 
     */
    public getNormAt(uv: XY) {
        const norm = this.getSurface().getNormAt(uv);
        if (this.sameDirWithSurface) {
            return norm;
        }
        return norm.reverse();
    }

    /**
     * 获取参数域中的点对应的3维坐标中的点
     * @param uv 
     */
    public getPtAt(uv: XY) {
        return this.surface.getPtAt(uv);
    }

    /**
     * 获取中心点的法矢
     * @param uv 
     */
    public getCenterNorm(): Vector3 {
        if (this.isPlane()) {
            return this.getNormAt(Vector2.zero());
        }
        return this.getNormAt(this.polygon.getCentroidPoint());
    }

    /**
     * 获取中心点
     */
    public getCentroidPoint(): Vector3 {
        return this.getPtAt(this.polygon.getCentroidPoint());
    }

    public setSurface(surface: Surface) {
        this.surface = surface.clone();
    }

    public getSurface() {
        return this.surface;
    }

    public getPolygon() {
        return this.polygon;
    }

    public setPolygon(polygon: Polygon): this {
        this.polygon = polygon;
        this.polygon.setParent(this);
        return this;
    }

    /**
     * 根据tag获取Loop
     * @param index 
     */
    public getLoopByTag(uuid: string): Loop | undefined {
        if (!this.getPolygon()) {
            return undefined;
        }
        return this.getPolygon().getLoopByTag(uuid);
    }

    /**
     * 根据tag获取Coedge
     * @param index 
     */
    public getCoedgeByTag(uuid: string): Coedge | undefined {
        if (!this.getPolygon()) {
            return undefined;
        }
        return this.getPolygon().getCoedgeByTag(uuid);
    }

    /**
     * 获取所有的coedges
     * @param index 
     */
    public getTopoCoedges(): Coedge[] {
        return this.getPolygon().getCoedges();
    }

    /**
     * 获取所有的edge
     */
    public getTopoEdges(): Edge[] {
        const edges: Edge[] = [];
        const ces = this.getTopoCoedges();
        ces.forEach(ce => {
            const edge = ce.getTopoEdge() as Edge;
            if (edge) {
                edges.push(edge);
            }
        });
        return edges;
    }

    /**
     * 获取有共边的Face
     */
    public getTwinFaces(): Face[] {
        const faces: Set<Face> = new Set();
        const ces = this.getTopoCoedges();
        ces.forEach(ce => {
            const twin = ce.getTwin();
            if (twin) {
                const twinFace = twin.getTopoFace();
                if (twinFace) {
                    faces.add(twinFace);
                }
            }
        });
        return [...faces];
    }

    /**
     * 解除与edge的引用
     */
    public clearTopoEdges() {
        this.getTopoCoedges().forEach(ce => {
            (ce as any)._edgeId = undefined;
            (ce as any)._sameDirWithEdge = undefined;
        });

    }

    /**
     * 获取所有的edge
     */
    public getTopoBody(): Shell | undefined {
        return this.getParent() as Shell;
    }

    public getType() {
        return GeometryType.enFace;
    }

    public isSameDirWithSurface() {
        return this.sameDirWithSurface;
    }

    /**
     * 任意取face上的一点
     */
    public getSomePoint(): Vector3 {
        const uv = this.polygon.getLoops()[0].getCoedges()[0].curve.getMidPt();
        return this.surface.getPtAt(uv);
    }

    /**
     *  Edge和face互相引用。根据三维边，反求二维边，并使face、coedge和edge互相引用
     */
    public makeEdgeAndFaceRefEachOther(edge: Edge, tolerance: number = ErrorSystem.DOUBLE_EPS) {
        // 将三维曲线转为2D曲线
        const cv2d = this.surface.getCurve2d(edge.curve)!;
        DebugWarn.assert(cv2d);

        for (const loop of this.polygon.getLoops()) {
            for (const coedge of loop.getCoedges()) {

                const equl = cv2d.equals(coedge.curve, tolerance);

                if (equl) {
                    edge.addCoEdgeInfo(coedge.tag);
                    coedge.setEdgeInfo(edge.tag, equl === 1);
                    return;
                }
            }
        }

        throw new Error("can't find, error?");
    }

    /**
     *  尝试Edge和face互相引用，。根据三维边，反求二维边，并使face、coedge和edge互相引用
     */
    public tryToMakeEdgeAndFaceRefEachOther(edge: Edge, tolerance: number = ErrorSystem.DOUBLE_EPS) {
        try {
            this.makeEdgeAndFaceRefEachOther(edge, tolerance);
            return true;
        } catch (e) {
            return false;
        }
    }


    /**
     *  计算包围盒
     */
    public getBoundingBox(): Box3 {
        const pts: XYZ[] = [];

        this.polygon.toPaths().forEach(path =>
            path.forEach(p => {
                pts.push(this.surface.getPtAt(p));
            }));

        return new Box3(pts);
    }

    /**
     * 
     *  s平移
     */
    public translate(offset: Vector3): this {
        this.surface.translate(offset);
        return this;
    }

    public rotate(angle: number, pivot: Vector3, axis: Vector3): this {
        this.surface.rotate(angle, pivot, axis);
        return this;
    }

    /**
     *  缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector3 = Vector3.zero()): this {
        const c = this.surface.getUVAt(center);
        this.polygon.scale(factor, c);
        this.surface.scale(factor, center);
        return this;
    }

    public applyTransform(m: Matrix4): this {
        this.surface.applyTransform(m);
        // 暂时不提供缩放
        return this;
    }

    /**
     *  转化为可渲染的对象
     */
    public toRenderObject(showDebugInfo: boolean): RenderObject {
        // face
        const render = new RenderObject(this.refId, 'Face_' + this.simpleUUID());

        // polygon
        const polygonRender = this.polygon.toRenderObject(showDebugInfo);
        polygonRender.isDebug = true;

        const surface = this.surface.toRenderObject(showDebugInfo);

        let polygonTri;

        // plane
        if (this.surface.getType() === GeometryType.enPlane) {
            // plane
            const origin = (this.surface as Plane).getOrigin();
            surface.vertices = [origin.toXYZ(), (this.surface as Plane).getNorm().multi(50).add(origin)];
            surface.edges = [[0, 1]];
            surface.isDebug = true;

            // 离散
            polygonTri = DiscreteUtil.tessPolygon(this.polygon, 0.1);

        } else if (this.surface.getType() === GeometryType.enCylinder) {
            // 
            polygonTri = DiscreteUtil.tessPolygon(this.polygon, 0.1, Vector2.unitX());
        } else {
            throw new Error('暂不支持该面的类型');
        }

        render.vertices = polygonTri.vertices.map((uv) => {
            return this.surface.getPtAt(uv).toXYZ();
        });

        render.faces = polygonTri.faces;
        if (render.faces && !this.sameDirWithSurface) {
            render.faces.forEach(face => {
                const t = face[0];
                face[0] = face[1];
                face[1] = t;
            });
        }

        // face的法矢
        if (this.surface.getType() === GeometryType.enPlane) {
            const norm = this.surface.getNormAt(Vector2.zero());
            if (!this.sameDirWithSurface) {
                norm.reverse();
            }
            render.normals = render.faces.map(() => {
                return norm.toXYZ();
            });
        } else {
            // throw new Error('暂没有实现该类型');
            render.normals = [];
        }

        const sameDir = (this.sameDirWithSurface ? '同向' : '反向');
        render.children = [polygonRender, surface, new RenderObject(-this.refId - 3, sameDir)];
        return render;
    }

    /**
     *  深拷贝
     */
    public clone(): Face {
        const sur = this.surface.clone();
        const poly = this.polygon.clone();
        const face = new Face(sur, this.sameDirWithSurface, poly);
        return face;
    }


    /**
     * clone的时候保持tag和拓扑
     */
    public cloneAndReserveTag(): Face {
        const sur = this.surface.clone();
        const poly = this.polygon.cloneAndReserveTag();
        const face = new Face(sur, this.sameDirWithSurface, poly);
        face.copyInternalDataFrom(this);
        return face;
    }

    /**
     * 是否是平面
     */
    public isPlane() {
        return this.surface.getType() === GeometryType.enPlane;
    }

    /**
     *  抽取元数据，用于序列化
     * @returns 返回js对象
     */
    public toMetaData(): FaceInterface {
        const meta = {
            type: this.getType(),
            tag: this.tag,
            sameDirWithSurface: this.sameDirWithSurface,
            polygon: this.polygon.toMetaData(),
            surface: this.surface.toMetaData(),
            topoTrack: this.topoTrack
        };

        if (this.topoTrack !== undefined && this.topoTrack.operate === TopoTrackType.NEW) {
            delete meta.topoTrack;
        }

        return meta;
    }
}

export { Face };
