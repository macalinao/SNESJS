/*
 * This file is part of SNESJS.
 *
 * SNESJS is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SNESJS is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with SNESJS.  If not, see <http://www.gnu.org/licenses/>.
 */

var TBL_EM = 0;
var TBL_MX = 256;
var TBL_Mx = 512;
var TBL_mX = 768;
var TBL_mx = 1024;

var OPCODE_A = 0;
var OPCODE_X = 1;
var OPCODE_Y = 2;
var OPCODE_Z = 3;
var OPCODE_S = 4;
var OPCODE_D = 5;

SNESJS = function() {}

SNESJS.CPU = function(snes) {
	this.snes = snes;

	this.alu = new SNESJS.CPU.ALU();

	this.regs = new SNESJS.CPU.Regs();
	this.aa = new SNESJS.CPU.Reg24();
	this.rd = new SNESJS.CPU.Reg24();
	this.sp = 0;
	this.dp = 0;

	this._cpu_version = 0;

	this.initialize_opcode_table();
}

SNESJS.CPU.prototype.step = function(clocks) {
	snes.smp.clock -= clocks * snes.smp.frequency;
	snes.ppu.clock -= clocks;
	for (var i = 0; i < snes.coprocessors.length; i++) {
		var chip = coprocessors[i];
		chip.clock -= clocks * chip.frequency;
	}
}

SNESJS.CPU.prototype.synchronize_smp = function() {
	while(snes.smp.clock < 0) {
		snes.smp.enter();
	}
}

SNESJS.CPU.prototype.synchronize_ppu = function() {
	while(snes.ppu.clock < 0) {
		snes.ppu.enter();
	}
}

SNESJS.CPU.prototype.synchronize_coprocessors = function() {
	for (var i = 0; i < cpu.coprocessors.length; i++) {
		var chip = cpu.coprocessors[i];
		if (chip.clock < 0) {
			//sync
		}
	}
}

SNESJS.CPU.prototype.synchronize_controllers = function() {

}

SNESJS.CPU.prototype.enter = function() {
	while(true) {
		if (status.nmi_pending) {
			status.nmi_pending = false;
			this.regs.vector = (this.regs.e == false ? 0xffee : 0xfffe);
			this.op_irq();
		}

		if (status.irq_pending) {
			status.irq_pending = false;
			this.regs.vector = (this.regs.e == false ? 0xffee : 0xfffe);
			this.op_irq();
		}

		this.op_step();
	}
}

SNESJS.CPU.prototype.op_step = function() {
	this.optable[this.op_readpc()]();
}

SNESJS.CPU.prototype.cpu_wram_reader = function(addr) {
	return this.wram[addr];
}

SNESJS.CPU.prototype.cpu_wram_writer = function(addr, data) {
	this.cpu.wram[addr] = data;
}

SNESJS.CPU.prototype.enable = function() {
	snes.bus.map
}


SNESJS.CPU.prototype.op_readpc = function() {
	// body...
}