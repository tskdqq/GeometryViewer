class OCCTEdge {
    public type: string = 'edge';
    constructor(public tag: string, public items: number[]) { }
    public pushItem(n: number) {
        this.items.push(n);
    }
    public toJson(): string {
        return `{"data":${JSON.stringify(this.items)},"tag":"${this.tag}"}`;
    }
}
export { OCCTEdge };
