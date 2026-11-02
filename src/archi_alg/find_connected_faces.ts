import { Face } from '../geometry/brep/face';
import { Line3d } from '../geometry/line3d';
import { CalculateIntersect } from '../algorithm/calculate_intersect';
import { Line1ProjectToLine2 } from '../algorithm/project/line_line_project';
import { ErrorSystem } from '../math/error_system';
import { DebugWarn } from '../util/debug_warn';
import { Curve3d } from '../geometry/curve3d';

export class FindConnectedFaces {
    /**
     * @param rootFace 根节点面(tag不为空)
     * @param srcFaces 搜索范围(可以包含根节点)
     * @param ifRecursive 是否对结果递归查找(默认为true)
     * @returns 返回一个集合，其中，通过共有临边的连接方式，每一个面都能递归连接到集合内的所有面(返回的集合不包含根节点)
     */
    public static execute(rootFace: Face, srcFaces: Face[], ifRecursive: boolean = true): Face[] {
        const results: Face[] = [];
        const rootTag = rootFace.tag;
        // 不再检测面的序号集合
        const ignoreList = new Map<number, string>();
        // 待检测的集合
        const waitingList: Face[] = [];
        // 搜索范围去除自身
        for (let idx = 0, len = srcFaces.length; idx < len; ++idx) {
            if (rootTag === srcFaces[idx].tag) {
                ignoreList.set(idx, rootTag);
                break;
            }
        }
        waitingList.push(rootFace);

        // 开始搜索连接的面
        while (waitingList.length > 0) {
            const currentRootFace = waitingList.shift();
            const connectedFcs = this._findCoedgeFace(currentRootFace!, srcFaces, ignoreList);
            results.push(...connectedFcs);
            // 是否递归查找
            if (ifRecursive) {
                waitingList.push(...connectedFcs);
            }
        }
        return results;
    }

    /**
     * @param root 根节点面
     * @param range 搜索范围(可以包含根节点)
     * @param indices 符合条件的面
     * @returns 返回一个面的集合，其中的每一个面都与根节点面共边
     */
    private static _findCoedgeFace(root: Face, range: Face[], ignoreList: Map<number, string>): Face[] {
        const results: Face[] = [];
        try {
            if (root && !root.getPolygon().isEmpty()) { // root.getPolygon().isValid()  isValid接口存在bug
                for (let idxFc = 0, lenFc = range.length; idxFc < lenFc; ++idxFc) {
                    // 跳过被排除的列表
                    if (ignoreList.get(idxFc)) {
                        continue;
                    }

                    const fc = range[idxFc];
                    // 检验face合法性
                    // 若果Face的polygon内loop数量为0, 虽然polygon合法但是faceFace函数会失败，直接跳过
                    try {
                        if (!fc || fc.getPolygon().isEmpty()) { // !fc.getPolygon().isValid() isValid接口存在bug
                            continue;
                        }
                        // 计算检测面与当前根节点面的3d交线
                        const coedge3ds: Curve3d[] = [];
                        let bHasTestRoot = false;
                        // 平行 -- faceFace不处理平行情况，此处额外处理
                        if (root.getCenterNorm().isParalellTo(fc.getCenterNorm())) {
                            const rootCe3d = root.getTopoCoedges().map(_ => root.getSurface().getCurve3d(_.curve));
                            coedge3ds.push(...rootCe3d);
                            bHasTestRoot = true;
                        } else {
                            const intersects = CalculateIntersect.faceFace(root, fc);
                            coedge3ds.push(...intersects);
                        }
                        // const coedge3ds = 
                        for (let idx = 0, len = coedge3ds.length; idx < len; ++idx) {
                            const ce = coedge3ds[idx];
                            // 将计算得到的交线与检测面的3d边Edge做共线检测
                            if (ce instanceof Line3d) {
                                if ((bHasTestRoot || this._ifLineIsPartOfCoedge(ce, root)) &&
                                this._ifLineIsPartOfCoedge(ce, fc)) {
                                    results.push(fc);
                                    ignoreList.set(idxFc, fc.tag || 'true');
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        DebugWarn.warn(false, '面与面求交线失败');
                        continue;
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
        return results;
    }

    /**
     * 递归查找所有与根节点面共边相邻的面
     * @param rootFace 根节点面(tag不为空)
     * @param srcFaces 搜索范围(可以包含根节点)
     * @returns 返回一个集合，其中，通过共有临边的连接方式，每一个面都能递归连接到集合内的所有面(返回的集合不包含根节点)
     */
    public static searchRecursively(rootFace: Face, srcFaces: Face[]): Face[] {
        return this.execute(rootFace, srcFaces, true);
    }

    /**
     * 查找所有与根节点面共边相邻的面(非递归)
     * @param rootFace 根节点面(tag不为空)
     * @param srcFaces 搜索范围(可以包含根节点)
     * @returns 返回一个集合，其中，通过共有临边的连接方式，每一个面都能递归连接到集合内的所有面(返回的集合不包含根节点)
     */
    public static search(rootFace: Face, srcFaces: Face[]): Face[] {
        return this.execute(rootFace, srcFaces, false);
    }

    /**
     * @param line 测试的线段
     * @param root 判断的face
     * @returns 线段是否与face某一段半边共线且有交集
     */
    private static _ifLineIsPartOfCoedge(line: Line3d, root: Face) {
        const egs = root.getTopoCoedges();
        for (let idxEg = 0, lenEg = egs.length; idxEg < lenEg; ++idxEg) {
            const eg = egs[idxEg];
            // 获取coedge的3d边
            const eg3d = eg.getCurve3d() as Line3d;
            // 判断3d边与交线共线
            if (eg3d && (eg3d).isColinearWith(line)) {
                // 两个面的交线为一个面的edge即共有临边，证明两个面相连
                const range1 = eg3d.getRange();
                const range2 = Line1ProjectToLine2.execute(line, eg3d);
                const intRange = range1.intersect(range2);
                if (intRange && intRange.getLength() > ErrorSystem.LENGTH_EPS) {
                    return true;
                }
            }
        }
        return false;
    }
}
