import { Vector3 } from '../math/vector3';
import { BrepBody } from '../geometry/brep/brep_body';
import { CreateBrepBodyByPts } from './body_builder/create_brep_body_by_pts';
import { ExtrudeAFace } from './body_builder/extrude_a_face';
import { Loop } from '../geometry/brep/loop';
import { Face } from '../geometry/brep/face';
import { Polygon } from '../geometry/brep/polygon';
import { Coordinate3 } from '../math/coordinate3';
import { SweepBody } from './body_builder/sweep_body';
import { Line3d } from '../geometry/line3d';
import { ExtrudeBody } from './body_builder/extrude_body';
import { Shell } from '../geometry/brep/shell';
import { Plane } from '../geometry/plane';

/**
 *
 */
class BodyBuilder {

    /**
     *  构造拉伸体
     * @param coordinate  坐标轴
     * @param polygon    在坐标轴下的polyogn
     * @param dir  拉伸方向
     * @param height  拉伸高度，可以为负，负数代表向反方向拉伸
     */
    public static extrude(coordinate: Coordinate3, polygon: Polygon, dir: Vector3, height: number): BrepBody {
        return ExtrudeBody.create(coordinate, polygon, dir, height);
    }

    /**
     *  构造扫掠体
     * @param profileLines  扫掠的截面线，可以封闭，也可以不封闭
     * @param path3d    扫描路径，可以封闭，也可以不封闭
     */
    public static sweep(profileLines: Line3d[], path3d: Line3d[], topo?: Set<string>[], isWithCutLine: boolean = false): Shell | BrepBody {
        const closed = profileLines.length > 2 && profileLines[0].getStartPt().equals(profileLines[profileLines.length - 1].getEndPt());
        // 转成拉伸体
        if (closed && path3d.length === 1) {
            const plane = new Plane(path3d[0].getStartPt(), path3d[0].getDirection());
            const lines = profileLines.map(l => plane.getCurve2d(l)!);
            const loop = new Loop(lines);
            if (!loop.isAnticlockwise()) {
                loop.reverse();
            }

            const polygon = new Polygon(loop);
            const body = ExtrudeBody.create(plane.toCoordinate(), polygon, path3d[0].getDirection(), path3d[0].getLength());
            if (topo) {
                for (let i = 2; i < body.getFaces().length; i++) {
                    const { tag } = body.getFaces()[i];
                    topo.push(new Set([tag]));
                }
            }

            return body;
        }
        return new SweepBody(profileLines, path3d, topo, isWithCutLine).execute();
    }

    /**
     *  切割成若干个单一shell/body
     * @param profileLines  扫掠的截面线，可以封闭，也可以不封闭
     * @param path3d    扫描路径，可以封闭，也可以不封闭
     */
    public static splitToSingles(shell: Shell, bReserveTag?: boolean): Shell[] {
        const faces = [...shell.getFaces()];

        if (!faces.length) {
            return [shell];
        }

        const result: Shell[] = [];

        // face - face.getTwinFaces
        while (faces.length) {
            const curShell: Map<Face, boolean> = new Map();
            curShell.set(faces.pop()!, false);

            while (true) {
                let changed = false;
                for (const [face, handled] of curShell) {
                    if (handled) {
                        continue;
                    }
                    curShell.set(face, true);
                    face.getTwinFaces().forEach(f => {
                        if (!curShell.get(f)) {
                            curShell.set(f, false);
                        }
                        // 处理过了，从数组中删除
                        const idx = faces.findIndex(fc => {
                            return f === fc;
                        });
                        if (idx > -1) {
                            faces.splice(idx, 1);
                        }
                    });
                    changed = true;
                    break;
                }
                if (changed) {
                    continue;
                } else {
                    const newShell = shell.clone();
                    newShell.clear();
                    curShell.forEach((value, face) => {
                        if (bReserveTag) {
                            const newFace =  face.cloneAndReserveTag();
                            newShell.addFace(newFace);
                        } else {
                            face.clearTopoEdges();
                            newShell.addFace(face);
                        }
                    });
                    newShell.calcAndAddEdges();
                    result.push(newShell);
                    break;
                }
            }
        }

        return result;
    }

    /**
     * ptsArr 中的每一组pts都是一个face的顶点
     * @deprecated 已被废弃，请使用`BodyBuilder.createBrepBodyByPts`
     * @param pathsArr 每一个pts
     * 
     */
    public static createByPts(pathsArr: Vector3[][][]): BrepBody {
        console.error('`BodyBuilder.createByPts` is deprecated, use `BodyBuilder.createBrepBodyByPts` instead');
        return BodyBuilder.createBrepBodyByPts(pathsArr);
    }

    /**
     * ptsArr 中的每一组pts都是一个face的顶点
     * @param pathsArr 每一个pts
     */
    public static createBrepBodyByPts(pathsArr: Vector3[][][]): BrepBody {
        return CreateBrepBodyByPts.execute(pathsArr);
    }

    /**
     * @param body [in,out]
     * @param faceTag 表示在那个面上挤压
     * @param loop 被挤压的区域,被挤压的区域不大于targetFace,否则会抛异常
     * @param extrudeDistance 挤压的距离，可正可负（规定与face法向相同为正，否则为负）
     * @returns true 挤压成功 false 挤压失败
     */
    public static extrudeAFace(face: Face, loop: Loop, extrudeDistance: number): boolean {
        return ExtrudeAFace.execute(face, loop, extrudeDistance);
    }
}

export { BodyBuilder };
