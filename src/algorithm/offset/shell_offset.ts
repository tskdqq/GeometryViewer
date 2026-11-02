import { Shell } from '../../geometry/brep/shell';
import { DebugWarn } from '../../util/debug_warn';
import { FaceOffset } from './face_offset';
import { GeometryType } from '../../geometry/geometry_type';
import { Plane } from '../../geometry/plane';
import { SurfaceSurfaceIntersect } from '../intersect/surface_surface_intersect';
import { Line3d } from '../../geometry/line3d';
import { Line2d } from '../../geometry/line2d';
import { BrepBody } from '../../geometry/brep/brep_body';
import { Coedge } from '../../geometry/brep/coedge';
import { Face } from '../../geometry/brep/face';
import { PtToLineSignedDistance } from '../distance/pt_to_line_signed_distance';
import { Polygon } from '../../geometry/brep/polygon';
import { ErrorSystem } from '../../math/error_system';
import { CalculateIntersect } from '../calculate_intersect';


class ShellOffset {

    /**
     *  shell的偏移，每个面可偏移不同的值（正值沿Face法向向外偏，负值向里偏）
     * @param shell           要偏移的shell
     * @param offsetValues    每个face的偏移值
     */
    public static execute(shell: Shell, offsetValues: Map<string, number>, calcEdge = true): boolean {
        if (shell.getFaces().length !== offsetValues.size) {
            DebugWarn.assert(false, 'Shell中面与偏移值数量不等 !');
            return false;
        }

        // 仅支持平面
        for (const face of shell.getFaces()) {
            if (face.getSurface().getType() !== GeometryType.enPlane) {
                DebugWarn.assert(false, '仅支持平面 !');
                return false;
            }
        }

        // 偏移单个面
        for (const face of shell.getFaces()) {
            const value = offsetValues.get(face.tag);
            if (value === undefined) {
                DebugWarn.assert(false, '从map中获取偏移值失败 !');
                return false;
            }
            FaceOffset.execute(face, value);
        }

        // 相邻面首尾相接
        for (const curFace of shell.getFaces()) {
            ShellOffset._fixFace(curFace);
        }

        shell.getFaces().forEach(f => {
            f.getTopoEdges().forEach(edge => {
                DebugWarn.assert(shell.deleteEdgeByTag(edge.tag), 'deleteEdgeByTag failed !');
            });
            f.clearTopoEdges();
        });

        shell.getFaces().forEach(f => f.getPolygon().makeStartEndConnected());

        if (calcEdge) {
            shell.calcAndAddEdges();

            if (shell instanceof BrepBody) {
                DebugWarn.assert(shell.isTopoValid(), 'shell.isTopoValid() failed !');
            } else {
                DebugWarn.assert(shell.isEdgeCoedgeRefValid(), 'shell.isEdgeCoedgeRefValid() failed !');
            }
        }

        return true;
    }

    /**
     *  shell的偏移，每个面可偏移不同的值（正值沿Face法向向外偏，负值向里偏）
     * @param shell           要偏移的shell
     * @param offsetValues    每个face的偏移值
     * @return 偏移结果
     */
    public static offsetSpecifiedFace(inputShell: Shell, offsetFaceId: string, offsetValue: number, calcEdge = true, deleteFaceIds?: string[]): boolean {
        if (!inputShell || inputShell.getFaces().length < 1) {
            DebugWarn.assert(false, 'offsetSpecifiedFace（）,传入的Shell不合法 !');
            return false;
        }

        // 仅支持平面
        for (const face of inputShell.getFaces()) {
            if (face.getSurface().getType() !== GeometryType.enPlane) {
                DebugWarn.assert(false, 'offsetSpecifiedFace（），仅支持平面 !');
                return false;
            }
        }

        // 偏移并修正指定面
        const thisFace = inputShell.getFaceByTag(offsetFaceId)!;
        if (!thisFace) {
            DebugWarn.assert(false, '要偏移的面不在Shell中 !');
            return false;
        }
        const thisFaceClone = thisFace.clone(); // 面拷贝拓扑关系不变
        if (FaceOffset.execute(thisFace, offsetValue) && ShellOffset._fixFace(thisFace) && this._fixFacePolygon(thisFace)) {
            // 修正偏移面成功
            // LogUtil.d(thisFace, '偏移并修正指定面成功，指定的面为：');
        } else {
            // 修正偏移面失败
            thisFace.setSurface(thisFaceClone.getSurface());
            thisFace.setPolygon(thisFaceClone.getPolygon());
            // LogUtil.d(thisFace, '偏移并修正指定面失败，指定的面为：');
        }

        // 修正指定面的邻面
        const adjFaces = thisFace.getTwinFaces();
        // LogUtil.d(adjFaces, '邻面：');

        // tslint:disable-next-line: prefer-for-of
        for (let index = 0; index < adjFaces.length; index++) {
            const adjFaceClone = adjFaces[index].clone(); // 面拷贝拓扑关系不变
            if (ShellOffset._fixFace(adjFaces[index]) && this._fixFacePolygon(adjFaces[index])) {
                // LogUtil.d(adjFaces[index], '修正邻面成功，邻面为：');
            } else {
                // 修正邻面失败
                adjFaces[index].setSurface(adjFaceClone.getSurface());
                adjFaces[index].setPolygon(adjFaceClone.getPolygon());
                // LogUtil.d(adjFaces[index], '修正邻面失败，邻面为：');
            }
        }
        // LogUtil.d(adjFaces, '修正后的邻面：');

        // 删除全部边
        [thisFace, ...adjFaces].forEach(f => {
            f.getTopoEdges().forEach(edge => {
                DebugWarn.assert(inputShell.deleteEdgeByTag(edge.tag), 'deleteEdgeByTag failed !');
            });
            f.clearTopoEdges();
        });
        const edges = inputShell.getEdges();
        for (const edge of edges) {
            inputShell.deleteEdgeByTag(edge.tag);
        }

        if (deleteFaceIds) { // 不维护面积为零的面，直接删除
            for (let index = 0; index < adjFaces.length; index++) {
                if (Math.abs(adjFaces[index].getPolygon().calcArea()) < ErrorSystem.LENGTH_EPS) {
                    // LogUtil.d(adjFaces[index], '删除面积过小的邻面：');
                    inputShell.deleteFaceByTag(adjFaces[index].tag);
                    deleteFaceIds.push(adjFaces[index].tag);
                    adjFaces.splice(index, 1);
                    index--;
                }
            }
        }

        // LogUtil.d(adjFaces, '删除面积为零后的邻面：');

        if (calcEdge) {
            inputShell.calcAndAddEdges();
            if (inputShell instanceof BrepBody) {
                DebugWarn.assert(inputShell.isTopoValid(), 'shell.isTopoValid() failed !');
                // console.log('isTopoValid');
            } else {
                DebugWarn.assert(inputShell.isEdgeCoedgeRefValid(), 'shell.isEdgeCoedgeRefValid() failed !');
                // console.log('isEdgeCoedgeRefValid');
            }
        }

        return true;
    }

    private static _fixFace(thisFace: Face) {
        let hasError = false;
        for (const curCoedge of thisFace.getTopoCoedges()) {
            if (this._fixCoedge(thisFace, curCoedge)) {
                hasError = true;
            }
        }
        return hasError;
    }

    private static _fixCoedge(thisFace: Face, curCoedge: Coedge) {
        const twinCoedge = curCoedge.getTwin();
        if (!twinCoedge) {
            return false;
        }
        const twinFace = twinCoedge.getTopoFace();
        if (!twinFace) {
            DebugWarn.warn(false, 'coedge.getTopoFace()为空 !');
            return false;
        }
        const curPlane = thisFace.getSurface() as Plane;
        const twinPlane = twinFace.getSurface() as Plane;
        // 平行的面暂不处理
        if (curPlane.getNorm().isParalellTo(twinPlane.getNorm())) {
            DebugWarn.warn(false, 'curPlane.isParalellTo.twinPlane!');
            return false;
        }
        const intLine3d = SurfaceSurfaceIntersect.execute(curPlane, twinPlane)[0] as Line3d;
        const curParamLine2d = curPlane.getCurve2d(intLine3d) as Line2d;
        const d = PtToLineSignedDistance.ptToLine2d(curParamLine2d.getMidPt(), curCoedge.curve as Line2d);
        // 修正CurCoedge pre next
        curCoedge.curve.offset(d);

        return true;
    }

    private static _fixFacePolygon(f: Face): boolean {
        const surfaceClone = f.getSurface().clone();
        const polygonClone = f.getPolygon().clone();

        const polygon = f.getPolygon();
        // LogUtil.d(polygon, 'polygon.makeStartEndConnected() 前');
        polygon.makeStartEndConnected();
        // LogUtil.d(polygon, 'polygon.makeStartEndConnected() 后');

        if (polygon.calcArea() < 0) {
            const newPlane = f.getSurface().clone();
            newPlane.reverse();
            const paths = polygon.toPaths().map(l => {
                return l.map(p => {
                    return newPlane.getUVAt(f.getSurface().getPtAt(p));
                });
            });
            const newPolygon = new Polygon(paths);
            if (newPolygon.calcArea() < 0) {
                newPolygon.reverse();
            }
            f.setPolygon(newPolygon);
            f.setSurface(newPlane);
        }

        if (!f.getPolygon().isValid()) {
            f.setPolygon(polygonClone);
            f.setSurface(surfaceClone);
            // LogUtil.d(f, '修正面失败，失败的面为：');
            return false;
        } else {
            // 修正邻面成功
            this._deleteCoincidencePart(f.getPolygon());
            // LogUtil.d(f, '修正面成功，成功的面为：');
            return true;
        }
    }

    // 删除Polygon中前后边的重合部分
    private static _deleteCoincidencePart(polygon: Polygon) {
        for (const loop of polygon.getLoops()) {
            if (loop.getAllCurves().length < 3 || !loop.isOnlyLines()) {
                continue;
            }

            // 删除短边
            for (let index = 0; index < loop.getCoedges().length; index++) {
                if (loop.getCoedges()[index].curve.getLength() < ErrorSystem.LENGTH_EPS) {
                    loop.deleteByArrayIdx(index);
                }
            }

            for (let i = 0; i < loop.getCoedges().length; i++) {

                if ((loop.getCoedges()[i].curve as Line2d).isColinearWith(loop.getCoedges()[(i + 1) % loop.getAllCurves().length].curve as Line2d)) {
                    const ints = CalculateIntersect.curveCurve(loop.getCoedges()[i].curve, loop.getCoedges()[(i + 1) % loop.getCoedges().length].curve, ErrorSystem.LENGTH_EPS);
                    if (ints.length === 1 && ints[0].isOverlap && ints[0]) {
                        loop.getCoedges()[i].curve = new Line2d(loop.getAllCurves()[i].getStartPt(), loop.getAllCurves()[(i + 1) % loop.getAllCurves().length].getEndPt());
                        loop.deleteByArrayIdx((i + 1) % loop.getAllCurves().length);
                    }
                }
            }
        }
    }
}

export { ShellOffset };
