/* tslint:disable:no-void-expression */
import { GeoDocEventHandler } from '../event_handler/geo_changed_handler';
import { Coedge } from '../geometry/brep/coedge';
import { Loop } from '../geometry/brep/loop';
import { Polygon } from '../geometry/brep/polygon';
import { Polyline } from '../geometry/brep/polyline';
import { Geomtry } from '../geometry/geometry';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';

export declare type GeomtryOrVector = (Vector2 | Vector3 | Geomtry);

/**
 * 文档,目前是单文档所以写成单例
 */
class GeoDocument {
    // 单例
    public static getInstance(): GeoDocument {
        if (!GeoDocument.instance) {
            GeoDocument.instance = new GeoDocument();
        }
        return GeoDocument.instance;
    }

    private static instance: GeoDocument;

    // 所有的几何
    private allGeos: GeomtryOrVector[] = [];
    // 方便查询
    private _idToGeo: Map<number, Geomtry | Vector2 | Vector3> = new Map();

    private redoList: GeomtryOrVector[] = [];

    public add(geo: GeomtryOrVector | GeomtryOrVector[]) {
        // 
        if (geo instanceof Array) {
            this.allGeos.push(...geo);
            GeoDocEventHandler.getInstance().onGeoAdded(geo);
            return;
        }

        if (geo instanceof Geomtry) {
            this.allGeos.push(geo);
            GeoDocEventHandler.getInstance().onGeoAdded([geo]);
        } else if (geo instanceof Vector2) {
            (geo as any).refId = (Geomtry as any).idGenerator++;
            this.allGeos.push(geo);
            GeoDocEventHandler.getInstance().onGeoAdded([geo]);
        } else if (geo instanceof Vector3) {
            (geo as any).refId = (Geomtry as any).idGenerator++;
            this.allGeos.push(geo);
            GeoDocEventHandler.getInstance().onGeoAdded([geo]);
        }

        if (this.redoList.length > 0) {
            this.redoList.splice(0, this.redoList.length);
        }
    }

    private resetMap() {
        this._idToGeo.clear();
        const walk = (geo: GeomtryOrVector) => {
            this._idToGeo.set((geo as any).refId, geo);
            if (geo instanceof Coedge) {
                walk(geo.curve);
            } else if (geo instanceof Polyline) {
                geo.getCoedges().forEach(g => walk(g));
            } else if (geo instanceof Polygon) {
                geo.getLoops().forEach(l => walk(l));
            }
        };

        this.allGeos.forEach(geo => walk(geo));
    }

    public update(...geos: Geomtry[]) {
        // 
        if (geos.length < 1) {
            return;
        }
        GeoDocEventHandler.getInstance().onGeoUpdate([...geos]);
    }

    public deleteById(...geoIds: number[]) {
        const set = new Set(geoIds);
        const idxes: number[] = [];
        this.allGeos.forEach((e, i) => {
            if (set.has((e as any).refId)) {
                idxes.push(i);
            }
        });

        this.deleteByArrayIdx(...idxes);
    }

    public getLoopByCurveId(id: number) {
        const loops = this.getAll(Loop);
        const loop = loops.find(l => {
            return l.getCoedges().find(ce => {
                return (ce.curve as any).refId === id;
            }) !== undefined;
        });
        return loop;
    }

    public deleteByArrayIdx(...idxes: number[]) {
        idxes.sort((a, b) => {
            return b - a;
        });
        const geos: GeomtryOrVector[] = [];
        idxes.forEach(idx => {
            if (idx >= 0) {
                const del = this.allGeos.splice(idx, 1);
                geos.push(...del);
            }
        });
        this.redoList.push(...geos);
        GeoDocEventHandler.getInstance().onGeoDeleted(geos);
    }

    public getAllData() {
        return this.allGeos;
    }

    public getAll<T extends Geomtry>(ctor: { new(param: any): T }): T[] {
        const result: T[] = [];
        GeoDocument.getInstance().getAllData().forEach(g => {
            if (g instanceof ctor) {
                result.push(g);
            }
        });
        return result;
    }

    public getGeoById(id: number): Vector2 | Vector3 | Geomtry | undefined {
        this.resetMap();
        if (id < 0) { return; }
        return this._idToGeo.get(id);
    }

    public getGeosById(ids: number[]): Geomtry[] {
        this.resetMap();
        if (ids.length < 1) { return []; }
        const result: any[] = [];
        ids.forEach(id => {
            const geo = this._idToGeo.get(id);
            if (geo) {
                result.push(geo);
            }
        });
        return result;
    }

    public getNextGeoById(id: number): Vector2 | Vector3 | Geomtry | undefined {
        if (id < 0) { return; }

        let idx = this.allGeos.findIndex((e) => {
            if ((e as any).refId === id) {
                return true;
            }
            return false;
        });

        if (idx > -1) {
            idx += 1;
            if (idx >= this.allGeos.length) {
                idx = 0;
            }
            return this.allGeos[idx];
        }

        return this.allGeos[0];
    }

    public getPreGeoById(id: number): Vector2 | Vector3 | Geomtry | undefined {
        if (id < 0) { return; }

        let idx = this.allGeos.findIndex((e) => {
            if ((e as any).refId === id) {
                return true;
            }
            return false;
        });

        if (idx > -1) {
            idx -= 1;
            if (idx < 0) {
                idx = this.allGeos.length - 1;
            }
            return this.allGeos[idx];
        }

        return this.allGeos[0];
    }

    public clear() {
        while (this.allGeos.length > 0) {
            this.allGeos.pop();
        }
        GeoDocEventHandler.getInstance().onGeoClear();
    }

    public undo() {
        if (this.allGeos.length > 0) {
            this.deleteByArrayIdx(this.allGeos.length - 1);
        }
    }

    public redo() {
        if (!this.redoList || this.redoList.length < 1) {
            return;
        }

        const geo = this.redoList.pop();
        if (geo) {
            this.allGeos.push(geo);
            GeoDocEventHandler.getInstance().onGeoAdded([geo]);
        }
    }
}

export { GeoDocument };
