import { CalculatDistance } from '../../algorithm/calculate_distance';
import { CalculateIntersect } from '../../algorithm/calculate_intersect';
import { Loop } from '../../geometry/brep/loop';
import { Line2d } from '../../geometry/line2d';
import { ErrorSystem } from '../../math/error_system';
import { DebugWarn } from '../../util/debug_warn';
import { MathUtil } from '../../util/math_util';
import { GeometryType } from '../../geometry/geometry_type';

/**
 * 
 */
class ExtendEveryLine {
    public static execute(maxOutterLoop: Loop | undefined, loops: Loop[], maxLength: number, angleTorlerance: number): Map<Line2d, Line2d> {

        const result = new Map<Line2d, Line2d>();

        const candidateLoops = [...loops];
        if (maxOutterLoop) {
            candidateLoops.push(maxOutterLoop);
        }

        // 1. 获取每一条线的起点和终点距离其他线的最近距离
        const lineToExtends = ExtendEveryLine._getLinePtsDistanceToOthers(candidateLoops, maxOutterLoop, maxLength, angleTorlerance);

        for (const loop1 of candidateLoops) {
            // 所有候选直线
            const ces = loop1.getCoedges();
            for (let i = 0; i < ces.length; i++) {
                const curve = ces[i].curve as Line2d;
                const pre = (i === 0 ? ces[ces.length - 1].curve : ces[i - 1].curve) as Line2d;
                const next = (i === ces.length - 1 ? ces[0].curve : ces[i + 1].curve) as Line2d;

                // todo：效率优化
                let startExtend = CalculatDistance.ptToCurveSignedDistance(pre.getMidPt(), curve) < 0;
                let endExtend = CalculatDistance.ptToCurveSignedDistance(curve.getMidPt(), next) < 0;
                if (loop1 === maxOutterLoop) {
                    startExtend = !startExtend;
                    endExtend = !endExtend;
                }

                const preStartEnd = lineToExtends.get(pre);
                const nextStartEnd = lineToExtends.get(next);
                if (!preStartEnd && !nextStartEnd) {
                    continue;
                }
                const offsetedLine = curve.clone();
                if (preStartEnd && startExtend) {
                    offsetedLine.extend(preStartEnd.end, false);
                }
                if (nextStartEnd && endExtend) {
                    offsetedLine.extend(nextStartEnd.start);
                }

                result.set(curve, offsetedLine);

                // .GeoDocument.getInstance().add(curve);

            }
        }

        return result;
    }

    private static _getLinePtsDistanceToOthers(candidateLoops: Loop[], maxOutterLoop: Loop | undefined, maxLength: number, angleTorlerance: number) {
        // 1. 获取每一条线的起点和终点距离其他线的最近距离
        const lineToExtends = new Map<Line2d, { start: number; end: number }>();
        for (const thisLoop of candidateLoops) {
            // 所有候选直线
            const cadidates: Line2d[] = [];
            const cadidatesExtend: Line2d[] = [];
            const isMaxLoop = (thisLoop === maxOutterLoop);
            for (const l of candidateLoops) {
                if (l === thisLoop) {
                    continue;
                }
                l.getCoedges().forEach((ce) => {
                    const line = ce.curve.clone() as Line2d;
                    cadidates.push(line);
                    cadidatesExtend.push(
                        line.clone()
                            .extendDouble(maxLength));
                    return line;
                });
            }

            const ces = thisLoop.getCoedges();
            for (const ce of ces) {
                DebugWarn.assert(ce.curve.getType() === GeometryType.enLine2D);
                const line = ce.curve as Line2d;

                const dir = line.getDirection();
                if (isMaxLoop) {
                    dir.rotate(MathUtil.PI_2);
                } else {
                    dir.rotate(-MathUtil.PI_2);
                }

                const startRay = Line2d.createByOriginAndDir(line.getStartPt(), dir, [0, ErrorSystem.MODEL_MAX_LENGTH]);
                const endRay = Line2d.createByOriginAndDir(line.getEndPt(), dir, [0, ErrorSystem.MODEL_MAX_LENGTH]);

                let nearestTostart = ExtendEveryLine._findNearLine(startRay, cadidates, maxLength, angleTorlerance);
                if (!nearestTostart) {
                    nearestTostart = ExtendEveryLine._findNearLine(startRay, cadidatesExtend, maxLength, angleTorlerance, cadidates);
                }
                let nearestToEnd = ExtendEveryLine._findNearLine(endRay, cadidates, maxLength, angleTorlerance);
                if (!nearestToEnd) {
                    nearestToEnd = ExtendEveryLine._findNearLine(endRay, cadidatesExtend, maxLength, angleTorlerance, cadidates);
                }

                if (!nearestTostart && !nearestToEnd) {
                    continue;
                }

                let sd = 0;
                let ed = 0;
                if (nearestTostart) {
                    sd = CalculatDistance.ptToCurve(line.getOrigin(), nearestTostart, true);
                }
                if (nearestToEnd) {
                    ed = CalculatDistance.ptToCurve(line.getOrigin(), nearestToEnd, true);
                }
                // if (start || end) {
                //     start = start || end as Line2d;
                //     end = end || start as Line2d;

                //     const sd = CalculatDistance.ptToCurve(line.getOrigin(), start, true);
                //     const ed = CalculatDistance.ptToCurve(line.getOrigin(), end, true);

                // }
                // else {
                //     lineToStartEnd.set(line, { start: maxLength / 4, end: maxLength / 4 });
                // }
                lineToExtends.set(line, { start: sd / 2, end: ed / 2 });
            }
        }
        return lineToExtends;
    }

    // 找到垂直的最近的线
    private static _findNearLine(ray: Line2d, candidates: Line2d[], maxLength: number, angleTorlerance: number, originCandidates?: Line2d[]): Line2d | undefined {
        let result;
        let min = maxLength * maxLength;

        const origin = ray.getOrigin();

        for (let i = 0; i < candidates.length; i++) {
            const l = candidates[i];
            if (!l.isPerpendicularTo(ray, angleTorlerance)) {
                continue;
            }

            const infos = CalculateIntersect.curveCurve(ray, l);
            if (infos.length === 0) {
                continue;
            }
            DebugWarn.assert(infos.length === 1, '交点数错误');

            const d = infos[0].point.distanceTo(origin);
            if (d > maxLength) {
                continue;
            }

            // 比较的是l的延长距离与line的延长的距离的乘积
            let extend = 1;
            if (originCandidates) {
                const param = infos[0].param2;
                const s1 = originCandidates[i].getStartParam() - param;
                const s2 = originCandidates[i].getEndParam() - param;
                extend = Math.min(Math.abs(s1), Math.abs(s2));
            }
            const dScale = d * extend;
            if (dScale < min) {
                min = dScale;
                result = l;
            }
        }

        return result;
    }
}

export { ExtendEveryLine };

