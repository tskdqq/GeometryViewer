import { FacesBoxIntersect } from '../algorithm/intersect/faces_box_intersect';
import { FacesProject } from '../algorithm/project/faces_project';
import { Body } from '../geometry/brep/body';
import { BrepBody } from '../geometry/brep/brep_body';
import { Face } from '../geometry/brep/face';
import { Polygon } from '../geometry/brep/polygon';
import { Polyline } from '../geometry/brep/polyline';
import { Coordinate3 } from '../math/coordinate3';
import { FaceFacesIntersect } from '../algorithm/intersect/face_faces_intersect';
import { LogUtil } from '../util/log_util';
import { TopoTrackType } from '../geometry/brep/topo_track_type';
import { GeometryType } from '../geometry/geometry_type';

/**
 * 裁剪并投影FacesBody
 */
class CutAndProjectFacesBody {

    /**
     * @param wall 
     * @param coordinate 投影坐标系，方向和投影平面
     * @param clipperBox 用来裁剪投影对象的brepbody
     */
    constructor(private wall: Body[], private coordinate: Coordinate3, private clipperBox: BrepBody) {
        console.log(this.wall);
    }

    /**
     * 执行方法，直接操作输入的body
     * @param inputBodies 输入的body 
     */
    public execute(_inputBodies: Body[]): {
        polylines: Polyline[];
        polygons: Polygon[];
    } {
        const inputBodies: Body[] = _inputBodies.map(b => {
            return b.clone() as Body;
        });
        // 补面
        const inputFaces = this.patchFaces(inputBodies);
        LogUtil.d(inputFaces, '补面');

        inputFaces.forEach(f => {
            if (f.topoTrack !== undefined) {
                f.topoTrack.tags = [(f.getParent() as Body).tag];
                f.topoTrack.operate = TopoTrackType.BOOL_OPERATE;
            }
        });

        // 布尔交
        inputBodies.forEach(body => {
            const faces = body.getFaces();
            FacesBoxIntersect.execute(faces, this.clipperBox);
            if (faces && faces.length > 0) {
                inputFaces.push(...faces);
            }
        });

        LogUtil.d(inputFaces, '布尔交结果');

        const polys = FacesProject.execute(inputFaces, this.coordinate, true);
        const tmp = [];
        for (const p of polys) {
            if (p instanceof Array) {
                tmp.push(...p);
            } else {
                tmp.push(p);
            }
        }
        LogUtil.d(tmp, '投影结果');

        // 只返回polygon
        const result: Polygon[] = [];
        result.push(...polys.filter(poly => {
            return !Array.isArray(poly);
        }) as Polygon[]);

        for (let ri = result.length - 1; ri >= 0; ri--) {
            const r = result[ri];
            let polylineArr: Polyline[];
            if (r instanceof Array) {
                polylineArr = r;
            } else {
                polylineArr = r.getLoops();
            }

            for (let i = polylineArr.length - 1; i >= 0; i--) {
                const polyline = polylineArr[i];
                const idx = polyline.getCoedges().findIndex(ce => {
                    return ce.userData === undefined;
                });
                if (idx < 0) {
                    const deleteMe = this.isDeletePolyline(polyline, r, polys);
                    if (deleteMe) {
                        polylineArr.splice(i, 1);
                    }
                    // polylineArr.splice(i, 1);
                }
            }
            if (polylineArr.length < 1) {
                result.splice(ri, 1);
            }
        }

        // merge
        // result.forEach(poly => {
        //     poly.getLoops().forEach(l => {
        //         let modified = false;
        //         for (let i = l.getCoedges().length - 1; i >= 0; i--) {
        //             if (l.getCoedges()[i].curve.getLength() < ErrorSystem.LENGTH_EPS) {
        //                 l.getCoedges().splice(i, 1);
        //                 modified = true;
        //             }
        //         }
        //         if (modified) {
        //             l.makeStartEndConnected();
        //         }
        //     });
        // });

        // 投影
        return {
            polylines: [],
            polygons: result
        };
    }

    /**
     * 补面
     * @param inputBodies 
     */
    private patchFaces(inputBodies: Body[]): Face[] {

        // 补面
        let projectToFaces = this.clipperBox.getFaces().filter(f => {
            return f.getCenterNorm().isParalellTo(this.coordinate.zDir);
        });
        projectToFaces = projectToFaces.filter(f => {
            // 包围盒粗判
            const inter = inputBodies.find(fb => {
                return fb.getBoundingBox().intersectsBox(f.getBoundingBox());
            });

            return inter !== undefined;
        });

        const inputFaces = [];
        for (const face of projectToFaces) {
            for (const body of inputBodies) {
                const rs = FaceFacesIntersect.execute(face, body.getFaces());
                for (const r of rs) {
                    if (!(r.getType() === GeometryType.enLoop)) {
                        continue;
                    }
                    const pt3ds = r.toPath().map(p => {
                        return face.getSurface().getPtAt(p);
                    });
                    // 计算环
                    const pts = pt3ds.map(p => {
                        return face.getSurface().getUVAt(p);
                    });
                    if (pts.length > 2) {
                        const loop = new Polygon(pts);
                        LogUtil.d(loop, '环');
                        loop.setUserData('faceType', '补的面');
                        // result.push(loop);
                        const tFace = new Face(face.getSurface().clone(), true, loop);
                        tFace.setParent(face.getParent());
                        inputFaces.push(tFace);
                    }
                }
            }
        }
        return inputFaces;
    }

    // 是否需要删除polyline
    private isDeletePolyline(polyline: Polyline, thisPolyline: (Polyline[] | Polygon), result: (Polyline[] | Polygon)[]) {
        return true;
        // const ces: Curve2d[] = [];
        // // 所有实线
        // for (const poly of result) {
        //     if (poly === thisPolyline) {
        //         continue;
        //     }
        //     if (poly instanceof Array) {
        //         poly.forEach(temp => {
        //             temp.getCoedges().forEach(ce => {
        //                 ces.push(ce.curve);
        //             });
        //         });
        //     } else {
        //         poly.getLoops().forEach(temp => {
        //             temp.getCoedges().forEach(ce => {
        //                 ces.push(ce.curve);
        //             });
        //         });
        //     }
        // }

        // for (const ce of polyline.getCoedges()) {
        //     const idx = ces.findIndex(curve => {
        //         if (ce.curve.getLength() < ErrorSystem.LENGTH_EPS) {
        //             return true;
        //         }
        //         const type = CurveCurvePositionJudge.curveToCurve(curve, ce.curve, ErrorSystem.LENGTH_EPS);
        //         return CurveCuvePositonType.OVERLAP_EQUAL === type
        //             || CurveCuvePositonType.OVERLAP === type
        //             || CurveCuvePositonType.OVERLAP_CONTAIN === type
        //             || CurveCuvePositonType.OVERLAP_IN === type;
        //     });

        //     if (idx < 0) {
        //       。  LogUtil.d(ces, '源');
        //       。  LogUtil.d(ce.curve, '曲线');
        //         return false;
        //     }
        // }
        // return true;
    }
}

export { CutAndProjectFacesBody };
