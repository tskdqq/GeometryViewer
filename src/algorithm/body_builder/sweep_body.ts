import { BrepBody } from '../../geometry/brep/brep_body';
import { Face } from '../../geometry/brep/face';
import { Polygon } from '../../geometry/brep/polygon';
import { Line3d } from '../../geometry/line3d';
import { Plane } from '../../geometry/plane';
import { Loop } from '../../geometry/brep/loop';
import { Vector3 } from '../../math/vector3';
import { Line2d } from '../../geometry/line2d';
import { CalculatDistance } from '../calculate_distance';
import { DebugWarn } from '../../util/debug_warn';
import { CalculateIntersect } from '../calculate_intersect';
import { GeometryType } from '../../geometry/geometry_type';
import { Coedge } from '../../geometry/brep/coedge';
import { ErrorSystem } from '../../math/error_system';
import { Shell } from '../../geometry/brep/shell';
import { Vector2 } from '../../math/vector2';

/**
 * @author tiansk
 *  扫掠体
 */
export class SweepBody {

    public _loop3dClosed: boolean = true;
    public _path3dClosed: boolean = true;

    constructor(public loop3d: Line3d[], public path3d: Line3d[], public topoTrack?: Set<string>[], public isWithCutLine: boolean = false) {
        this.init();
        // 检查曲线的合法性
        DebugWarn.assert(this.loop3dValid(), '扫描轮廓必须首尾相连，且无自交');
        const faceStart = new Face(this.loop3d, this.path3d[0].getDirection().reverse());
        const d = CalculatDistance.ptToSurface(path3d[0].getStartPt(), faceStart.getSurface());

        DebugWarn.assert(d < 1e-8, '第一条扫描路径的起点必须在扫描轮廓平面上');
    }

    // 截面轮廓线
    public execute(): BrepBody | Shell {
        let body: BrepBody | Shell;
        if (!this._loop3dClosed) {
            body = new Shell();
        } else {
            body = new BrepBody();
        }

        // 计算扫描base
        // for (let i = 0; i < this.path3d.length; i++) {
        //     for (let j = 0; j < this.loop3d.length; j++) {
        //         const curve = this.calcProfile(j, i);
        //         body.addNewEdge(curve);
        //     }
        // }

        // 每一条轮廓线依次扫掠
        // for (let profileIdx = 0; profileIdx < 3; profileIdx++) {
        for (let profileIdx = 0; profileIdx < this.loop3d.length; profileIdx++) {
            const faces: Face[] = this.sweepAProfile(profileIdx);
            // faces内部添加edge
            if (faces.length > 1) {
                for (let i = 0; i < (this._path3dClosed ? faces.length : faces.length - 1); i++) {
                    // 
                    const curFace = faces[i];
                    const nextFace = faces[(i + 1) % faces.length];
                    // 使2个face相连，并添加edge
                    if (faces.length > 1) {
                        this.makeFaceConnected(body, curFace, nextFace);
                    }
                }
            }

            let topoTrack: Set<string>;
            if (this.topoTrack) {
                topoTrack = new Set();
                this.topoTrack.push(topoTrack);
            }
            faces.forEach(f => {
                body.addFace(f);
                if (topoTrack) {
                    topoTrack.add(f.tag);
                }
            });
        }

        // 添加底面
        if (!this._path3dClosed && this._loop3dClosed) {
            // 添加底面
            const faceStart = new Face(this.loop3d, this.path3d[0].getDirection().reverse());
            body.addFace(faceStart);
        }

        // 添加顶面
        const topLoop: Line3d[] = [];
        for (let nProfileIndex = 0; nProfileIndex < this.loop3d.length; nProfileIndex++) {
            const line3d = this.calcProfile(nProfileIndex, this.path3d.length - 1);
            line3d.translate(this.path3d[this.path3d.length - 1].getDirection().normalize().multi(this.path3d[this.path3d.length - 1].getLength()));
            topLoop.push(line3d);
        }
        if (!this._path3dClosed && this._loop3dClosed) {
            const faceEnd = new Face(topLoop, this.path3d[this.path3d.length - 1].getDirection());
            body.addFace(faceEnd);
        }

        // 计算拓扑关系
        body._calcAndAddEdges(ErrorSystem.DOUBLE_EPS);

        if (body instanceof BrepBody) {
            DebugWarn.assert(body.isTopoValid(), '扫掠体不合法' + body.asString());
        }

        return body;
    }

    /**
     * 扫一个轮廓线
     * @param profile0 
     * @param path3d 
     */
    public sweepAProfile(profileIdx: number): Face[] {
        // 已经扫掠完成的路径
        const sweepedPath: Set<number> = new Set();
        const result = [];
        for (let i = 0; i < this.path3d.length; i++) {
            if (sweepedPath.has(i)) {
                continue;
            }
            // 计算真正的profile
            let profile = this.calcProfile(profileIdx, i);

            const plane = new Plane(profile.getMidPt(), this.path3d[i].getDirection(), profile.getDirection().reverse());
            // 找在同一个平面上的
            const idxes = this.findPathInPlane(this.path3d, i, plane.norm, sweepedPath);

            if (idxes[0] !== i) {
                profile = this.calcProfile(profileIdx, idxes[0]);
            }

            // 扫掠
            const loopRight: Line2d[] = [];
            const loopLeft: Line2d[] = [];
            const profile2d = plane.getLine2D(profile)!;
            DebugWarn.assert(profile2d);

            let offsetLeft: any;
            let offsetRight: any;
            idxes.forEach((idx, arrayIdx) => {
                const path2d = plane.getLine2D(this.path3d[idx])!;
                DebugWarn.assert(path2d);
                {
                    const left = path2d.clone();
                    if (offsetLeft === undefined) {
                        offsetLeft = CalculatDistance.ptToCurveSignedDistance(profile2d.getStartPt(), path2d);
                    }

                    left.offset(offsetLeft);
                    loopLeft.push(left);
                    if (idxes.length > 1) {
                        // 有多条路径
                        if (arrayIdx === 0) {
                            left.setUserData('start', true);
                        } else if (arrayIdx === idxes.length - 1) {
                            left.setUserData('end', true);
                        }
                    } else {
                        // 只有一条路径
                        left.setUserData('startOrEnd', true);
                    }
                }
                {
                    const right = path2d.clone();
                    if (offsetRight === undefined) {
                        offsetRight = CalculatDistance.ptToCurveSignedDistance(profile2d.getEndPt(), path2d);
                    }

                    right.offset(offsetRight);
                    loopRight.push(right);
                    if (idxes.length > 1) {
                        if (arrayIdx === 0) {
                            right.setUserData('start', true);
                            right.setUserData('startDir', right.getDirection());
                        } else if (arrayIdx === idxes.length - 1) {
                            right.setUserData('end', true);
                            right.setUserData('endDir', right.getDirection());
                        }
                    } else {
                        right.setUserData('startOrEnd', true);
                        right.setUserData('startOrEndDir', right.getDirection());
                    }
                }
            });
            if (!this.isWithCutLine) {
                let polygon: Polygon;
                // 是一个环
                if ((idxes.length === this.path3d.length) && idxes.length > 1 && this._path3dClosed) {
                    const loop1 = new Loop(loopRight);
                    loop1.makeStartEndConnected();

                    loopLeft.reverse().forEach(left => {
                        left.reverse();
                    });
                    const loop2 = new Loop(loopLeft);
                    loop2.makeStartEndConnected();

                    polygon = new Polygon([loop1, loop2]);

                } else {
                    loopLeft.reverse().forEach(left => {
                        loopRight.push(left.reverse());
                    });
                    const loop = new Loop(loopRight);
                    loop.makeStartEndConnected();
                    if (!loop.isAnticlockwise()) {
                        debugger;
                    }
                    polygon = new Polygon(loop);
                }

                result.push(new Face(plane, true, polygon));
                DebugWarn.assert(polygon.isValid(), '!polygon.isValid()' + polygon.asString());
            } else {
                // 是一个环
                let preRightIntersect, preLeftIntersect;
                if ((idxes.length === this.path3d.length) && idxes.length > 1 && this._path3dClosed) {
                    for (let j = 0, len = loopRight.length; j < len; j++) {
                        const preRight = loopRight[(j - 1 + len) % len];
                        const preLeft = loopLeft[(j - 1 + len) % len];
                        const right = loopRight[j];
                        const left = loopLeft[j];
                        const nextRight = loopRight[(j + 1) % len];
                        const nextLeft = loopLeft[(j + 1) % len];
                        if (!preRightIntersect) {
                            preRightIntersect = this.getCurveCurveIntersect(preRight, right);
                        }
                        const nextRightIntersect = this.getCurveCurveIntersect(right, nextRight);
                        if (!preLeftIntersect) {
                            preLeftIntersect = this.getCurveCurveIntersect(preLeft, left);
                        }
                        const nextLeftIntersect = this.getCurveCurveIntersect(nextLeft, left);
                        const loop = new Loop([preRightIntersect, nextRightIntersect, nextLeftIntersect, preLeftIntersect]);
                        loop.makeStartEndConnected();
                        const polygon = new Polygon(loop);
                        result.push(new Face(plane, true, polygon));
                        preRightIntersect = nextRightIntersect.clone();
                        preLeftIntersect = nextLeftIntersect.clone();
                        DebugWarn.assert(polygon.isValid(), '!polygon.isValid()' + polygon.asString());
                    }
                } else if (idxes.length > 1) {
                    for (let j = 0, len = loopRight.length; j < len; j++) {
                        let loop: Loop;
                        if (j === 0) {
                            const right = loopRight[j];
                            const left = loopLeft[j];
                            const nextRight = loopRight[(j + 1) % len];
                            const nextLeft = loopLeft[(j + 1) % len];
                            const nextRightIntersect = this.getCurveCurveIntersect(right, nextRight);
                            const nextLeftIntersect = this.getCurveCurveIntersect(nextLeft, left);
                            preLeftIntersect = nextLeftIntersect.clone();
                            preRightIntersect = nextRightIntersect.clone();
                            loop = new Loop([right.getStartPt(), nextRightIntersect, nextLeftIntersect, left.getStartPt()]);
                        } else if (j === len - 1) {
                            const right = loopRight[j];
                            const left = loopLeft[j];
                            const preRight = loopRight[j - 1];
                            const preLeft = loopLeft[j - 1];
                            if (!preRightIntersect) {
                                preRightIntersect = this.getCurveCurveIntersect(right, preRight);
                            }
                            if (!preLeftIntersect) {
                                preLeftIntersect = this.getCurveCurveIntersect(preLeft, left);
                            }
                            loop = new Loop([preRightIntersect, right.getEndPt(), left.getEndPt(), preLeftIntersect]);
                        } else {
                            const preRight = loopRight[(j - 1 + len) % len];
                            const preLeft = loopLeft[(j - 1 + len) % len];
                            const right = loopRight[j];
                            const left = loopLeft[j];
                            const nextRight = loopRight[(j + 1) % len];
                            const nextLeft = loopLeft[(j + 1) % len];
                            if (!preRightIntersect) {
                                preRightIntersect = this.getCurveCurveIntersect(preRight, right);
                            }
                            const nextRightIntersect = this.getCurveCurveIntersect(right, nextRight);
                            if (!preLeftIntersect) {
                                preLeftIntersect = this.getCurveCurveIntersect(preLeft, left);
                            }
                            const nextLeftIntersect = CalculateIntersect.curveCurve(nextLeft, left)[0].point;
                            loop = new Loop([preRightIntersect, nextRightIntersect, nextLeftIntersect, preLeftIntersect]);
                            preRightIntersect = nextRightIntersect.clone();
                            preLeftIntersect = nextLeftIntersect.clone();
                        }
                        const polygon = new Polygon(loop);
                        result.push(new Face(plane, true, polygon));
                        DebugWarn.assert(polygon.isValid(), '!polygon.isValid()' + polygon.asString());
                    }
                } else {
                    loopLeft.reverse().forEach(left => {
                        loopRight.push(left.reverse());
                    });
                    const loop = new Loop(loopRight);
                    loop.makeStartEndConnected();
                    if (!loop.isAnticlockwise()) {
                        debugger;
                    }
                    const polygon = new Polygon(loop);
                    result.push(new Face(plane, true, polygon));
                }

                // result.push(new Face(plane, true, polygon));
            }
        }
        return result;
    }

    private findPathInPlane(path3d: Line3d[], curIdx: number, norm: Vector3, sweepedPath: Set<number>): number[] {
        sweepedPath.add(curIdx);
        const result = [curIdx];
        // 向后查找
        do {
            let i = curIdx + 1;
            if (i === path3d.length) {
                if (this._path3dClosed) {
                    i = 0;
                } else {
                    break;
                }
            }
            while (i !== curIdx) {
                if (path3d[i].getDirection().isPerpendicularTo(norm) && !sweepedPath.has(i)) {
                    result.push(i);
                    sweepedPath.add(i);
                    i++;
                    if (i === path3d.length) {
                        if (this._path3dClosed) {
                            i = 0;
                        } else {
                            break;
                        }
                    }
                } else {
                    break;
                }
            }
        } while (0);

        // 向前查找
        if (this._path3dClosed) {
            let i = (curIdx - 1 + path3d.length) % path3d.length;
            while (i !== curIdx) {
                if (path3d[i].getDirection().isPerpendicularTo(norm) && !sweepedPath.has(i)) {
                    result.splice(0, 0, i);
                    sweepedPath.add(i);
                    i = (i - 1 + path3d.length) % path3d.length;
                } else {
                    break;
                }
            }
        }
        return result;
    }

    // 计算每一条线的偏移距离
    private init() {
        // path是否封闭
        const pathLength = this.path3d.length;
        if (this.path3d.length < 2 || !this.path3d[pathLength - 1].getEndPt().equals(this.path3d[0].getStartPt())) {
            this._path3dClosed = false;
        } else {
            this._path3dClosed = true;
            // 通过扫描方向来判断是否真正可以闭合
            // const profile = this.calcProfile(0, this.path3d.length - 1);
            // if (!profile.getDirection().isPerpendicularTo(this.loop3d[0].getDirection())) {
            //     this._path3dClosed = true;
            // } else {
            //     this._path3dClosed = false;
            // }
        }

        // loop3d是否封闭
        const loop3dLength = this.loop3d.length;
        if (this.loop3d.length < 2 || !this.loop3d[loop3dLength - 1].getEndPt().equals(this.loop3d[0].getStartPt())) {
            this._loop3dClosed = false;
        } else {
            this._loop3dClosed = true;
        }
    }

    public getLoop2d(profileId: number) {
        const path0 = this.path3d[0];
        const profile = this.loop3d[profileId];
        const dirU = profile.getDirection();
        const dirV = profile.getDirection().cross(path0.getDirection()).normalize();
        const plane = new Plane(path0.getStartPt(), dirU, dirV);
        const l = plane.getLine2D(profile)!;
        DebugWarn.assert(l);
        return l;
    }

    /**
     * 计算用来扫掠的截面线
     * @param profile0 
     * @param pathIdx 
     * @param nextIsUnknown 后面的是未知的 
     */
    public calcProfile(profileIdx: number, pathIdx: number): Line3d {
        DebugWarn.assert(profileIdx >= 0 && profileIdx < this.loop3d.length);
        // 
        if (pathIdx === 0) {
            return this.loop3d[profileIdx].clone();
        }

        const u = this.loop3d[profileIdx].getDirection();
        for (let i = 0; i < pathIdx; i++) {
            const prePath = this.path3d[i];
            const nextPath = this.path3d[i + 1];

            const norm = nextPath.getDirection().cross(prePath.getDirection()).normalize();
            const plane = new Plane(Vector3.zero(), norm);
            const preDir = plane.getUVAt(prePath.getDirection());
            const nextDir = plane.getUVAt(nextPath.getDirection());
            const theta = preDir.angleTo(nextDir);
            u.rotate(theta, norm);
        }
        const v = u.cross(this.path3d[pathIdx].getDirection()).normalize();
        const pl = new Plane(this.path3d[pathIdx].getStartPt(), u, v);
        const result = pl.getLine3D(this.getLoop2d(profileIdx));
        return result;
    }

    private loop3dValid() {
        // 首尾顺序相连
        for (let i = 0; i < this.loop3d.length - 1; i++) {
            const cur = this.loop3d[i];
            const next = this.loop3d[i + 1];
            if (!next.getStartPt().equals(cur.getEndPt())) {
                return false;
            }
        }

        if (this._loop3dClosed && this.loop3d.length > 1) {
            const pts3d = this.loop3d.map(_ => _.getStartPt());
            // 构造平面
            const plane = new Plane(pts3d[0], this.path3d[0].getStartTangent());
            const pts2d = pts3d.map(p => plane.getUVAt(p));
            const l = new Loop(pts2d);

            if (l.calcArea() < 0) {
                this.loop3d = this.loop3d.map(_ => _.clone().reverse());
                this.loop3d.reverse();
            }
        }
        // todo 无自交
        return true;
    }

    private makeFaceConnected(body: Shell, face1: Face, face2: Face) {
        const plane1 = face1.getSurface() as Plane;
        const plane2 = face2.getSurface() as Plane;
        // DebugWarn.assert(!face1.getCenterNorm().isParalellTo(face2.getCenterNorm()));
        if (face1.getCenterNorm().isParalellTo(face2.getCenterNorm())) {
            return;
        }
        const curves = CalculateIntersect.surfaceSurface(plane1, plane2);
        DebugWarn.assert(curves.length === 1 && curves[0].getType() === GeometryType.enLine3D);
        // 交线
        const intLine = curves[0] as Line3d;
        // GeoDocument.getInstance().add(intLine);
        {
            const ce1 = this.offsetCoedge(face1, intLine, true);
            const ce2 = this.offsetCoedge(face2, intLine, false);
            if (!ce1 || !ce2) {
                return;
            }
            const edge = body.addNewEdge(plane1.getLine3D(ce1.curve));

            edge.addCoEdgeInfo(ce1.tag);
            edge.addCoEdgeInfo(ce2.tag);

            ce1.setEdgeInfo(edge.tag, true);
            ce2.setEdgeInfo(edge.tag, false);
        }
    }

    private offsetCoedge(face1: Face, curve: Line3d, isPre: boolean): Coedge {

        // 查找需要延伸的2条coedge
        const ces = face1.getTopoCoedges().filter(ce => {
            if (isPre) {
                return ce.curve.userData && (ce.curve.userData.end !== undefined || ce.curve.userData.startOrEnd !== undefined);
            }
            return ce.curve.userData && (ce.curve.userData.start !== undefined || ce.curve.userData.startOrEnd !== undefined);
        });

        let pathDir: Vector2 = undefined as any;
        for (const ce of face1.getTopoCoedges()) {
            if (!ce.curve.userData) {
                continue;
            }
            if (ce.curve.userData.startOrEndDir) {
                pathDir = ce.curve.userData.startOrEndDir;
                break;
            }

            if (isPre) {
                if (ce.curve.userData.endDir) {
                    pathDir = ce.curve.userData.endDir;
                    break;
                }
            } else {
                if (ce.curve.userData.startDir) {
                    pathDir = ce.curve.userData.startDir;
                    break;
                }
            }
        }
        DebugWarn.assert(pathDir && (pathDir instanceof Vector2));

        DebugWarn.assert(ces.length === 2);

        const plane1 = face1.getSurface() as Plane;
        const line2d = plane1.getLine2D(curve)!;
        DebugWarn.assert(line2d);

        let mid: Coedge = undefined as any;
        // 找到需要替换的边
        let mid1: any = ces[0].getNextCoedge();
        if (mid1.getNextCoedge() !== ces[1]) {
            mid1 = undefined;
        }

        let mid2: any = ces[1].getNextCoedge();
        if (mid2.getNextCoedge() !== ces[0]) {
            mid2 = undefined;
        }

        if (mid1 && mid2) {
            const centerDir = new Vector2(mid2.curve.getMidPt(), mid1.curve.getMidPt());
            if (centerDir.dot(pathDir) > 0) {
                if (isPre) {
                    mid = mid1;
                } else {
                    mid = mid2;
                }
            } else {
                if (isPre) {
                    mid = mid2;
                } else {
                    mid = mid1;
                }
            }
        } else if (mid1) {
            mid = mid1;
        } else if (mid2) {
            mid = mid2;
        }

        DebugWarn.assert(mid);
        if (!mid) {
            return undefined as any;
        }

        const pre: Coedge = mid.getPreCoedge();
        const next: Coedge = mid.getNextCoedge();
        DebugWarn.assert(pre && next);

        // 替换mid
        let start;
        {
            const preLine = pre.curve.extend(ErrorSystem.MODEL_MAX_LENGTH, true);
            const infos = CalculateIntersect.curveCurve(preLine, line2d);
            DebugWarn.assert(infos.length === 1);
            preLine.setRange(preLine.getRange().min, infos[0].param1);
            start = preLine.getEndPt();
        }
        let end;
        {
            const nextLine = next.curve.extend(ErrorSystem.MODEL_MAX_LENGTH, false);
            const infos = CalculateIntersect.curveCurve(nextLine, line2d);
            DebugWarn.assert(infos.length === 1);
            nextLine.setRange(infos[0].param1, nextLine.getRange().max);
            end = nextLine.getStartPt();
        }

        mid.curve = new Line2d(start, end);
        return mid;
    }
    private getCurveCurveIntersect(line0: Line2d, line1: Line2d) {
        let res: any[] = [];
        if (!line0.isParalellTo(line1)) {
            res = CalculateIntersect.curveCurve(line0.clone().extendDouble(1000), line1.clone().extendDouble(1000));
        } else if (line0.isParalellTo(line1)) {
            res = CalculateIntersect.curveCurve(line0, line1);
        }
        DebugWarn.assert(res.length > 0, '求交失败');
        return res[0].point;
    }
}
