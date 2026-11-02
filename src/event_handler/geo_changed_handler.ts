import { GeomtryOrVector } from '../ui/geo_document';

interface GeoDocChangedObserver {
    onGeoAdded(geos: GeomtryOrVector[]): void;
    onGeoUpdate(geos: GeomtryOrVector[]): void;
    onGeoDeleted(geos: GeomtryOrVector[]): void;
    onGeoClear(): void;
}

class GeoDocEventHandler {

    // 单例
    public static getInstance() {
        if (!GeoDocEventHandler.instance) {
            GeoDocEventHandler.instance = new GeoDocEventHandler();
        }

        return GeoDocEventHandler.instance;
    }
    private static instance: GeoDocEventHandler;


    private observers: GeoDocChangedObserver[] = [];

    public register(observer: GeoDocChangedObserver) {
        this.observers.push(observer);
    }

    public unregister(observer: GeoDocChangedObserver) {
        const idx = this.observers.findIndex((o) => {
            return o === observer;
        });

        if (idx > 0) {
            this.observers.splice(idx, 1);
        } else {
            console.error('cant find');
        }
    }

    public onGeoAdded(geos: GeomtryOrVector[]) {
        this.observers.forEach(observer => {
            observer.onGeoAdded(geos);
        });
    }

    public onGeoUpdate(geos: GeomtryOrVector[]) {
        this.observers.forEach(observer => {
            observer.onGeoUpdate(geos);
        });
    }


    public onGeoDeleted(geos: GeomtryOrVector[]) {
        this.observers.forEach(observer => {
            observer.onGeoDeleted(geos);
        });
    }

    public onGeoClear() {
        this.observers.forEach(observer => {
            observer.onGeoClear();
        });
    }
}

export { GeoDocChangedObserver, GeoDocEventHandler };
