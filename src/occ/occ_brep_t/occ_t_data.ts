import { OCCTFace } from './occ_t_face';
import { OCCTWire } from './occ_t_wire';
import { OCCTEdge } from './occ_t_edge';
import { OCCTVertex } from './occ_t_vertex';
import { GeometryType } from '../../geometry/geometry_type';
class OCCTData {
    public mFaceList: OCCTFace[] = [];
    public mWireList: OCCTWire[] = [];
    public mEdgeList: OCCTEdge[] = [];
    public mVertexList: OCCTVertex[] = [];
    constructor(public tag: string, public type: GeometryType) { }
    public toJsonString(): string {
        let str = `{"tag":"${this.tag}","type":${this.type},"faces":[`;
        for (let i = 0; i < this.mFaceList.length; i++) {
            const mOCCTFace: OCCTFace = this.mFaceList[i];
            str = str + mOCCTFace.toJson();
            if (i < this.mFaceList.length - 1) {
                str += ',';
            }
        }
        str += '],"wires":[';
        for (let i = 0; i < this.mWireList.length; i++) {
            const mOCCTWire: OCCTWire = this.mWireList[i];
            str = str + mOCCTWire.toJson();
            if (i < this.mWireList.length - 1) {
                str += ',';
            }
        }
        str += '],"edges":[';
        for (let i = 0; i < this.mEdgeList.length; i++) {
            const mOCCTEdge: OCCTEdge = this.mEdgeList[i];
            str = str + mOCCTEdge.toJson();
            if (i < this.mEdgeList.length - 1) {
                str += ',';
            }
        }
        str += '],"vertexs":[';
        for (let i = 0; i < this.mVertexList.length; i++) {
            const mOCCTVertex: OCCTVertex = this.mVertexList[i];
            str = str + mOCCTVertex.toJson();
            if (i < this.mVertexList.length - 1) {
                str += ',';
            }
        }
        str += ']}';
        return str;
    }
    public toJson(): Object {
        return JSON.parse(this.toJsonString());
    }
}
export { OCCTData };
