import * as poly2tri from 'poly2tri';
import * as earcut from 'earcut';

import { Loop } from '../geometry/brep/loop';
import { Polygon } from '../geometry/brep/polygon';
import { Polyline } from '../geometry/brep/polyline';
import { Vector2 } from '../math/vector2';
import { MathUtil } from '../util/math_util';
import { PolygonTri, XYIndex } from './discrete/interfaces';
import { SearchGraph } from './search_graph';
import { DebugWarn } from '../util/debug_warn';
import { Line2d } from '../geometry/line2d';
import { ErrorSystem } from '../math/error_system';
import { LineLineIntersect } from './intersect/line_line_intersect';
import { GeometryType } from '../geometry/geometry_type';

/**
 * @author tiansk
 *  离散算法
 */
class DiscreteUtil {

    // 离散PolygonEx
    private static tessPolygonEx(_polygon: Polygon, startIdx = 0, bIfCylinder = false): PolygonTri {
        const polygon = _polygon.clone();
        if (polygon.getLoops().length < 1) {
            console.error('input error');
        }

        // 将Loop离散为点集
        const discreteLoop = (_loop: Loop, _startIdx: number): XYIndex[] => {
            DebugWarn.assert(_loop.isOnlyLines());
            return DiscreteUtil.discretePolyline(_loop, 0).map(({ x, y }, idx) => {
                const index = idx + _startIdx;
                return {
                    x, y, index
                };
            });
        };

        // 所有的顶点
        const allVertices: XYIndex[] = [];
        // 所有的边
        const allEdges: number[][] = [];

        // 所有待输入的顶点
        const outVertices = discreteLoop(polygon.getLoops()[0], startIdx);

        allVertices.push(...outVertices);
        allEdges.push([outVertices[0].index, outVertices[outVertices.length - 1].index]);

        try {
            if (bIfCylinder) {
                const swctx = new poly2tri.SweepContext(outVertices);
                for (let i = 1; i < polygon.getLoops().length; i++) {
                    const loop = polygon.getLoops()[i];
                    const vertices = discreteLoop(loop, allVertices.length + startIdx);
                    swctx.addHole(vertices);
                    allVertices.push(...vertices);
                    allEdges.push([vertices[0].index, vertices[vertices.length - 1].index]);
                }
                const triangles = swctx.triangulate().getTriangles();
                return {
                    vertices: allVertices.map((xyIndex) => {
                        return new Vector2(xyIndex);
                    }),
                    edges: allEdges,
                    faces: triangles.map((tri) => {
                        const p0: any = tri.getPoint(0);
                        const p1: any = tri.getPoint(1);
                        const p2: any = tri.getPoint(2);
                        return [p0.index, p1.index, p2.index];
                    })
                };
            } else {
                const holeIndices: number[] = [];
                const dataInput: number[] = [];
                const triangles: number[][] = [];
                for (let i = 1; i < polygon.getLoops().length; i++) {
                    const loop = polygon.getLoops()[i];
                    const vertices = discreteLoop(loop, allVertices.length + startIdx);
                    holeIndices.push(allVertices.length + startIdx);
                    allVertices.push(...vertices);
                    allEdges.push([vertices[0].index, vertices[vertices.length - 1].index]);
                }
                allVertices.forEach(element => {
                    dataInput.push(element.x);
                    dataInput.push(element.y);
                });
                const triangleIndices = earcut(dataInput, holeIndices.length ? holeIndices : undefined, 2);
                triangleIndices.forEach((ele, index, theArray) => {
                    if (index % 3 !== 0) {
                        return;
                    } else {
                        if (theArray.length > index + 2) {
                            triangles.push([theArray[index] + startIdx, theArray[index + 1] + startIdx, theArray[index + 2] + startIdx]);
                        }
                    }
                });
                return {
                    vertices: allVertices.map((xyIndex) => {
                        return new Vector2(xyIndex);
                    }),
                    edges: allEdges,
                    faces: triangles
                };
            }
        } catch (error) {
            console.error(polygon.asString(), '离散化错误');
            return {
                vertices: [],
                edges: [],
                faces: []
            };

        }
    }

    /**
     * 网格化polygon
     * @param _polygon 
     * @param stepLenth 
     */
    public static tessPolygon(_polygon: Polygon, stepLenth?: number, stepDir?: Vector2): PolygonTri {
        const result: PolygonTri = {
            vertices: [],
            edges: [],
            faces: []
        };
        if (_polygon.getLoops().length < 1) {
            return result;
        }

        let ifCylinder = false;
        let polygon;
        let pexes: Polygon[] = [];
        if (stepDir) {
            if (stepLenth === undefined) {
                throw new Error('polygon 包含曲面，需指定曲线离散精度');
            }
            polygon = new Polygon(DiscreteUtil.discretePolygonWithDir(_polygon, stepDir, stepLenth));
            pexes = [polygon];
            ifCylinder = true;
        } else {
            if (_polygon.isOnlyLines()) {
                polygon = _polygon.clone();
            } else {
                if (stepLenth === undefined) {
                    throw new Error('polygon 包含曲线，需指定曲线离散精度');
                }
                polygon = new Polygon(DiscreteUtil.discretePolygon(_polygon, stepLenth));
            }
            pexes = SearchGraph.loopsToPolygonExs(polygon.getLoops());
            if (polygon.getLoops().length > 0 && pexes.length < 1) {
                if (_polygon.getLoops().length === 1) {
                    pexes = [_polygon.clone()];
                } else {
                    console.log('离散出错');
                }
            }
        }

        let start = 0;
        for (const pex of pexes) {
            start = result.vertices.length;
            const tri = DiscreteUtil.tessPolygonEx(pex, start, ifCylinder);

            result.vertices.push(...tri.vertices);
            result.edges.push(...tri.edges);
            result.faces.push(...tri.faces);
        }
        if (result) {
            return result;
        }

        throw new Error('error');
    }

    /**
     * 离散polyline，也可传入loop
     * @param _loop 
     * @param stepLenth 离散精度
     */
    public static discretePolyline(_loop: Polyline, stepLenth: number): Vector2[] {
        const loop = _loop.clone();
        const ces = loop.getAllCurves();
        const pts = [];
        for (let i = 0; i < ces.length; i++) {
            const cv = ces[i];
            const discretedCurve = cv.discrete(stepLenth);
            if ((i !== ces.length - 1) || (_loop.getType() === GeometryType.enLoop)) {
                discretedCurve.pop();
            }
            pts.push(...discretedCurve);
        }
        return pts;
    }

    /**
     * 离散polyline，也可传入loop
     * @param _loop 
     * @param stepLenth 离散精度
     */
    public static discretePolygon(_polygon: Polygon, stepLenth: number): Vector2[][] {
        const result: Vector2[][] = [];
        _polygon.getLoops().forEach(l => {
            const pts = DiscreteUtil.discretePolyline(l, stepLenth);
            result.push(pts);
        });
        return result;
    }

    // todo：用一组平行线去切割polygon
    public static discretePolygonWithDir(polygon: Polygon, dir: Vector2, stepLenth: number): Vector2[][] {
        DebugWarn.assert(polygon.isOnlyLines());
        const polygon2 = polygon.clone();

        const stepLine1 = Line2d.createByOriginAndDir(Vector2.zero(), dir.rotate(MathUtil.PI_2), [-ErrorSystem.MODEL_MAX_LENGTH, ErrorSystem.MODEL_MAX_LENGTH]);
        const stepLine2 = stepLine1.clone();
        stepLine2.offset(stepLenth);
        // 计算跨度

        const result: Vector2[][] = [];

        // 构造直线
        polygon2.getLoops().forEach(loop => {
            const pts: Vector2[] = [];
            loop.getCoedges().forEach(ce => {
                if (ce.curve.getStartTangent().isParalellTo(dir)) {
                    pts.push(ce.curve.getStartPt());
                    return;
                }
                const line1 = ce.curve.clone().extendDouble(ErrorSystem.MODEL_MAX_LENGTH) as Line2d;
                const info1 = LineLineIntersect.line2dAndLine2d(line1, stepLine1);
                const info2 = LineLineIntersect.line2dAndLine2d(line1, stepLine2);
                DebugWarn.assert(info1.length === 1 && info2.length === 1 && !info1[0].isOverlap && !info2[0].isOverlap);
                const step = Math.abs(info1[0].param1 - info2[0].param1);
                let cur = ce.curve.getStartParam();
                while (cur < ce.curve.getEndParam()) {
                    pts.push(ce.curve.getPtAt(cur));
                    cur += step;
                }
            });
            result.push(pts);
        });

        return result;
    }

    public static polygonTriAsLoops(tri: PolygonTri) {
        return tri.faces.map(f => {
            return new Loop(f.map(idx => {
                return tri.vertices[idx];
            }));
        });
    }
}

export { DiscreteUtil };

