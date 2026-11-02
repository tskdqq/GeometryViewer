import { Vector3 } from '../math/vector3';
import { Coordinate3 } from '../math/coordinate3';
import { Polyline } from '../geometry/brep/polyline';
import { Shell } from '../geometry/brep/shell';
import { Plane } from '../geometry/plane';
import { Face } from '../geometry/brep/face';
import { DebugWarn } from '../util/debug_warn';

/**
 * 
 */
export class ShellBuilder {

    /**
     *  根据polyline拉伸出shell
     * @param coordinate  坐标轴
     * @param polygon    在坐标轴下的polyline
     * @param dir  拉伸方向
     * @param height  拉伸高度，可以为负，负数代表向反方向拉伸
     */
    public static extrude(coordinate: Coordinate3, polyline: Polyline, dir: Vector3, height: number): Shell {
        return ShellBuilder.create(coordinate, polyline, dir, height);
    }

    public static create(coordinate: Coordinate3, polyline: Polyline, dir: Vector3, height: number): Shell {
        const shell = new Shell();

        const basePlane = new Plane(coordinate);

        const faces = [];

        const pts3ds = polyline.toPath().map(p => {
            return basePlane.getPtAt(p);
        });

        const isClosed = polyline.isClosed();

        // 侧面
        for (let i = 0; i < (isClosed ? pts3ds.length : pts3ds.length - 1); i++) {

            const startPt = pts3ds[i];
            const endPt = pts3ds[(i + 1) % pts3ds.length];

            const face = Face.createByExtrude(startPt, endPt, dir, height);
            shell.addFace(face);
            faces.push(face);
        }

        shell.calcAndAddEdges();

        shell.getFaces().forEach(f => {
            f.getTopoCoedges().forEach(ce => {
                console.log(ce.getTopoEdge(), ce.sameDirWithEdge);
                DebugWarn.assert(ce.getTopoEdge());
            });
        });

        return shell;
    }

    /**
     * 内部拷贝inputFaces
     * @param inputFaces 
     * @param topoTrack 输出参数，用于拓扑追踪
     */
    public static createByFaces(inputFaces: Face[], topoTrack?: Map<string, string>): Shell {
        const shell = new Shell();

        inputFaces.forEach(face => {
            const faceClone = face.clone();
            faceClone.clearTopoEdges();
            if (topoTrack) {
                topoTrack.set(face.tag, faceClone.tag);
            }
            shell.addFace(faceClone);
        });

        shell.calcAndAddEdges();

        if (!shell.isEdgeCoedgeRefValid()) {
            DebugWarn.assert(false, 'Shell不合法 !');
            return new Shell();
        }

        return shell;
    }
}
