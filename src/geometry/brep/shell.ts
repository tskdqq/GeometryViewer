import { TopoObject } from './topo_objecet';
import { Vector3 } from '../../math/vector3';
import { Matrix4 } from '../../math/matrix4';
import { Box3 } from '../../math/box3';
import { Face } from './face';
import { Edge } from './edge';
import { ShellInterface } from '../geo_interfaces';
import { Curve3d } from '../curve3d';
import { UUIDUtil } from '../../util/uuid_util';
import { RenderObject } from '../../algorithm/discrete/render_object';
import { Coedge } from './coedge';
import { Polygon } from './polygon';
import { DebugWarn } from '../../util/debug_warn';
import { GeometryType } from '../../geometry/geometry_type';
import { Loop } from './loop';
import { Plane } from '../plane';
import { Line3d } from '../line3d';
import { ErrorSystem } from '../../math/error_system';
import { Line1ProjectToLine2 } from '../../algorithm/project/line_line_project';
import { Line2d } from '../line2d';
import { TopoTrackType } from './topo_track_type';

/**
 * 壳，标识不封闭的body
 */
class Shell extends TopoObject {
    protected readonly faceList: Face[] = [];
    protected readonly edgeList: Edge[] = [];

    public static loadFromAny(jsObj: ShellInterface): Shell {
        const body = new Shell();
        // 反射每个面
        for (const face of jsObj.faceList) {
            body.addFace(Face.loadFromAny(face));
        }

        // 反射每条Edge
        for (const edge of jsObj.edgeList) {
            body.addEdge(Edge.loadFromAny(edge));
        }

        body.copyInternalDataFrom(jsObj);

        return body;
    }


    public getType(): GeometryType {
        return GeometryType.enShell;
    }

    /**
     * shell是否是空的（没有任何的Edge和Face）
     */
    public isEmpty() {
        return !this.faceList.length && !this.edgeList.length;
    }

    public clear() {
        this.faceList.splice(0, this.faceList.length);
        this.edgeList.splice(0, this.edgeList.length);
    }

    /**
     * 获取所有的面
     */
    public getFaces() {
        return this.faceList;
    }

    /**
     * 获取所有的边
     */
    public getEdges() {
        return this.edgeList;
    }

    /**
     *  向body中添加face，若face没有合法的索引，则会分配一个
     * @param face
     */
    public addFace(face: Face) {
        if (!face.tag) {
            face.tag = UUIDUtil.generateShort();
        }
        face.setParent(this);
        this.faceList.push(face);
    }

    /**
     *  删除face
     * @param face
     */
    public deleteFaceByTag(tag: string) {
        const faceIdx = this.getFaces().findIndex(face => {
            return tag === face.tag;
        });
        DebugWarn.assert(faceIdx > -1);
        if (faceIdx < 0) {
            return;
        }
        // 解除与coedge的关联
        this.getFaces()[faceIdx].getTopoCoedges().forEach(ce => {
            const edge = ce.getTopoEdge();
            if (edge) {
                edge.deleteCoedgeInfo(ce.tag);
            }
        });
        // 删除面
        this.getFaces().splice(faceIdx, 1);
    }

    /**
     *  向body中添加一条新的边，并赋予该edge一个索引，
     * @returns 返回新的边
     * 
     */
    public addNewEdge(curve3d: Curve3d): Edge {
        const edge = new Edge(curve3d);
        this.addEdge(edge);
        return edge;
    }

    /**
     *  向body中添加一条边，并赋予该edge一个索引，
     */
    public addEdge(edge: Edge) {
        if (!edge.tag) {
            edge.tag = UUIDUtil.generateShort();
        }

        edge.setParent(this);
        this.edgeList.push(edge);
    }

    /**
     * 计算并添加edges
     */
    public calcAndAddEdges(lengthEps = ErrorSystem.LENGTH_EPS) {
        let split = this._calcAndAddEdges(lengthEps);
        if (split) {
            split = this._calcAndAddEdges(lengthEps);
            DebugWarn.assert(!split, 'has splited,why split again?');
        }
    }

    /**
     * 计算并添加edges
     */
    public _calcAndAddEdges(lengthEps: number) {
        let hasSplit = false;
        const faces = this.getFaces();
        for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
            const face = faces[faceIdx];
            face.getTopoCoedges().forEach(thisCoedge => {
                let thisCoedge3d;
                let thisEdge: Edge | undefined;

                // 已经绑定了Edge
                if (thisCoedge.edgeId) {
                    thisEdge = this.getEdgeByTag(thisCoedge.edgeId)!;
                    DebugWarn.assert(thisEdge);
                    if (thisCoedge.getTwin()) {
                        return;
                    }
                    // edge需要关联另一条coedge
                    thisCoedge3d = thisEdge.curve;
                } else {
                    thisCoedge3d = thisCoedge.getCurve3d()!;
                }
                DebugWarn.assert(thisCoedge3d);
                const coedges = this._findCoedgeEqualsCurve(thisCoedge3d, faceIdx, ErrorSystem.ANGLE_EPS, lengthEps);

                if (!coedges.length) {
                    if (!thisEdge) {
                        thisEdge = this.addNewEdge(thisCoedge3d);

                        thisCoedge.setEdgeInfo(thisEdge.tag, true);

                        thisEdge.addCoEdgeInfo(thisCoedge.tag);
                    }
                    return;
                }

                if (coedges.length === 1) {
                    // 
                    const thatCoedge = coedges[0];
                    const thatCoedge3d = thatCoedge.getCurve3d()!;
                    DebugWarn.assert(thatCoedge3d);
                    const equl = thisCoedge3d.equals(thatCoedge3d, lengthEps);
                    if (equl) {
                        if (!thisEdge) {
                            thisEdge = this.addNewEdge(thisCoedge3d);

                            thisCoedge.setEdgeInfo(thisEdge.tag, true);

                            thisEdge.addCoEdgeInfo(thisCoedge.tag);
                        }

                        thisEdge.addCoEdgeInfo(thatCoedge.tag);
                        thatCoedge.setEdge(thisEdge);

                        return;
                    }
                }
                const tmp: any = [thisCoedge3d];
                // edgeCurve需要被打断
                hasSplit = true;
                const ranges = coedges.map(ce => {
                    const cv3d = ce.getCurve3d() as Line3d;
                    DebugWarn.assert(cv3d.getType() === GeometryType.enLine3D);
                    tmp.push(cv3d);
                    const plane = face.getSurface() as Plane;
                    DebugWarn.assert(plane.getType() === GeometryType.enPlane);
                    tmp.push(plane.getLine2D(cv3d));

                    return Line1ProjectToLine2.execute(plane.getLine2D(cv3d)!, thisCoedge.curve as Line2d);
                });

                const splitRanges = thisCoedge.curve.getRange().clone().split(...ranges);
                if (splitRanges.length === 1) {
                    return;
                }
                const idx = thisCoedge.getTopoLoop()!.getCoedges().findIndex(ce => {
                    return ce === thisCoedge;
                });
                DebugWarn.assert(idx > -1);
                const splitedCoedges = splitRanges.map(r => {
                    return thisCoedge.curve.clone().setRange(r);
                });
                thisCoedge.getTopoLoop()!.getCoedges()
                    .splice(idx, 1);

                thisCoedge.getTopoLoop()!.insertCoedge(idx, ...splitedCoedges);
            });
        }
        return hasSplit;
    }

    // 在几何上查找一个face
    private _findCoedgeEqualsCurve(curve3d: Curve3d, ignoreFaceIdx: number, angleTol: number, distanceTol: number): Coedge[] {
        const line = curve3d as Line3d;
        DebugWarn.assert(curve3d.getType() === GeometryType.enLine3D, '暂时只支持直线');
        const result: Coedge[] = [];
        for (let i = 0; i < this.faceList.length; i++) {
            if (i === ignoreFaceIdx) {
                continue;
            }
            const face = this.faceList[i];
            const plane = face.getSurface() as Plane;
            DebugWarn.assert(plane.getType() === GeometryType.enPlane);

            // 通过垂直关系判断
            if (!line.getDirection().isPerpendicularTo(plane.getNorm(), angleTol)) {
                continue;
            }

            // 通过距离关系判断
            if (Math.abs(line.getMidPt().sub(plane.getOrigin()).dot(plane.norm)) > distanceTol) {
                continue;
            }

            // 包围盒
            if (!line.getBoundingBox().intersectsBox(face.getBoundingBox(), distanceTol)) {
                continue;
            }

            // 真正去查找
            face.getTopoCoedges().forEach(ce => {
                // 已经绑定了edge
                if (ce.edgeId) {
                    return;
                }
                const cv3d = ce.getCurve3d() as Line3d;
                DebugWarn.assert(cv3d);
                if (this.isTwoLinesOverlap(cv3d, line, distanceTol)) {
                    result.push(ce);
                }
            });
        }
        // console.warn('cant find bug?');
        return result;
    }

    // todo: 移到PositionJudge中去
    // 2直线是否重叠，
    private isTwoLinesOverlap(line1: Line3d, line2: Line3d, distanceTol: number, _rangeOverlapTol = ErrorSystem.LENGTH_EPS) {
        // 使用距离容差判断共线
        if (!line1.isColinearWith(line2, distanceTol)) {
            return false;
        }

        let rangeOverlapTol = _rangeOverlapTol;

        if (rangeOverlapTol > line1.getRange().getLength()) {
            rangeOverlapTol = line1.getRange().getLength() / 2;
        } else if (rangeOverlapTol > line2.getRange().getLength()) {
            rangeOverlapTol = line2.getRange().getLength() / 2;
        }

        // line2向line1投影
        const range2 = Line1ProjectToLine2.execute(line2, line1);
        const intRange = line1.getRange().intersect(range2);

        return intRange && intRange.getLength() > rangeOverlapTol;
    }

    /**
     * 拓扑是否合法，一个edge关联2个coedge
     */
    public isTopoValid() {
        // 遍历topo关系
        for (const f of this.getFaces()) {
            for (const l of f.getPolygon().getLoops()) {
                for (const ce of l.getCoedges()) {
                    if (ce.getTopoBody() !== this) {
                        return false;
                    }
                    if (ce.getTopoLoop() !== l) {
                        return false;
                    }
                    if (ce.getTopoPolygon() !== f.getPolygon()) {
                        return false;
                    }
                    if (ce.getTopoFace() !== f) {
                        return false;
                    }
                    if (!ce.getTopoEdge()) {
                        return false;
                    }
                    // 不必检查
                    // if (!ce.getTwin()) {
                    //     return false;
                    // }
                }
            }
        }
        for (const e of this.getEdges()) {
            if (!e.coedgeIds) {
                return false;
            }
            if (!e.coedgeIds.length) {
                return false;
            }
            if (!e.getTopoCoedges().length) {
                return false;
            }
            if (!this.getCoedgeByTag(e.coedgeIds[0])) {
                return false;
            }
            if (e.coedgeIds.length === 2) {
                if (!this.getCoedgeByTag(e.coedgeIds[1])) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 检查edge与coedge互相引用是否合法,
     * > 不合法的情况：
     * - edge根据coedgeId找不到coedge，
     * - coedge根据edgeId找不到edge
     */
    public isEdgeCoedgeRefValid() {
        // 遍历topo关系
        for (const f of this.getFaces()) {
            for (const l of f.getPolygon().getLoops()) {
                for (const ce of l.getCoedges()) {
                    if (ce.getTopoLoop() !== l) {
                        return false;
                    }
                    if (ce.getTopoPolygon() !== f.getPolygon()) {
                        return false;
                    }
                    if (ce.getTopoFace() !== f) {
                        return false;
                    }
                    if (ce.edgeId && !ce.getTopoEdge()) {
                        debugger;
                        return false;
                    }
                }
            }
        }
        for (const e of this.getEdges()) {
            if (!e.coedgeIds) {
                continue;
            }
            for (const id of e.coedgeIds) {
                if (id && !this.getCoedgeByTag(id)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 根据tag获取edge
     * @param index 
     */
    public getEdgeByTag(tag: string): Edge | undefined {
        return this.getEdges().find(edge => {
            return tag === edge.tag;
        });
    }

    /**
     * 根据tag获取face
     * @param index 
     */
    public getFaceByTag(uuid: string): Face | undefined {
        return this.getFaces().find(face => {
            return uuid === face.tag;
        });
    }

    /**
     * 根据tag获取Polygon
     * @param index 
     */
    public getPolygonByTag(uuid: string): Polygon | undefined {
        for (const face of this.getFaces()) {
            if (face.getPolygon() && face.getPolygon().tag === uuid) {
                return face.getPolygon();
            }
        }
        return;
    }

    /**
     * 根据tag获取Loop
     * @param index 
     */
    public getLoopByTag(uuid: string): Loop | undefined {
        for (const face of this.getFaces()) {
            if (!face.getPolygon()) {
                continue;
            }
            for (const l of face.getPolygon().getLoops()) {
                if (l.tag === uuid) {
                    return l;
                }
            }

        }
        return;
    }

    /**
     * 根据tag获取Loop
     * @param index 
     */
    public getCoedgeByTag(uuid: string): Coedge | undefined {
        for (const face of this.getFaces()) {
            if (!face.getPolygon()) {
                continue;
            }
            for (const l of face.getPolygon().getLoops()) {
                for (const ce of l.getCoedges()) {
                    if (ce.tag === uuid) {
                        return ce;
                    }
                }
            }
        }
        return;
    }

    /**
     * 删除edge
     * @param edgeTag 
     */
    public deleteEdgeByTag(edgeTag: string): boolean {
        const idx = this.getEdges().findIndex(e => {
            return edgeTag === e.tag;
        });
        if (idx < 0) {
            return false;
        }
        const edge = this.getEdges()[idx] as Edge;

        this.getEdges().splice(idx, 1);

        // 解除edge和coedge的绑定
        const ces = edge.getTopoCoedges();
        if (!ces || !ces.length) {
            return true;
        }
        ces.forEach(ce => {
            (ce as any)._sameDirWithEdge = undefined;
            (ce as any)._edgeId = undefined;
        });

        return true;
    }

    /**
     *  平移
     */
    public translate(offset: Vector3): this {
        this.getFaces().forEach(face => face.translate(offset));
        this.getEdges().forEach(edge => edge.translate(offset));
        return this;
    }

    public rotate(angle: number, pivot: Vector3, axis: Vector3): this {
        this.getFaces().forEach(face => face.rotate(angle, pivot, axis));
        this.getEdges().forEach(edge => edge.rotate(angle, pivot, axis));
        return this;
    }

    public scale(factor: number, center: Vector3 = Vector3.zero()): this {
        this.getFaces().forEach(face => face.scale(factor, center));
        this.getEdges().forEach(edge => edge.scale(factor, center));
        return this;
    }


    public applyTransform(m: Matrix4): this {
        this.getFaces().forEach(face => face.applyTransform(m));
        this.getEdges().forEach(edge => edge.applyTransform(m));
        return this;
    }

    public getBoundingBox(): Box3 {
        const box = new Box3();
        this.faceList.forEach(face => {
            box.union(face.getBoundingBox());
        });

        return box;
    }

    /**
     *  抽取元数据，用于序列化
     * @returns 返回js对象
     */
    public toRenderObject(showDebugInfo: boolean): RenderObject {

        const faceList = new RenderObject(-this.refId - 1, 'faceList');
        faceList.children = [];
        for (const face of this.faceList) {
            faceList.children.push(face.toRenderObject(showDebugInfo));
        }

        const edgeList = new RenderObject(-this.refId, 'edgeList');
        edgeList.children = [];
        for (const edge of this.edgeList) {
            const edgeRender = edge.toRenderObject(showDebugInfo);
            edgeRender.color = '#0000aa';
            edgeList.children.push(edgeRender);
        }

        const render = new RenderObject(this.refId, 'Shell_' + this.simpleUUID());
        render.children = [faceList, edgeList];
        return render;
    }

    /**
     *  深拷贝
     */
    public clone(): Shell {
        const brepBody = new Shell();
        this.faceList.map(face => {
            brepBody.addFace(face.clone());
        });
        this.edgeList.map(edge => {
            brepBody.addEdge(edge.clone());
        });
        return brepBody;
    }

    /**
     * clone的时候保持tag和拓扑
     */
    public cloneAndReserveTag(): Shell {
        const brepBody = new Shell();
        this.faceList.map(face => {
            brepBody.addFace(face.cloneAndReserveTag());
        });
        this.edgeList.map(edge => {
            brepBody.addEdge(edge.cloneAndReserveTag());
        });
        brepBody.copyInternalDataFrom(this);
        return brepBody;
    }

    /**
     *  抽取元数据，用于序列化
     * @returns 返回js对象
     */
    public toMetaData(): ShellInterface {
        const meta = {
            type: this.getType(),
            tag: this.tag,
            faceList: this.faceList.map((face) => {
                return face.toMetaData();
            }),

            edgeList: this.edgeList.map((edge) => {
                return edge.toMetaData();
            }),
            topoTrack: this.topoTrack
        };

        if (this.topoTrack !== undefined && this.topoTrack.operate === TopoTrackType.NEW) {
            delete meta.topoTrack;
        }

        return meta;
    }
}

export { Shell };

