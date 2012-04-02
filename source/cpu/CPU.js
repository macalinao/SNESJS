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

SNESJS.CPU = function(snes) {
	this.snes = snes;

	this.alu = new SNESJS.CPU.ALU();

	this.regs = new SNESJS.CPU.Regs();
	this.aa = new SNESJS.CPU.Reg24();
	this.rd = new SNESJS.CPU.Reg24();
	this.sp = 0;
	this.dp = 0;

	this._cpu_version = 0;

	this.channel = [
	new SNESJS.CPU.Channel(), new SNESJS.CPU.Channel(), new SNESJS.CPU.Channel(), new SNESJS.CPU.Channel(), new SNESJS.CPU.Channel(), new SNESJS.CPU.Channel(), new SNESJS.CPU.Channel(), new SNESJS.CPU.Channel()];

	this.port_data = [0, 0, 0, 0];

	this.this.status = new SNESJS.CPU.this.status();

	this.initialize_opcode_table();
}

SNESJS.CPU.prototype.step = function(clocks) {
	this.snes.smp.clock -= clocks * this.snes.smp.frequency;
	this.snes.ppu.clock -= clocks;
	for (var i = 0; i < snes.coprocessors.length; i++) {
		var chip = coprocessors[i];
		chip.clock -= clocks * chip.frequency;
	}
}

SNESJS.CPU.prototype.synchronize_smp = function() {
	while (this.snes.smp.clock < 0) {
		this.snes.smp.enter();
	}
}

SNESJS.CPU.prototype.synchronize_ppu = function() {
	while (this.snes.ppu.clock < 0) {
		this.snes.ppu.enter();
	}
}

SNESJS.CPU.prototype.synchronize_coprocessors = function() {
	for (var i = 0; i < this.coprocessors.length; i++) {
		var chip = this.coprocessors[i];
		if (chip.clock < 0) {
			//sync
		}
	}
}

SNESJS.CPU.prototype.synchronize_controllers = function() {
	//Sync...
}

SNESJS.CPU.prototype.op_io = function() {
	this.add_clocks(6);
}

SNESJS.CPU.prototype.enter = function() {
	while (true) {
		if (this.status.nmi_pending) {
			this.status.nmi_pending = false;
			this.regs.vector = (this.regs.e == false ? 0xffee : 0xfffe);
			this.op_irq();
		}

		if (this.status.irq_pending) {
			this.status.irq_pending = false;
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
	/*
	function <uint8(unsigned) > read( & CPU::mmio_read, (CPU * ) & cpu);

	function <void(unsigned, uint8) > write( & CPU::mmio_write, (CPU * ) & cpu);

	bus.map(Bus::MapMode::Direct, 0x00, 0x3f, 0x2140, 0x2183, read, write);
	bus.map(Bus::MapMode::Direct, 0x80, 0xbf, 0x2140, 0x2183, read, write);

	bus.map(Bus::MapMode::Direct, 0x00, 0x3f, 0x4016, 0x4017, read, write);
	bus.map(Bus::MapMode::Direct, 0x80, 0xbf, 0x4016, 0x4017, read, write);

	bus.map(Bus::MapMode::Direct, 0x00, 0x3f, 0x4200, 0x421f, read, write);
	bus.map(Bus::MapMode::Direct, 0x80, 0xbf, 0x4200, 0x421f, read, write);

	bus.map(Bus::MapMode::Direct, 0x00, 0x3f, 0x4300, 0x437f, read, write);
	bus.map(Bus::MapMode::Direct, 0x80, 0xbf, 0x4300, 0x437f, read, write);

	read = function <uint8(unsigned) > (cpu_wram_reader);
	write = function <void(unsigned, uint8) > (cpu_wram_writer);

	bus.map(Bus::MapMode::Linear, 0x00, 0x3f, 0x0000, 0x1fff, read, write, 0x000000, 0x002000);
	bus.map(Bus::MapMode::Linear, 0x80, 0xbf, 0x0000, 0x1fff, read, write, 0x000000, 0x002000);
	bus.map(Bus::MapMode::Linear, 0x7e, 0x7f, 0x0000, 0xffff, read, write);
	*/
}

SNESJS.CPU.prototype.power = function() {
	this.regs.a = 0x0000;
	this.regs.x = 0x0000;
	this.regs.y = 0x0000;
	this.regs.s = 0x01ff;

	this.reset();
}

SNESJS.CPU.prototype.reset = function() {
	this.snes.processor.create(Enter, this.snes.system.cpu_frequency);
	this.snes.coprocessors.reset();
	this.snes.ppucounter.reset();

	this.regs.pc = 0x000000;
	this.regs.x.h = 0x00;
	this.regs.y.h = 0x00;
	this.regs.s.h = 0x01;
	this.regs.d = 0x0000;
	this.regs.db = 0x00;
	this.regs.p = 0x34;
	this.regs.e = 1;
	this.regs.mdr = 0x00;
	this.regs.wai = false;
	update_table();

	this.regs.pc.l = bus.read(0xfffc);
	this.regs.pc.h = bus.read(0xfffd);
	this.regs.pc.b = 0x00;

	this.status.nmi_valid = false;
	this.status.nmi_line = false;
	this.status.nmi_transition = false;
	this.status.nmi_pending = false;

	this.status.irq_valid = false;
	this.status.irq_line = false;
	this.status.irq_transition = false;
	this.status.irq_pending = false;

	this.status.irq_lock = false;
	this.status.hdma_pending = false;

	this.status.wram_addr = 0x000000;

	this.status.joypad_strobe_latch = 0;

	this.status.nmi_enabled = false;
	this.status.virq_enabled = false;
	this.status.hirq_enabled = false;
	this.status.auto_joypad_poll_enabled = false;

	this.status.pio = 0xff;

	this.status.htime = 0x0000;
	this.status.vtime = 0x0000;

	this.status.rom_speed = 8;

	this.status.joy1l = this.status.joy1h = 0x00;
	this.status.joy2l = this.status.joy2h = 0x00;
	this.status.joy3l = this.status.joy3h = 0x00;
	this.status.joy4l = this.status.joy4h = 0x00;

	this.dma_reset();
}
