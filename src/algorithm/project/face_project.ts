import { Face } from '../../geometry/brep/face';
import { Loop } from '../../geometry/brep/loop';
import { Polygon } from '../../geometry/brep/polygon';
import { Polyline } from '../../geometry/brep/polyline';
import { TopoTrackType } from '../../geometry/brep/topo_track_type';
import { Line2d } from '../../geometry/line2d';
import { Plane } from '../../geometry/plane';
import { Coordinate3 } from '../../math/coordinate3';
import { Interval } from '../../math/interval';
import { Vector2 } from '../../math/vector2';
import { DebugWarn } from '../../util/debug_warn';
import { DiscreteUtil } from '../discrete_util';
import { Line1ProjectToLine2 } from './line_line_project';
import { GeometryType } from '../../geometry/geometry_type';
import { ErrorSystem } from '../../math/error_system';

/**
 * line1向line2投影，返回一个区间，该区间代表投影后的线在line2上的区间
 */
class FaceProject {
    public static execute(face: Face, coordinate: Coordinate3): Polyline[] | Polygon {
        const projectedPlane = face.getSurface() as Plane;
        const targetPlane = new Plane(coordinate);
        const polyogn = face.getPolygon();
        DebugWarn.assert(!polyogn.isEmpty(), 'polygon不能为空');

        // 平行，投影为一条线
        if (face.getSurface().getNormAt(Vector2.zero()).isPerpendicularTo(coordinate.zDir, ErrorSystem.ANGLE_EPS)) {
            // 
            const paths = polyogn.getLoops().map(l => {
                // 取出所有的三维点
                const xys = DiscreteUtil.discretePolyline(l, 0.1);
                const v3ds = xys.map(xy => {
                    return projectedPlane.getPtAt(xy);
                });
                // 投影到参数域
                return v3ds.map(v3 => {
                    return targetPlane.getUVAt(v3);
                });
            });

            const polylines = FaceProject.mergeLines(paths);
            polylines.forEach(polyline => {
                if (polyline.topoTrack !== undefined) {
                    polyline.topoTrack.operate = TopoTrackType.PROJECT;
                    polyline.topoTrack.tags = [face.tag];
                    polyline.topoTrack.parentType = GeometryType.enFace;
                }
            });
            return polylines;
        }
        // 2.不平行依次投影
        const polygon = new Polygon();
        if (polygon.topoTrack !== undefined) {
            polygon.topoTrack.operate = TopoTrackType.PROJECT;
            if (face.topoTrack !== undefined && face.topoTrack.operate === TopoTrackType.BOOL_OPERATE) {
                polygon.topoTrack.tags = [face.topoTrack.tags[0]];
                polygon.topoTrack.parentType = GeometryType.enBrepBody;
            } else {
                polygon.topoTrack.tags = [face.tag];
                polygon.topoTrack.parentType = GeometryType.enFace;
            }
        }


        polyogn.getLoops().forEach(l => {
            const loop = new Loop();
            l.getCoedges().forEach(ce => {
                // 取出所有的三维点
                const line3d = projectedPlane.getLine3D(ce.curve as Line2d);
                // const projectedLine2d = targetPlane.getLine2D(line3d)!;
                const p1 = targetPlane.getUVAt(line3d.getStartPt());
                const p2 = targetPlane.getUVAt(line3d.getEndPt());
                const projectedLine2d = new Line2d(p1, p2);

                const coedge = loop.addCurve(projectedLine2d);
                // 拓扑追溯
                if (face.topoTrack !== undefined && face.topoTrack.operate !== TopoTrackType.BOOL_OPERATE) {
                    if (coedge.topoTrack !== undefined) {
                        coedge.topoTrack.operate = TopoTrackType.PROJECT;
                        coedge.topoTrack.tags = [ce.tag];
                        coedge.topoTrack.parentType = GeometryType.enCoedge;
                    }
                }
            });
            if (face.topoTrack !== undefined && face.topoTrack.operate !== TopoTrackType.BOOL_OPERATE) {
                if (loop.topoTrack !== undefined) {
                    loop.topoTrack.operate = TopoTrackType.PROJECT;
                    loop.topoTrack.tags = [l.tag];
                    loop.topoTrack.parentType = GeometryType.enLoop;
                }
            }
            polygon.addLoop(loop);
        });

        if (polygon.calcArea() < 0) {
            polygon.reverse();
        }

        return polygon;
    }

    public static mergeLines(paths: Vector2[][]): Polyline[] {
        // 合并直线
        let line0: Line2d | undefined;
        const ranges = [];
        for (const path of paths) {
            for (let i = 0; i < path.length; i++) {
                if (path[i].equals(path[i === path.length - 1 ? 0 : i + 1])) {
                    continue;
                }

                const line = new Line2d(path[i], path[i === path.length - 1 ? 0 : i + 1]);
                if (!line0) {
                    line0 = line;
                    ranges.push(line0.getRange());
                    continue;
                }
                const range = Line1ProjectToLine2.execute(line, line0);
                ranges.push(range);

            }
        }

        if (!line0) {
            return [];
        }
        DebugWarn.assert(line0, 'line0?');
        // 合并
        const resultRanges = Interval.merge(ranges);

        return resultRanges.map(r => {
            const l = (line0 as Line2d).clone().setRange(r);
            const polyline = new Polyline();
            polyline.addCurve(l);
            return polyline;
        });
    }
}


export { FaceProject };
