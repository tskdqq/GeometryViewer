import { Polygon } from '../geometry/brep/polygon';
import { DebugWarn } from '../util/debug_warn';
import { Face } from '../geometry/brep/face';
import { Loop } from '../geometry/brep/loop';
import { ErrorSystem } from '../math/error_system';
import { GeometryType } from '../geometry/geometry_type';
import { Body } from '../geometry/brep/body';
import { BoolOperate2d } from './bool_operate_2d';
import { Surface } from '../geometry/surface';
import { FaceFacesIntersect } from './intersect/face_faces_intersect';
import { SearchGraph } from './search_graph';
import { LogUtil } from '../util/log_util';

/**
 * 布尔运算
 */
export class BoolOperate3d {

    // /**
    //  * face交body
    //  * @param loopOrPolygons1 
    //  * @param loopOrPolygons2 
    //  */
    // public static faceIntersectBody(face: Face, body: Body): Polygon {
    //     DebugWarn.assert(face.getSurface().getType() === GeometryType.enPlane, 'just suport plane type');

    //     const thisSurface = face.getSurface();

    //     let thisPolygon = face.getPolygon().clone();

    //     for (const clipper of body.getFaces()) {
    //         if (thisPolygon.isEmpty()) {
    //             return thisPolygon;
    //         }

    //         const thatSurface = clipper.getSurface() as Plane;

    //         const intcurves = CalculateIntersect.surfaceSurface(thisSurface, thatSurface);
    //         if (intcurves.length) {
    //             const interCurve = intcurves[0] as Line3d;
    //             const line2d = thatSurface.getLine2D(interCurve)!;
    //             const testUV = line2d.getMidPt()
    //                 .add(
    //                     line2d.getDirection().rotate(-MathUtil.PI_2).multi(100));
    //             const test = thatSurface.getPtAt(testUV);

    //             const outside = PositionJudge.isPtAboveFace(test, clipper);
    //             line2d.extendDouble(ErrorSystem.MODEL_MAX_LENGTH);

    //             const pts = [];
    //             // 减掉外面的
    //             if (outside) {
    //                 const right = line2d.clone();
    //                 right.offset(ErrorSystem.MODEL_MAX_LENGTH);
    //                 pts.push(right.getStartPt(), right.getEndPt(), line2d.getEndPt(), line2d.getStartPt());
    //             } else {
    //                 const left = line2d.clone();
    //                 left.offset(-ErrorSystem.MODEL_MAX_LENGTH);
    //                 pts.push(left.getStartPt(), left.getEndPt(), line2d.getEndPt(), line2d.getStartPt());
    //             }

    //             const loop = new Loop(pts);
    //             if (!loop.isAnticlockwise()) {
    //                 loop.reverse();
    //                 console.log('loop !isAnticlockwise');
    //             }
    //             thisPolygon = BoolOperate2d.difference(thisPolygon, [loop]);
    //         }
    //     }

    //     return thisPolygon;
    // }

    /**
     * face交body
     * @param loopOrPolygons1 
     * @param loopOrPolygons2 
     */
    public static surfaceIntersectBody(surface: Surface, body: Body): Polygon {
        DebugWarn.assert(surface.getType() === GeometryType.enPlane, 'just suport plane type');

        const range = Loop.createByRectangle(
            { x: -ErrorSystem.MODEL_MAX_LENGTH, y: -ErrorSystem.MODEL_MAX_LENGTH },
            { x: ErrorSystem.MODEL_MAX_LENGTH, y: ErrorSystem.MODEL_MAX_LENGTH });

        const face = new Face(surface, true, new Polygon(range));
        const loopOrPolylines = FaceFacesIntersect.execute(face, body.getFaces());
        let loops: Loop[] = [];

        let hasError = false;
        loopOrPolylines.forEach(l => {
            if (l instanceof Loop) {
                loops.push(l as Loop);
            } else if (l.getAllCurves().length > 1) {
                loops.push(new Loop(l.toPath()));
            } else {
                hasError = true;
            }
        });

        if (hasError) {
            const cv3d: any = [];

            loopOrPolylines.forEach(l => {
                l.getAllCurves().forEach(cv => {
                    cv3d.push(face.getSurface().getCurve3d(cv));
                });
            });

            LogUtil.e([face, body, ...cv3d], 'surface与body求交错误');
        }

        loops = loops.filter(l => l.isValid());

        if (!loops.length) {
            return new Polygon();
        }
        const lls: Loop[] = [];
        SearchGraph.loopsToPolygonExs(loops).forEach(pe => {
            lls.push(...pe.getLoops());
        });

        const polygon = new Polygon(lls);

        return BoolOperate2d.intersect([face.getPolygon(), polygon]);
    }

    /**
     * face减body
     * @param loopOrPolygons1 
     * @param loopOrPolygons2 
     */
    public static faceDifferenceBody(face: Face, body: Body): Polygon {
        // if (!face.getBoundingBox().intersectsBox(body.getBoundingBox())) {
        //     return face.getPolygon().clone();
        // }
        DebugWarn.assert(face.getSurface().getType() === GeometryType.enPlane, 'just suport plane type');

        const thisPolygon = face.getPolygon().clone();
        const intPolygon = BoolOperate3d.surfaceIntersectBody(face.getSurface(), body);
        if (intPolygon.isEmpty()) {
            return thisPolygon;
        }
        // console.log(face.asString());
        return BoolOperate2d.difference(thisPolygon, [intPolygon]);
    }
}
