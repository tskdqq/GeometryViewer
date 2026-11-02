import { XYZ } from '../../math/xy';

/**
 * @author tiansk
 *  渲染对象，所有的几何对象都要离散为此数据结构
 */
class RenderObject {

    // 离散后的所有顶点，此数据不渲染
    public vertices: XYZ[] = [];

    // 点集，一个点由一个索引组成
    public points?: number[];
    // 边集，一条边，由2个索引组成
    public edges?: number[][];
    // 三角片集，一个三角面片，由3个索引组成
    public faces?: number[][];
    // 三角片的法矢，与faces对应
    public normals?: XYZ[];
    // 子节点
    public children?: RenderObject[];

    public color?: string;

    public isDebug: boolean;

    // 几何对象的 Id + 名称
    constructor(public geoId: number, public name: string) {
        this.isDebug = false;
    }

    // public static fromVector(p: Vector) {
    //     const rp = new RenderObject();
    //     this.vert

    // }
}

export { RenderObject };
