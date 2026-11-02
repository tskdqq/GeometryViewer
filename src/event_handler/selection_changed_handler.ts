interface SelectionChangedObserver {
    onSelectAdded(geoIds: number[]): void;
    onSelectDeleted(geoIds: number[]): void;
    onSelectClear(): void;
}

class SelectionChangedHandler {

    // 单例
    public static getInstance() {
        if (!SelectionChangedHandler.instance) {
            SelectionChangedHandler.instance = new SelectionChangedHandler();
        }

        return SelectionChangedHandler.instance;
    }
    private static instance: SelectionChangedHandler;


    private observers: SelectionChangedObserver[] = [];

    public register(observer: SelectionChangedObserver) {
        this.observers.push(observer);
    }

    public unregister(observer: SelectionChangedObserver) {
        const idx = this.observers.findIndex((o) => {
            return o === observer;
        });

        if (idx > 0) {
            this.observers.splice(idx, 1);
        } else {
            console.error('cant find');
        }
    }

    public onSelectAdded(geoIds: number[]) {
        this.observers.forEach(observer => {
            observer.onSelectAdded(geoIds);
        });
    }


    public onSelectDeleted(geoIds: number[]) {
        this.observers.forEach(observer => {
            observer.onSelectDeleted(geoIds);
        });
    }

    public onSelectClear() {
        this.observers.forEach(observer => {
            observer.onSelectClear();
        });
    }
}

export { SelectionChangedObserver, SelectionChangedHandler };
