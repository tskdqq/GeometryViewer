import { BrepBody } from '../../geometry/brep/brep_body';
import { Face } from '../../geometry/brep/face';
import { Loop } from '../../geometry/brep/loop';
import { Line3d } from '../../geometry/line3d';
import { Plane } from '../../geometry/plane';
import { ErrorSystem } from '../../math/error_system';
import { Vector3 } from '../../math/vector3';
import { DebugWarn } from '../../util/debug_warn';
import { MathUtil } from '../../util/math_util';
import { CalculateIntersect } from '../calculate_intersect';
import { PositionJudge } from '../position_judge';
import { BoolOperate2d } from '../bool_operate_2d';
import { Polyline } from '../../geometry/brep/polyline';
import { GeometryType } from '../../geometry/geometry_type';

/**
 * Faces 与 Box求交
 */
class FacesBoxIntersect {

    /**
     * Faces 与 Box求交, 直接改变输入参数faces
     * @param faces 
     * @param box 
     * @returns 返回Face的数组
     */
    public static execute(faces: Face[], box: BrepBody) {
        // 判断body是凹还是凸
        const tu = true;
        if (tu) {
            FacesBoxIntersect.__excute(faces, box.getFaces());
            return;
        }
        const boxFaces = box.getFaces();
        const result: Face[] = [];
        for (const f of faces) {
            const polylines = CalculateIntersect.faceFaces(f, boxFaces);
            if (!polylines || polylines.length < 1) {
                // 没有交,取一点判断内外
                const pt = f.getSomePoint();
                const ok = FacesBoxIntersect.isPtInBody(pt, boxFaces);
                if (ok) {
                    result.push(f.clone());
                }
                // 舍掉
                continue;
            } else {
                const loops: Loop[] = [];
                const polys: Polyline[] = [];
                // 切面
                for (const l of polylines) {
                    if (l.getType() === GeometryType.enLoop) {
                        // 
                        loops.push(l as Loop);
                    } else {
                        polys.push(l as Polyline);
                    }
                }

                if (loops.length > 0) {
                    const polygon = BoolOperate2d.intersect([f.getPolygon(), ...loops]);
                    f.setPolygon(polygon);
                }
            }
        }

        return result;
    }

    /**
     * body没有洞
     * @param point 
     * @param faces 
     */
    public static isPtInBody(point: Vector3, faces: Face[]): boolean {
        // 1.射线法求点与body的位置关系
        // const dir = new Vector3(Math.random(), Math.random(), Math.random());
        // dir.normlize();

        // const line3d = Line3d.createByOriginAndDir(point, dir, [0, ErrorSystem.MODEL_MAX_LENGTH]);

        // for (const face of faces) {
        //     const uv = face.getSurface().getUVAt(point);
        //     const polygon = face.getPolygon();

        //     if (PtLoopPositonType.OUT === PositionJudge.ptToPolygon(uv, polygon)) {
        //         return false;
        //     }
        // }
        return true;
    }

    private static __excute(faces: Face[], box: Face[]) {
        for (const cliper of box) {
            FacesBoxIntersect.__excuteA(faces, cliper);
        }
    }

    private static __excuteA(faces: Face[], clipper: Face) {
        DebugWarn.assert(clipper.getSurface().getType() === GeometryType.enPlane, 'just suport plane type');
        const maxFace = clipper.getSurface();
        for (const f of faces) {
            if (f.userData && f.userData.deleteMe) { continue; }

            const intcurves = CalculateIntersect.surfaceSurface(maxFace, f.getSurface());
            if (intcurves.length < 1) {
                // 判断是在否是在法线同一侧吗
                const p = f.getSomePoint();
                const outside = PositionJudge.isPtAboveFace(p, clipper);
                if (outside) {
                    // 标记为删除
                    f.setUserData('deleteMe', 1);
                    continue;
                }
            } else {
                // 开始截
                const interCurve = intcurves[0] as Line3d;
                const plane = f.getSurface() as Plane;
                const line2d = plane.getLine2D(interCurve)!;
                const testUV = line2d.getMidPt()
                    .add(
                        line2d.getDirection().rotate(-MathUtil.PI_2).multi(100));
                const test = plane.getPtAt(testUV);

                const outside = PositionJudge.isPtAboveFace(test, clipper);
                line2d.extend(ErrorSystem.MODEL_MAX_LENGTH);
                line2d.extend(ErrorSystem.MODEL_MAX_LENGTH, false);

                const pts = [];
                // 减掉外面的
                if (outside) {
                    const right = line2d.clone();
                    right.offset(ErrorSystem.MODEL_MAX_LENGTH);
                    pts.push(right.getStartPt(), right.getEndPt(), line2d.getEndPt(), line2d.getStartPt());
                } else {
                    const left = line2d.clone();
                    left.offset(-ErrorSystem.MODEL_MAX_LENGTH);
                    pts.push(left.getStartPt(), left.getEndPt(), line2d.getEndPt(), line2d.getStartPt());
                }

                const loop = new Loop(pts);
                if (!loop.isAnticlockwise()) {
                    loop.reverse();
                    console.log('loop !isAnticlockwise');
                }
                const polygon = BoolOperate2d.difference(f.getPolygon(), [loop]);
                if (!polygon.isEmpty()) {
                    f.setPolygon(polygon);
                } else {
                    // 标记为删除
                    f.setUserData('deleteMe', 1);
                }
            }
        }

        for (let i = faces.length - 1; i > -1; i--) {
            if (faces[i].userData && faces[i].userData.deleteMe) {
                faces.splice(i, 1);
            }
        }
    }
}

export { FacesBoxIntersect };

