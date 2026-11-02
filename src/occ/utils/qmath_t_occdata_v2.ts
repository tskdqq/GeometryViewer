import { OCCSolidI, OCCFaceI, OCCWireI, OCCEdge, OCCLineI, OCCPlaneI } from '../models/occ_solid_i';
import { BrepBody } from '../../geometry/brep/brep_body';
import { Face } from '../../geometry/brep/face';
import { Coedge } from '../../geometry/brep/coedge';
import { Loop } from '../../geometry/brep/loop';
import { Vector3 } from '../../math/vector3';
import { GeometryType } from '../../geometry/geometry_type';
import { XYZ } from '../../math/xy';
import { Edge, Plane, Shell } from '../../xmath';

class TransQMathTOCC {

    private brepBody: BrepBody | Shell;
    private occFaceList: OCCFaceI[];
    private occWireList: OCCWireI[];
    private occEdgeList: OCCEdge[];
    private occVertexList: XYZ[];

    constructor(brepBody: BrepBody | Shell) {
        this.brepBody = brepBody;
        this.occFaceList = [];
        this.occWireList = [];
        this.occEdgeList = [];
        this.occVertexList = [];
    }

    public run(): OCCSolidI {
        this._facesToOCCFaceList(this.brepBody.getFaces());
        const occSolid = {
            type: <GeometryType.enBrepBody | GeometryType.enShell>this.brepBody.getType(),
            tag: this.brepBody.tag,
            vertexs: this.occVertexList,
            edges: this.occEdgeList,
            wires: this.occWireList,
            faces: this.occFaceList
        };
        return occSolid;
    }

    private _facesToOCCFaceList(faces: Face[]) {
        for (const face of faces) {
            this._getOCCFaceIndex(this._faceToOCCFace(face));
        }
    }
    private _faceToOCCFace(face: Face): OCCFaceI {
        const surface = face.getSurface();
        let occSurface;
        if (surface.getType() === GeometryType.enPlane) {
            occSurface = this._getOCCPlane(surface as Plane);
        } else {
            throw new Error('不支持该surface类型');
        }
        const occFace: OCCFaceI = {
            data: [],
            surface: occSurface,
            tag: face.tag,
            isSameDirWithSurface: face.isSameDirWithSurface()
        };
        for (const loop of face.getPolygon().getLoops()) {
            occFace.data.push(this._getOCCWireIndex(this._loopToOCCWire(loop, face)));
        }
        return occFace;
    }
    private _getOCCPlane(plane: Plane): OCCPlaneI {
        const origin = plane.getOrigin();
        const dirU = plane.dirU;
        const dirV = plane.dirV;
        return {
            type: plane.getType(),
            origin: {
                x: this._fixNumber(origin.x),
                y: this._fixNumber(origin.y),
                z: this._fixNumber(origin.z)
            },
            dirU: {
                x: this._fixNumber(dirU.x),
                y: this._fixNumber(dirU.y),
                z: this._fixNumber(dirU.z)
            },
            dirV: {
                x: this._fixNumber(dirV.x),
                y: this._fixNumber(dirV.y),
                z: this._fixNumber(dirV.z)
            }
        };
    }
    private _loopToOCCWire(loop: Loop, faceItem: Face): OCCWireI {
        const wire: OCCWireI = {
            tag: loop.tag,
            data: []
        };
        for (const coedge of loop.getCoedges()) {
            const index = this._getOCCEdgeIndex(this._edgeToOCCEdge(coedge, faceItem));
            if (coedge.sameDirWithEdge) {
                wire.data.push('+' + index);
            } else {
                wire.data.push('-' + index);
            }
        }
        return wire;
    }
    private _edgeToOCCEdge(coedge: Coedge, faceItem: Face): OCCEdge {
        const edge: Edge = coedge.getTopoEdge() as Edge;
        if (!edge) {
            throw new Error('Edge拓扑追踪失败');
        }
        const curve = edge.curve;
        if (curve.getType() === GeometryType.enLine3D) {
            return this._getOCCLineEdge(edge);
        } else {
            throw new Error('不支持Edge类型');
        }
    }
    private _getOCCLineEdge(edge: Edge) {
        const start = (<Edge>edge).curve.getStartPt();
        const end = (<Edge>edge).curve.getEndPt();
        const data = [this._getOCCVertexIndex(start), this._getOCCVertexIndex(end)];
        const occLineEdge: OCCLineI = {
            type: edge.curve.getType() as GeometryType.enLine3D,
            data: data,
            tag: edge.tag
        };
        return occLineEdge;
    }
    private _getOCCVertexIndex(vertex: Vector3) {
        for (let i = 0; i < this.occVertexList.length; i++) {
            const pos = this.occVertexList[i];
            if (vertex.equals(pos, 1e-7)) {
                return i;
            }
        }
        this.occVertexList.push({
            x: this._fixNumber(vertex.x),
            y: this._fixNumber(vertex.y),
            z: this._fixNumber(vertex.z)
        });
        return this.occVertexList.length - 1;
    }
    private _getOCCEdgeIndex(occEdge: OCCEdge) {
        for (let i = 0, len = this.occEdgeList.length; i < len; i++) {
            if (this.occEdgeList[i].tag === occEdge.tag) {
                return i;
            }
        }
        this.occEdgeList.push(occEdge);
        return this.occEdgeList.length - 1;
    }
    private _getOCCWireIndex(occWire: OCCWireI): number {
        for (let i = 0, len = this.occWireList.length; i < len; i++) {
            if (this.occWireList[i].tag === occWire.tag) {
                return i;
            }
        }
        this.occWireList.push(occWire);
        return this.occWireList.length - 1;
    }
    private _getOCCFaceIndex(occFace: OCCFaceI): number {
        for (let i = 0, len = this.occFaceList.length; i < len; i++) {
            if (this.occFaceList[i].tag === occFace.tag) {
                return i;
            }
        }
        this.occFaceList.push(occFace);
        return this.occFaceList.length - 1;
    }
    private _fixNumber(value: number) {
        return value;
    }
}
export { TransQMathTOCC };

