import { Face } from '../geometry/brep/face';
import { Loop } from '../geometry/brep/loop';
import { Polygon } from '../geometry/brep/polygon';
import { Curve } from '../geometry/curve';
import { Line2d } from '../geometry/line2d';
import { Plane } from '../geometry/plane';
import { ErrorSystem } from '../math/error_system';
import { Vector } from '../math/vector';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { DebugWarn } from '../util/debug_warn';
import { CalculatDistance } from './calculate_distance';
import { LineLoopPositionJudge } from './position_judge/line_loop_position_judge';
import { LoopLoopPositionJudge } from './position_judge/loop_loop_position_judge';
import {
    CurveCuvePositonType, CurveLoopPositonType, LoopLoopPositonType, PtCurvePostionType,
    PtLoopPositonType
} from './position_judge/position_judge_type';
import { PtCurvePositionJudge } from './position_judge/pt_curve_position_judge';
import { PtLoopPositionJudge } from './position_judge/pt_loop_position_judge';
import { PtPolygonPositionJudge } from './position_judge/pt_polygon_position_judge';
import { Curve2d } from '../geometry/curve2d';
import { Curve3d } from '../geometry/curve3d';
import { CurveCurvePositionJudge } from './curve_curve_position_judge';
import { GeometryType } from '../geometry/geometry_type';

/**
 * 几何元素的位置关系判断，包括：
 * #### 1.点与曲线的位置关系：
 * - 点在曲线上`isPtOnCurve`
 * - 点在曲线右上`isPtOnCurveRight`
 * 
 * #### 2.两曲线间的位置关系`curveToCurve`：重叠，相交，不相交
 * 
 *  判断直线间的平行和垂直请用`line.isParalellTo`和`line.isPerpendicularTo`
 * 
 * #### 3.点与Loop的位置关系`ptToLoop`：点在loop内，点在loop外，点在loop上，
 * > 注意，只支持点与外环的位置关系判断，内环reverse即可得到外环
 * 
 * #### 4.点与Polygon的位置关系`ptToPolygon`：
 * - 点在Polygon内
 * - 点在Polygon外
 * - 点在Polygon上，
 */
class PositionJudge {

    /** 
     * 点与曲线的位置关系：
     * - 点在曲线起点 
     * - 点在曲线末点
     * - 点在曲线上
     * - 点不在曲线上
     * @param point 任意一点
     * @param curve 任意曲线
     * @param tolerance 距离容差
     */
    public static ptToCurve<PointType extends Vector>(
        point: PointType,
        curve: Curve<PointType>,
        tolerance: number = ErrorSystem.LENGTH_EPS): PtCurvePostionType {

        return PtCurvePositionJudge.execute(point, curve, tolerance);
    }

    /**
     * 点是否在曲线右边
     * 
     * 如下图，p1在曲线右侧，p2在曲线左侧
     * ```
     *      p1
     * ————<——————
     *      p2
     * ```
     * @param point 任意一点
     * @param curve 任意曲线
     */
    public static isPtOnCurveRight<PointType extends Vector>(point: PointType, curve: Curve<PointType>): boolean {
        return PtCurvePositionJudge.isPtOnCurveRight(point, curve);
    }

    /**
     * 点是否在平面的右侧，
     * 
     * 规定：点在平面法线一侧为右侧，否则为左侧
     * 
     * @param point 任意一点
     * @param plane 任意平面
     */
    public static isPtAbovePlane(point: Vector3, plane: Plane): boolean {
        return CalculatDistance.ptToSurfaceSignedDistance(point, plane) > 0;
    }

    /**
     * 点是否在Face的上侧
     * 
     * 规定：点在平面法线一侧为上侧，否则为下侧
     * 
     * @param point 任意一点
     * @param plane 任意平面
     */
    public static isPtAboveFace(point: Vector3, face: Face): boolean {
        const pl = face.getSurface().clone();
        if (pl.getType() === GeometryType.enPlane) {

            if (!face.isSameDirWithSurface()) {
                pl.reverse();
            }
            return PositionJudge.isPtAbovePlane(point, pl as Plane);
        }
        throw new Error('只支持平面');
    }

    /**
     * 点是否在Face内
     * 
     * @param point 任意一点
     * @param face
     */
    public static isPtInFace(point: Vector3, face: Face, tolerance: number = ErrorSystem.LENGTH_EPS): boolean {
        const uv = face.getSurface().getUVAt(point);
        return PtLoopPositonType.OUT !== PositionJudge.ptToPolygon(uv, face.getPolygon(), tolerance);
    }

    /**
     * 曲线与曲线的位置关系判断:相交，重叠，不相交
     * 
     * 支持 Line2d Line2d
     * @param curve1
     * @param curve2
     * @param tolerance 
     * @returns `CurveCuvePositonType`
     */
    public static curveToCurve<PointType extends Vector>(
        curve1: Curve<PointType>,
        curve2: Curve<PointType>,
        distanceTol = ErrorSystem.LENGTH_EPS,
        angleTol = ErrorSystem.ANGLE_EPS,
        overlapTol = ErrorSystem.LENGTH_EPS): CurveCuvePositonType {
        return CurveCurvePositionJudge.execute(curve1, curve2, distanceTol, angleTol, overlapTol);

    }

    /**
     * 两曲线是否重叠
     * @param curve1 
     * @param curve2 
     * @param distanceTol 用来判断曲线距离的容差
     * @param overlapLength 重叠段的长度大于该容差，才会判为重叠
     */
    public static isTwoCurveOverlap(curve1: Curve2d, curve2: Curve2d, distanceTol: number, overlapLength: number): boolean;
    public static isTwoCurveOverlap(curve1: Curve3d, curve2: Curve3d, distanceTol: number, overlapLength: number): boolean;
    public static isTwoCurveOverlap(curve1: Curve2d | Curve3d, curve2: Curve2d | Curve3d, distanceTol: number, overlapLength: number): boolean {
        throw new Error('not implement');
    }


    /**
     * 点与Loop的位置关系判断:ON，IN，OUT,
     * 逆时针的环为外环，顺时针的环为内环
     * 
     * @param point
     * @param loop
     * @param tolerance 
     * @returns `CurveCuvePositonType`
     */
    public static ptToLoop(pt: Vector2, loop: Loop, tolerance: number = ErrorSystem.LENGTH_EPS): PtLoopPositonType {
        return PtLoopPositionJudge.execute(pt, loop, tolerance);
    }

    /**
     * 点与Polygon的位置关系判断:ON，IN，OUT,
     * 
     * @param point
     * @param Polygon
     * @param tolerance 
     * @returns `CurveCuvePositonType`
     */
    public static ptToPolygon(pt: Vector2, polygon: Polygon, tolerance: number = ErrorSystem.LENGTH_EPS): PtLoopPositonType {
        return PtPolygonPositionJudge.execute(pt, polygon, tolerance);
    }

    /**
     * 曲线与Loop的位置关系判断:ON，IN，OUT,
     * 逆时针的环为外环，顺时针的环为内环
     * 
     * @param curve 2d曲线
     * @param loop
     * @param tolerance 
     * @returns `CurveCuvePositonType`
     */
    public static curveToLoop(curve: Curve<Vector2>, loop: Loop, tolerance: number = ErrorSystem.LENGTH_EPS): CurveLoopPositonType {

        DebugWarn.assert(loop.isValid() && loop.isAnticlockwise(), 'just support valid and outter loop');

        // 退化成点
        if (curve.getLength() < tolerance) {
            const type = this.ptToLoop(curve.getMidPt(), loop, tolerance);
            if (type === PtLoopPositonType.IN) {
                return CurveLoopPositonType.IN;
            }
            if (type === PtLoopPositonType.ON) {
                return CurveLoopPositonType.ON;
            }
            if (type === PtLoopPositonType.OUT) {
                return CurveLoopPositonType.OUT;
            }
            DebugWarn.assert('请添加类型');
        }

        if (curve instanceof Line2d) {
            return LineLoopPositionJudge.execute(curve as Line2d, loop, tolerance);
        }

        throw new Error('Temporarily only support Line2d!');
    }

    /**
     * Loop1与Loop2的位置关系判断,以loop2位基准:相离、外切、相交、内切 
     * 逆时针的环为外环，顺时针的环为内环
     * 
     * @param curve 2d曲线
     * @param loop
     * @param tolerance 
     * @returns `CurveCuvePositonType`
     */
    public static loopToLoop(loop1: Loop, loop2: Loop, tolerance: number = ErrorSystem.LENGTH_EPS): LoopLoopPositonType {
        return LoopLoopPositionJudge.execute(loop1, loop2, tolerance);
    }
}

export { PositionJudge };
