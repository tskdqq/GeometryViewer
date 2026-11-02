import { Vector3 } from '../../math/vector3';
import { BrepBody } from '../../geometry/brep/brep_body';
import { Plane } from '../../geometry/plane';
import { Line2d } from '../../geometry/line2d';
import { Edge } from '../../geometry/brep/edge';
import { Face } from '../../geometry/brep/face';
import { Polygon } from '../../geometry/brep/polygon';
import { DebugWarn } from '../../util/debug_warn';
import { GeometryType } from '../../geometry/geometry_type';

/**
 *
 */
export class CreateBrepBodyByPts {
    /**
     * ptsArr 中的每一组pts都是一个face的顶点
     * @param pathsArr 每一个pts
     */
    public static execute(pathsArr: Vector3[][][]): BrepBody {
        const body = new BrepBody();
        // 1.生成face
        const faces = [];
        for (let i = 0; i < pathsArr.length; i++) {
            const paths = pathsArr[i];
            const face = CreateBrepBodyByPts.calcFace(i, paths);
            faces.push(face);

            body.addFace(face);
        }

        // // todo 效率优化
        const edges: Edge[] = [];
        // 2.生成edge
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i];
            const polygon = face.getPolygon();
            const loops = polygon.getLoops();
            for (const loop of loops) {
                // 
                const ces = loop.getCoedges();
                for (const ce of ces) {
                    // 
                    DebugWarn.assert((face.getSurface().getType() === GeometryType.enPlane) && (ce.curve.getType() === GeometryType.enLine2D));
                    const curve3d = (face.getSurface() as Plane).getLine3D(ce.curve as Line2d);

                    // 查找该条edge是否存在
                    const idx = edges.findIndex(e => {
                        return e.curve.getStartPt().equals(curve3d.getStartPt()) && e.curve.getEndPt().equals(curve3d.getEndPt())
                            || e.curve.getStartPt().equals(curve3d.getEndPt()) && e.curve.getEndPt().equals(curve3d.getStartPt());
                    });
                    if (idx > -1) {
                        continue;
                    }
                    const edge = new Edge(curve3d);
                    ce.setEdgeInfo(edge.tag, true);
                    edge.addCoEdgeInfo(ce.tag);
                    // 找相邻的边
                    CreateBrepBodyByPts._findNextCoedge(i, faces, edge);
                    body.addEdge(edge);
                    edges.push(edge);
                }
            }
        }
        return body;
    }

    // 将该方法写成Face的构造方法，或静态工厂方法
    // 找2个非共线向量计算法矢
    public static calcFace(first: number, paths: Vector3[][]): Face {
        for (const path of paths) {
            DebugWarn.assert(path.length > 2, '点数量太少，无法成环');
        }

        const p0 = paths[0][0];
        let norm;
        const p01 = paths[0][1].clone().sub(p0);
        for (let i = 2; i < paths[0].length; i++) {
            // 
            const p02 = paths[0][i].clone().sub(p0);
            if (p01.isParalellTo(p02)) {
                continue;
            }
            norm = p01.normlize().cross(p02.normlize());
        }
        if (!norm) {
            throw new Error('无法确定平面法矢');
        }
        const plane = new Plane(p0, norm);

        const pt2ds = paths.map(path => {
            return path.map(p => {
                return plane.getUVAt(p);
            });
        });

        const polygon = new Polygon(pt2ds);
        return new Face(plane, true, polygon);
    }

    public static _findNextCoedge(ignoreIdx: number, faces: Face[], e: Edge) {
        for (let i = 0; i < faces.length; i++) {
            if (i === ignoreIdx) {
                continue;
            }
            const face = faces[i];
            const polygon = face.getPolygon();
            const loops = polygon.getLoops();
            for (const loop of loops) {
                // 
                const ces = loop.getCoedges();
                for (const ce of ces) {
                    // 
                    DebugWarn.assert((face.getSurface().getType() === GeometryType.enPlane) && (ce.curve.getType() === GeometryType.enLine2D));
                    const curve3d = (face.getSurface() as Plane).getLine3D(ce.curve as Line2d);

                    // 查找该条edge是否存在
                    if (e.curve.getStartPt().equals(curve3d.getStartPt()) && e.curve.getEndPt().equals(curve3d.getEndPt())
                        || e.curve.getStartPt().equals(curve3d.getEndPt()) && e.curve.getEndPt().equals(curve3d.getStartPt())) {
                        // 
                        ce.setEdgeInfo(e.tag, true);
                        e.addCoEdgeInfo(ce.tag);
                        return;
                    }
                }
            }
        }
    }
}
