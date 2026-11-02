/* tslint:disable:no-void-expression */
import { Face } from '../../geometry/brep/face';
import { Polygon } from '../../geometry/brep/polygon';
import { Polyline } from '../../geometry/brep/polyline';
import { Line2d } from '../../geometry/line2d';
import { Line3d } from '../../geometry/line3d';
import { Plane } from '../../geometry/plane';
import { Coordinate3 } from '../../math/coordinate3';
import { ErrorSystem } from '../../math/error_system';
import { Vector2 } from '../../math/vector2';
import { DebugWarn } from '../../util/debug_warn';
import { CalculateIntersect } from '../calculate_intersect';
import { SurfaceSurfaceIntersect } from '../intersect/surface_surface_intersect';
import { SplitPolygon } from '../split/split_polygon';
import { SplitPolyline } from '../split/split_polyline';
import { FaceProject } from './face_project';
import { PositionJudge } from '..';
import { PtLoopPositonType, CurveLoopPositonType } from '../position_judge/position_judge_type';
import { CalculatDistance } from '../calculate_distance';
import { MathUtil } from '../../util/math_util';

/**
 * Face数组沿coordinate的z轴向coordinate平面投影
 */
class FacesProject {

    /**
     * @param faces 
     * @param coordinate 
     * @param isJudgeOcclusion 是否计算遮挡关系，默认为false
     */
    public static execute(faces: Face[], coordinate: Coordinate3, isJudgeOcclusion = false): (Polyline[] | Polygon)[] {
        return new FacesProject(faces, coordinate, isJudgeOcclusion).__execute();
    }

    private constructor(
        private faces: Face[],
        private coordinate: Coordinate3,
        private isJudgeOcclusion: boolean) { }

    /**
     * @param faces 
     * @param coordinate 
     * @param judgeOcclusion 是否计算遮挡关系
     */
    private __execute(): (Polyline[] | Polygon)[] {
        const result = this.faces.map(f => {
            return FaceProject.execute(f, this.coordinate);
        });

        // 不判断遮挡关系
        if (!this.isJudgeOcclusion) {
            return result;
        }

        // 打断
        for (let i = 0; i < result.length; i++) {
            this.splitPolygon(i, result);
        }

        // 判断遮挡关系,并将遮挡关系绑定到Coedge上
        this._judgeOcclusion(result);

        return result;
    }

    // 判断遮挡关系
    private _judgeOcclusion(polygons: (Polyline[] | Polygon)[]) {
        const targetPlane = new Plane(this.coordinate);
        let i = 0;
        for (const poly of polygons) {
            const polylines: Polyline[] = [];
            if (poly instanceof Array) {
                polylines.push(...poly);
            } else {
                polylines.push(...poly.getLoops());
            }

            const idx = i++;
            polylines.forEach(pl => this.judgePolylineOcclusion(pl, idx, polygons, targetPlane));
        }

    }

    public judgePolylineOcclusion(
        polyline: Polyline,
        idx: number,
        polygons: (Polyline[] | Polygon)[],
        targetPalne: Plane) {

        //  
        for (const ce of polyline.getCoedges()) {
            // 中点
            const midPt = ce.curve.getMidPt();
            const fronts = this.__judgePointOcclusion(midPt, idx, polygons, targetPalne);
            if (fronts.length > 0) {
                // ce.setUserData('front', fronts.map(front => {
                //     return faces[front].id;
                // }));
                ce.setUserData('lineType', '虚线');
            }
        }
    }

    private __judgePointOcclusion(
        pt2d: Vector2,
        idx: number,
        polygons: (Polyline[] | Polygon)[],
        targetPalne: Plane) {
        const pt3d = targetPalne.getPtAt(pt2d);
        const line = Line3d.createByOriginAndDir(
            pt3d,
            targetPalne.getNorm(),
            [-ErrorSystem.MODEL_MAX_LENGTH, ErrorSystem.MODEL_MAX_LENGTH]);

        // 中点
        const candidates = [{ face: this.faces[idx], idx, param: 0 }];
        for (let i = 0; i < polygons.length; i++) {
            const polygon = polygons[i];
            if (i === idx) { continue; }
            if (polygon instanceof Array) {
                // 
                if (this.faces[i].getCenterNorm().isPerpendicularTo(this.coordinate.zDir)) {
                    console.warn('应该使用curve与polygon的位置关系');
                    if (CalculatDistance.ptToSurface(pt3d, this.faces[i].getSurface()) > ErrorSystem.LENGTH_EPS) {
                        continue;
                    }
                    if (CurveLoopPositonType.INTERSECT === PositionJudge.curveToLoop((this.faces[i].getSurface() as Plane).getLine2D(line)!, this.faces[i].getPolygon().loops[0])) {
                        candidates.push({ face: this.faces[i], idx: i, param: 0 });
                    }
                }
            } else {
                const type = PositionJudge.ptToPolygon(pt2d, polygon);
                // 不是out
                if (type !== PtLoopPositonType.OUT) {
                    candidates.push({ face: this.faces[i], idx: i, param: 0 });
                }
            }
        }

        // 
        candidates.forEach(faceAndIdx => {
            DebugWarn.assert(faceAndIdx.face);
            const intersects = CalculateIntersect.curveSurface(line, faceAndIdx.face.getSurface());
            if (intersects.length === 1) {
                faceAndIdx.param = line.getParamAt(intersects[0]);
            } else {
                // 两平面垂直
                const norm1 = faceAndIdx.face.getCenterNorm();
                const norm2 = targetPalne.getNormAt(Vector2.zero());
                const norm = norm1.cross(norm2);
                const plane = new Plane(pt3d, norm);
                const plane2 = faceAndIdx.face.getSurface() as Plane;
                const line3ds = SurfaceSurfaceIntersect.execute(plane, plane2);
                DebugWarn.assert(line3ds.length === 1);
                const line2d = plane2.getLine2D(line3ds[0] as Line3d)!;
                DebugWarn.assert(line2d);

                const curve2ds = CalculateIntersect.curve2dPolygon(line2d, faceAndIdx.face.getPolygon());
                let max = -ErrorSystem.MODEL_MAX_LENGTH;
                curve2ds.forEach(cv => {
                    const sp = line.getParamAt(plane2.getPtAt(cv.getStartPt()));
                    const ep = line.getParamAt(plane2.getPtAt(cv.getEndPt()));
                    if (sp > max) { max = sp; }
                    if (ep > max) { max = ep; }
                });

                faceAndIdx.param = max;
            }
        });

        candidates.sort((a, b) => {
            return a.param - b.param;
        });

        const meIdx = candidates.findIndex(cand => {
            return cand.idx === idx;
        });

        // 过滤掉同一级的
        let result = candidates.slice(meIdx + 1);
        result = result.filter(r => {
            return !MathUtil.isNearlyEqual(r.param, candidates[meIdx].param);
        });
        return result.map(r => { return r.idx; });
    }

    public splitPolygon(idx: number, src: (Polyline[] | Polygon)[]): boolean {
        const polygon: Polyline[] | Polygon = src[idx];
        // 1.搜集直线
        const polylines = [];
        const candidates: Line2d[] = [];
        for (let i = 0; i < src.length; i++) {
            if (i === idx) {
                continue;
            }
            const p = src[i];
            if (p instanceof Array) {
                polylines.push(...p);
            } else {
                polylines.push(...p.getLoops());
            }
        }
        polylines.forEach(l => {
            l.getCoedges().forEach(ce => {
                candidates.push(ce.curve.clone() as Line2d);
            });
        });

        // 2.打断
        if (polygon instanceof Array) {
            for (const polyline of polygon) {
                SplitPolyline.execute(polyline, candidates);
            }
            return true;
        }

        // 打断polygon
        SplitPolygon.execute(polygon, candidates);

        return true;
    }
}

export { FacesProject };

