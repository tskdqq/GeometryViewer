import { BrepBody } from '../geometry/brep/brep_body';
import { Plane } from '../geometry/plane';
import { Face } from '../geometry/brep/face';
import { Polygon } from '../geometry/brep/polygon';
import { DebugWarn } from '../util/debug_warn';
import { Line3d } from '../geometry/line3d';
import { Loop } from '../geometry/brep/loop';
import { ErrorSystem } from '../math/error_system';
import { Vector3 } from '../math/vector3';
import { GeometryType } from '../geometry/geometry_type';
import { BodyBuilder } from '../algorithm/body_builder';
import { Line2d } from '../geometry/line2d';
import { TransQMathTOCC } from '../occ/utils/qmath_t_occdata_v2';
import { TransOccToQMath } from '../occ/utils/occ_to_qmath_data';
import { SearchGraph, BoolOperate2d, PositionJudge, LoopLoopPositonType, CurveLoopPositonType } from '../algorithm';
import { Curve3dsUtil } from '../algorithm/curve3d_util';
import { Polyline } from '../geometry/brep/polyline';
import { MathUtil } from '../util/math_util';
import { Coedge } from '../geometry/brep/coedge';

/**
 * 开洞
 */
export class CreateHole {

    private static holeCoincidenceLineOffsetDis = 0.1;

    /**
     * @param wall 开洞的墙
     * @param holePlanarWire 墙洞轮廓
     * @param wallThickness 墙厚度
     * @returns 开洞成功返回true，否则返回false
     */
    public static async executeByBoolSubstract(wall: BrepBody, holePlanarWire: Line3d[]): Promise<BrepBody | undefined> {
        const holrNormal: Vector3 = new Vector3();
        if (!Curve3dsUtil.isCoplanar(holePlanarWire, holrNormal)) {
            DebugWarn.assert(false, '墙洞中的边线应共面!');
            return undefined;
        }

        // 在墙体上找出要开洞的侧面
        let wallFace: Face | undefined;
        for (const face of wall.getFaces()) {
            if (face.getCenterNorm().isParalellTo(holrNormal)) {
                wallFace = face;
                break;
            }
        }
        if (!wallFace) {
            DebugWarn.assert(false, '未在墙上找到开洞的面!');
            return undefined;
        }

        if ((wallFace as Face).getSurface().getType() !== GeometryType.enPlane) {
            DebugWarn.assert(false, '墙开洞只支持在平面上开洞!');
            return undefined;
        }
        const wallBody = (wallFace as Face).getTopoBody();
        if (!wallBody || wallBody.getType() !== GeometryType.enBrepBody) {
            DebugWarn.assert(false, '墙开洞中的墙并非实体!');
            return undefined;
        }

        // LogUtil.d((wallFace as Face), 'wallFace:');

        const wallPlane = ((wallFace as Face).getSurface() as Plane);
        const refPlane = new Plane(wallPlane.getOrigin(), wallPlane.dirU.clone().reverse(), wallPlane.dirV.clone());
        refPlane.translate(refPlane.getNorm().multi(-ErrorSystem.MODEL_MAX_LENGTH / 2));

        const holeLine2ds: Line2d[] = [];
        holePlanarWire.forEach(holeLine => {
            const l = refPlane.getLine2D(holeLine);
            if (l) { holeLine2ds.push(l); }
        });
        const holeLoop = new Loop(holeLine2ds).reverse();
        if (!holeLoop.isAnticlockwise()) {
            holeLoop.reverse();
        }

        holeLoop.offset(1e-5); // 将洞口往外扩1e-5，防止相切时OCC布尔运算结果不符合预期

        if (!holeLoop.isValid()) {
            DebugWarn.warn(false, '墙开洞中洞的轮廓不合法!' + holeLoop.asString());
            return undefined;
        }
        const holeBody = BodyBuilder.extrude(refPlane.toCoordinate(), new Polygon(holeLoop), refPlane.getNorm(), ErrorSystem.MODEL_MAX_LENGTH);
        if (!holeBody.isTopoValid()) {
            DebugWarn.warn(false, '墙开洞中洞的体拓扑不合法!' + holeBody.asString());
            return undefined;
        }

        // LogUtil.d(wallBody as BrepBody, 'wallBody:');
        // LogUtil.d(holeBody, 'holeBody:');

        const occSolid = new TransQMathTOCC(wallBody as BrepBody).run();
        const occSolid2 = new TransQMathTOCC(holeBody).run();
        const data = {
            blankBody: occSolid,
            toolBody: occSolid2
        };

        // 调用pythonOCC实现体的布尔运算
        const response = await fetch('http://114.55.146.181:8080/boolSubtract', {
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });

        let result: BrepBody | undefined;
        await response.json().then(r => {
            const resultBody = (new TransOccToQMath().run(r)) as BrepBody;
            // LogUtil.d(resultBody, 'boolSubtract resultBody:');
            result = resultBody;
        });

        return result;
    }

    /**
     * @param wall [int out] 开洞的墙
     * @param holePlanarWire 墙洞轮廓
     * @param wallThickness 墙厚度
     * @returns 开洞成功返回true，否则返回false
     */
    public static async execute(wall: BrepBody, holePlanarWires: Line3d[][]): Promise<boolean> {
        if (!wall.isTopoValid()) {
            DebugWarn.assert(false, '传入开洞的墙体不合法!');
            return false;
        }
        if (holePlanarWires.length < 1) {
            DebugWarn.assert(false, '洞口数据为空!');
            return false;
        }

        const holeNormal: Vector3 = new Vector3();
        for (const holePlanarWire of holePlanarWires) {
            if (!Curve3dsUtil.isCoplanar(holePlanarWire, holeNormal)) {
                DebugWarn.assert(false, '墙洞中的边线应共面!');
                return false;
            }
        }

        // 在墙体上找出要开洞的侧面
        let wallFace: Face | undefined;
        for (const face of wall.getFaces()) {
            if (face.getCenterNorm().isParalellTo(holeNormal)) {
                wallFace = face;
                break;
            }
        }
        if (!wallFace) {
            DebugWarn.warn(false, '未在墙上找到开洞的面!');
            return false;
        }

        // 获取全部墙的洞口，能合并的合并
        const refPlane = wallFace.getSurface() as Plane;
        const holeLoops: Loop[] = [];
        for (const holePlanarWire of holePlanarWires) {
            const holeLine2ds = holePlanarWire.map((holeLine3d) => {
                const stPt = refPlane.getUVAt(holeLine3d.getStartPt());
                const endPt = refPlane.getUVAt(holeLine3d.getEndPt());
                return new Line2d(stPt, endPt);
            });
            const holeLoop = new Loop(holeLine2ds);
            if (!holeLoop.isAnticlockwise()) {
                holeLoop.reverse();
            }
            holeLoops.push(holeLoop);
        }

        // LogUtil.d(holeLoops, '全部门洞环：');

        if (holeLoops.length > 1) {
            const unionPolygon = BoolOperate2d.union(holeLoops);
            unionPolygon.offset(0.001);
            unionPolygon.offset(-0.001);
            unionPolygon.offset(-0.001);
            unionPolygon.offset(0.001);
            // 不应再有内环
            const innerLoops = unionPolygon.getLoops().filter(l => { return !l.isAnticlockwise(); });
            if (innerLoops.length > 0) {
                DebugWarn.warn(false, '洞口合并后应不再有内环!');
                return false;
            }
            holeLoops.splice(0, holeLoops.length);
            unionPolygon.getLoops().forEach(outLoop => {
                holeLoops.push(outLoop);
            });
        }

        // 判断洞口是否与墙侧面有交，无相交则无需开动
        const facePolygon = wallFace.getPolygon();
        const facePolygonBox = facePolygon.getBoundingBox();
        for (let index = 0; index < holeLoops.length; index++) {
            if (!holeLoops[index].getBoundingBox().intersectsBox(facePolygonBox)
                || (BoolOperate2d.intersect([holeLoops[index], facePolygon]).calcArea() < ErrorSystem.LENGTH_EPS)) {
                holeLoops.splice(index, 1);
            }
        }
        if (holeLoops.length < 1) {
            // 无需开动！
            return true;
        }

        // LogUtil.d(holeLoops, '合并后门全部洞环：');
        // LogUtil.d(wallFace.getPolygon(), 'wallFace.getPolygon()：');

        const unionHolePlanarWires: Line3d[][] = [];
        for (const holeLoop of holeLoops) {
            const holeLine3ds = holeLoop.getAllCurves().map((holeLine2d) => {
                const stPt = refPlane.getPtAt(holeLine2d.getStartPt());
                const endPt = refPlane.getPtAt(holeLine2d.getEndPt());
                return new Line3d(stPt, endPt);
            });
            unionHolePlanarWires.push(holeLine3ds);
        }

        // LogUtil.d(unionHolePlanarWires[0], '合并后的第一个三维门洞：');

        // 开始挖洞
        const originalWall = wall.clone();
        for (const unionHolePlanarWire of unionHolePlanarWires) {
            if (!this.createHole(wall, unionHolePlanarWire)) {
                const resultBody = await CreateHole.executeByBoolSubstract(wall, unionHolePlanarWire);
                if (resultBody) {
                    this._resetBody(wall, resultBody);
                } else {
                    this._resetBody(wall, originalWall); // 开洞失败，将墙体回滚
                    return false;
                }
            }
        }

        if (!wallFace || !wall.isTopoValid() || !wall.isEdgeCoedgeRefValid()) {
            DebugWarn.assert(false, '开洞后墙体不合法!');
            return false;
        }

        return true;
    }

    /** 
     * 墙体开洞失败时墙体可以是无效的状态，外部execute函数会负责失败时回滚墙体
     * @param wall [int out] 开洞的墙
     * @param holePlanarWire 墙洞轮廓
     * @param wallThickness 墙厚度
     * @returns 开洞成功返回true，否则返回false
     */
    public static createHole(wall: BrepBody, holePlanarWire: Line3d[]): boolean {

        if (!wall.isTopoValid()) {
            DebugWarn.assert(false, '传入开洞的墙体不合法!');
            return false;
        }
        if (holePlanarWire.length < 2) {
            DebugWarn.assert(false, '洞口数据为空!');
            return false;
        }

        const holeNormal: Vector3 = new Vector3();
        if (!Curve3dsUtil.isCoplanar(holePlanarWire, holeNormal)) {
            DebugWarn.assert(false, '墙洞中的边线应共面!');
            return false;
        }

        // 在墙体上找出要开洞的侧面
        let wallFace: Face | undefined;
        for (const face of wall.getFaces()) {
            if (face.getCenterNorm().isParalellTo(holeNormal)) {
                wallFace = face;
                break;
            }
        }
        if (!wallFace) {
            DebugWarn.warn(false, '未在墙上找到开洞的面!');
            return false;
        }

        const { face0, face1, modifiedLine3ds0, modifiedLine3ds1, deleteFaces } = CreateHole._getCandidateFaces(wall, holePlanarWire, holeNormal);
        if (!face0 || !face1 || !modifiedLine3ds0 || !modifiedLine3ds1 || !deleteFaces) {
            DebugWarn.warn(false, '获取墙的修正边失败，墙开洞调用布尔运算!');
            return false;
        }
        if ((face0.getSurface().getType() !== GeometryType.enPlane) || (face1.getSurface().getType() !== GeometryType.enPlane)) {
            DebugWarn.warn(false, '墙开洞的面只能是平面!');
            return false;
        }
        if (modifiedLine3ds0.length !== modifiedLine3ds1.length) {
            DebugWarn.warn(false, '墙的前后面修正边数量不等，墙开洞调用布尔运算!');
            return false;
        }

        // LogUtil.d(modifiedLine3ds0, 'modifiedLine3ds0：');
        // LogUtil.d(modifiedLine3ds1, 'modifiedLine3ds1：');

        const newSideFaces: Face[] = [];
        const testLine3ds: Line3d[] = [];
        for (let index = 0; index < modifiedLine3ds0.length; index++) {
            testLine3ds.push(new Line3d(modifiedLine3ds0[index].getStartPt(), modifiedLine3ds1[index].getStartPt()));
            testLine3ds.push(new Line3d(modifiedLine3ds0[index].getEndPt(), modifiedLine3ds1[index].getEndPt()));
        }

        // 侧面
        for (let i = 0; i < modifiedLine3ds0.length; i++) {
            const p0 = modifiedLine3ds0[i].getStartPt();
            const p0Next = modifiedLine3ds0[i].getEndPt();
            const p1 = modifiedLine3ds1[i].getStartPt();
            const p1Next = modifiedLine3ds1[i].getEndPt();

            // 构造侧面surface
            const dirU = p0Next.clone().sub(p0);
            const norm = dirU.cross(face0.getCenterNorm());
            const dirV = norm.cross(dirU);
            const plane = new Plane(p0, dirU, dirV);
            // 构造polygon
            const pt2ds = [p0, p1, p1Next, p0Next].map(p => {
                return plane.getUVAt(p);
            });

            const line2ds: Line2d[] = [];
            for (let index = 0; index < pt2ds.length; index++) {
                line2ds.push(new Line2d(pt2ds[index], pt2ds[(index + 1) % pt2ds.length]));
            }
            const loops = SearchGraph.simpleLoop(line2ds);
            if (loops.length !== 1 || loops[0].getType() !== GeometryType.enLoop) {
                DebugWarn.warn(false, '墙的侧面搜环失败，墙开洞调用布尔运算!');
                return false;
            }

            const intSection: Polygon = new Polygon(loops[0] as Loop);
            const newSideFace = new Face(plane, true, intSection);
            wall.addFace(newSideFace);
            newSideFaces.push(newSideFace);
        }

        // 删除的面与新建的修正后的侧面的Polygon求交（因为墙的侧面是等候拉伸出来的，实际墙的上下底面有可能有被裁减的）
        deleteFaces.forEach(deleteFace => {
            deleteFace.getTopoEdges().forEach(edge => {
                DebugWarn.assert(wall.deleteEdgeByTag(edge.tag), 'deleteEdgeByTag failed （deleteFace）!');
            });
            wall.deleteFaceByTag(deleteFace.tag);
        });

        {// 前面
            const face0Polygon = face0.getPolygon();
            const refPlane0 = face0.getSurface() as Plane;
            const holeLine2ds0 = holePlanarWire.map((holeLine3d) => {
                const stPt = refPlane0.getUVAt(holeLine3d.getStartPt());
                const endPt = refPlane0.getUVAt(holeLine3d.getEndPt());
                return new Line2d(stPt, endPt);
            });
            const holeloop0 = new Loop(holeLine2ds0);
            if (!holeloop0.isAnticlockwise()) {
                holeloop0.reverse();
            }
            for (const holeLine2d of holeloop0.getAllCurves()) {
                // TODO: Clipper有Bug（布尔减会保留部分重合的两条边），临时解决方案：将洞上与墙重合的边向外偏移
                let hasCoincidence = false;
                for (const l of face0Polygon.getLoops()) {
                    const loopClone = l.clone();
                    if (!loopClone.isAnticlockwise()) {
                        loopClone.reverse();
                    }
                    const posType = PositionJudge.curveToLoop(holeLine2d, loopClone, ErrorSystem.LENGTH_EPS);
                    if (CurveLoopPositonType.ON === posType) {
                        hasCoincidence = true;
                        break;
                    }
                }
                if (hasCoincidence) {
                    holeLine2d.offset(this.holeCoincidenceLineOffsetDis);
                }
            }
            holeloop0.makeStartEndConnected();

            const subPolygon0 = BoolOperate2d.difference(face0Polygon, [new Polygon(holeloop0)]);
            if (!subPolygon0.isValid()) {
                DebugWarn.warn(false, '墙的前面Polygon不合法，墙开洞调用布尔运算!');
                return false;
            }

            wall.addFace(new Face(face0.getSurface(), face0.isSameDirWithSurface(), subPolygon0));
            face0.getTopoEdges().forEach(edge => {
                DebugWarn.assert(wall.deleteEdgeByTag(edge.tag), 'deleteEdgeByTag failed （face0）!');
            });
            wall.deleteFaceByTag(face0.tag);
        }
        {// 后面
            const face1Polygon = face1.getPolygon();
            const refPlane1 = face1.getSurface() as Plane;
            const holeLine2ds1 = holePlanarWire.map((holeLine3d) => {
                const stPt = refPlane1.getUVAt(holeLine3d.getStartPt());
                const endPt = refPlane1.getUVAt(holeLine3d.getEndPt());
                return new Line2d(stPt, endPt);
            });
            const holeloop1 = new Loop(holeLine2ds1);
            if (!holeloop1.isAnticlockwise()) {
                holeloop1.reverse();
            }
            for (const holeLine2d of holeloop1.getAllCurves()) {
                // TODO: Clipper有Bug（布尔减会保留部分重合的两条边），临时解决方案：将洞上与墙重合的边向外偏移
                let hasCoincidence = false;
                for (const l of face1Polygon.getLoops()) {
                    const loopClone = l.clone();
                    if (!loopClone.isAnticlockwise()) {
                        loopClone.reverse();
                    }
                    const posType = PositionJudge.curveToLoop(holeLine2d, loopClone, ErrorSystem.LENGTH_EPS);
                    if (CurveLoopPositonType.ON === posType) {
                        hasCoincidence = true;
                        break;
                    }
                }
                if (hasCoincidence) {
                    holeLine2d.offset(this.holeCoincidenceLineOffsetDis);
                }
            }
            holeloop1.makeStartEndConnected();

            const subPolygon1 = BoolOperate2d.difference(face1Polygon, [new Polygon(holeloop1)]);
            if (!subPolygon1.isValid()) {
                DebugWarn.warn(false, '墙的后面Polygon不合法，墙开洞调用布尔运算!');
                return false;
            }

            wall.addFace(new Face(face1.getSurface(), face1.isSameDirWithSurface(), subPolygon1));
            face1.getTopoEdges().forEach(edge => {
                DebugWarn.assert(wall.deleteEdgeByTag(edge.tag), 'deleteEdgeByTag failed （face1）!');
            });
            wall.deleteFaceByTag(face1.tag);
        }

        // LogUtil.d(face0, 'face0');
        // LogUtil.d(face1, 'face1');

        // wall.getFaces().forEach(f => {
        //     f.getTopoEdges().forEach(edge => {
        //         DebugWarn.assert(wall.deleteEdgeByTag(edge.tag), 'deleteEdgeByTag failed （AllFace）!');
        //     });
        //     f.clearTopoEdges();
        // });

        // LogUtil.d(wall, '开洞后墙体（未计算Edge）:');

        // edge
        wall.calcAndAddEdges();

        // LogUtil.d(wall, '开洞后墙体:');

        if (!wall.isTopoValid()) {
            DebugWarn.warn(false, '开洞算法后墙体不合法，墙开洞调用布尔运算。');
            return false;
        }

        return true;
    }

    private static _getCandidateFaces(body: BrepBody, holePlanarWire: Line3d[], holeNormal: Vector3) {

        const wallSidefaces: Face[] = [];
        const bIsInnerHoles: boolean[] = [];
        for (const face of body.getFaces()) {
            // 1.判平行
            if (!holeNormal.isParalellTo(face.getCenterNorm())) {
                continue;
            }

            // 2.是否有包含关系
            const plane = face.getSurface() as Plane;
            if (plane.getType() !== GeometryType.enPlane) {
                DebugWarn.warn(false, '开洞仅支持平面! ');
                return {
                    face0: undefined,
                    face1: undefined
                };
            }

            const proLines = holePlanarWire.map((holePlanarLine3d) => {
                const stPt = plane.getUVAt(holePlanarLine3d.getStartPt());
                const endPt = plane.getUVAt(holePlanarLine3d.getEndPt());
                return new Line2d(stPt, endPt);
            });

            // LogUtil.d(proLines, 'proLines');

            const proLoop = new Loop(proLines);
            if (!proLoop.isAnticlockwise()) {
                proLoop.reverse();
            }
            const projectPolygon = new Polygon(proLoop);
            if (!projectPolygon.isValid() || projectPolygon.getLoops().length !== 1) {
                DebugWarn.warn(false, '一个洞口在墙上的投影轮廓应只有一个环! ');
                return {
                    face0: undefined,
                    face1: undefined
                };
            }

            const holeLoop = projectPolygon.getLoops()[0];
            const facePolygon = face.getPolygon().clone();
            const intPolygon = BoolOperate2d.intersect([holeLoop, facePolygon]);
            if (!intPolygon || intPolygon.getLoops().length < 1) {
                DebugWarn.warn(false, '洞口与墙面无相交区域! ');
                return {
                    face0: undefined,
                    face1: undefined
                };
            }

            // DebugWarn.warn(false, 'intPolygon.calcArea(): ' + holeLoop.calcArea());
            // DebugWarn.warn(false, 'holeLoop.calcArea()： ' + holeLoop.calcArea());
            if (MathUtil.isNearlyEqual(Math.abs(intPolygon.calcArea()), Math.abs(holeLoop.calcArea()), ErrorSystem.DOUBLE_EPS)) {
                const holeLoopClone = holeLoop.clone();
                if (!holeLoopClone.isAnticlockwise()) {
                    holeLoopClone.reverse();
                }
                const loopPosType = PositionJudge.loopToLoop(facePolygon.getLoops()[0], holeLoopClone);
                if (LoopLoopPositonType.INTERSECT_TANGENT_OUTTER === loopPosType
                    || LoopLoopPositonType.INTERSECT_TANGENT_INNER === loopPosType) {
                    // 开的不是内环洞,且与外环有交
                    // DebugWarn.warn(false, '开的不是内环洞! ');
                    wallSidefaces.push(face);
                    bIsInnerHoles.push(false);
                } else {
                    // 开的是内环洞
                    // DebugWarn.warn(false, '开的是内环洞! ');
                    wallSidefaces.push(face);
                    bIsInnerHoles.push(true);
                }
            } else {
                // 开的不是内环洞,且与外环有交
                // DebugWarn.warn(false, '开的不是内环洞! ');
                wallSidefaces.push(face);
                bIsInnerHoles.push(false);
            }
        }

        if (wallSidefaces.length !== 2 || bIsInnerHoles.length !== 2 || bIsInnerHoles[0] !== bIsInnerHoles[1]) {
            DebugWarn.warn(false, '判断洞口为内环洞口or轮廓洞口失败! ');
            return {
                face0: undefined,
                face1: undefined
            };
        }

        let smallWallSideFace: Face;
        let largeWallSideFace: Face;
        if (MathUtil.isNearlyEqual(wallSidefaces[0].getPolygon().calcArea(), wallSidefaces[1].getPolygon().calcArea(), ErrorSystem.LENGTH_EPS)) {
            smallWallSideFace = wallSidefaces[0];
            largeWallSideFace = wallSidefaces[1];
        } else {
            smallWallSideFace = (wallSidefaces[0].getPolygon().calcArea() > wallSidefaces[1].getPolygon().calcArea()) ? wallSidefaces[1] : wallSidefaces[0];
            largeWallSideFace = (wallSidefaces[0].getPolygon().calcArea() > wallSidefaces[1].getPolygon().calcArea()) ? wallSidefaces[0] : wallSidefaces[1];
        }

        let modifiedLine3ds0: Line3d[] = []; // 开洞后要添加（或修改）的墙的两个侧面以外的面（用在两个侧面上的三维边表示）
        let line3ds1: Line3d[] = [];
        const deleteFaces: Face[] = [];
        if (bIsInnerHoles[0]) {
            {
                // 一个侧面上内环洞
                if (smallWallSideFace.getSurface().getType() !== GeometryType.enPlane) {
                    DebugWarn.warn(false, '开洞算法只支持平面! ');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }
                const face0Plane = smallWallSideFace.getSurface() as Plane;
                const proLines0 = holePlanarWire.map((holePlanarLine) => {
                    const stPt = face0Plane.getUVAt(holePlanarLine.getStartPt());
                    const endPt = face0Plane.getUVAt(holePlanarLine.getEndPt());
                    return new Line2d(stPt, endPt);
                });
                const holeLoop0 = new Loop(proLines0);
                if (holeLoop0.isAnticlockwise()) {
                    holeLoop0.reverse(); // 内环要求顺时针
                }
                // 洞口轮廓一个侧面上的三维边
                modifiedLine3ds0 = holeLoop0.getAllCurves().map((holeLine2d) => {
                    return face0Plane.getLine3D(holeLine2d) as Line3d;
                });
            }

            {
                // 另一个侧面上内环洞
                if (largeWallSideFace.getSurface().getType() !== GeometryType.enPlane) {
                    DebugWarn.warn(false, '开洞算法只支持平面! ');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }
                const face1Plane = largeWallSideFace.getSurface() as Plane;
                const proLines1 = holePlanarWire.map((holePlanarLine) => {
                    const stPt = face1Plane.getUVAt(holePlanarLine.getStartPt());
                    const endPt = face1Plane.getUVAt(holePlanarLine.getEndPt());
                    return new Line2d(stPt, endPt);
                });
                const holeLoop1 = new Loop(proLines1);
                if (holeLoop1.isAnticlockwise()) {
                    holeLoop1.reverse(); // 内环要求顺时针
                }
                // 洞口轮廓另一个侧面上的三维边
                line3ds1 = holeLoop1.getAllCurves().map((holeLine2d) => {
                    return face1Plane.getLine3D(holeLine2d) as Line3d;
                });
            }
        } else {
            {
                // 一个侧面上的非内环洞（洞的轮廓与墙轮廓有相交）
                if (smallWallSideFace.getSurface().getType() !== GeometryType.enPlane) {
                    DebugWarn.warn(false, '开洞算法只支持平面! ');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }
                let dirBaseLine2d: Line2d | undefined;

                const plane = smallWallSideFace.getSurface() as Plane;
                const modifiedLine2ds: Line2d[] = []; // 由洞口轮廓和墙的轮廓两部分组成
                const proLines = holePlanarWire.map((holePlanarLine) => {
                    const stPt = plane.getUVAt(holePlanarLine.getStartPt());
                    const endPt = plane.getUVAt(holePlanarLine.getEndPt());
                    return new Line2d(stPt, endPt);
                });
                const holeLoop = new Loop(proLines);
                // 求洞口的修正轮廓
                for (const proLine of proLines) {
                    // LogUtil.d(proLine, '洞口的线：');
                    // LogUtil.d(smallWallSideFace.getPolygon(), '面轮廓：');

                    const intPolylines = BoolOperate2d.polylineIntersect(new Polyline([proLine]), [smallWallSideFace.getPolygon()], false, ErrorSystem.LENGTH_EPS);
                    if (intPolylines.length < 1) {
                        continue;
                    }
                    // LogUtil.d(intPolylines, '洞口线被裁减结果：');

                    if (intPolylines.length !== 1 || intPolylines[0].getAllCurves().length !== 1) {
                        DebugWarn.warn(false, '墙洞边与墙轮廓求交只能有一条交线! ');
                        return {
                            face0: undefined,
                            face1: undefined
                        };
                    }
                    modifiedLine2ds.push(intPolylines[0].getAllCurves()[0] as Line2d);
                }

                // LogUtil.d(modifiedLine2ds, '洞口的修正轮廓');
                // LogUtil.d(smallWallSideFace.getPolygon(), 'smallWallSideFace.getPolygon()');
                // LogUtil.d(smallWallSideFace.getPolygon().clone().getCoedges(), 'smallWallSideFace.getPolygon().clone().getCoedges()');

                // 求墙的修正轮廓
                for (const wallCoedge of smallWallSideFace.getPolygon().getCoedges()) {
                    if (wallCoedge.curve.getType() !== GeometryType.enLine2D) {
                        DebugWarn.warn(false, '墙轮廓边不为直线! ');
                        return {
                            face0: undefined,
                            face1: undefined
                        };
                    }

                    const originalLenth = wallCoedge.curve.getLength();
                    const intPolylines = BoolOperate2d.polylineDifference(new Polyline([wallCoedge.curve]), [holeLoop], false, ErrorSystem.LENGTH_EPS);
                    if (intPolylines.length > 0) {
                        if (!wallCoedge.getTwin()) {
                            DebugWarn.warn(false, 'Coedge getTwin()失败! ');
                            return {
                                face0: undefined,
                                face1: undefined
                            };
                        }
                        const twinFace = (wallCoedge.getTwin() as Coedge).getTopoFace();
                        if (!twinFace) {
                            DebugWarn.warn(false, 'Coedge getTwinFsce失败! ');
                            return {
                                face0: undefined,
                                face1: undefined
                            };
                        }
                        if (intPolylines.length === 1 && !MathUtil.isNearlyEqual(originalLenth, intPolylines[0].getAllCurves()[0].getLength())) {
                            // 墙轮廓边被部分裁减
                            deleteFaces.push((twinFace as Face));
                            modifiedLine2ds.push(intPolylines[0].getAllCurves()[0] as Line2d);
                            if (!dirBaseLine2d) {
                                dirBaseLine2d = wallCoedge.curve as Line2d;
                            }
                        } else if (intPolylines.length > 1) {
                            // 墙轮廓边被裁减成多段
                            deleteFaces.push((twinFace as Face));
                            intPolylines.forEach(intPolyline => {
                                modifiedLine2ds.push(intPolyline.getAllCurves()[0] as Line2d);
                            });
                            if (!dirBaseLine2d) {
                                dirBaseLine2d = wallCoedge.curve as Line2d;
                            }
                        }
                    } else {
                        // TODO: Clipper中求loop外的curve2有bug
                        // DebugWarn.assert(wallCoedge.getTwin(), 'getTwin()失败 ！');
                        // const twinFace = (wallCoedge.getTwin() as Coedge).getTopoFace();
                        // DebugWarn.assert(twinFace, 'getTwinFsce失败 ！');
                        // deleteFaces.push((twinFace as Face));
                    }
                }

                // LogUtil.d(modifiedLine2ds, '洞口与墙的修正轮廓（未进行搜环）：');

                const modifiedHoleLine2ds = SearchGraph.simpleLoop(modifiedLine2ds);
                if (!dirBaseLine2d || modifiedHoleLine2ds.length !== 1 || modifiedHoleLine2ds[0].getType() !== GeometryType.enPolyline) {
                    DebugWarn.warn(false, '墙洞中开门洞获取洞口修正边失败!');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }
                const holePolyline = modifiedHoleLine2ds[0] as Polyline;
                if (!holePolyline.isOnlyLines()) {
                    DebugWarn.warn(false, '开门洞获取洞口修正边包含非直线!');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }

                // LogUtil.d(holePolyline, '洞口与墙的修正轮廓（搜环结果）');

                // 保证polyline逆时针
                for (const holeline of holePolyline.getAllCurves()) {
                    if ((dirBaseLine2d as Line2d).containsPoint(holeline.getStartPt()) && (dirBaseLine2d as Line2d).containsPoint(holeline.getEndPt())) {
                        // console.log('找到与dirBaseLine2d重合的线');
                        if (!(dirBaseLine2d as Line2d).getDirection().isSameDirectionWith(holeline.getStartTangent())) {
                            holePolyline.reverse();
                            break;
                        }
                    }
                }
                if (!dirBaseLine2d) {
                    DebugWarn.warn(false, '开门洞获取洞口修正边的基准线为空!');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }

                // LogUtil.d(holePolyline, '洞口与墙的修正轮廓（保证逆时针）');

                modifiedLine3ds0 = holePolyline.getAllCurves().map((holeLine2d) => {
                    return plane.getLine3D(holeLine2d) as Line3d;
                });
            }

            {
                // 另一个侧面上的非内环洞（洞的轮廓与墙轮廓有相交）
                if (largeWallSideFace.getSurface().getType() !== GeometryType.enPlane) {
                    DebugWarn.warn(false, '墙开洞的面只支持平面! ');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }
                let dirBaseLine2d: Line2d | undefined;

                const plane = largeWallSideFace.getSurface() as Plane;
                const modifiedLine2ds: Line2d[] = []; // 由洞口轮廓和墙的轮廓两部分组成
                const proLines = holePlanarWire.map((holePlanarLine) => {
                    const stPt = plane.getUVAt(holePlanarLine.getStartPt());
                    const endPt = plane.getUVAt(holePlanarLine.getEndPt());
                    return new Line2d(stPt, endPt);
                });
                const holeLoop = new Loop(proLines);
                // 求洞口的修正轮廓
                for (const proLine of proLines) {
                    const intPolylines = BoolOperate2d.polylineIntersect(new Polyline([proLine]), [largeWallSideFace.getPolygon()], false, ErrorSystem.LENGTH_EPS);
                    if (intPolylines.length < 1) {
                        continue;
                    }
                    if (intPolylines.length !== 1 || intPolylines[0].getAllCurves().length !== 1) {
                        DebugWarn.warn(false, '墙洞边与墙轮廓求交只能有一条交线! ');
                        return {
                            face0: undefined,
                            face1: undefined
                        };
                    }

                    modifiedLine2ds.push(intPolylines[0].getAllCurves()[0] as Line2d);
                }

                // LogUtil.d(modifiedLine2ds, '另一侧面洞口的修正轮廓');
                // LogUtil.d(largeWallSideFace.getPolygon(), 'largeWallSideFace.getPolygon()');

                // 求墙的修正轮廓
                for (const wallCoedge of largeWallSideFace.getPolygon().getCoedges()) {
                    if (wallCoedge.curve.getType() !== GeometryType.enLine2D) {
                        DebugWarn.warn(false, '墙轮廓边不为直线! ');
                        return {
                            face0: undefined,
                            face1: undefined
                        };
                    }

                    const originalLenth = wallCoedge.curve.getLength();
                    const intPolylines = BoolOperate2d.polylineDifference(new Polyline([wallCoedge.curve]), [holeLoop], false, ErrorSystem.LENGTH_EPS);
                    if (intPolylines.length > 0) {
                        if (!wallCoedge.getTwin()) {
                            DebugWarn.warn(false, 'Coedge getTwin()失败! ');
                            return {
                                face0: undefined,
                                face1: undefined
                            };
                        }
                        const twinFace = (wallCoedge.getTwin() as Coedge).getTopoFace();
                        if (!twinFace) {
                            DebugWarn.warn(false, 'Coedge getTwinFsce失败! ');
                            return {
                                face0: undefined,
                                face1: undefined
                            };
                        }
                        if (intPolylines.length === 1 && !MathUtil.isNearlyEqual(originalLenth, intPolylines[0].getAllCurves()[0].getLength())) {
                            // 墙轮廓边被部分裁减
                            deleteFaces.push((twinFace as Face));
                            modifiedLine2ds.push(intPolylines[0].getAllCurves()[0] as Line2d);
                            if (!dirBaseLine2d) {
                                dirBaseLine2d = wallCoedge.curve as Line2d;
                            }
                        } else if (intPolylines.length > 1) {
                            // 墙轮廓边被裁减成多段
                            deleteFaces.push((twinFace as Face));
                            intPolylines.forEach(intPolyline => {
                                modifiedLine2ds.push(intPolyline.getAllCurves()[0] as Line2d);
                            });
                            if (!dirBaseLine2d) {
                                dirBaseLine2d = wallCoedge.curve as Line2d;
                            }
                        }
                    } else {
                        // TODO: Clipper中求loop外的curve2有bug
                        // DebugWarn.assert(wallCoedge.getTwin(), 'getTwin()失败 ！');
                        // const twinFace = (wallCoedge.getTwin() as Coedge).getTopoFace();
                        // DebugWarn.assert(twinFace, 'getTwinFsce失败 ！');
                        // deleteFaces.push((twinFace as Face));
                    }
                }

                // LogUtil.d(modifiedLine2ds, '洞口与墙的修正轮廓（未进行搜环）：');

                const modifiedHoleLine2ds = SearchGraph.simpleLoop(modifiedLine2ds);
                if (!dirBaseLine2d || modifiedHoleLine2ds.length !== 1 || modifiedHoleLine2ds[0].getType() !== GeometryType.enPolyline) {
                    DebugWarn.warn(false, '墙洞中开门洞获取洞口修正边失败!');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }
                const holePolyline = modifiedHoleLine2ds[0] as Polyline;
                if (!holePolyline.isOnlyLines()) {
                    DebugWarn.warn(false, '开门洞获取洞口修正边包含非直线!');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }

                // LogUtil.d(holePolyline, '洞口与墙的修正轮廓（搜环结果）');

                // 保证polyline逆时针
                for (const holeline of holePolyline.getAllCurves()) {
                    if ((dirBaseLine2d as Line2d).containsPoint(holeline.getStartPt()) && (dirBaseLine2d as Line2d).containsPoint(holeline.getEndPt())) {
                        // console.log('找到与dirBaseLine2d重合的线');
                        if (!(dirBaseLine2d as Line2d).getDirection().isSameDirectionWith(holeline.getStartTangent())) {
                            holePolyline.reverse();
                            break;
                        }
                    }
                }
                if (!dirBaseLine2d) {
                    DebugWarn.warn(false, '开门洞获取洞口修正边的基准线为空!');
                    return {
                        face0: undefined,
                        face1: undefined
                    };
                }

                // LogUtil.d(holePolyline, '洞口与墙的修正轮廓（保证逆时针）');

                line3ds1 = holePolyline.getAllCurves().map((holeLine2d) => {
                    return plane.getLine3D(holeLine2d) as Line3d;
                });
            }
        }

        const modifiedLine3ds1: Line3d[] = [];
        for (let index = line3ds1.length - 1; index > -1; index--) {
            modifiedLine3ds1.push(line3ds1[index].reverse());
        }

        // deleteFaces去重
        for (let i = 0; i < deleteFaces.length - 1; i++) {
            for (let j = i + 1; j < deleteFaces.length; j++) {
                if (deleteFaces[i].tag === deleteFaces[j].tag) {
                    deleteFaces.splice(j, 1);
                }
            }
        }

        // LogUtil.d(modifiedLine3ds0, 'modifiedLine3ds0');
        // LogUtil.d(modifiedLine3ds1, 'modifiedLine3ds1');

        return {
            face0: smallWallSideFace,
            face1: largeWallSideFace,
            modifiedLine3ds0,
            modifiedLine3ds1,
            deleteFaces
        };
    }

    public static _resetBody(body: BrepBody, replaceBody: BrepBody) {
        body.clear();
        const replaceBodyClone = replaceBody.cloneAndReserveTag();
        for (const face of replaceBodyClone.getFaces()) {
            body.addFace(face);
        }
        for (const edge of replaceBodyClone.getEdges()) {
            body.addEdge(edge);
        }
    }
}
