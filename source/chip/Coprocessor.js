SNESJS.Coprocessor = function(snes) {
	this.snes = snes;
}

SNESJS.Coprocessor.prototype.step = function(clocks) {
	clock += clocks * snes.cpu.frequency;
}

SNESJS.Coprocessor.synchronize_cpu = function() {
}