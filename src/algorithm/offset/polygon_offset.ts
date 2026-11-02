import * as ClipperLib from '../../lib/clipperlib/clipperlib';
import { ClipperFormatConverter } from '../../util/clipper_format_converter';
import { Polygon } from '../../geometry/brep/polygon';

/**
 * 
 */
export class PolygonOffset {
    public static polygonOffset(loop: Polygon, _delta: number): Polygon {
        if (loop.isEmpty()) {
            return new Polygon();
        }
        const scale = 1e8;

        const paths = ClipperFormatConverter.polygonToPaths(loop);
        ClipperLib.JS.ScaleUpPaths(paths, scale);
        // offset
        const offset = new ClipperLib.ClipperOffset();
        offset.AddPaths(paths, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);

        offset.Execute(paths, _delta * scale);
        if (!paths.length) {
            console.error('偏移出错', loop.asString(), _delta);
        }
        ClipperLib.JS.ScaleDownPaths(paths, scale);
        return ClipperFormatConverter.pathsToPolygon(paths);
    }
}
