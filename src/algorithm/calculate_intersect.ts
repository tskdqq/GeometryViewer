import { BrepBody } from '../geometry/brep/brep_body';
import { Face } from '../geometry/brep/face';
import { Loop } from '../geometry/brep/loop';
import { Polygon } from '../geometry/brep/polygon';
import { Polyline } from '../geometry/brep/polyline';
import { Curve } from '../geometry/curve';
import { Curve2d } from '../geometry/curve2d';
import { Curve3d } from '../geometry/curve3d';
import { Surface } from '../geometry/surface';
import { ErrorSystem } from '../math/error_system';
import { Vector } from '../math/vector';
import { Vector3 } from '../math/vector3';
import { CurveCueveIntersectInfo } from './intersect/curve_cueve_intersect_info';
import { CurveCurveIntersect } from './intersect/curve_curve_intersect';
import { CurveSurfaceIntersect } from './intersect/curve_surface_intersect';
import { FaceFaceIntersect } from './intersect/face_face_intersect';
import { FaceFacesIntersect } from './intersect/face_faces_intersect';
import { FacesBoxIntersect } from './intersect/faces_box_intersect';
import { SurfaceSurfaceIntersect } from './intersect/surface_surface_intersect';
import { BoolOperate2d } from './bool_operate_2d';

/**
 * 几何元素求交，线线求交，线面求交
 */
class CalculateIntersect {

    /**
     * 曲线与曲线的交点，目前支持Line2d与Line2d的交点, Line2d和Arc2d的交点，Arc2d和Arc2d的交点
     * 若两曲线重合，则交点为重合段内的某个交点
     * @param curve1 
     * @param curve2 
     * @param distanceTol 距离容差用来判断共圆、共线
     * @param angleTol  角度容差，用来判断平行
     * @param extraInfo [out]如果需要知道交点的额外信息（交点在各个曲线上的参数），则传入该参数,
     */
    public static curveCurve<PointType extends Vector>(
        curve1: Curve<PointType>,
        curve2: Curve<PointType>,
        distanceTol: number = ErrorSystem.ANGLE_EPS,
        angleTol: number = ErrorSystem.ANGLE_EPS,
        overlapRangeTol: number = ErrorSystem.LENGTH_EPS): CurveCueveIntersectInfo<PointType>[] {

        return CurveCurveIntersect.execute(curve1, curve2, distanceTol, angleTol, overlapRangeTol);
    }


    /**
     * curve与polygon求交，即求curve在polygon内部的部分
     * @param curve 
     * @param polygon 
     */
    public static curve2dPolygon(
        curve: Curve2d,
        polygon: Polygon): Curve2d[] {

        const results: Curve2d[] = [];
        // 包含边界
        const polyLines = BoolOperate2d.polylineIntersect(new Polyline([curve]), [polygon], true);
        polyLines.forEach(pl => {
            results.push(...pl.getAllCurves());
        });
        return results;
    }

    /**
     * 三维曲线与曲面的交点,
     * @param curve  曲线
     * @param surface 曲面
     * @returns 交点可能不止一个，故返回交点的数组
     */
    public static curveSurface(
        curve: Curve3d,
        surface: Surface): Vector3[] {

        return CurveSurfaceIntersect.execute(curve, surface);
    }

    /**
     * 曲面与曲面相交为交线
     * @param surface 曲面
     * @param surface 曲面
     * @returns 交线可能不止一条，故返回交线的数组
     */
    public static surfaceSurface(
        surface1: Surface,
        surface2: Surface): Curve3d[] {

        return SurfaceSurfaceIntersect.execute(surface1, surface2);
    }

    /**
     * Face与Face相交，结果为交线（交点可认为是退化成的线）
     * @param face1 
     * @param face2 
     * @returns 交线可能不止一条，故返回交线的数组,若无交线，则返回空数组
     */
    public static faceFace(
        face1: Face,
        face2: Face): Curve3d[] {

        return FaceFaceIntersect.execute(face1, face2);
    }

    /**
     * Face 与 多个Face分别求交，然后将交线封装成Polyline[]
     * 
     * 数组内的元素有可能是loop，也有可能是Polyline
     * @param face 
     * @param faces 
     */
    public static faceFaces(face: Face, faces: Face[]): (Polyline | Loop)[] {
        return FaceFacesIntersect.execute(face, faces);
    }

    /**
     * 求多个Face在Box内部的部分
     * 
     * 数组内的元素有可能是loop，也有可能是Polyline
     * @param faces 
     * @param box 
     */
    public static facesBox(faces: Face[], box: BrepBody) {
        return FacesBoxIntersect.execute(faces, box);
    }
}

export { CalculateIntersect };
