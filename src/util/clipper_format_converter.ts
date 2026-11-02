import { Loop } from '../geometry/brep/loop';
import { Polygon } from '../geometry/brep/polygon';
import { Polyline } from '../geometry/brep/polyline';
import * as ClipperLib from '../lib/clipperlib/clipperlib';
import { Vector2 } from '../math/vector2';

/**
 * 格式转换类
 */
class ClipperFormatConverter {

    public static vector2ToXY(vec: Vector2): ClipperLib.IntPoint {
        const X = vec.x;
        const Y = vec.y;
        return { X, Y };
    }

    public static vector2sToXY(vector2s: Vector2[]): ClipperLib.IntPoint[] {
        return vector2s.map(vec => {
            return { X: vec.x, Y: vec.y };
        });
    }

    public static pathsToPolygon(solutionPolytree: ClipperLib.IntPoint[][]) {
        const polygon = new Polygon();

        for (const pts of solutionPolytree) {
            const l = ClipperFormatConverter.pathToLoop(pts);
            if (l && !l.isEmpty()) {
                polygon.addLoop(l);
            }
        }

        return polygon;
    }

    public static pathToLoop(path: ClipperLib.IntPoint[]): Loop {
        return new Loop(path.map((e: ClipperLib.IntPoint) => {
            return { x: e.X, y: e.Y };
        }));
    }

    public static loopToPath(loop: Loop): ClipperLib.IntPoint[] {
        return loop.toPath().map(p => {
            return ClipperFormatConverter.vector2ToXY(p);
        });
    }

    public static pathToPolyline(path: ClipperLib.IntPoint[]): Polyline {
        return new Polyline((path).map((e: ClipperLib.IntPoint) => {
            return { x: e.X, y: e.Y };
        }));
    }

    public static polylineToPath(polyline: Polyline): ClipperLib.IntPoint[] {
        const pts = polyline.toPath();
        return pts.map(p => {
            const X = p.x;
            const Y = p.y;

            return { X, Y };
        });
    }

    public static polygonToPaths(polygon: Polygon): ClipperLib.IntPoint[][] {
        const result: ClipperLib.IntPoint[][] = [];
        const loops = polygon.getLoops();
        loops.forEach((loop: Loop) => {
            const pts = loop.getCoedges().map(e => {
                return { X: e.curve.getStartPt().x, Y: e.curve.getStartPt().y };
            });
            if (pts.length) {
                result.push(pts);
            }
        });
        return result;
    }

    public static clpExPolygonToPolygon(exPolygon: ClipperLib.ExPolygon): Polygon {
        const out = [];

        // tslint:disable-next-line
        for (let i = 0; i < exPolygon.outer.length; i++) {
            out.push(exPolygon.outer[i]);
        }

        const polygon = ClipperFormatConverter.pathsToPolygon([out]);

        // tslint:disable-next-line
        for (let i = 0; i < exPolygon.holes.length; i++) {
            const inner = [];
            // tslint:disable-next-line
            for (let j = 0; j < exPolygon.holes[i].length; j++) {
                inner.push(exPolygon.holes[i][j]);
            }
            polygon.addLoop(ClipperFormatConverter.pathToLoop(inner));
        }

        return polygon;
    }

    public static clipperExPolygonsToPolygon(exPolygons: ClipperLib.ExPolygons): Polygon[] {
        return exPolygons.map(polygon => {
            return ClipperFormatConverter.clpExPolygonToPolygon(polygon);
        });
    }
}

export { ClipperFormatConverter };
