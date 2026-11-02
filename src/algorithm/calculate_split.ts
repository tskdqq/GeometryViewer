import { Face } from '../geometry/brep/face';
import { Loop } from '../geometry/brep/loop';
import { SplitFace } from './split/split_face';
import { Line2d } from '../geometry/line2d';
import { Polygon } from '../geometry/brep/polygon';
import { SplitPolygon } from './split/split_polygon';
import { BrepBody } from '../geometry/brep/brep_body';
import { Plane } from '../geometry/plane';
import { PlaneCutBody } from './split/plane_cut_body';
import { PlaneCutFace } from './split/plane_cut_face';

/**
 * 打断算法
 */
export class Split {

    /**
     * 打断face,若face属于body，则会改变body拓扑
     */
    public static faceByLoop(face: Face, loop: Loop) {
        return SplitFace.execute(face, loop);
    }

    /**
     * 平面切face，返回与平面法向同侧的部分
     */
    public static faceByPlane(body: Face, plane: Plane): Face | undefined {
        return PlaneCutFace.execute(body, plane);
    }

    /**
     * 打断Loop,用若干条二维直线将一个环拆成多个环
     */
    public static polygon(splitLines: Line2d[], polygon: Polygon) {
        return SplitPolygon.LineSplitPolygon(splitLines, polygon);
    }

    /**
     * 面切体，返回与平面法向同侧的部分
     */
    public static body(body: BrepBody, plane: Plane): BrepBody | undefined {
        return PlaneCutBody.execute(body, plane);
    }
}
