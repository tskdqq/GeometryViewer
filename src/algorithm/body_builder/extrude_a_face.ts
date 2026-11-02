import { DebugWarn } from '../../util/debug_warn';
import { ErrorSystem } from '../../math/error_system';
import { Face } from '../../geometry/brep/face';
import { Loop } from '../../geometry/brep/loop';
import { BrepBody } from '../../geometry/brep/brep_body';
import { LoopLoopPositonType, CurveCuvePositonType } from '../position_judge/position_judge_type';
import { CalculateProjecet } from '../calculate_project';
import { Polygon } from '../../geometry/brep/polygon';
import { BoolOperate2d } from '../bool_operate_2d';
import { SearchGraph } from '../search_graph';
import { Coedge } from '../../geometry/brep/coedge';
import { Curve2d } from '../../geometry/curve2d';
import { Interval } from '../../math/interval';
import { Plane } from '../../geometry/plane';
import { Line2d } from '../../geometry/line2d';
import { LoopLoopPositionJudge } from '../position_judge/loop_loop_position_judge';
import { CurveCurvePositionJudge } from '../curve_curve_position_judge';

/**
 * 挤压拉伸
 */
export class ExtrudeAFace {

    /**
     * @param body [in,out]
     * @param faceTag 表示在那个面上挤压
     * @param _loop 被挤压的区域,被挤压的区域不大于targetFace,否则会抛异常
     * @param extrudeDistance 挤压的距离，可正可负（规定与face法向相同为正，否则为负）
     * @returns true 挤压成功 false 挤压失败
     */
    public static execute(targetFace: Face, _loop: Loop, extrudeDistance: number): boolean {
        if (Math.abs(extrudeDistance) < ErrorSystem.LENGTH_EPS) {
            return true;
        }
        const body: BrepBody = targetFace.getTopoBody() as BrepBody;
        DebugWarn.assert(body, 'cant find body,error?');
        const loop = _loop.clone();
        if (!loop.isAnticlockwise()) {
            loop.reverse();
        }
        const addingFaces: Face[] = [];
        const oldFaces = [...body.getFaces()];

        const polygon = targetFace.getPolygon();
        // todo： 支持多个环的算法（添加loop与polygon的位置关系判断）
        DebugWarn.assert(polygon.getLoops().length === 1, '只支持一个环的loop');
        const type = LoopLoopPositionJudge.execute(loop, polygon.getLoops()[0]);
        if (type !== LoopLoopPositonType.EQUAL
            && type !== LoopLoopPositonType.INTERSECT_TANGENT_INNER
            && type !== LoopLoopPositonType.IN) {
            console.error('传入的loop不能比原face大，请用二维布尔裁剪一下');
            return false;
        }

        // 挤压方向
        const extrudeDir = targetFace.getCenterNorm();
        const offset3d = extrudeDir.clone().multi(extrudeDistance);

        // 顶面
        let topFace;
        {// 顶面
            topFace = targetFace.clone().translate(offset3d);
            const tmpPolygon = new Polygon(loop.clone());
            topFace.setPolygon(tmpPolygon);
            addingFaces.push(topFace);
        }

        // 侧面
        const { newFaces, deletedFaces } = ExtrudeAFace.calcSideFaces(targetFace, loop, extrudeDistance, type === LoopLoopPositonType.IN);
        newFaces.forEach(f => {
            f.getTopoCoedges().forEach(ce => {
                DebugWarn.assert(!ce.edgeId);
            });
            addingFaces.push(f);
        });

        // 底面
        let bottomFace;
        {
            if (type === LoopLoopPositonType.EQUAL) {
                // 需要删除底面
                deletedFaces.push(targetFace);
            } else if (type === LoopLoopPositonType.INTERSECT_TANGENT_INNER) {
                // 需要分成多个face
                const holes = BoolOperate2d.difference(targetFace.getPolygon().clone(), [loop]);
                deletedFaces.push(targetFace);

                const polygons = SearchGraph.polygonToPolygonExs(holes);
                polygons.forEach(p => {
                    const face = targetFace.clone();
                    face.setPolygon(p);
                    addingFaces.push(face);
                });

            } else if (type === LoopLoopPositonType.IN) {
                targetFace.getPolygon().addLoop(loop.clone().reverse());
                bottomFace = targetFace;
            } else {
                DebugWarn.assert(false, '不应该是此类型' + bottomFace);
            }
        }

        // 记录需要保留的edge
        const reserveEdges: Set<string> = new Set();
        oldFaces.forEach(o => {
            if (deletedFaces.indexOf(o) > -1) {
                return;
            }
            if (o.getTopoCoedges().length !== o.getTopoEdges().length) {
                console.error(o.getTopoCoedges().length, o.getTopoEdges().length);
            }
            o.getTopoEdges().forEach(oe => {
                reserveEdges.add(oe.tag);
            });
        });

        // 需要删除的面，也就是被改动的面
        deletedFaces.forEach(f => {
            body.deleteFaceByTag(f.tag);
        });

        const deletedEdges: string[] = [];
        // 删除edge时需解除与coedge的关联
        body.getEdges().forEach(e => {
            if (!reserveEdges.has(e.tag)) {
                deletedEdges.push(e.tag);
            }
        });
        deletedEdges.forEach(tag => {
            const deleteOK = body.deleteEdgeByTag(tag);
            DebugWarn.assert(deleteOK);
        });

        addingFaces.forEach(f => {
            body.addFace(f);
        });
        DebugWarn.assert(body.isEdgeCoedgeRefValid());

        // 补充其他的edge
        body.calcAndAddEdges();
        DebugWarn.warn(body.isTopoValid());

        return true;
    }

    // loop在face内部
    public static calcSideFaces(targetFace: Face, loop: Loop, extrudeDistance: number, isLoopInFace: boolean) {

        const newFaces = [];
        const deletedFaces = [];

        const extrudeDir = targetFace.getCenterNorm();

        // 搜集所有需要打断的线，是因为有的线被多条曲线打断
        const adjacentFaces: Map<Coedge, Curve2d[]> = new Map();
        // 侧面
        for (const ce of loop.getCoedges()) {
            const cv = ce.curve;
            let extrudeDirectly = false;
            let twin: Coedge | undefined;

            if (isLoopInFace) {
                extrudeDirectly = true;
            } else {
                twin = ExtrudeAFace.getTwinByCurve(cv, targetFace);
                if (!twin) {
                    extrudeDirectly = true;
                } else {
                    const twinFace = twin.getTopoFace() as Face;
                    DebugWarn.assert(twinFace);
                    if (twinFace.getSurface().getType() !== targetFace.getSurface().getType()) {
                        extrudeDirectly = true;
                    } else if (!twinFace.getCenterNorm().isPerpendicularTo(targetFace.getCenterNorm())) {
                        extrudeDirectly = true;
                    }
                }
            }
            // console.log('isLoopInFace', isLoopInFace);
            if (extrudeDirectly) {
                const start = targetFace.getPtAt(cv.getStartPt());
                const end = targetFace.getPtAt(cv.getEndPt());
                const newFace = Face.createByExtrude(start, end, extrudeDir, extrudeDistance, true);
                newFaces.push(newFace);
                continue;
            } else {
                if (!twin) {
                    throw new Error('twin is undefined?');
                }
                let curves = adjacentFaces.get(twin);
                if (!curves) {
                    curves = [];
                    adjacentFaces.set(twin, curves);
                }
                curves.push(cv);
            }
        }

        for (const [twin, curves] of adjacentFaces) {

            const clonedTwinFace = twin.getTopoFace()!.cloneAndReserveTag();
            clonedTwinFace.clearTopoEdges();

            const twinRange = twin.curve.getRange();
            const subRanges: Interval[] = [];
            curves.forEach(cv => {
                const line3d = (targetFace.getSurface() as Plane).getLine3D(cv);
                const line2d = (clonedTwinFace.getSurface() as Plane).getLine2D(line3d);
                // 
                const itRange = CalculateProjecet.line1ToLine2(line2d as Line2d, twin.curve as Line2d);

                DebugWarn.assert(twinRange.containsInterval(itRange, ErrorSystem.LENGTH_EPS));
                subRanges.push(itRange);
            });
            // 
            const subs = twinRange.sub(...subRanges).filter(r => {
                return r.getLength() > ErrorSystem.LENGTH_EPS;
            });
            const cvs = subs.map(r => {
                return twin!.curve.clone().setRange(r);
            });

            subRanges.forEach(sr => {
                const c = twin.curve.clone().setRange(sr);
                // todo：需要判断正负?
                c.offset(extrudeDistance);
                cvs.push(c);
            });

            cvs.sort((a, b) => {
                return a.getRange().min - b.getRange().min;
            });

            deletedFaces.push(twin.getTopoFace()!);

            const twinLoop = clonedTwinFace.getLoopByTag(twin.getTopoLoop()!.tag)!;
            if (!twinLoop) {
                debugger;
            }
            const idx = twinLoop.getCoedges().findIndex(c => {
                return c.tag === twin!.tag;
            });
            DebugWarn.assert(idx > -1);

            twinLoop.getCoedges().splice(idx, 1);
            twinLoop.insertCoedge(idx, ...cvs);
            // LogUtil.d(twinLoop, 'twinLoop');
            twinLoop.makeStartEndConnected();
            // LogUtil.d(twinLoop, 'new');
            newFaces.push(clonedTwinFace);
        }

        return { newFaces, deletedFaces };
    }

    // 
    public static getTwinByCurve(curve: Curve2d, targetFace: Face): Coedge | undefined {
        const coedge = targetFace.getTopoCoedges().find(ce => {
            const type = CurveCurvePositionJudge.execute(curve, ce.curve);
            return type === CurveCuvePositonType.OVERLAP_EQUAL || type === CurveCuvePositonType.OVERLAP_IN;
        });
        if (coedge) {
            return coedge.getTwin();
        }
        return;
    }

    // /**
    //  * 合并face
    //  * @param newFace 
    //  * @param oldFace 
    //  */
    // public static mergeFace(oldFace: Face, newFace: Face) {
    //     // 
    //     if (oldFace.isPlane() && newFace.isPlane()) {
    //         const norm1 = oldFace.getCenterNorm();
    //         const norm2 = newFace.getCenterNorm();
    //         if (norm1.isParalellTo(norm2)) {
    //             return;
    //         }
    //         const oldPolygon = oldFace.getPolygon();
    //         const newPolygon = CalculateProjecet.face1ToFace2(newFace, oldFace.getSurface());
    //         let boolresult;
    //         if (norm1.isSameDirectionWith(norm2)) {
    //             boolresult = BoolOperate2d.union([oldPolygon, newPolygon]);
    //         } else {
    //             boolresult = BoolOperate2d.difference(oldPolygon, [newPolygon]);
    //         }
    //         return oldFace.clone().setPolygon(boolresult);
    //     }

    //     return;
    // }
}

