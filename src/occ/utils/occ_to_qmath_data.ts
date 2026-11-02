import { BrepBody } from '../../geometry/brep/brep_body';
import { GeometryType } from '../../geometry/geometry_type';
import { Shell } from '../../geometry/brep/shell';
import { DebugWarn } from '../../util/debug_warn';
import { Line3d } from '../../geometry/line3d';
import { Face } from '../../geometry/brep/face';
import { Polygon } from '../../geometry/brep/polygon';
import { Loop } from '../../geometry/brep/loop';
import { Line2d } from '../../geometry/line2d';
import { Edge } from '../../geometry/brep/edge';
import { Plane } from '../../geometry/plane';
import { TopoTrackType } from '../../geometry/brep/topo_track_type';
import { Coedge } from '../../geometry/brep/coedge';
import { OCCSolidI, OCCFaceI } from '../models/occ_solid_i';
import { LogUtil } from '../../util/log_util';

class TransOccToQMath {

    // 转成face的数组
    public transToFaces(occ: OCCSolidI): Face[] {
        const result: Face[] = [];
        occ.faces.forEach(occFace => {
            try {
                const face = this._transAFace(occFace, occ);
                result.push(face);
            } catch (e) {
                console.error(e);
            }
        });
        return result;
    }

    // 转成xmath中的shell或brepbody
    public run(occ: OCCSolidI): Shell {
        let shell: Shell | BrepBody;
        if (occ.type === GeometryType.enShell) {
            shell = new Shell();
        } else {
            shell = new BrepBody();
        }
        shell.tag = occ.tag;

        /*
        export interface OCCLineI {
            type: GeometryType.enLine3D;
            data: number[];
            tag: string;
        }
         */
        // 转Edge
        occ.edges.forEach(occEdge => {
            if (occEdge.type === GeometryType.enLine3D) {
                const { data, tag } = occEdge;
                DebugWarn.assert(data.length === 2, 'data.length must equals 2');
                const curve = new Line3d(occ.vertexs[data[0]], occ.vertexs[data[1]]);
                const edge = new Edge(curve);
                edge.tag = tag;
                shell.addEdge(edge);
            }
        });
        /*
            export interface OCCFaceI {
                data: number[];
                surface: OCCSurface;
                isSameDirWithSurface: boolean;
                tag: string;
            }
        */
        // 转face
        occ.faces.forEach(occFace => {
            if (occFace.surface.type !== GeometryType.enPlane) {
                throw new Error('暂时只支持平面');
            }
            const { data, surface, tag, isSameDirWithSurface } = occFace;
            DebugWarn.assert(data.length, 'data.length must greater than 0');

            // surface
            const plane = new Plane(surface.origin, surface.dirU, surface.dirV);

            // polygon
            const polygon = new Polygon();
            data.forEach(wireIdx => {
                const wire = occ.wires[wireIdx];
                let shouldReverse = false;
                // 不成环
                if (wire.data.length < 2) {
                    return;
                }

                const [s1, e1] = this._getEdgeInWire(wire.data[wire.data.length - 1], occ);
                const [s2, e2] = this._getEdgeInWire(wire.data[0], occ);

                DebugWarn.assert(wire.data.length > 1, '不能构成环');
                if (e1 === s2) {
                    shouldReverse = false;
                } else if (e2 === s1) {
                    shouldReverse = true;
                } else {
                    // 不成环
                    return;
                }
                let i = 0;
                if (shouldReverse) {
                    i = wire.data.length - 1;
                }
                const loop = new Loop();
                loop.tag = wire.tag;
                polygon.addLoop(loop);
                for (; (shouldReverse ? i >= 0 : i < wire.data.length); (shouldReverse ? i-- : i++)) {
                    const edgeStr = wire.data[i];

                    const [s, e, edgeIdx] = this._getEdgeInWire(edgeStr, occ);
                    const edge = occ.edges[edgeIdx];

                    const line = new Line2d(plane.getUVAt(occ.vertexs[s]), plane.getUVAt(occ.vertexs[e]));

                    const coedge = loop.addCurve(line);
                    // coedge与edge互相引用
                    coedge.setEdgeInfo(edge.tag, !edgeStr.startsWith('-'));
                    // edge引用coedge
                    const qmathEdge = shell.getEdges()[edgeIdx];
                    if (!qmathEdge.coedgeIds) {
                        qmathEdge.coedgeIds = [];
                    }
                    qmathEdge.coedgeIds.push(coedge.tag);
                }
                if (!loop.isValid()) {
                    console.error('loop不合法', wire);
                    LogUtil.d(loop, 'loop数据：');
                }
            });

            if (!polygon.isValid()) {
                console.error('polygon不合法');
                LogUtil.d(polygon, 'polygon不合法');
            }
            const face = new Face(plane, isSameDirWithSurface, polygon);

            face.tag = tag;
            shell.addFace(face);
        });

        // body需要过滤非法的环
        if (shell instanceof BrepBody) {
            const deleted: string[] = [];
            shell.getEdges().forEach(edge => {
                if (edge.getTopoCoedges().length === 0) {
                    deleted.push(edge.tag);
                }
                if (edge.getTopoCoedges().length !== 2 && (shell.getType() === GeometryType.enBrepBody)) {
                    throw new Error('edge与coedge不配对');
                }
            });
            deleted.forEach(d => shell.deleteEdgeByTag(d));
        }

        this._transTopo(occ, shell);

        return shell;
    }

    private _getEdgeInWire(edgeStr: string, occ: OCCSolidI): [number, number, number] {
        const edgeIdx = Number.parseInt(edgeStr.substring(1));
        const edge = occ.edges[edgeIdx];
        if (edge.type !== GeometryType.enLine3D) {
            throw new Error('只支持直线');
        }
        // const start = occ.vertexs[edge.data[0]];
        // const end = occ.vertexs[edge.data[1]];
        if (edgeStr.startsWith('-')) {
            return [edge.data[1], edge.data[0], edgeIdx];
        } else {
            return [edge.data[0], edge.data[1], edgeIdx];
        }
    }

    /**
     * 转一个face
     * @param occFace 
     */
    private _transAFace(occFace: OCCFaceI, occ: OCCSolidI) {
        if (occFace.surface.type !== GeometryType.enPlane) {
            throw new Error('暂时只支持平面');
        }
        const { data, surface, tag, isSameDirWithSurface } = occFace;
        DebugWarn.assert(data.length, 'data.length must greater than 0');

        // surface
        const plane = new Plane(surface.origin, surface.dirU, surface.dirV);

        // polygon
        const polygon = new Polygon();
        data.forEach(wireIdx => {
            const wire = occ.wires[wireIdx];

            const loop = new Loop();
            loop.tag = wire.tag;
            polygon.addLoop(loop);
            wire.data.forEach(edgeStr => {
                const edgeIdx = Number.parseInt(edgeStr.substring(1));
                const edge = occ.edges[edgeIdx];
                if (edge.type !== GeometryType.enLine3D) {
                    throw new Error('只支持直线');
                }
                const start = plane.getUVAt(occ.vertexs[edge.data[0]]);
                const end = plane.getUVAt(occ.vertexs[edge.data[1]]);

                let line;
                if (edgeStr.startsWith('-')) {
                    line = new Line2d(end, start);
                } else {
                    line = new Line2d(start, end);
                }
                loop.addCurve(line);
            });
            const coedges = loop.getCoedges();
            if (!coedges.length) {
                throw new Error('错误');
            }
            const last = coedges.pop();
            if (!last) {
                throw new Error('错误');
            }
            const sorted: Coedge[] = [last];
            while (coedges.length) {
                if (sorted.length && !sorted[sorted.length - 1]) {
                    debugger;
                }
                const end = sorted[sorted.length - 1].curve.getEndPt();
                const findCoedgeIndexs: number[] = [];
                for (let i = 0; i < coedges.length; i++) {
                    const start = coedges[i].curve.getStartPt();
                    if (!sorted.length || start.equals(end)) {
                        findCoedgeIndexs.push(i);
                    }
                }
                if (findCoedgeIndexs.length < 1) {
                    throw new Error('错误');
                } else {
                    let finalIndex = findCoedgeIndexs[0];
                    if (findCoedgeIndexs.length > 1) {
                        for (let index = 0; index < findCoedgeIndexs.length; index++) {
                            if (end.distanceTo(coedges[finalIndex].curve.getStartPt()) > end.distanceTo(coedges[index].curve.getStartPt())) {
                                finalIndex = index;
                            }
                        }
                    }
                    sorted.push(coedges[finalIndex]);
                    coedges.splice(finalIndex, 1);
                }
            }
            coedges.push(...sorted);
            if (!loop.isValid()) {
                console.error('loop不合法', wire);
                LogUtil.d(loop, 'loop数据：');
            }
        });

        if (!polygon.isValid()) {
            console.error('polygon不合法');
            LogUtil.d(polygon, 'loop数据：');
        }
        const face = new Face(plane, isSameDirWithSurface, polygon);

        face.tag = tag;
        return face;
    }

    private _transTopo(occ: OCCSolidI, shell: Shell) {

        // 转TopoEdge
        if (occ.topo_edge) {
            const keys = Object.keys(occ.topo_edge);
            for (const edgeId of keys) {
                const edge = shell.getEdgeByTag(edgeId);
                if (!edge) {
                    throw new Error('cant find edge');
                }
                const typeValue = occ.topo_edge[edgeId];
                if (typeValue.type === 'added') {
                    edge.topoTrack = {
                        tags: typeValue.value ? [typeValue.value] : [],
                        operate: TopoTrackType.CONSTRUCTION_DRAWING_ADDED,
                        parentType: GeometryType.enInvalid
                    };
                } else if (typeValue.type === 'modified') {
                    edge.topoTrack = {
                        tags: typeValue.value ? [typeValue.value] : [],
                        operate: TopoTrackType.CONSTRUCTION_DRAWING_MODIFIED,
                        parentType: GeometryType.enInvalid
                    };
                } else if (typeValue.type === 'reserved') {
                    edge.topoTrack = {
                        tags: typeValue.value ? [typeValue.value] : [],
                        operate: TopoTrackType.CONSTRUCTION_DRAWING_RESERVED,
                        parentType: GeometryType.enInvalid
                    };
                } else {
                    throw new Error('cant find edge');
                }
            }
        }
        // 转TopoFace
        if (occ.topo_face) {
            const keys = Object.keys(occ.topo_face);
            for (const faceId of keys) {
                const face = shell.getFaceByTag(faceId);
                if (!face) {
                    continue;
                }
                const typeValue = occ.topo_face[faceId];
                if (typeValue.type === 'added') {
                    face.topoTrack = {
                        tags: typeValue.value ? [typeValue.value] : [],
                        operate: TopoTrackType.CONSTRUCTION_DRAWING_ADDED,
                        parentType: GeometryType.enInvalid
                    };
                } else if (typeValue.type === 'modified') {
                    face.topoTrack = {
                        tags: typeValue.value ? [typeValue.value] : [],
                        operate: TopoTrackType.CONSTRUCTION_DRAWING_MODIFIED,
                        parentType: GeometryType.enInvalid
                    };
                } else if (typeValue.type === 'reserved') {
                    face.topoTrack = {
                        tags: typeValue.value ? [typeValue.value] : [],
                        operate: TopoTrackType.CONSTRUCTION_DRAWING_RESERVED,
                        parentType: GeometryType.enInvalid
                    };
                } else {
                    continue;
                }
            }
        }

        // 追踪体的topo
        shell.topoTrack = {
            tags: occ.topo_body_shell_tag ? [occ.topo_body_shell_tag] : [],
            operate: TopoTrackType.CONSTRUCTION_DRAWING_RESERVED,
            parentType: GeometryType.enInvalid
        };
    }
}
export { TransOccToQMath };
