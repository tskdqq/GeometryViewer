import { Loop } from '../../geometry/brep/loop';
import { Polygon } from '../../geometry/brep/polygon';
import * as ClipperLib from '../../lib/clipperlib/clipperlib';
import { ClipperFormatConverter } from '../../util/clipper_format_converter';
import { Curve2d } from '../../geometry/curve2d';
import { Vector2 } from '../../math/vector2';
import { LogUtil } from '../../util/log_util';
import { GeometryType } from '../../geometry/geometry_type';
import { LineLineIntersect } from '../intersect/line_line_intersect';
import { Line2d } from '../../geometry/line2d';
import { PtPolygonPositionJudge } from '../position_judge/pt_polygon_position_judge';
import { PtLoopPositionJudge } from '../position_judge/pt_loop_position_judge';
import { PtLoopPositonType } from '../position_judge/position_judge_type';
import { ErrorSystem } from '../../math/error_system';

/**
 * 二维布尔运算，封装的clipper算法
 */
class BoolOperateClipper {
    // todo加速
    /**
     * 差
     * @param loopOrPolygons1 
     * @param loopOrPolygons2 
     */
    public static curvePolygon(curve: Curve2d, loopOrPolygons2: (Loop | Polygon)[], isIntersect: boolean): Vector2[][] {
        const curves: Curve2d[] = [];
        // 1.搜集所有线
        loopOrPolygons2.forEach(l => {
            curves.push(...l.copyAllCurves());
        });

        if (!curves.length) {
            if (isIntersect) {
                return [];
            } else {
                return [[curve.getStartPt(), curve.getEndPt()]];
            }
        }

        let lines = [curve];
        // 2.打断
        for (const cv of curves) {
            // 
            const splitResult: Curve2d[] = [];
            for (const l of lines) {
                const infos = LineLineIntersect.line2dAndLine2d(l as Line2d, cv as Line2d);
                if (!infos.length) {
                    splitResult.push(l);
                } else {
                    infos.forEach(({ point, isOverlap }) => {
                        if (!isOverlap) {
                            splitResult.push(new Line2d(l.getStartPt(), point));
                            splitResult.push(new Line2d(point, l.getEndPt()));
                        }
                    });
                }
            }

            lines = splitResult;
        }
        const inner: Curve2d[] = [];
        const outter: Curve2d[] = [];
        // 3.判断内外关系
        for (const l of lines) {
            const find = loopOrPolygons2.find(p => {
                if (p instanceof Polygon) {
                    return PtPolygonPositionJudge.execute(l.getMidPt(), p) === PtLoopPositonType.IN;
                }
                return PtLoopPositionJudge.execute(l.getMidPt(), p, ErrorSystem.LENGTH_EPS, false) === PtLoopPositonType.IN;
            });
            // 内部
            if (find) {
                inner.push(l);
            } else {
                outter.push(l);
            }
        }

        if (isIntersect) {
            return inner.map(l => {
                return [l.getStartPt(), l.getEndPt()];
            });
        } else {
            return outter.map(l => {
                return [l.getStartPt(), l.getEndPt()];
            });
        }
    }

    public static boolOperate(loopOrPolygons1: (Loop | Polygon)[], type: (0 | 1 | 2), loopOrPolygons2: (Loop | Polygon)[]): Polygon {
        const clipper = new ClipperLib.Clipper();
        const scale = 1e8;

        let ptsAEmpty = true;
        for (const l of loopOrPolygons1) {
            if (l.getType() === GeometryType.enLoop) {
                const paths = [ClipperFormatConverter.loopToPath(l as Loop)];
                if (!paths.length) {
                    continue;
                }
                ClipperLib.JS.ScaleUpPaths(paths, scale);
                clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
            } else if (l.getType() === GeometryType.enPolygon) {
                const paths = ClipperFormatConverter.polygonToPaths(l as Polygon);
                if (!paths.length) {
                    continue;
                }
                ClipperLib.JS.ScaleUpPaths(paths, scale);
                clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
            } else {
                throw new Error('not support this type');
            }
            ptsAEmpty = false;
        }

        if (loopOrPolygons2) {
            for (const l of loopOrPolygons2) {
                if (l.getType() === GeometryType.enLoop) {
                    const paths = [ClipperFormatConverter.loopToPath(l as Loop)];
                    if (!paths.length) {
                        continue;
                    }
                    ClipperLib.JS.ScaleUpPaths(paths, scale);
                    clipper.AddPaths(paths, ClipperLib.PolyType.ptClip, true);
                } else if (l.getType() === GeometryType.enPolygon) {
                    const paths = ClipperFormatConverter.polygonToPaths(l as Polygon);
                    if (!paths.length) {
                        continue;
                    }
                    ClipperLib.JS.ScaleUpPaths(paths, scale);
                    clipper.AddPaths(paths, ClipperLib.PolyType.ptClip, true);
                } else {
                    throw new Error('not support this type');
                }
            }
        }

        let clipType = -1;
        if (type === 0) {
            clipType = ClipperLib.ClipType.ctUnion;
            if (ptsAEmpty) {
                return new Polygon();
            }
        } else if (type === 1) {
            clipType = ClipperLib.ClipType.ctIntersection;
            if (ptsAEmpty) {
                return new Polygon();
            }
        } else if (type === 2) {
            clipType = ClipperLib.ClipType.ctDifference;
        }

        const solution: ClipperLib.IntPoint[][] = [];
        const ok = clipper.Execute(
            clipType,
            solution,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero);
        if (!ok) {
            LogUtil.e([...loopOrPolygons1, ...loopOrPolygons2], 'clipper运算失败');
            console.error('clipper运算失败');
        }
        ClipperLib.JS.ScaleDownPaths(solution, scale);
        const rpaths = ClipperLib.Clipper.CleanPolygons(solution, 1e-6);

        return ClipperFormatConverter.pathsToPolygon(rpaths);
    }
}

export { BoolOperateClipper };
