import { RenderObject } from '../../algorithm/discrete/render_object';
import { Box3 } from '../../math/box3';
import { Matrix4 } from '../../math/matrix4';
import { Vector3 } from '../../math/vector3';
import { Curve3d } from '../curve3d';
import { EdgeInterface } from '../geo_interfaces';
import { GeometryType } from '../../geometry/geometry_type';
import { TopoObject } from './topo_objecet';
import { Coedge } from './coedge';
import { Body } from './body';
import { Face } from './face';
import { ReflectCurve3d } from '../reflect_curve3d';
import { DebugWarn } from '../../util/debug_warn';
import { TopoTrackType } from './topo_track_type';

/**
 * @author tiansk
 *  Brep体中的三维边,一条边对应2条CoEdge
 */
class Edge extends TopoObject {

    public static loadFromAny(jsObj: EdgeInterface) {
        const curve = ReflectCurve3d.execute(jsObj.curve);
        const edge = new Edge(curve);
        edge.copyInternalDataFrom(jsObj);

        if (jsObj.coedgeIds) {
            edge.coedgeIds = [...jsObj.coedgeIds];
        }

        return edge;
    }

    // 对应二维边索引
    public coedgeIds?: string[];
    public curve: Curve3d;

    constructor(curve3d: Curve3d) {
        super();
        this.curve = curve3d;
    }

    public setCurve(curve: Curve3d) {
        this.curve = curve;
    }

    public addCoEdgeInfo(coedgeId: string) {
        if (this.coedgeIds === undefined) {
            this.coedgeIds = [];
        }
        DebugWarn.assert(this.coedgeIds.length < 3 && this.coedgeIds.indexOf(coedgeId) < 0);
        this.coedgeIds.push(coedgeId);
    }

    public deleteCoedgeInfo(coedgeId: string) {
        if (!this.coedgeIds) {
            return;
        }
        const idx = this.coedgeIds.findIndex(ce => {
            return ce === coedgeId;
        });
        this.coedgeIds.splice(idx, 1);
    }

    /**
     * 获取另一条半边的tag
     * @param tag 
     */
    public getAnotherCoedgeTag(tag: string): string | undefined {
        if (!this.coedgeIds) {
            return;
        }
        DebugWarn.assert(this.coedgeIds.length < 3);
        if (this.coedgeIds[0] === tag) {
            return this.coedgeIds[1];
        }
        if (this.coedgeIds[1] === tag) {
            return this.coedgeIds[0];
        }

        return undefined;
    }

    /**
     * 获取edge对应的2个face
     */
    public getTopoCoedges(): Coedge[] {
        const result: Coedge[] = [];
        const ces = this.coedgeIds;
        if (!ces || ces.length < 1) {
            return result;
        }
        const body = this.getParent() as Body;

        ces.forEach(ce => {
            body.getFaces().forEach(face => {
                const find = face.getCoedgeByTag(ce);
                if (find) {
                    result.push(find);
                }
            });
        });

        return result;
    }

    /**
     * 获取edge在对应的face上的coedge
     */
    public getCoedgeOnFace(face: Face): Coedge | undefined {
        const coedgeIds = this.coedgeIds;
        if (!face || !coedgeIds || coedgeIds.length < 1) {
            return undefined;
        }

        for (const coedgeId of coedgeIds) {
            const find = face.getCoedgeByTag(coedgeId);
            if (find) {
                return find;
            }
        }

        return undefined;
    }

    /**
     * 获取edge对应的2个face
     */
    public getTopoFaces(): Face[] {
        const result: Face[] = [];
        const ces = this.coedgeIds;
        if (!ces || ces.length < 1) {
            return result;
        }
        const body = this.getParent() as Body;

        ces.forEach(ce => {
            body.getFaces().forEach(face => {
                if (face.getCoedgeByTag(ce)) {
                    result.push(face);
                }
            });
        });

        return result;
    }

    public getType() {
        return GeometryType.enEdge;
    }

    public getBoundingBox(): Box3 {
        return this.curve.getBoundingBox();
    }

    public translate(offset: Vector3): this {
        this.curve.translate(offset);
        return this;
    }

    public rotate(angle: number, pivot: Vector3, axis: Vector3): this {
        this.curve.rotate(angle, pivot, axis);
        return this;
    }

    /**
     *  缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector3 = Vector3.zero()): this {
        this.curve.scale(factor, center);
        return this;
    }

    public applyTransform(m: Matrix4): this {
        this.curve.applyTransform(m);
        return this;
    }

    public toRenderObject(showDebugInfo: boolean): RenderObject {
        let name1 = '';
        let name2 = '';
        // if (this.faceIndexes) {
        //     if (this.faceIndexes[0] !== undefined) {
        //         name1 = `F${this.faceIndexes[0]}`;
        //     }
        //     if (this.faceIndexes[1] !== undefined) {
        //         name2 = `F${this.faceIndexes[1]}`;
        //     }
        // }

        // if (this.loopIndexes) {
        //     if (this.loopIndexes[0] !== undefined) {
        //         name1 += `L${this.loopIndexes[0]}`;
        //     }
        //     if (this.loopIndexes[1] !== undefined) {
        //         name2 += `L${this.loopIndexes[1]}`;
        //     }
        // }

        if (this.coedgeIds) {
            if (this.coedgeIds[0] !== undefined) {
                name1 += `Coedge_${this.simpleUUID(this.coedgeIds[0])}`;
            }
            if (this.coedgeIds[1] !== undefined) {
                name2 += `Coedge_${this.simpleUUID(this.coedgeIds[1])}`;
            }
        }

        const child1 = new RenderObject(-this.refId - 1, name1);
        const child2 = new RenderObject(-this.refId - 2, name2);

        const render = new RenderObject(this.refId, 'Edge_' + this.simpleUUID());

        render.children = [
            this.curve.toRenderObject(showDebugInfo),
            child1,
            child2
        ];

        return render;
    }

    public toMetaData(): EdgeInterface {
        const meta: EdgeInterface = {
            tag: this.tag,
            type: this.getType(),
            curve: this.curve.toMetaData(),
            topoTrack: this.topoTrack
        };

        if (this.coedgeIds) {
            meta.coedgeIds = this.coedgeIds;
        }

        if (this.topoTrack !== undefined && this.topoTrack.operate === TopoTrackType.NEW) {
            delete meta.topoTrack;
        }

        return meta;
    }

    public clone(): Edge {
        const newEdge = new Edge(this.curve.clone());
        if (this.coedgeIds) {
            newEdge.coedgeIds = [...this.coedgeIds];
        }
        return newEdge;
    }

    public cloneAndReserveTag(): Edge {
        const newEdge = new Edge(this.curve.clone());
        if (this.coedgeIds) {
            newEdge.coedgeIds = [...this.coedgeIds];
        }
        newEdge.copyInternalDataFrom(this);
        return newEdge;
    }
}

export { Edge };
