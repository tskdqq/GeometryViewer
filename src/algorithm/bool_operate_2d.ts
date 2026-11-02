import { Loop } from '../geometry/brep/loop';
import { Polygon } from '../geometry/brep/polygon';
import { BoolOperateClipper } from './bool_operate/bool_operate_clipper';
import { Polyline } from '../geometry/brep/polyline';
import { PolylinePolygonBool } from './bool_operate/polyline_polygon_bool';
import { ErrorSystem } from '../math/error_system';
import { GeometryType } from '../geometry/geometry_type';

/**
 * 布尔运算
 * - 
 */
class BoolOperate2d {

    /**
     * 并
     * @param loopOrPolygons
     */
    public static union(loopOrPolygons: (Loop | Polygon)[]): Polygon {
        if (!loopOrPolygons.length) {
            return new Polygon();
        }
        return BoolOperateClipper.boolOperate(loopOrPolygons, 0, []);
    }

    /**
     * 交
     * @param loopOrPolygons1 
     * @param loopOrPolygons2 
     */
    public static intersect(loopOrPolygons: (Loop | Polygon)[]): Polygon {
        if (!loopOrPolygons.length) {
            return new Polygon();
        }
        let result = loopOrPolygons[0];
        if (!(result.getType() === GeometryType.enPolygon)) {
            result = new Polygon(result as Loop);
        }
        for (let i = 1; i < loopOrPolygons.length; i++) {
            result = BoolOperateClipper.boolOperate([result], 1, [loopOrPolygons[i]]);
        }
        return result as Polygon;
    }

    /**
     * 差 loopOrPolygons1 - loopOrPolygons2
     * @param loopOrPolygons1 
     * @param loopOrPolygons2 
     */
    public static difference(loopOrPolygon1: (Loop | Polygon), loopOrPolygons2: (Loop | Polygon)[]): Polygon {
        if (loopOrPolygon1.isEmpty()) {
            return new Polygon();
        }
        if (!loopOrPolygons2.length) {
            if (loopOrPolygon1 instanceof Polygon) {
                return loopOrPolygon1.clone();
            }
            return new Polygon(loopOrPolygon1.clone());
        }
        return BoolOperateClipper.boolOperate([loopOrPolygon1], 2, loopOrPolygons2);
    }

    /**
     * 返回polyline在loop/polygon内部的部分
     * @param polyline 
     * @param polygon 
     * @param torlerance 
     */
    public static polylineIntersect(polyline: Polyline, loopOrPolygons: (Polygon | Loop)[], isTangentKeep: boolean, torlerance: number = ErrorSystem.DOUBLE_EPS): Polyline[] {
        if (!loopOrPolygons.length || polyline.isEmpty()) {
            return [];
        }

        return PolylinePolygonBool.execute(
            polyline,
            loopOrPolygons,
            true,
            isTangentKeep,
            torlerance);
    }

    /**
     * 返回polyline在loop/polygon外部的部分
     * @param polyline 
     * @param polygon 
     * @param torlerance 
     */
    public static polylineDifference(polyline: Polyline, loopOrPolygons: (Polygon | Loop)[], isTangentKeep: boolean, torlerance: number = ErrorSystem.DOUBLE_EPS): Polyline[] {
        if (polyline.isEmpty()) {
            return [];
        }

        if (!loopOrPolygons.length) {
            return [polyline];
        }
        return PolylinePolygonBool.execute(
            polyline,
            loopOrPolygons,
            false,
            isTangentKeep,
            torlerance);
    }
}

export { BoolOperate2d };
