import { RenderObject } from '../../algorithm/discrete/render_object';
import { Box2 } from '../../math/box2';
import { Matrix3 } from '../../math/matrix3';
import { Vector2 } from '../../math/vector2';
import { Curve2d } from '../curve2d';
import { CoedgeInterface } from '../geo_interfaces';
import { GeometryType } from '../../geometry/geometry_type';
import { TopoObject } from './topo_objecet';
import { Edge } from './edge';
import { Loop } from './loop';
import { Polygon } from './polygon';
import { Face } from './face';
import { Body } from './body';
import { ReflectCurve2d } from '../reflect_curve2d';
import { Curve3d } from '../curve3d';
import { DebugWarn } from '../../util/debug_warn';
import { TopoTrackType } from './topo_track_type';
import { ErrorSystem } from '../../math/error_system';

/**
 *  半边结构
 */
class Coedge extends TopoObject {

    public static loadFromAny(jsObject: CoedgeInterface): Coedge {
        const curve = ReflectCurve2d.loadCurve2dFromAny(jsObject.curve);
        const coedge = new Coedge(curve);
        coedge.copyInternalDataFrom(jsObject);

        if (jsObject.sameDirWithEdge !== undefined && jsObject.edgeId !== undefined) {
            coedge._edgeId = jsObject.edgeId;
            coedge._sameDirWithEdge = jsObject.sameDirWithEdge;
        }
        return coedge;
    }

    // 二维边,不能为空
    public curve: Curve2d;

    // 对应三维边的索引
    private _edgeId?: string;
    public get edgeId() {
        return this._edgeId;
    }

    private _sameDirWithEdge?: boolean;
    // 与三维边是否同向
    public get sameDirWithEdge() {
        return this._sameDirWithEdge;
    }

    public setEdgeInfo(edgeId: string, sameDirWithEdge: boolean) {
        this._edgeId = edgeId;
        this._sameDirWithEdge = sameDirWithEdge;
    }

    constructor(curve: Curve2d) {
        super();
        this.curve = curve;
    }

    public setCurve(curve: Curve2d) {
        this.curve = curve;
    }

    public setEdge(edge: Edge): boolean {
        const cv3d = this.getCurve3d()!;
        const edgeCurve = edge.curve;
        const equal = cv3d.equals(edgeCurve, ErrorSystem.LENGTH_EPS);
        DebugWarn.assert(equal, '');
        if (!equal) {
            console.error('set edge failed!');
            return false;
        }

        this.setEdgeInfo(edge.tag, equal === 1);
        return true;
    }

    /**
     * 获取所属loop
     */
    public getTopoLoop(): Loop | undefined {
        const loop = this.getParent();
        if (loop) {
            return loop as Loop;
        }
        return undefined;
    }

    /**
     * 获取所属Polygon
     */
    public getTopoPolygon(): Polygon | undefined {
        const loop = this.getTopoLoop();
        if (!loop || !loop.getParent()) {
            return undefined;
        }
        return loop.getParent() as Polygon;
    }

    /**
     * 获取所属Face
     */
    public getTopoFace(): Face | undefined {
        const loop = this.getTopoPolygon();
        if (!loop || !loop.getParent()) {
            return undefined;
        }
        return loop.getParent() as Face;
    }

    /**
     * 获取所属Boby
     */
    public getTopoBody(): Body | undefined {
        const loop = this.getTopoFace();
        if (!loop || !loop.getParent()) {
            return undefined;
        }
        return loop.getParent() as Body;
    }

    /**
     * 获取其对应edge
     */
    public getTopoEdge(): Edge | undefined {
        if (!this.edgeId) {
            return;
        }
        const body = this.getTopoBody();
        if (!body) {
            return undefined;
        }
        return body.getEdgeByTag(this.edgeId);
    }

    /**
     * 获取coedge对应face上的曲线
     */
    public getCurve3d(): Curve3d | undefined {
        const face = this.getTopoFace();
        if (!face) {
            return undefined;
        }
        return face.getSurface().getCurve3d(this.curve);
    }

    /**
     * 获取其共享Edge的共边
     */
    public getTwin(): Coedge | undefined {
        const edge = this.getTopoEdge();
        if (!edge) {
            return;
        }
        const tag = edge.getAnotherCoedgeTag(this.tag);
        if (!tag) {
            return;
        }

        const body = this.getTopoBody() as Body;

        return body.getCoedgeByTag(tag);
    }

    /**
     * 获取同属于一个loop的前一条coedge
     */
    public getPreCoedge(): Coedge {
        const loop = this.getTopoLoop() as Loop;
        const ces = loop.getCoedges();
        const idx = ces.findIndex(ce => {
            return ce === this;
        });

        return ces[(idx - 1 + ces.length) % ces.length];
    }

    /**
     * 获取同属于一个loop的后一条coedge
     */
    public getNextCoedge(): Coedge {
        const loop = this.getTopoLoop() as Loop;
        const ces = loop.getCoedges();
        const idx = ces.findIndex(ce => {
            return ce === this;
        });

        return ces[(idx + 1) % ces.length];
    }

    /**
     * 获取coedge在loop数组中的index
     */
    public getIndex(): number {
        const loop = this.getTopoLoop() as Loop;
        const ces = loop.getCoedges();
        const idx = ces.findIndex(ce => {
            return ce === this;
        });
        return idx;
    }

    /**
     * 
     */
    public getType() {
        return GeometryType.enCoedge;
    }

    /**
     * 
     */
    public getBoundingBox(): Box2 {
        return this.curve.getBoundingBox();
    }

    /**
     *  偏移
     */
    public offset(offsetDistance: number): this {
        this.curve.offset(offsetDistance);
        return this;
    }

    /**
     *  平移
     */
    public translate(offset: Vector2): this {
        this.curve.translate(offset);
        return this;
    }

    /**
     *  绕坐标轴/点的旋转
     * @param angle 旋转的角度
     * @param axis 哪个轴旋转
     */
    public rotate(angle: number, axis: Vector2): this {
        this.curve.rotate(angle, axis);
        return this;
    }

    /**
     *  缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector2 = Vector2.zero()): this {
        this.curve.scale(factor, center);
        return this;
    }

    /**
     * 
     *  深拷贝
     */
    public clone(): Coedge {
        const newCoEdge = new Coedge(this.curve.clone());
        if (this._edgeId && this.sameDirWithEdge) {
            this.setEdgeInfo(this._edgeId, this.sameDirWithEdge);
        }

        return newCoEdge;
    }

    /**
     * clone的时候保持tag和拓扑
     */
    public cloneAndReserveTag(): Coedge {
        const newCoEdge = new Coedge(this.curve.clone());

        newCoEdge.copyTopoDataFrom(this);
        newCoEdge.copyInternalDataFrom(this);
        return newCoEdge;
    }

    /**
     *  乘以变换矩阵 
     */
    public applyTransform(m: Matrix3): this {
        this.curve.applyTransform(m);
        return this;
    }

    /**
     *  抽取元数据，用于序列化
     * @returns 返回js对象
     */
    public toMetaData(): CoedgeInterface {
        const meta: CoedgeInterface = {
            tag: this.tag,
            type: this.getType(),
            curve: this.curve.toMetaData(),
            topoTrack: this.topoTrack
        };

        if (this.topoTrack !== undefined && this.topoTrack.operate === TopoTrackType.NEW) {
            delete meta.topoTrack;
        }

        if (this.edgeId !== undefined) {
            meta.sameDirWithEdge = this.sameDirWithEdge;
            meta.edgeId = this.edgeId;
        }

        return meta;
    }

    public toRenderObject(showDebugInfo: boolean): RenderObject {
        const render = this.curve.toRenderObject(showDebugInfo);
        render.name = 'Coedge_' + this.simpleUUID();
        if (this.edgeId) {
            render.name += ` <E(${this.edgeId.substr(0, 4)})，${this.sameDirWithEdge ? '同向' : '反向'}>`;
        }
        return render;
    }

    public copyTopoDataFrom(another: Coedge) {
        this._edgeId = another.edgeId;
        this._sameDirWithEdge = another.sameDirWithEdge;
    }
}

export { Coedge };
