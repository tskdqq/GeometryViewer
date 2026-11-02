import { Loop } from '../../geometry/brep/loop';
import { Face } from '../../geometry/brep/face';
import { Polygon } from '../../geometry/brep/polygon';
import { BoolOperate2d } from '../bool_operate_2d';
import { DebugWarn } from '../../util/debug_warn';
import { SearchGraph } from '../search_graph';
import { BrepBody } from '../../geometry/brep/brep_body';
import { GeometryType } from '../../geometry/geometry_type';

/**
 * Face的打断算法，使用loop去打断face,返回新产生的面的tag
 */
export class SplitFace {
    public static execute(face: Face, loop: Loop): string[] {
        DebugWarn.assert(face.getTopoBody(), '必须能取到face的body');
        const body = face.getTopoBody()!;
        // 1.先打断face
        const face1 = face.clone();
        const polygon1 = new Polygon(loop);
        const polygonInt = BoolOperate2d.intersect([face.clone().getPolygon(), polygon1]);
        if (polygonInt.isEmpty()) {
            return [];
        }
        face1.setPolygon(polygonInt);

        const result = [face1.tag];

        const loopCopy = loop.clone();
        loopCopy.offset(1e-8);
        const polygon2 = BoolOperate2d.difference(face.clone().getPolygon(), [loopCopy]);
        const polygons = SearchGraph.polygonToPolygonExs(polygon2);
        polygons.forEach(p => {
            const face2 = face.clone();
            face2.setPolygon(p);
            body.addFace(face2);
            result.push(face2.tag);
        });

        // 维护body的拓扑关系
        // 删除edge
        face.getTopoEdges().forEach(edge => {
            body.deleteEdgeByTag(edge.tag);
        });
        // 删除face
        body.deleteFaceByTag(face.tag);
        // 添加新face
        body.addFace(face1);

        body.calcAndAddEdges();

        if (body.getType() === GeometryType.enBrepBody) {
            DebugWarn.assert((body as BrepBody).isTopoValid());
        }

        return result;
    }
}
