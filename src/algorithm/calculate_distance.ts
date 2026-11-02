import { Curve } from '../geometry/curve';
import { Line2d } from '../geometry/line2d';
import { Line3d } from '../geometry/line3d';
import { Plane } from '../geometry/plane';
import { Surface } from '../geometry/surface';
import { Vector } from '../math/vector';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { PtToLineSignedDistance } from './distance/pt_to_line_signed_distance';
import { PtToArcSignedDistance } from './distance/pt_to_arc_signed_distance';
import { Arc2d } from '../geometry/arc2d';
import { Arc3d } from '../geometry/arc3d';

/**
 * @author tiansk 
 * 
 * 计算几何元素间的最近距离，可返回垂足(计算垂足时会把曲线当成无限长)
 * > (note：两点之间的距离请用 `Vector.distanceTo`)
 * 
 * 包括以下2个接口：
 * 1. 点到曲线的最近距离 `ptToCurve`       
 * > 目前支持的类型有： - Vector2到Line2d， Vector3到Line3d
 * 
 * 2. 点到曲线的有向距离 `ptToCurveSigned`，点在曲线右侧距离为正，点在曲线左侧距离为负
 * 
 * ```
 *             p1 (p1在line的右侧，有向距离为正)
 *       
 *        —————<————— line
 * 
 *             p2 (p2在line的左侧，向距离为负)
 * ```
 * 
 * ~~【暂不开放】 3. 空间中两异面直线的的距离 `twoLine3d`， 计算距离时可返回垂足~~
 * 
 */
class CalculatDistance {

    /**
     *  #### 点到曲线的有向距离(把曲线当成无限长)
     * @param point 二维点或三维点 与curve的类型对应
     * @param curve 二维曲线或三维曲线 与point的类型对应
     * @param footPoint  [out] 输出参数，若用户想要获取垂足点，则传入该参数
     * @returns 距离值，可正可负可为0
     */
    public static ptToCurveSignedDistance<PointType extends Vector>(point: PointType, curve: Curve<PointType>, footPoint?: PointType): number {
        // 二维点
        if (point instanceof Vector2) {
            // 直线
            if (curve instanceof Line2d) {
                if (footPoint instanceof Vector2) {
                    return PtToLineSignedDistance.ptToLine2d(point as Vector2, curve as Line2d, footPoint as Vector2);
                } else {
                    return PtToLineSignedDistance.ptToLine2d(point as Vector2, curve as Line2d);
                }
            } else if (curve instanceof Arc2d) { // 弧线
                if (footPoint instanceof Vector2) {
                    return PtToArcSignedDistance.ptToArc2d(point as Vector2, curve as Arc2d, footPoint as Vector2);
                } else {
                    return PtToArcSignedDistance.ptToArc2d(point as Vector2, curve as Arc2d);
                }
            }
        }

        // 三维点
        if (point instanceof Vector3) {
            // 直线
            if (curve instanceof Line3d) {
                if (footPoint instanceof Vector3) {
                    return PtToLineSignedDistance.ptToLine3d(point as Vector3, curve as Line3d, footPoint as Vector3);
                } else {
                    return PtToLineSignedDistance.ptToLine3d(point as Vector3, curve as Line3d);
                }
            } else if (curve instanceof Arc3d) {
                if (footPoint instanceof Vector3) {
                    return PtToArcSignedDistance.ptToArc3d(point as Vector3, curve as Arc3d, footPoint as Vector3);
                } else {
                    return PtToArcSignedDistance.ptToArc3d(point as Vector3, curve as Arc3d);
                }
            }
        }

        throw new Error('不支持的类型');
    }

    /**
     *  点到曲线的距离
     * @param point 二维点或三维点 与curve的类型对应
     * @param curve 二维曲线或三维曲线 与point的类型对应
     * @param curveIsInfinite 是否认为曲线是无限长的
     * @param minDistancePoint  [out] 输出参数，若用户想要获取最近点，则传入该参数
     * @returns 距离值，≥0
     */
    public static ptToCurve<PointType extends Vector>(point: PointType, curve: Curve<PointType>, curveIsInfinite: boolean, minDistancePoint?: PointType) {
        const footInner = point.clone() as PointType;
        const directedDistance = CalculatDistance.ptToCurveSignedDistance(point, curve, footInner);
        if (minDistancePoint) {
            minDistancePoint.copy(footInner);
        }

        const d = Math.abs(directedDistance);
        if (curveIsInfinite) {
            return d;
        }

        if (curve.containsPoint(footInner)) {
            return d;
        }

        const d1 = curve.getStartPt().distanceTo(point);
        const d2 = curve.getEndPt().distanceTo(point);

        if (minDistancePoint) {
            minDistancePoint.copy(d1 < d2 ? curve.getStartPt() : curve.getEndPt());
        }

        return Math.min(d1, d2);
    }

    /**
     *  点到Surface的有向距离
     * @param point 三维点
     * @param surface 曲面
     * @param footPoint  [out] 输出参数，若用户想要获取垂足点，则传入该参数
     * @returns 有向距离,在法线同侧为正，
     */
    public static ptToSurfaceSignedDistance(point: Vector3, surface: Surface, footPoint?: Vector3) {
        if (surface instanceof Plane) {
            const OA = new Vector3(surface.getOrigin(), point);
            const norm = surface.getNorm();
            const d = OA.dot(norm);
            if (footPoint) {
                const foot = point.clone().sub(surface.getNorm().multi(d));
                footPoint.copy(foot);
            }
            return d;
        }
        throw new Error('暂不支持该类型');
    }

    /**
     * 点到Surface的距离,返回结果 >= 0
     * @param point 三维点
     * @param surface 曲面
     * @param footPoint  [out] 输出参数，若用户想要获取垂足点，则传入该参数
     * @returns 距离值，≥0
     */
    public static ptToSurface(point: Vector3, surface: Surface, footPoint?: Vector3) {
        return Math.abs(CalculatDistance.ptToSurfaceSignedDistance(point, surface, footPoint));
    }

    // /**
    //  * 两曲线之间的距离，若曲线有交，则距离为0
    //  * @param curve1 
    //  * @param curve2 
    //  */
    // public static curveToCurve<PointType extends Vector>(curve1: Curve<PointType>, curve2: Curve<PointType>) {
    //     if (curve1.getType() === GeometryType.enLine2D && curve2.getType() === GeometryType.enLine2D) {
    //         // 

    //     } else if (curve1.getType() === GeometryType.enLine3D && curve2.getType() === GeometryType.enLine3D) {
    //         // 
    //     }
    // }

    /**
     * 空间中两异面直线间的距离
     * @param line1  
     * @param line2  
     */
    // static twoLine3d(line1: Line3d, line2: Line3d) {
    //     // , footPointOnLine1?: Vector3, footPointOnLine2?: Vector3

    //     if (line1.isParalellTo(line2)) {
    //         return CalculatDistance.ptToCurve(line1.getStartPt(), line2, true);
    //     }

    //     // 两异面直线的距离
    //     const dir1 = line1.getDirection();
    //     const dir2 = line2.getDirection();

    //     const zDir = dir1.cross(dir2);
    //     const ab = line1.getPtAt(0).sub(line2.getPtAt(0));
    //     const d = ab.dot(zDir);

    //     // // 求垂足 
    //     // if (footPointOnLine1) {
    //     // }

    //     return Math.abs(d);
    // }
}

export { CalculatDistance };
