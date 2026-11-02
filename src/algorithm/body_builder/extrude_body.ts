import { Coordinate3 } from '../../math/coordinate3';
import { Vector3 } from '../../math/vector3';
import { BrepBody } from '../../geometry/brep/brep_body';
import { Face } from '../../geometry/brep/face';
import { Polygon } from '../../geometry/brep/polygon';
import { GeometryType } from '../../geometry/geometry_type';
import { Line3d } from '../../geometry/line3d';
import { Plane } from '../../geometry/plane';
import { SearchGraph } from '../search_graph';
import { Cylinder } from '../../geometry/cylinder';
import { Arc2d } from '../../geometry/arc2d';
import { Loop } from '../../geometry/brep/loop';
import { Arc3d } from '../../geometry/arc3d';
import { DebugWarn } from '../../util/debug_warn';

/**
 * @author tiansk
 *  拉伸体
 */
export class ExtrudeBody {

    /**
     *  构造拉伸体
     * @param coordinate  坐标轴
     * @param polygon    在坐标轴下的polyogn
     * @param dir  拉伸方向
     * @param height  拉伸高度，可以为负，负数代表向反方向拉伸
     */
    public static create(coordinate: Coordinate3, polygon: Polygon, dir: Vector3, height: number, coedgeToFace?: Map<string, string>): BrepBody {
        DebugWarn.assert(dir.dot(coordinate.zDir) > 0, '拉伸方向和coordinate z轴方向必须成锐角 \n\n');
        DebugWarn.assert(polygon.isValid(), 'polygon 不合法\n\n' + polygon.asString());
        polygon.getLoops().forEach(l => {
            const cvs = l.getAllCurves();
            for (let i = 0; i < cvs.length; i++) {
                DebugWarn.assert(
                    cvs[i].getEndPt().equals(cvs[(i + 1) % cvs.length].getStartPt(), 1e-8),
                    'polygon本身误差过大，转occ会有问题,调用polygon.makeStartEndConnected()可消除误差' + polygon.asString()
                );
            }
        });

        const polygonExs = SearchGraph.polygonToPolygonExs(polygon);
        const body = new BrepBody();

        polygonExs.forEach(p => {
            const e = ExtrudeBody.extrudePolygonEx(coordinate, p, dir, height, coedgeToFace);
            e.getEdges().forEach(eg => {
                body.addEdge(eg);
            });
            e.getFaces().forEach(fc => {
                body.addFace(fc);
            });
        });
        DebugWarn.assert(body.isTopoValid());
        return body;
    }

    public static extrudePolygonEx(coordinate: Coordinate3, polygon: Polygon, dir: Vector3, height: number, coedgeToFace?: Map<string, string>): BrepBody {
        const body = new BrepBody();

        const extrudeDir = dir.clone().normlize();

        // 底面
        let face0: Face;
        {
            const downPlane = new Plane(coordinate);
            const downPolygon = polygon.clone();
            face0 = new Face(downPlane, height < 0, downPolygon);
            body.addFace(face0);
        }

        // 顶面
        let face1: Face;
        {
            const upPlane = new Plane(coordinate.clone().translate(extrudeDir.clone().multi(height)));
            const upPolygon = polygon.clone();
            face1 = new Face(upPlane, height > 0, upPolygon);
            body.addFace(face1);
        }

        const basePlane = new Plane(coordinate);
        const strToFace = new Map<string, Face>();

        // 侧面
        for (const loop of polygon.getLoops()) {
            for (const ce of loop.getCoedges()) {
                let face: Face;
                if (ce.curve.getType() === GeometryType.enLine2D) {
                    const startPt = basePlane.getPtAt(ce.curve.getStartPt());
                    const endPt = basePlane.getPtAt(ce.curve.getEndPt());

                    face = Face.createByExtrude(startPt, endPt, dir, height);
                } else if (ce.curve.getType() === GeometryType.enArc2D) {
                    const cylinder = new Cylinder(coordinate.clone(), ce.curve.clone() as Arc2d);
                    const { min, max } = ce.curve.getRange();
                    const polygon1 = new Polygon(Loop.createByRectangle({ x: min, y: 0 }, { x: max, y: height }));
                    face = new Face(cylinder, true, polygon1);
                } else {
                    throw new Error('不支持的类型');
                }

                body.addFace(face);

                strToFace.set(`${loop.tag}-${ce.tag}`, face);
                if (coedgeToFace) {
                    coedgeToFace.set(ce.tag, face.tag);
                }
            }
        }

        // 边
        for (const loop of polygon.getLoops()) {
            const coedgeLength = loop.getCoedges().length;
            for (let j = 0; j < coedgeLength; j++) {
                const curCoedge = loop.getCoedges()[j];

                // 当前侧面
                const curFace = strToFace.get(`${loop.tag}-${curCoedge.tag}`);
                if (!curFace) {
                    throw new Error('cant find face, error!');
                }

                const curStartPt = basePlane.getPtAt(curCoedge.curve.getStartPt());
                const curEndPt = basePlane.getPtAt(curCoedge.curve.getEndPt());

                let downCurve3d;
                // 下边
                {
                    if (curCoedge.curve.getType() === GeometryType.enLine2D) {
                        downCurve3d = new Line3d(curStartPt, curEndPt);
                    } else if (curCoedge.curve.getType() === GeometryType.enArc2D) {
                        downCurve3d = new Arc3d(coordinate, curCoedge.curve.clone() as Arc2d);
                    } else {
                        throw new Error('不支持的类型');
                    }
                    const edge = body.addNewEdge(downCurve3d);

                    face0.makeEdgeAndFaceRefEachOther(edge);
                    curFace.makeEdgeAndFaceRefEachOther(edge);
                }

                // 上边
                {
                    const curve = downCurve3d.clone().translate(extrudeDir.clone().multi(height));
                    const edge = body.addNewEdge(curve);

                    face1.makeEdgeAndFaceRefEachOther(edge);
                    curFace.makeEdgeAndFaceRefEachOther(edge);
                }
                // 侧边
                {
                    const curve = new Line3d(curEndPt, extrudeDir.clone().multi(height).add(curEndPt));
                    const edge = body.addNewEdge(curve);

                    // 下一个侧面
                    const nextCoedge = loop.getCoedges()[(j + 1) % coedgeLength];
                    const nextFace = strToFace.get(`${loop.tag}-${nextCoedge.tag}`);
                    if (!nextFace) {
                        throw new Error('cant find face, error!');
                    }
                    curFace.makeEdgeAndFaceRefEachOther(edge);
                    nextFace.makeEdgeAndFaceRefEachOther(edge);
                }
            }
        }

        return body;
    }
}
