import { Geomtry } from '../geometry';
import { TopoTrackType } from './topo_track_type';
import { UUIDUtil } from '../../util/uuid_util';
import { TopoObjectInterface, TopoTrackInterface } from '../geo_interfaces';
import { GeometryType } from '../../geometry/geometry_type';

/**
 *  拓扑对象的基类
 */
abstract class TopoObject extends Geomtry {
    /**
     * @property 父对象
     */
    private _parent?: TopoObject;

    // topo对象的唯一标识
    public tag: string;

    constructor() {
        super();
        this.tag = UUIDUtil.generateShort();
    }

    // 拓扑追踪, 该对象是怎么来的
    public topoTrack?: TopoTrackInterface = {
        tags: [],
        // 默认是新建
        operate: TopoTrackType.NEW,
        parentType: GeometryType.enInvalid
    };

    public setParent(parent: TopoObject | undefined) {
        this._parent = parent;
    }

    public getParent() {
        return this._parent;
    }

    // 从参数拷贝内部数据到this
    protected copyInternalDataFrom(topo: TopoObjectInterface | TopoObject) {
        if (topo instanceof TopoObject) {
            this._parent = topo._parent;
        }
        if (topo.tag) {
            this.tag = topo.tag;
        }
        if (topo.topoTrack) {
            const copy = JSON.parse(JSON.stringify(topo.topoTrack));
            this.topoTrack = copy;
        }
    }

    /**
     * clone的时候保持tag和拓扑
     */
    public abstract cloneAndReserveTag(): TopoObject;

    // 简化UUID
    protected simpleUUID(uuid?: string) {
        if (uuid) {
            return uuid.substr(0, 4);
        }
        return (this.tag + '').substr(0, 4);
    }
}

export { TopoObject };
