SNESJS = function() {
    this.cpu = new SNESJS.CPU(this);
    this.bus = new SNESJS.Bus(this);
}