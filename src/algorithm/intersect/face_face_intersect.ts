import { Face } from '../../geometry/brep/face';
import { Curve3d } from '../../geometry/curve3d';
import { Line3d } from '../../geometry/line3d';
import { Plane } from '../../geometry/plane';
import { Polyline } from '../../geometry/brep/polyline';
import { SurfaceSurfaceIntersect } from './surface_surface_intersect';
import { GeometryType } from '../../geometry/geometry_type';
import { BoolOperate2d } from '../bool_operate_2d';
import { Line2d } from '../../geometry/line2d';
import { ErrorSystem } from '../../math/error_system';

/**
 * face 与 face求交，返回值为交线
 */
class FaceFaceIntersect {

    /**
     * Face与Face相交，结果为交线（交点可认为是退化成的线）
     * @param face1 
     * @param face2 
     * @returns 交线可能不止一条，故返回交线的数组,若无交线，则返回空数组
     */
    public static execute(
        face1: Face,
        face2: Face): Curve3d[] {

        // 不处理平行的情况
        if (face1.getCenterNorm().isParalellTo(face2.getCenterNorm())) {
            return [];
        }

        // 判断是否有交
        const box1 = face1.getBoundingBox();
        const box2 = face2.getBoundingBox();

        if (!box1.intersectsBox(box2)) {
            return [];
        }

        const surface1 = face1.getSurface();
        const surface2 = face2.getSurface();

        const interCurves = SurfaceSurfaceIntersect.execute(surface1, surface2);

        const cliper1: Curve3d[] = [];
        // 与第1个面求交
        for (const c of interCurves) {
            if (!(c.getType() === GeometryType.enLine3D)) {
                throw new Error('不支持的类型');
            }

            if (surface1.getType() === GeometryType.enPlane) {
                const interFace1 = FaceFaceIntersect.curve3dIntersectFace(c as Line3d, face1);
                cliper1.push(...interFace1);
            }
        }

        const cliper2: Curve3d[] = [];
        // 与第2个面求交
        for (const c of cliper1) {
            if (!(c.getType() === GeometryType.enLine3D)) {
                throw new Error('不支持的类型');
            }

            if (surface2.getType() === GeometryType.enPlane) {
                const interFace1 = FaceFaceIntersect.curve3dIntersectFace(c as Line3d, face2);
                cliper2.push(...interFace1);
            }
        }

        return cliper2;
    }

    // 内部使用
    // 条件：Curve3d在face上
    // 求：Curve3在face参数域内的部分
    private static curve3dIntersectFace(line3d: Line3d, face: Face): Line3d[] {
        const surface1 = face.getSurface();
        const plane1 = surface1 as Plane;
        // 3d曲线投影在平面参数域内
        const line2d = plane1.getLine2D(line3d);
        if (!line2d) {
            return [];
        }
        // 包含边界 isTangentKeep = true
        const intPolylines = BoolOperate2d.polylineIntersect(new Polyline([line2d]), [face.getPolygon()], true, ErrorSystem.LENGTH_EPS);
        const modifiedLine2ds: Line2d[] = [];
        intPolylines.forEach(pl => {
            const cvs = pl.getAllCurves();
            if (cvs && cvs.length > 0) {
                modifiedLine2ds.push(cvs[0] as Line2d);
            }
        });
        const result: Line3d[] = [];
        modifiedLine2ds.forEach((l2d) => {
            try {
                const r = plane1.getLine3DByPts(l2d.getStartPt(), l2d.getEndPt());
                result.push(r);
            } catch (error) {
                // 
            }
        });
        return result;
    }
}

export { FaceFaceIntersect };
