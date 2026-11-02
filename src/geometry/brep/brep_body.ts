import { RenderObject } from '../../algorithm/discrete/render_object';
import { BodyInterface } from '../geo_interfaces';
import { GeometryType } from '../../geometry/geometry_type';
import { Edge } from './edge';
import { Face } from './face';
import { Body } from './body';
import { TopoTrackType } from './topo_track_type';

/**
 *  brep体
 */
class BrepBody extends Body {

    public static loadFromAny(jsObj: BodyInterface): BrepBody {
        const body = new BrepBody();
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
        return GeometryType.enBrepBody;
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

        const render = new RenderObject(this.refId, 'BRepBody_' + this.simpleUUID());
        render.children = [faceList, edgeList];
        return render;
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
                    if (!ce.getTwin()) {
                        return false;
                    }
                }
            }
        }
        for (const e of this.getEdges()) {
            if (!e.coedgeIds) {
                return false;
            }
            if (e.coedgeIds.length !== 2) {
                return false;
            }
            if (e.getTopoCoedges().length !== 2) {
                return false;
            }
            if (!this.getCoedgeByTag(e.coedgeIds[0])) {
                return false;
            }
            if (!this.getCoedgeByTag(e.coedgeIds[1])) {
                return false;
            }
        }
        return true;
    }

    /**
     *  深拷贝
     */
    public clone(): BrepBody {
        const brepBody = new BrepBody();
        this.faceList.map(face => {
            brepBody.addFace(face.clone());
        });
        this.edgeList.map(edge => {
            brepBody.addEdge(edge.clone());
        });
        return brepBody;
    }

    /**
     *  clone的时候保持tag和拓扑
     */
    public cloneAndReserveTag(): BrepBody {
        const brepBody = new BrepBody();
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
    public toMetaData(): BodyInterface {
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

export { BrepBody };
