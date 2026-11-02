import { OCCTVertex } from './occ_t_vertex';

class OCCTWire {
    public type: string = 'wire';
    constructor(public tag: string, public items: string[], public normal: OCCTVertex) { }
    public pushItem(n: string) {
        this.items.push(n);
    }
    public toJson(): string {
        return `{"data":${JSON.stringify(this.items)},"tag":"${this.tag}","dir":${this.normal.toJson()}}`;
    }
}
export { OCCTWire };
