import { Loop } from '../../geometry/brep/loop';
import { Polyline } from '../../geometry/brep/polyline';
import { Curve2d } from '../../geometry/curve2d';
import { ErrorSystem } from '../../math/error_system';
import { DebugWarn } from '../../util/debug_warn';
import { Vector2 } from '../../math/vector2';
import { Curve3d } from '../../geometry/curve3d';
import { Vector3 } from '../../math/vector3';

/**
 * 搜索简单Polyline，简单Polyline就是Coedge只在端点处相交，且交点最多连接2条线
 * 该接口目前不开放出去
 */
class SearchPolyline {

    public static execute(_curve2ds: Curve2d[], tolerance = ErrorSystem.LENGTH_EPS): (Polyline | Loop)[] {
        if (_curve2ds.length < 1) {
            return [];
        }
        if (_curve2ds.length === 1) {
            return [new Polyline([_curve2ds[0]])];
        }

        const result: (Polyline | Loop)[] = [];

        const curves = [..._curve2ds];
        while (curves.length) {
            // 找一条最长的曲线，作为搜索的首条线，避免第一条线是长度过短的线
            const first = SearchPolyline.findAndRemoveLongestCurve(curves);
            const loop: Curve2d[] = [first as Curve2d];
            // find next
            while (curves.length) {
                const next = SearchPolyline.findAndRemoveNextCurve(loop[loop.length - 1].getEndPt(), curves, tolerance);
                if (next) {
                    loop.push(next as Curve2d);
                } else {
                    break;
                }
            }
            // find pre
            while (curves.length) {
                const pre = SearchPolyline.findAndRemoveNextCurve(loop[0].getStartPt(), curves, tolerance);
                if (pre) {
                    loop.splice(0, 0, (pre as Curve2d).reverse());
                } else {
                    break;
                }
            }
            if (loop[loop.length - 1].getEndPt().equals(loop[0].getStartPt(), tolerance)) {
                result.push(new Loop(loop).clone());
            } else {
                result.push(new Polyline(loop).clone());
            }
        }

        // 变为逆时针
        result.forEach(loop => {
            if (!loop.isAnticlockwise()) {
                loop.reverse();
            }
        });

        return result;
    }

    public static findAndRemoveLongestCurve(curves: (Curve2d | Curve3d)[]) {
        DebugWarn.assert(curves.length);
        const src = [...curves];
        let max = src.pop()!.getLength();
        let curveIdx = src.length;
        src.forEach((cv, idx) => {
            const l = cv.getLength();
            if (l > max) {
                max = l;
                curveIdx = idx;
            }
        });
        const r = curves[curveIdx];
        curves.splice(curveIdx, 1);
        return r;
    }

    public static findAndRemoveNextCurve(pt: Vector2 | Vector3, curves: (Curve2d | Curve3d)[], tolerance: number) {
        const candidates: { cv: Curve2d | Curve3d; d: number; reverse: boolean }[] = [];
        for (const cv of curves) {
            const d1 = cv.getStartPt().distanceTo(pt);
            const d2 = cv.getEndPt().distanceTo(pt);
            if (d1 < tolerance && d2 < tolerance) {
                if (d1 > d2) {
                    candidates.push({ cv, d: d2, reverse: true });
                } else {
                    candidates.push({ cv, d: d1, reverse: false });
                }
            } else if (d1 < tolerance) {
                candidates.push({ cv, d: d1, reverse: false });
            } else if (d2 < tolerance) {
                candidates.push({ cv, d: d2, reverse: true });
            }
        }
        if (candidates.length < 1) {
            return;
        }

        // 找距离最小的
        candidates.sort((a, b) => {
            return a.d - b.d;
        });

        const result = candidates[0];
        // 
        const idx = curves.findIndex(v => {
            return v === result.cv;
        });
        DebugWarn.assert(idx > -1);
        curves.splice(idx, 1);

        if (result.reverse) {
            return result.cv.clone().reverse();
        }
        return result.cv.clone();
    }
}

export { SearchPolyline };
