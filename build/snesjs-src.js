//SNESJS by simplyianm

SNESJS = function() {
    this.cpu = new SNESJS.CPU(this);
    this.bus = new SNESJS.Bus(this);
}
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

var PORT_1 = 0;
var PORT_2 = 1;

var DEVICE_NONE = 0;
var DEVICE_JOYPAD = 1;
var DEVICE_MULTITAP = 2;
var DEVICE_MOUSE = 3;
var DEVICE_SUPERSCOPE = 4;
var DEVICE_JUSTIFIER = 5;
var DEVICE_JUSTIFIERS = 6;

var JOYPAD_B = 1 << 0;
var JOYPAD_Y = 1 << 1;
var JOYPAD_SELECT = 1 << 2;
var JOYPAD_START = 1 << 3;
var JOYPAD_UP = 1 << 4;
var JOYPAD_DOWN = 1 << 5;
var JOYPAD_LEFT = 1 << 6;
var JOYPAD_RIGHT = 1 << 7;
var JOYPAD_A = 1 << 8;
var JOYPAD_X = 1 << 9;
var JOYPAD_L = 1 << 10;
var JOYPAD_R = 1 << 11;

var MOUSE_X = 1 << 0;
var MOUSE_Y = 1 << 1;
var MOUSE_LEFT = 1 << 2;
var MOUSE_RIGHT = 1 << 3;

var SUPERSCOPE_X = 1 << 0;
var SUPERSCOPE_Y = 1 << 1;
var SUPERSCOPE_TRIGGER = 1 << 2;
var SUPERSCOPE_CURSOR = 1 << 3;
var SUPERSCOPE_TURBO = 1 << 4;
var SUPERSCOPE_PAUSE = 1 << 5;

var JUSTIFIER_X = 1 << 0;
var JUSTIFIER_Y = 1 << 1;
var JUSTIFIER_TRIGGER = 1 << 2;
var JUSTIFIER_START = 1 << 3;

var REGION_NTSC = 0;
var REGION_PAL = 1;

var MEMORYTYPE_RAM = 0;
var MEMORYTYPE_RTC = 1;
var MEMORYTYPE_BSXRAM = 2;
var MEMORYTYPE_BSXPRAM = 3;
var MEMORYTYPE_SUFAMITURBOARAM = 4;
var MEMORYTYPE_SUFAMITURBOBRAM = 5;
var MEMORYTYPE_GAMEBOYRAM = 6;
var MEMORYTYPE_GAMEBOYRTC = 7;

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

	this.status = new SNESJS.CPU.Status();

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

	this.regs.pc.d = 0x000000;
	this.regs.x.h = 0x00;
	this.regs.y.h = 0x00;
	this.regs.s.h = 0x01;
	this.regs.d.w = 0x0000;
	this.regs.db = 0x00;
	this.regs.p.assign(0x34);
	this.regs.e = 1;
	this.regs.mdr = 0x00;
	this.regs.wai = false;
	update_table();

	this.regs.pc.l = this.snes.bus.read(0xfffc);
	this.regs.pc.h = this.snes.bus.read(0xfffd);
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

SNESJS.CPU.ALU = function() {
	this.mpyctr = 0;
	this.divctr = 0;
	this.shift = 0;
}
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

SNESJS.CPU.Channel = function() {
      this.dma_enabled = false;
      this.hdma_enabled = false;

      this.direction = false;
      this.indirect = false;
      this.unused = false;
      this.reverse_transfer = false;
      this.fixed_transfer = false;
      this.transfer_mode = 0;

      this.dest_addr = 0;
      this.source_addr = 0;
      this.source_bank = 0;

      this.union = new SNESJS.CPU.Channel.Union();

      this.indirect_bank = 0;
      this.hdma_addr = 0;
      this.line_counter = 0;
      this.unknown = 0;

      this.hdma_completed = false;
      this.hdma_do_transfer = false;
}

SNESJS.CPU.Channel.Union = function() {
      this.transfer_size = 0;
      this.indirect_addr = 0;
}
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

SNESJS.CPU.prototype.op_io_irq = function() {
	if (interrupt_pending()) {
		//modify I/O cycle to bus read cycle, do not increment PC
		this.op_read(this.regs.pc.d);
	} else {
		this.op_io();
	}
}

SNESJS.CPU.prototype.op_io_cond2 = function() {
	if (this.regs.d.l != 0x00) {
		this.op_io();
	}
}

SNESJS.CPU.prototype.op_io_cond4 = function(x, y) {
	if (!this.regs.p.x || (x & 0xff00) != (y & 0xff00)) {
		this.op_io();
	}
}

SNESJS.CPU.prototype.op_io_cond6 = function(addr) {
	if (this.regs.e && (this.regs.pc.w & 0xff00) != (addr & 0xff00)) {
		this.op_io();
	}
}

SNESJS.CPU.prototype.op_irq = function() {
  this.op_read(this.regs.pc.d);
  this.op_io();

  if(!this.regs.e) {
  	this.op_writestack(this.regs.pc.b);
  }

  this.op_writestack(this.regs.pc.h);
  this.op_writestack(this.regs.pc.l);
  this.op_writestack(this.regs.e ? (this.regs.p & ~0x10) : this.regs.p);
  this.rd.l = this.op_read(this.regs.vector + 0);
  this.regs.pc.b = 0x00;
  this.regs.p.i  = 1;
  this.regs.p.d  = 0;
  this.rd.h = this.op_read(this.regs.vector + 1);
  this.regs.pc.w = this.rd.w;
}

SNESJS.CPU.prototype.opcode_length = function(){
	var op, len;

	op = this.dreadb(this.regs.pc.d);
	len = SNESJS.CPU.OPS._op_len_tbl[op];
	if (len == 5) {
		return (this.regs.e || this.regs.p.m) ? 2 : 3;
	}
	if (len == 6) {
		return (this.regs.e || this.regs.p.x) ? 2 : 3;
	}
	return len;
}
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

SNESJS.CPU.prototype.initialize_opcode_table = function() {
	/*
	 * Register all ops!
	 */
	this.opEII(0x00, "interrupt", 0xfffe, 0xffe6);
	this.opMF(0x01, "read_idpx", "ora");
	this.opEII(0x02, "interrupt", 0xfff4, 0xffe4);
	this.opMF(0x03, "read_sr", "ora");
	this.opMF(0x04, "adjust_dp", "tsb");
	this.opMF(0x05, "read_dp", "ora");
	this.opMF(0x06, "adjust_dp", "asl");
	this.opMF(0x07, "read_ildp", "ora");
	this.opA(0x08, "php");
	this.opMF(0x09, "read_const", "ora");
	this.opM(0x0a, "asl_imm");
	this.opE(0x0b, "phd");
	this.opMF(0x0c, "adjust_addr", "tsb");
	this.opMF(0x0d, "read_addr", "ora");
	this.opMF(0x0e, "adjust_addr", "asl");
	this.opMF(0x0f, "read_long", "ora");
	this.opAII(0x10, "branch", 0x80, 0x00);
	this.opMF(0x11, "read_idpy", "ora");
	this.opMF(0x12, "read_idp", "ora");
	this.opMF(0x13, "read_isry", "ora");
	this.opMF(0x14, "adjust_dp", "trb");
	this.opMFI(0x15, "read_dpr", "ora", OPCODE_X);
	this.opMF(0x16, "adjust_dpx", "asl");
	this.opMF(0x17, "read_ildpy", "ora");
	this.opAII(0x18, "flag", 0x01, 0x00);
	this.opMF(0x19, "read_addry", "ora");
	this.opMII(0x1a, "adjust_imm", OPCODE_A, 1);
	this.opE(0x1b, "tcs");
	this.opMF(0x1c, "adjust_addr", "trb");
	this.opMF(0x1d, "read_addrx", "ora");
	this.opMF(0x1e, "adjust_addrx", "asl");
	this.opMF(0x1f, "read_longx", "ora");
	this.opA(0x20, "jsr_addr");
	this.opMF(0x21, "read_idpx", "and");
	this.opE(0x22, "jsr_long");
	this.opMF(0x23, "read_sr", "and");
	this.opMF(0x24, "read_dp", "bit");
	this.opMF(0x25, "read_dp", "and");
	this.opMF(0x26, "adjust_dp", "rol");
	this.opMF(0x27, "read_ildp", "and");
	this.opE(0x28, "plp");
	this.opMF(0x29, "read_const", "and");
	this.opM(0x2a, "rol_imm");
	this.opE(0x2b, "pld");
	this.opMF(0x2c, "read_addr", "bit");
	this.opMF(0x2d, "read_addr", "and");
	this.opMF(0x2e, "adjust_addr", "rol");
	this.opMF(0x2f, "read_long", "and");
	this.opAII(0x30, "branch", 0x80, 1);
	this.opMF(0x31, "read_idpy", "and");
	this.opMF(0x32, "read_idp", "and");
	this.opMF(0x33, "read_isry", "and");
	this.opMFI(0x34, "read_dpr", "bit", OPCODE_X);
	this.opMFI(0x35, "read_dpr", "and", OPCODE_X);
	this.opMF(0x36, "adjust_dpx", "rol");
	this.opMF(0x37, "read_ildpy", "and");
	this.opAII(0x38, "flag", 0x01, 0x01);
	this.opMF(0x39, "read_addry", "and");
	this.opMII(0x3a, "adjust_imm", OPCODE_A, -1);
	this.opAII(0x3b, "transfer_w", OPCODE_S, OPCODE_A);
	this.opMF(0x3c, "read_addrx", "bit");
	this.opMF(0x3d, "read_addrx", "and");
	this.opMF(0x3e, "adjust_addrx", "rol");
	this.opMF(0x3f, "read_longx", "and");
	this.opE(0x40, "rti");
	this.opMF(0x41, "read_idpx", "eor");
	this.opA(0x42, "wdm");
	this.opMF(0x43, "read_sr", "eor");
	this.opXI(0x44, "move", -1);
	this.opMF(0x45, "read_dp", "eor");
	this.opMF(0x46, "adjust_dp", "lsr");
	this.opMF(0x47, "read_ildp", "eor");
	this.opMI(0x48, "push", OPCODE_A);
	this.opMF(0x49, "read_const", "eor");
	this.opM(0x4a, "lsr_imm");
	this.opA(0x4b, "phk");
	this.opA(0x4c, "jmp_addr");
	this.opMF(0x4d, "read_addr", "eor");
	this.opMF(0x4e, "adjust_addr", "lsr");
	this.opMF(0x4f, "read_long", "eor");
	this.opAII(0x50, "branch", 0x40, 0);
	this.opMF(0x51, "read_idpy", "eor");
	this.opMF(0x52, "read_idp", "eor");
	this.opMF(0x53, "read_isry", "eor");
	this.opXI(0x54, "move", +1);
	this.opMFI(0x55, "read_dpr", "eor", OPCODE_X);
	this.opMF(0x56, "adjust_dpx", "lsr");
	this.opMF(0x57, "read_ildpy", "eor");
	this.opAII(0x58, "flag", 0x04, 0x00);
	this.opMF(0x59, "read_addry", "eor");
	this.opXI(0x5a, "push", OPCODE_Y);
	this.opAII(0x5b, "transfer_w", OPCODE_A, OPCODE_D);
	this.opA(0x5c, "jmp_long");
	this.opMF(0x5d, "read_addrx", "eor");
	this.opMF(0x5e, "adjust_addrx", "lsr");
	this.opMF(0x5f, "read_longx", "eor");
	this.opA(0x60, "rts");
	this.opMF(0x61, "read_idpx", "adc");
	this.opE(0x62, "per");
	this.opMF(0x63, "read_sr", "adc");
	this.opMI(0x64, "write_dp", OPCODE_Z);
	this.opMF(0x65, "read_dp", "adc");
	this.opMF(0x66, "adjust_dp", "ror");
	this.opMF(0x67, "read_ildp", "adc");
	this.opMI(0x68, "pull", OPCODE_A);
	this.opMF(0x69, "read_const", "adc");
	this.opM(0x6a, "ror_imm");
	this.opE(0x6b, "rtl");
	this.opA(0x6c, "jmp_iaddr");
	this.opMF(0x6d, "read_addr", "adc");
	this.opMF(0x6e, "adjust_addr", "ror");
	this.opMF(0x6f, "read_long", "adc");
	this.opAII(0x70, "branch", 0x40, 1);
	this.opMF(0x71, "read_idpy", "adc");
	this.opMF(0x72, "read_idp", "adc");
	this.opMF(0x73, "read_isry", "adc");
	this.opMII(0x74, "write_dpr", OPCODE_Z, OPCODE_X);
	this.opMFI(0x75, "read_dpr", "adc", OPCODE_X);
	this.opMF(0x76, "adjust_dpx", "ror");
	this.opMF(0x77, "read_ildpy", "adc");
	this.opAII(0x78, "flag", 0x04, 0x04);
	this.opMF(0x79, "read_addry", "adc");
	this.opXI(0x7a, "pull", OPCODE_Y);
	this.opAII(0x7b, "transfer_w", OPCODE_D, OPCODE_A);
	this.opA(0x7c, "jmp_iaddrx");
	this.opMF(0x7d, "read_addrx", "adc");
	this.opMF(0x7e, "adjust_addrx", "ror");
	this.opMF(0x7f, "read_longx", "adc");
	this.opA(0x80, "bra");
	this.opM(0x81, "sta_idpx");
	this.opA(0x82, "brl");
	this.opM(0x83, "sta_sr");
	this.opXI(0x84, "write_dp", OPCODE_Y);
	this.opMI(0x85, "write_dp", OPCODE_A);
	this.opXI(0x86, "write_dp", OPCODE_X);
	this.opM(0x87, "sta_ildp");
	this.opXII(0x88, "adjust_imm", OPCODE_Y, -1);
	this.opM(0x89, "read_bit_const");
	this.opMII(0x8a, "transfer", OPCODE_X, OPCODE_A);
	this.opA(0x8b, "phb");
	this.opXI(0x8c, "write_addr", OPCODE_Y);
	this.opMI(0x8d, "write_addr", OPCODE_A);
	this.opXI(0x8e, "write_addr", OPCODE_X);
	this.opMI(0x8f, "write_longr", OPCODE_Z);
	this.opAII(0x90, "branch", 0x01, 0);
	this.opM(0x91, "sta_idpy");
	this.opM(0x92, "sta_idp");
	this.opM(0x93, "sta_isry");
	this.opXII(0x94, "write_dpr", OPCODE_Y, OPCODE_X);
	this.opMII(0x95, "write_dpr", OPCODE_A, OPCODE_X);
	this.opXII(0x96, "write_dpr", OPCODE_X, OPCODE_Y);
	this.opM(0x97, "sta_ildpy");
	this.opMII(0x98, "transfer", OPCODE_Y, OPCODE_A);
	this.opMII(0x99, "write_addrr", OPCODE_A, OPCODE_Y);
	this.opE(0x9a, "txs");
	this.opXII(0x9b, "transfer", OPCODE_X, OPCODE_Y);
	this.opMI(0x9c, "write_addr", OPCODE_Z);
	this.opMII(0x9d, "write_addrr", OPCODE_A, OPCODE_X);
	this.opMII(0x9e, "write_addrr", OPCODE_Z, OPCODE_X);
	this.opMI(0x9f, "write_longr", OPCODE_X);
	this.opXF(0xa0, "read_const", "ldy");
	this.opMF(0xa1, "read_idpx", "lda");
	this.opXF(0xa2, "read_const", "ldx");
	this.opMF(0xa3, "read_sr", "lda");
	this.opXF(0xa4, "read_dp", "ldy");
	this.opMF(0xa5, "read_dp", "lda");
	this.opXF(0xa6, "read_dp", "ldx");
	this.opMF(0xa7, "read_ildp", "lda");
	this.opXII(0xa8, "transfer", OPCODE_A, OPCODE_Y);
	this.opMF(0xa9, "read_const", "lda");
	this.opXII(0xaa, "transfer", OPCODE_A, OPCODE_X);
	this.opA(0xab, "plb");
	this.opXF(0xac, "read_addr", "ldy");
	this.opMF(0xad, "read_addr", "lda");
	this.opXF(0xae, "read_addr", "ldx");
	this.opMF(0xaf, "read_long", "lda");
	this.opAII(0xb0, "branch", 0x01, 1);
	this.opMF(0xb1, "read_idpy", "lda");
	this.opMF(0xb2, "read_idp", "lda");
	this.opMF(0xb3, "read_isry", "lda");
	this.opXFI(0xb4, "read_dpr", "ldy", OPCODE_X);
	this.opMFI(0xb5, "read_dpr", "lda", OPCODE_X);
	this.opXFI(0xb6, "read_dpr", "ldx", OPCODE_Y);
	this.opMF(0xb7, "read_ildpy", "lda");
	this.opAII(0xb8, "flag", 0x40, 0x00);
	this.opMF(0xb9, "read_addry", "lda");
	this.opX(0xba, "tsx");
	this.opXII(0xbb, "transfer", OPCODE_Y, OPCODE_X);
	this.opXF(0xbc, "read_addrx", "ldy");
	this.opMF(0xbd, "read_addrx", "lda");
	this.opXF(0xbe, "read_addry", "ldx");
	this.opMF(0xbf, "read_longx", "lda");
	this.opXF(0xc0, "read_const", "cpy");
	this.opMF(0xc1, "read_idpx", "cmp");
	this.opEI(0xc2, "pflag", 0);
	this.opMF(0xc3, "read_sr", "cmp");
	this.opXF(0xc4, "read_dp", "cpy");
	this.opMF(0xc5, "read_dp", "cmp");
	this.opMF(0xc6, "adjust_dp", "dec");
	this.opMF(0xc7, "read_ildp", "cmp");
	this.opXII(0xc8, "adjust_imm", OPCODE_Y, +1);
	this.opMF(0xc9, "read_const", "cmp");
	this.opXII(0xca, "adjust_imm", OPCODE_X, -1);
	this.opA(0xcb, "wai");
	this.opXF(0xcc, "read_addr", "cpy");
	this.opMF(0xcd, "read_addr", "cmp");
	this.opMF(0xce, "adjust_addr", "dec");
	this.opMF(0xcf, "read_long", "cmp");
	this.opAII(0xd0, "branch", 0x02, 0);
	this.opMF(0xd1, "read_idpy", "cmp");
	this.opMF(0xd2, "read_idp", "cmp");
	this.opMF(0xd3, "read_isry", "cmp");
	this.opE(0xd4, "pei");
	this.opMFI(0xd5, "read_dpr", "cmp", OPCODE_X);
	this.opMF(0xd6, "adjust_dpx", "dec");
	this.opMF(0xd7, "read_ildpy", "cmp");
	this.opAII(0xd8, "flag", 0x08, 0x00);
	this.opMF(0xd9, "read_addry", "cmp");
	this.opXI(0xda, "push", OPCODE_X);
	this.opA(0xdb, "stp");
	this.opA(0xdc, "jmp_iladdr");
	this.opMF(0xdd, "read_addrx", "cmp");
	this.opMF(0xde, "adjust_addrx", "dec");
	this.opMF(0xdf, "read_longx", "cmp");
	this.opXF(0xe0, "read_const", "cpx");
	this.opMF(0xe1, "read_idpx", "sbc");
	this.opEI(0xe2, "pflag", 1);
	this.opMF(0xe3, "read_sr", "sbc");
	this.opXF(0xe4, "read_dp", "cpx");
	this.opMF(0xe5, "read_dp", "sbc");
	this.opMF(0xe6, "adjust_dp", "inc");
	this.opMF(0xe7, "read_ildp", "sbc");
	this.opXII(0xe8, "adjust_imm", OPCODE_X, +1);
	this.opMF(0xe9, "read_const", "sbc");
	this.opA(0xea, "nop");
	this.opA(0xeb, "xba");
	this.opXF(0xec, "read_addr", "cpx");
	this.opMF(0xed, "read_addr", "sbc");
	this.opMF(0xee, "adjust_addr", "inc");
	this.opMF(0xef, "read_long", "sbc");
	this.opAII(0xf0, "branch", 0x02, 1);
	this.opMF(0xf1, "read_idpy", "sbc");
	this.opMF(0xf2, "read_idp", "sbc");
	this.opMF(0xf3, "read_isry", "sbc");
	this.opE(0xf4, "pea");
	this.opMFI(0xf5, "read_dpr", "sbc", OPCODE_X);
	this.opMF(0xf6, "adjust_dpx", "inc");
	this.opMF(0xf7, "read_ildpy", "sbc");
	this.opAII(0xf8, "flag", 0x08, 0x08);
	this.opMF(0xf9, "read_addry", "sbc");
	this.opXI(0xfa, "pull", OPCODE_X);
	this.opA(0xfb, "xce");
	this.opE(0xfc, "jsr_iaddrx");
	this.opMF(0xfd, "read_addrx", "sbc");
	this.opMF(0xfe, "adjust_addrx", "inc");
	this.opMF(0xff, "read_longx", "sbc");
}

SNESJS.CPU.prototype.optable = [];

/*
 * Op registration helpers
 */

//All modes
SNESJS.CPU.prototype.opA = function(id, name) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name);

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func1(cpu);
	};
}

//All modes, 2 args
SNESJS.CPU.prototype.opAII = function(id, name, x, y) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name);

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func1(cpu, x, y);
	};
}

//Different on emulation mode
SNESJS.CPU.prototype.opE = function(id, name) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_e");

	this.optable[TBL_EM + id] = function() {
		func1(cpu);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_n");

	this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu);
	};
}

//Different on emulation mode, 1 arg
SNESJS.CPU.prototype.opEI = function(id, name, x) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_e");

	this.optable[TBL_EM + id] = function() {
		func1(cpu, x);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_n");

	this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, x);
	};
}

//Different on emulation mode, 2 args
SNESJS.CPU.prototype.opEII = function(id, name, x, y) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_e");

	this.optable[TBL_EM + id] = function() {
		func1(cpu, x, y);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_n");

	this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, x, y);
	};
}

//Different on memory mode
SNESJS.CPU.prototype.opM = function(id, name) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = function() {
		func1(cpu);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");

	this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu);
	};
}

//Different on memory mode, 1 arg
SNESJS.CPU.prototype.opMI = function(id, name, x) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = function() {
		func1(cpu, x);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");

	this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, x);
	};
}

//Different on memory mode, 2 args
SNESJS.CPU.prototype.opMII = function(id, name, x, y) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = function() {
		func1(cpu, x, y);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");

	this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, x, y);
	};
}

//Different on memory mode, accepts a function
SNESJS.CPU.prototype.opMF = function(id, name, fn) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");
	var func1_a = getFunctionByName("SNESJS.CPU.OPS." + fn + "_b");

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = function() {
		func1(cpu, func1_a);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");
	var func2_a = getFunctionByName("SNESJS.CPU.OPS." + fn + "_w");

	this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, func2_a);
	};
}

//Different on memory mode, accepts a function, 1 arg
SNESJS.CPU.prototype.opMFI = function(id, name, fn, x) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");
	var func1_a = getFunctionByName("SNESJS.CPU.OPS." + fn + "_b");

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_Mx + id] = function() {
		func1(cpu, func1_a, x);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");
	var func2_a = getFunctionByName("SNESJS.CPU.OPS." + fn + "_w");

	this.optable[TBL_mX + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, func2_a, x);
	};
}

//Different on register width
SNESJS.CPU.prototype.opX = function(id, name) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_mX + id] = function() {
		func1(cpu);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");

	this.optable[TBL_Mx + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu);
	};
}

//Different on register width, 1 arg
SNESJS.CPU.prototype.opXI = function(id, name, x) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_mX + id] = function() {
		func1(cpu, x);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");

	this.optable[TBL_Mx + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, x);
	};
}

SNESJS.CPU.prototype.opXII = function(id, name, x, y) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_mX + id] = function() {
		func1(cpu, x, y);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");

	this.optable[TBL_Mx + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, x, y);
	};
}

//Different on register width, accepts a function
SNESJS.CPU.prototype.opXF = function(id, name, fn) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");
	var func1_a = getFunctionByName("SNESJS.CPU.OPS." + fn);

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_mX + id] = function() {
		func1(cpu, func1_a);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");
	var func2_a = getFunctionByName("SNESJS.CPU.OPS." + fn);

	this.optable[TBL_Mx + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, func2_a);
	};
}

//Different on register width, accepts a function, 1 arg
SNESJS.CPU.prototype.opXFI = function(id, name, fn, x) {
	var cpu = this;
	var func1 = getFunctionByName("SNESJS.CPU.OPS." + name + "_b");
	var func1_a = getFunctionByName("SNESJS.CPU.OPS." + fn);

	this.optable[TBL_EM + id] = this.optable[TBL_MX + id] = this.optable[TBL_mX + id] = function() {
		func1(cpu, func1_a, x);
	};

	var func2 = getFunctionByName("SNESJS.CPU.OPS." + name + "_w");
	var func2_a = getFunctionByName("SNESJS.CPU.OPS." + fn);

	this.optable[TBL_Mx + id] = this.optable[TBL_mx + id] = function() {
		func2(cpu, func2_a, x);
	};
}

SNESJS.CPU.OPS._op_len_tbl = [
//0, 1, 2, 3, 4, 5, 6, 7, 8, 9, a, b, c, d, e, f
2, 2, 2, 2, 2, 2, 2, 2, 1, 5, 1, 1, 3, 3, 3, 4, //0x0n
2, 2, 2, 2, 2, 2, 2, 2, 1, 3, 1, 1, 3, 3, 3, 4, //0x1n
3, 2, 4, 2, 2, 2, 2, 2, 1, 5, 1, 1, 3, 3, 3, 4, //0x2n
2, 2, 2, 2, 2, 2, 2, 2, 1, 3, 1, 1, 3, 3, 3, 4, //0x3n
1, 2, 2, 2, 3, 2, 2, 2, 1, 5, 1, 1, 3, 3, 3, 4, //0x4n
2, 2, 2, 2, 3, 2, 2, 2, 1, 3, 1, 1, 4, 3, 3, 4, //0x5n
1, 2, 3, 2, 2, 2, 2, 2, 1, 5, 1, 1, 3, 3, 3, 4, //0x6n
2, 2, 2, 2, 2, 2, 2, 2, 1, 3, 1, 1, 3, 3, 3, 4, //0x7n
2, 2, 3, 2, 2, 2, 2, 2, 1, 5, 1, 1, 3, 3, 3, 4, //0x8n
2, 2, 2, 2, 2, 2, 2, 2, 1, 3, 1, 1, 3, 3, 3, 4, //0x9n
6, 2, 6, 2, 2, 2, 2, 2, 1, 5, 1, 1, 3, 3, 3, 4, //0xan
2, 2, 2, 2, 2, 2, 2, 2, 1, 3, 1, 1, 3, 3, 3, 4, //0xbn
6, 2, 2, 2, 2, 2, 2, 2, 1, 5, 1, 1, 3, 3, 3, 4, //0xcn
2, 2, 2, 2, 2, 2, 2, 2, 1, 3, 1, 1, 3, 3, 3, 4, //0xdn
6, 2, 2, 2, 2, 2, 2, 2, 1, 5, 1, 1, 3, 3, 3, 4, //0xen
2, 2, 2, 2, 3, 2, 2, 2, 1, 3, 1, 1, 3, 3, 3, 4 //0xfn
];

SNESJS.CPU.OPS = {
	// Misc ops
	nop: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();
	},

	wdm: function(cpu) {
		cpu.last_cycle();
		cpu.op_readpc();
	},

	xba: function(cpu) {
		cpu.op_io();
		cpu.last_cycle();
		cpu.op_io();
		// Swap
		cpu.regs.a.l ^= cpu.regs.a.h;
		cpu.regs.a.h ^= cpu.regs.a.l;
		cpu.regs.a.l ^= cpu.regs.a.h;

		cpu.regs.p.n = (cpu.regs.a.l & 0x80) != 0;
		cpu.regs.p.z = cpu.regs.a.l == 0;
	},

	move_b: function(cpu, adjust) {
		cpu.dp = cpu.op_readpc();
		cpu.sp = cpu.op_readpc();
		cpu.regs.db = cpu.dp;
		cpu.rd.l = cpu.op_readlong((cpu.sp << 16) | regs.x.w);
		cpu.op_writelong((cpu.dp << 16) | cpu.regs.y.w, cpu.rd.l);
		cpu.op_io();
		cpu.regs.x.l += adjust;
		cpu.regs.y.l += adjust;

		cpu.last_cycle();
		cpu.op_io();

		if (cpu.regs.a.w-- != 0) {
			cpu.regs.pc.w -= 3;
		}
	},

	move_w: function(cpu, adjust) {
		cpu.dp = cpu.op_readpc();
		cpu.sp = cpu.op_readpc();
		cpu.regs.db = cpu.dp;
		cpu.rd.l = cpu.op_readlong((cpu.sp << 16) | regs.x.w);
		cpu.op_writelong((cpu.dp << 16) | cpu.regs.y.w, cpu.rd.l);
		cpu.op_io();
		cpu.regs.x.w += adjust;
		cpu.regs.y.w += adjust;

		cpu.last_cycle();
		cpu.op_io();

		if (cpu.regs.a.w-- != 0) {
			cpu.regs.pc.w -= 3;
		}
	},

	interrupt_e: function(cpu, vectorE, vectorN) {
		cpu.op_readpc();

		cpu.op_writestack(cpu.regs.pc.h);
		cpu.op_writestack(cpu.regs.pc.l);
		cpu.op_writestack(cpu.regs.p);

		cpu.rd.l = cpu.op_readlong(vectorE + 0);

		cpu.regs.pc.b = 0;
		cpu.regs.p.i = 1;
		cpu.regs.p.d = 0;

		cpu.last_cycle();
		cpu.rd.h = cpu.op_readlong(vectorE + 1);

		cpu.regs.pc.w = cpu.rd.w;
	},

	interrupt_n: function(cpu, vectorE, vectorN) {
		cpu.op_readpc();

		cpu.op_writestack(cpu.regs.pc.h);
		cpu.op_writestack(cpu.regs.pc.l);
		cpu.op_writestack(cpu.regs.p);

		cpu.rd.l = cpu.op_readlong(vectorN + 0);

		cpu.regs.pc.b = 0;
		cpu.regs.p.i = 1;
		cpu.regs.p.d = 0;

		cpu.last_cycle();
		cpu.rd.h = cpu.op_readlong(vectorN + 1);

		cpu.regs.pc.w = cpu.rd.w;
	},

	stp: function(cpu) {
		cpu.regs.wai = true;
		while (cpu.regs.wai) {
			cpu.last_cycle();
			cpu.op_io();
		}
	},

	xce: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();

		var carry = cpu.regs.p.c;
		cpu.regs.p.c = cpu.regs.e;
		cpu.regs.e = carry;

		if (cpu.regs.e) {
			cpu.regs.p |= 0x30;
			cpu.regs.s.h = 0x01;
		}

		if (regs.p.x) {
			cpu.regs.x.h = 0x00;
			cpu.regs.y.h = 0x00;
		}

		cpu.update_table();
	},

	flag: function(cpu, mask, value) {
		cpu.last_cycle();
		cpu.op_io_irq();

		cpu.regs.p = (cpu.regs.p & ~mask) | value;
	},

	pflag_e: function(cpu, mode) {
		cpu.rd.l = cpu.op_readpc();

		cpu.last_cycle();
		cpu.op_io();

		cpu.regs.p = (mode ? cpu.regs.p | cpu.rd.l : cpu.regs.p & ~cpu.rd.l);
		cpu.regs.p.assign(cpu.regs.p | 0x30);

		if (cpu.regs.p.x) {
			cpu.regs.x.h = 0x00;
			cpu.regs.y.h = 0x00;
		}

		cpu.update_table();
	},

	pflag_n: function(cpu, mode) {
		cpu.rd.l = cpu.op_readpc();

		cpu.last_cycle();
		cpu.op_io();

		cpu.regs.p = (mode ? cpu.regs.p | cpu.rd.l : cpu.regs.p & ~cpu.rd.l);

		if (cpu.regs.p.x) {
			cpu.regs.x.h = 0x00;
			cpu.regs.y.h = 0x00;
		}

		cpu.update_table();
	},

	transfer_b: function(cpu, from, to) {
		cpu.last_cycle();
		cpu.op_io_irq();

		cpu.regs.r[to].l = cpu.regs.r[from].l;
		cpu.regs.p.n = (cpu.regs.r[to].l & 0x8000);
		cpu.regs.p.z = (cpu.regs.r[to].l == 0);
	},

	transfer_w: function(cpu, from, to) {
		cpu.last_cycle();
		cpu.op_io_irq();

		cpu.regs.r[to].w = cpu.regs.r[from].w;
		cpu.regs.p.n = (cpu.regs.r[to].w & 0x8000);
		cpu.regs.p.z = (cpu.regs.r[to].w == 0);
	},

	tcs_e: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();

		cpu.regs.s.l = cpu.regs.a.l;
	},

	tcs_n: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();

		cpu.regs.s.w = cpu.regs.a.w;
	},

	tsx_b: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();

		cpu.regs.x.l = cpu.regs.s.l;
		cpu.regs.p.n = (cpu.regs.x.l & 0x80) != 0;
		cpu.regs.p.z = cpu.regs.x.l == 0;
	},

	tsx_w: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();

		cpu.regs.x.w = cpu.regs.s.w;
		cpu.regs.p.n = (cpu.regs.x.w & 0x80) != 0;
		cpu.regs.p.z = cpu.regs.x.w == 0;
	},

	tsx_e: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();

		cpu.regs.s.l = cpu.regs.x.l;
	},

	tsx_n: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();

		cpu.regs.s.w = cpu.regs.x.w;
	},

	push_b: function(cpu, n) {
		cpu.op_io();

		cpu.last_cycle();
		cpu.op_writestack(cpu.regs.r[n].l);
	},

	push_w: function(cpu, n) {
		cpu.op_io();

		cpu.op_writestack(cpu.regs.r[n].h);

		cpu.last_cycle();
		cpu.op_writestack(cpu.regs.r[n].l);
	},

	phd_e: function(cpu) {
		cpu.op_io();

		cpu.op_writestackn(cpu.regs.d.h);
		cpu.op_writestackn(cpu.regs.d.l);
	},

	phd_n: function(cpu) {
		cpu.op_io();

		cpu.op_writestackn(cpu.regs.d.h);

		cpu.last_cycle();
		cpu.op_writestackn(cpu.regs.d.l);
	},

	phb: function(cpu) {
		cpu.op_io();

		cpu.last_cycle();
		cpu.op_writestack(cpu.regs.db);
	},

	phk: function(cpu) {
		cpu.op_io();

		cpu.last_cycle();
		cpu.op_writestack(cpu.regs.pc.b);
	},

	php: function(cpu) {
		cpu.op_io();

		cpu.last_cycle();
		cpu.op_writestack(cpu.regs.p);
	},

	pull_b: function(cpu, n) {
		cpu.op_io();
		cpu.op_io();

		cpu.last_cycle();
		cpu.regs.r[n].l = cpu.op_readstack();

		cpu.regs.p.n = (cpu.regs.r[n].l & 0x80) != 0;
		cpu.regs.p.z = (cpu.regs.r[n].l == 0);
	},

	pull_w: function(cpu, n) {
		cpu.op_io();
		cpu.op_io();

		cpu.last_cycle();
		cpu.regs.r[n].l = cpu.op_readstack();

		cpu.regs.p.n = (cpu.regs.r[n].w & 0x8000) != 0;
		cpu.regs.p.z = (cpu.regs.r[n].w == 0);
	},

	pld_e: function(cpu) {
		cpu.op_io();
		cpu.op_io();

		cpu.regs.d.l = cpu.op_readstackn();

		cpu.last_cycle();
		cpu.regs.d.h = cpu.op_readstackn();

		cpu.regs.p.n = (cpu.regs.d.w & 0x8000) != 0;
		cpu.regs.p.z = (cpu.regs.d.w == 0);
		cpu.regs.s.h = 0x01;
	},

	pld_n: function(cpu) {
		cpu.op_io();
		cpu.op_io();

		cpu.regs.d.l = cpu.op_readstackn();

		cpu.last_cycle();
		cpu.regs.d.h = cpu.op_readstackn();

		cpu.regs.p.n = (cpu.regs.d.w & 0x8000) != 0;
		cpu.regs.p.z = (cpu.regs.d.w == 0);
	},

	plb: function(cpu) {
		cpu.op_io();
		cpu.op_io();

		cpu.last_cycle();
		cpu.op_readstack();

		cpu.regs.p.n = (cpu.regs.db & 0x80) != 0;
		cpu.regs.p.z = (cpu.regs.db == 0);
	},

	plp_e: function(cpu) {
		cpu.op_io();
		cpu.op_io();

		cpu.last_cycle();
		cpu.regs.p = cpu.op_readstack() | 0x30;
		if (cpu.regs.p.x) {
			cpu.regs.x.h = 0x00;
			cpu.regs.y.h = 0x00;
		}

		cpu.update_table();
	},

	plp_n: function(cpu) {
		cpu.op_io();
		cpu.op_io();

		cpu.last_cycle();
		cpu.regs.p = cpu.op_readstack();
		if (cpu.regs.p.x) {
			cpu.regs.x.h = 0x00;
			cpu.regs.y.h = 0x00;
		}

		cpu.update_table();
	},

	// PC ops
	branch: function(cpu, bit, val) {
		if ((cpu.regs.p & bit) != val) {
			cpu.last_cycle();
			cpu.rd.l = cpu.op_readpc();
		} else {
			cpu.rd.l = cpu.op_readpc();
			cpu.aa.w = cpu.regs.pc.d + cpu.rd.l;
			cpu.op_io_cond6(cpu.aa.w);
			cpu.last_cycle();
			cpu.op_io();
			cpu.regs.pc.w = cpu.aa.w;
		}
	},

	bra: function(cpu) {
		cpu.rd.l = cpu.op_readpc();
		cpu.aa.w = cpu.regs.pc.d + cpu.rd.l;
		cpu.op_io_cond6(aa.w);
		cpu.last_cycle();
		cpu.op_io();
		cpu.regs.pc.w = cpu.aa.w;
	},

	brl: function(cpu) {
		cpu.rd.l = cpu.op_readpc();
		cpu.rd.h = cpu.op.readpc();
		cpu.last_cycle();
		cpu.op_io();
		cpu.regs.pc.w = cpu.regs.pc.d + cpu.rd.w;
	},

	jmp_addr: function(cpu) {
		cpu.rd.l = cpu.op_readpc();
		cpu.last_cycle();
		cpu.rd.h = cpu.op_readpc();
		cpu.regs.pc.w = cpu.rd.w;
	},

	jmp_long: function(cpu) {
		cpu.rd.l = cpu.op_readpc();
		cpu.rd.h = cpu.op_readpc();
		cpu.last_cycle();
		cpu.rd.b = cpu.op_readpc();
		cpu.regs.pc.d = cpu.rd.d & 0xffffff;
	},

	jmp_iaddr: function(cpu) {
		cpu.aa.l = cpu.op_readpc();
		cpu.aa.h = cpu.op_readpc();
		cpu.rd.l = cpu.op_readaddr(aa.w + 0);
		cpu.last_cycle();
		cpu.rd.h = cpu.op_readaddr(aa.w + 1);
		cpu.regs.pc.w = cpu.rd.w;
	},

	jmp_iaddrx: function(cpu) {
		cpu.aa.l = cpu.op_readpc();
		cpu.aa.h = cpu.op_readpc();
		cpu.op_io();
		cpu.rd.l = cpu.op_readpbr((uint)(aa.w + regs.x.w + 0));
		cpu.last_cycle();
		cpu.rd.h = cpu.op_readpbr((uint)(aa.w + regs.x.w + 1));
		cpu.regs.pc.w = cpu.rd.w;
	},

	jmp_iladdr: function(cpu) {
		cpu.aa.l = cpu.op_readpc();
		cpu.aa.h = cpu.op_readpc();
		cpu.rd.l = cpu.op_readaddr(cpu.aa.w + 0);
		cpu.rd.h = cpu.op_readaddr(cpu.aa.w + 1);
		cpu.last_cycle();
		cpu.rd.b = cpu.op_readaddr(cpu.aa.w + 2);
		cpu.regs.pc.d = cpu.rd.d & 0xffffff;
	},

	jsr_addr: function(cpu) {
		cpu.aa.l = cpu.op_readpc();
		cpu.aa.h = cpu.op_readpc();
		cpu.op_io();
		cpu.regs.pc.w--;
		cpu.op_writestack(cpu.regs.pc.h);
		cpu.last_cycle();
		cpu.op_writestack(cpu.regs.pc.l);
		cpu.regs.pc.w = cpu.aa.w;
	},

	jsr_long_e: function(cpu) {

	},

	jsr_long_n: function(cpu) {

	},

	jsr_iaddrx_e: function(cpu) {

	},

	jsr_iaddrx_n: function(cpu) {

	},

	rti_e: function(cpu) {

	},

	rti_n: function(cpu) {

	},

	rts: function(cpu) {

	},

	rtl_e: function(cpu) {

	},

	rtl_n: function(cpu) {

	},

	nop: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();
	},

	wdm: function(cpu) {
		cpu.last_cycle();
		cpu.op_readpc();
	},

	xba: function(cpu) {
		cpu.op_io();
		cpu.last_cycle();
		cpu.op_io();
		cpu.regs.a.l ^= cpu.regs.a.h;
		cpu.regs.a.h ^= cpu.regs.a.l;
		cpu.regs.a.l ^= cpu.regs.a.h;
		cpu.regs.p.n = (cpu.regs.a.l & 0x80) == 0x80;
		cpu.regs.p.z = (cpu.regs.a.l == 0);
	},

	move_b: function(cpu, adjust) {
		cpu.dp = cpu.op_readpc();
		cpu.sp = cpu.op_readpc();
		cpu.regs.db = cpu.dp;
		cpu.rd.l = cpu.op_readlong((cpu.sp << 16) | cpu.regs.x.w);
		cpu.op_writelong(((cpu.dp << 16) | cpu.regs.y.w), cpu.rd.l);
		cpu.op_io();
		cpu.regs.x.l += adjust;
		cpu.regs.y.l += adjust;
		cpu.last_cycle();
		cpu.op_io();
		if (cpu.regs.a.w-- == 0x01) {
			cpu.regs.pc.w -= 3;
		}
	},

	move_w: function(cpu, adjust) {
		cpu.dp = cpu.op_readpc();
		cpu.sp = cpu.op_readpc();
		cpu.regs.db = cpu.dp;
		cpu.rd.l = cpu.op_readlong((cpu.sp << 16) | cpu.regs.x.w);
		cpu.op_writelong((cpu.dp << 16) | cpu.regs.y.w, cpu.rd.l);
		cpu.op_io();
		cpu.regs.x.w += cpu.adjust;
		cpu.regs.y.w += cpu.adjust;
		cpu.last_cycle();
		cpu.op_io();
		if (regs.a.w-- == 0x01) {
			regs.pc.w -= 3;
		}
	},

	interrupt_e: function(cpu, vectorE, vectorN) {
		cpu.op_readpc();
		cpu.op_writestack(cpu.regs.pc.h);
		cpu.op_writestack(cpu.regs.pc.l);
		cpu.op_writestack(cpu.regs.p);
		cpu.rd.l = cpu.op_readlong(vectorE + 0);
		cpu.regs.pc.b = 0x00;
		cpu.regs.p.i = true;
		cpu.regs.p.d = false;
		cpu.last_cycle();
		cpu.rd.h = cpu.op_readlong(vectorE + 1);
		cpu.regs.pc.w = rd.w;
	},

	interrupt_n: function(cpu, vectorE, vectorN) {
		cpu.op_readpc();
		cpu.op_writestack(cpu.regs.pc.h);
		cpu.op_writestack(cpu.regs.pc.l);
		cpu.op_writestack(cpu.regs.p);
		op_writestack(regs.p);
		cpu.rd.l = cpu.op_readlong(vectorN + 0);
		cpu.regs.pc.b = 0x00;
		cpu.regs.p.i = true;
		cpu.regs.p.d = false;
		cpu.last_cycle();
		cpu.rd.h = cpu.op_readlong(vectorN + 1);
		cpu.regs.pc.w = rd.w;
	},

	stp: function(cpu) {
		cpu.regs.wai = true;
		while (cpu.regs.wai) {
			cpu.last_cycle();
			cpu.op_io();
		}
	},

	wai: function(cpu) {
		cpu.regs.wai = true;
		while (cpu.regs.wai) {
			cpu.last_cycle();
			cpu.op_io();
		}
		cpu.op_io();
	},

	xce: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();
		var carry = cpu.regs.p.c; //Switch c with e
		cpu.regs.p.c = cpu.regs.e;
		cpu.regs.e = carry;
		if (cpu.regs.e) {
			cpu.regs.p.assign(cpu.regs.p | 0x30);
			cpu.regs.s.h = 0x01;
		}
		if (cpu.regs.p.x) {
			cpu.regs.x.h = 0x00;
			cpu.regs.y.h = 0x00;
		}
		cpu.update_table();
	},

	flag: function(cpu, mask, value) {
		cpu.last_cycle();
		cpu.op_io_irq();
		cpu.regs.p.assign((regs.p & ~mask) | value);
	},

	pflag_e: function(cpu, mode) {
		cpu.rd.l = cpu.op_readpc();
		cpu.last_cycle();
		cpu.op_io();
		cpu.regs.p.assign((mode == 0x1) ? cpu.regs.p | cpu.rd.l : cpu.regs.p & ~rd.l);
		cpu.regs.p.assign(cpu.regs.p | 0x30);
		if (cpu.regs.p.x) {
			cpu.regs.x.h = 0x00;
			cpu.regs.y.h = 0x00;
		}
		cpu.update_table();
	},

	pflag_n: function(cpu, mode) {
		cpu.rd.l = cpu.op_readpc();
		cpu.last_cycle();
		cpu.op_io();
		cpu.regs.p.assign((mode == 0x1) ? cpu.regs.p | cpu.rd.l : cpu.regs.p & ~rd.l);
		if (cpu.regs.p.x) {
			cpu.regs.x.h = 0x00;
			cpu.regs.y.h = 0x00;
		}
		cpu.update_table();
	},

	transfer_b: function(cpu, from, to) {
		cpu.last_cycle();
		cpu.op_io_irq();
		cpu.regs.r[to].l = cpu.regs.r[from].l;
		cpu.regs.p.n = (cpu.regs.r[to].l & 0x80) == 0x80;
		cpu.regs.p.z = (cpu.regs.r[to].l == 0);
	},

	transfer_w: function(cpu, from, to) {
		cpu.last_cycle();
		cpu.op_io_irq();
		cpu.regs.r[to].w = cpu.regs.r[from].w;
		cpu.regs.p.n = (regs.r[to].w & 0x8000) == 0x8000;
		cpu.regs.p.z = regs.r[to].w == 0;
	},

	tcs_e: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();
		cpu.regs.s.l = cpu.regs.a.l;
	},

	tcs_n: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();
		cpu.regs.s.w = cpu.regs.a.w;
	},

	tsx_b: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();
		cpu.regs.x.l = cpu.regs.s.l;
		cpu.regs.p.n = (cpu.regs.x.l & 0x80) == 0x80;
		cpu.regs.p.z = cpu.regs.x.l == 0;
	},

	tsx_w: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();
		cpu.regs.x.w = cpu.regs.s.w;
		cpu.regs.p.n = (cpu.regs.x.w & 0x8000) == 0x8000;
		cpu.regs.p.z = cpu.regs.x.w == 0;
	},

	txs_e: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();
		cpu.regs.s.l = cpu.regs.x.l;
	},

	txs_n: function(cpu) {
		cpu.last_cycle();
		cpu.op_io_irq();
		cpu.regs.s.w = cpu.regs.x.w;
	},

	push_b: function(cpu, n) {
		cpu.op_io();
		cpu.last_cycle();
		cpu.op_writestack(cpu.regs.r[n].l);
	},

	push_w: function(cpu, n) {
		cpu.op_io();
		cpu.op_writestack(regs.r[n].h);
		cpu.last_cycle();
		cpu.op_writestack(regs.r[n].l);
	},

	phd_e: function(cpu) {
		cpu.op_io();
		cpu.op_writestackn(cpu.regs.d.h);
		cpu.last_cycle();
		cpu.op_writestackn(cpu.regs.d.l);
		cpu.regs.s.h = 0x01;
	},

	phd_n: function(cpu) {
		cpu.op_io();
		cpu.op_writestackn(cpu.regs.d.h);
		cpu.last_cycle();
		cpu.op_writestackn(cpu.regs.d.l);
	}

};

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

SNESJS.CPU.prototype.dma_transfer_valid = function(bbus, abus) {
  //transfers from WRAM to WRAM are invalid; chip only has one address bus
  return !(bbus == 0x80 && (
  (abus & 0xfe0000) == 0x7e0000 || (abus & 0x40e000) == 0x0000));
}

SNESJS.CPU.prototype.dma_addr_valid = function(abus) {
  //A-bus access to B-bus or S-CPU registers are invalid
  if ((abus & 0x40ff00) == 0x2100) return false; //$[00-3f|80-bf]:[2100-21ff]
  if ((abus & 0x40fe00) == 0x4000) return false; //$[00-3f|80-bf]:[4000-41ff]
  if ((abus & 0x40ffe0) == 0x4200) return false; //$[00-3f|80-bf]:[4200-421f]
  if ((abus & 0x40ff80) == 0x4300) return false; //$[00-3f|80-bf]:[4300-437f]
  return true;
}

SNESJS.CPU.prototype.dma_read = function(abus) {
  if (this.dma_addr_valid(abus) == false) return 0x00;
  return this.snes.bus.read(abus);
}

SNESJS.CPU.prototype.dma_write = function(valid, addr, data) {
  if (valid) {
    this.snes.bus.write(addr, data);
  }
}

SNESJS.CPU.prototype.dma_transfer = function(direction, bbus, abus) {
  if (direction == 0) {
    data = this.dma_read(abus);
    this.add_clocks(8);
    this.dma_write(this.dma_transfer_valid(bbus, abus), 0x2100 | bbus, data);
  } else {
    data = this.dma_transfer_valid(bbus, abus) ? this.snes.bus.read(0x2100 | bbus) : 0x00;
    this.add_clocks(8);
    this.dma_write(this.dma_addr_valid(abus), abus, data);
  }
}

SNESJS.CPU.prototype.dma_bbus = function(i, index) {
  switch (channel[i].transfer_mode) {
    default:
    case 0:
      return (channel[i].dest_addr); //0
    case 1:
      return (channel[i].dest_addr + (index & 1)); //0,1
    case 2:
      return (channel[i].dest_addr); //0,0
    case 3:
      return (channel[i].dest_addr + ((index >> 1) & 1)); //0,0,1,1
    case 4:
      return (channel[i].dest_addr + (index & 3)); //0,1,2,3
    case 5:
      return (channel[i].dest_addr + (index & 1)); //0,1,0,1
    case 6:
      return (channel[i].dest_addr); //0,0     [2]
    case 7:
      return (channel[i].dest_addr + ((index >> 1) & 1)); //0,0,1,1 [3]
  }
}

SNESJS.CPU.prototype.dma_addr = function(i) {
  var result = (channel[i].source_bank << 16) | (channel[i].source_addr);

  if (channel[i].fixed_transfer == false) {
    if (channel[i].reverse_transfer == false) {
      channel[i].source_addr++;
    } else {
      channel[i].source_addr--;
    }
  }

  return result;
}

SNESJS.CPU.prototype.hdma_addr = function(i) {
  return (channel[i].source_bank << 16) | (channel[i].hdma_addr++);
}

SNESJS.CPU.prototype.hdma_iaddr = function(i) {
  return (channel[i].indirect_bank << 16) | (channel[i].indirect_addr++);
}

SNESJS.CPU.prototype.dma_run = function() {
  this.add_clocks(16);

  for (var i = 0; i < 8; i++) {
    if (channel[i].dma_enabled == false) continue;
    this.add_clocks(8);

    var index = 0;
    do {
      dma_transfer(channel[i].direction, this.dma_bbus(i, index++), this.dma_addr(i));
    } while (channel[i].dma_enabled && --channel[i].transfer_size);

    channel[i].dma_enabled = false;
  }

  this.irq_lock = true;
}

SNESJS.CPU.prototype.hdma_active_after = function(i) {
  for (var n = i + 1; i < 8; i++) {
    if (channel[i].hdma_enabled && !channel[i].hdma_completed) return true;
  }
  return false;
}

SNESJS.CPU.prototype.hdma_update = function(i) {
  if ((channel[i].line_counter & 0x7f) == 0) {
    channel[i].line_counter = this.dma_read(hdma_addr(i));
    channel[i].hdma_completed = (channel[i].line_counter == 0);
    channel[i].hdma_do_transfer = !channel[i].hdma_completed;
    this.add_clocks(8);

    if (channel[i].indirect) {
      channel[i].indirect_addr = this.dma_read(this.hdma_addr(i)) << 8;
      this.add_clocks(8);

      //emulating this glitch causes a slight slowdown; only enable if needed
      //if(!channel[i].hdma_completed || hdma_active_after(i)) {
      channel[i].indirect_addr >>= 8;
      channel[i].indirect_addr |= this.dma_read(this.hdma_addr(i)) << 8;
      this.add_clocks(8);
      //}
    }
  }
}

SNESJS.CPU.transfer_length = [1, 2, 2, 4, 4, 4, 2, 4];

SNESJS.CPU.prototype.hdma_run = function() {
  var channels = 0;
  for (var i = 0; i < 8; i++) {
    if (channel[i].hdma_enabled) channels++;
  }
  if (channels == 0) return;

  this.add_clocks(16);
  for (var i = 0; i < 8; i++) {
    if (channel[i].hdma_enabled == false || channel[i].hdma_completed == true) continue;
    channel[i].dma_enabled = false;

    if (channel[i].hdma_do_transfer) {
      var length = transfer_length[channel[i].transfer_mode];
      for (var index = 0; index < length; index++) {
        var addr = channel[i].indirect == false ? hdma_addr(i) : hdma_iaddr(i);
        dma_transfer(channel[i].direction, dma_bbus(i, index), addr);
      }
    }
  }

  for (var i = 0; i < 8; i++) {
    if (channel[i].hdma_enabled == false || channel[i].hdma_completed == true) continue;

    channel[i].line_counter--;
    channel[i].hdma_do_transfer = channel[i].line_counter & 0x80;
    hdma_update(i);
  }

  this.irq_lock = true;
}

SNESJS.CPU.prototype.hdma_init = function() {
  var channels = 0;
  for (var i = 0; i < 8; i++) {
    channel[i].hdma_completed = false;
    channel[i].hdma_do_transfer = false;
    if (channel[i].hdma_enabled) {
      channels++;
    } 
  }
  if (channels == 0) return;

  this.add_clocks(16);
  for (var i = 0; i < 8; i++) {
    if (!channel[i].hdma_enabled) continue;
    channel[i].dma_enabled = false;

    channel[i].hdma_addr = channel[i].source_addr;
    channel[i].line_counter = 0;
    this.hdma_update(i);
  }

  this.irq_lock = true;
}

SNESJS.CPU.prototype.dma_reset = function() {
  for (var i = 0; i < 8; i++) {
    channel[i].dma_enabled = false;
    channel[i].hdma_enabled = false;

    channel[i].direction = 1;
    channel[i].indirect = true;
    channel[i].unused = true;
    channel[i].reverse_transfer = true;
    channel[i].fixed_transfer = true;
    channel[i].transfer_mode = 0x07;

    channel[i].dest_addr = 0xff;
    channel[i].source_addr = 0xffff;
    channel[i].source_bank = 0xff;

    channel[i].transfer_size = 0xffff;
    channel[i].indirect_addr = 0xffff;

    channel[i].indirect_bank = 0xff;
    channel[i].hdma_addr = 0xff;
    channel[i].line_counter = 0xff;
    channel[i].unknown = 0xff;

    channel[i].hdma_completed = false;
    channel[i].hdma_do_transfer = false;
  }
}

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

SNESJS.CPU.prototype.op_readpc = function() {
  return this.op_read((this.regs.pc.b << 16) + this.regs.pc.w++);
}

SNESJS.CPU.prototype.op_readstack = function() {
  this.regs.e ? this.regs.s.l++ : this.regs.s.w++;
  return this.op_read(this.regs.s.w);
}

SNESJS.CPU.prototype.op_readstackn = function() {
  return this.op_read(++this.regs.s.w);
}

SNESJS.CPU.prototype.op_readaddr = function(addr) {
  return this.op_read(addr & 0xffff);
}

SNESJS.CPU.prototype.op_readlong = function(addr) {
  return this.op_read(addr & 0xffffff);
}

SNESJS.CPU.prototype.op_readdbr = function(addr) {
  return this.op_read(((this.regs.db << 16) + addr) & 0xffffff);
}

SNESJS.CPU.prototype.op_readpbr = function(addr) {
  return this.op_read((this.regs.pc.b << 16) + (addr & 0xffff));
}

SNESJS.CPU.prototype.op_readdp = function(addr) {
  if (this.regs.e && this.regs.d.l == 0x00) {
    return this.op_read((this.regs.d & 0xff00) + ((this.regs.d + (addr & 0xffff)) & 0xff));
  } else {
    return this.op_read((this.regs.d + (addr & 0xffff)) & 0xffff);
  }
}

SNESJS.CPU.prototype.op_readsp = function(addr) {
  return this.op_read((this.regs.s + (addr & 0xffff)) & 0xffff);
}

SNESJS.CPU.prototype.op_writestack = function(data) {
  this.op_write(this.regs.s.w, data);
  this.regs.e ? this.regs.s.l-- : this.regs.s.w--;
}

SNESJS.CPU.prototype.op_writestackn = function(data) {
  this.op_write(this.regs.s.w--, data);
}

SNESJS.CPU.prototype.op_writeaddr = function(addr, data) {
  this.op_write(addr & 0xffff, data);
}

SNESJS.CPU.prototype.op_writelong = function(addr, data) {
  this.op_write(addr & 0xffffff, data);
}

SNESJS.CPU.prototype.op_writedbr = function(addr, data) {
  this.op_write(((this.regs.db << 16) + addr) & 0xffffff, data);
}

SNESJS.CPU.prototype.op_writepbr = function(addr, data) {
  this.op_write((this.regs.pc.b << 16) + (addr & 0xffff), data);
}

SNESJS.CPU.prototype.op_writedp = function(addr, data) {
  if (this.regs.e && this.regs.d.l == 0x00) {
    this.op_write((this.regs.d & 0xff00) + ((this.regs.d + (addr & 0xffff)) & 0xff), data);
  } else {
    this.op_write((this.regs.d + (addr & 0xffff)) & 0xffff, data);
  }
}

SNESJS.CPU.prototype.op_writesp = function(addr, data) {
  this.op_write((this.regs.s + (addr & 0xffff)) & 0xffff, data);
}

SNESJS.CPU.prototype.pio = function() {
  return this.status.pio;
}

SNESJS.CPU.prototype.joylatch = function() {
  return this.status.joypad_strobe_latch;
}

SNESJS.CPU.prototype.interrupt_pending = function() {
  return false;
}

SNESJS.CPU.prototype.port_read = function(port) {
  return this.port_data[port & 3];
}

SNESJS.CPU.prototype.port_write = function(port, data) {
  this.port_data[port & 3] = data;
}

SNESJS.CPU.prototype.op_io = function() {
  this.add_clocks(6);
}

SNESJS.CPU.prototype.op_read = function(addr) {
  this.regs.mdr = this.snes.bus.read(addr);
  this.add_clocks(speed(addr));
  return this.regs.mdr;
}

SNESJS.CPU.prototype.op_write = function(addr, data) {
  this.add_clocks(speed(addr));
  this.snes.bus.write(addr, this.regs.mdr = data);
}

SNESJS.CPU.prototype.speed = function(addr) {
  if (addr & 0x408000) {

    if (addr & 0x800000) {
      return status.rom_speed;
    }

    return 8;
  }

  if ((addr + 0x6000) & 0x4000) {
    return 8;
  }

  if ((addr - 0x4000) & 0x7e00) {
    return 6;
  }

  return 12;
}

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

SNESJS.CPU.prototype.mmio_read = function(addr) {
    if ((addr & 0xffc0) == 0x2140) {
        synchronize_smp();
        return this.snes.smp.port_read(new uint2(addr & 3));
    }

    switch (addr & 0xffff) {
        case 0x2180:
            var result = this.snes.bus.read(0x7e0000 | this.status.wram_addr);
            this.status.wram_addr = (this.status.wram_addr + 1) & 0x01ffff;
            return result;

        case 0x4016:
            var result = regs.mdr & 0xfc;
            result |= (Input.input.port_read(false) & 3);
            return result;

        case 0x4017:
            var result = (this.status.regs.mdr & 0xe0) | 0x1c;
            result |= (Input.input.port_read(true) & 3);
            return result;

        case 0x4210:
            var result = this.status.regs.mdr & 0x70;
            result |= ((this.status.nmi_line ? 1 : 0) << 7);
            result |= 0x02;  //CPU revision
            this.status.nmi_line = false;
            return result;

        case 0x4211:
            var result = this.status.regs.mdr & 0x7f;
            result |= (this.status.irq_line ? 1 : 0) << 7;
            this.status.irq_line = false;
            return result;

        case 0x4212:
            var result = (this.status.regs.mdr & 0x3e);
            vbstart = this.snes.ppu.overscan() ? 240 : 225;

            if (this.snes.ppucounter.vcounter() >= vbstart && this.snes.ppucounter.vcounter() <= vbstart + 2) {
                result |= 0x01;
            }

            if (this.snes.ppucounter.hcounter() <= 2 || this.snes.ppucounter.hcounter() >= 1096) {
                result |= 0x40;
            }
            if (this.snes.ppucounter.vcounter() >= vbstart){
                result |= 0x80;
            }

            return result;

        case 0x4213:
            return this.status.pio;

        case 0x4214:
            return this.status.rddiv >> 0;

        case 0x4215:
            return this.status.rddiv >> 8;

        case 0x4216:
            return this.status.rdmpy >> 0;

        case 0x4217:
            return this.status.rdmpy >> 8;

        case 0x4218:
            return this.status.joy1l;

        case 0x4219:
            return this.status.joy1h;

        case 0x421a:
            return this.status.joy2l;

        case 0x421b:
            return this.status.joy2h;

        case 0x421c:
            return this.status.joy3l;

        case 0x421d:
            return this.status.joy3h;

        case 0x421e:
            return this.status.joy4l;

        case 0x421f:
            return this.status.joy4h;
    }

    if ((addr & 0xff80) == 0x4300) {
        i = (addr >> 4) & 7;
        switch (addr & 0xff8f) {
            case 0x4300:
                return ((channel[i].direction ? 1 : 0) << 7)
                | ((channel[i].indirect ? 1 : 0) << 6)
                | ((channel[i].unused ? 1 : 0) << 5)
                | ((channel[i].reverse_transfer ? 1 : 0) << 4)
                | ((channel[i].fixed_transfer ? 1 : 0) << 3)
                | (channel[i].transfer_mode << 0);

            case 0x4301:
                return channel[i].dest_addr;

            case 0x4302:
                return channel[i].source_addr >> 0;

            case 0x4303:
                return channel[i].source_addr >> 8;

            case 0x4304:
                return channel[i].source_bank;

            case 0x4305:
                return channel[i].union.transfer_size >> 0;

            case 0x4306:
                return channel[i].union.transfer_size >> 8;

            case 0x4307:
                return channel[i].indirect_bank;

            case 0x4308:
                return channel[i].hdma_addr >> 0;

            case 0x4309:
                return channel[i].hdma_addr >> 8;

            case 0x430a:
                return channel[i].line_counter;

            case 0x430b:
            case 0x430f:
                return channel[i].unknown;
        }
    }

    return this.status.regs.mdr;
}

SNESJS.CPU.prototype.mmio_write = function(addr, data) {
    if ((addr & 0xffc0) == 0x2140) {
        this.status.synchronize_smp();
        this.status.port_write((addr & 3), data);
        return;
    }

    switch (addr & 0xffff) {
        case 0x2180:
            this.snes.bus.write(new uint24(0x7e0000 | this.status.wram_addr), data);
            this.status.wram_addr = (this.status.wram_addr + 1) & 0x01ffff;
            return;

        case 0x2181:
            this.status.wram_addr = (this.status.wram_addr & 0x01ff00) | (data << 0);
            return;

        case 0x2182:
            this.status.wram_addr = (this.status.wram_addr & 0x0100ff) | (data << 8);
            return;

        case 0x2183:
            this.status.wram_addr = (this.status.wram_addr & 0x00ffff) | ((data & 1) << 16);
            return;

        case 0x4016:
            this.snes.input.port1.latch(data & 1);
            this.snes.input.port2.latch(data & 1);
            return;

        case 0x4200:
            var nmi_enabled = this.status.nmi_enabled;
            var virq_enabled = this.status.virq_enabled;
            var hirq_enabled = this.status.hirq_enabled;

            this.status.nmi_enabled = (data & 0x80) != 0;
            this.status.virq_enabled = (data & 0x20) != 0;
            this.status.hirq_enabled = (data & 0x10) != 0;
            this.status.auto_joypad_poll_enabled = (data & 0x01) != 0;

            if (!nmi_enabled && this.status.nmi_enabled && this.status.nmi_line) {
                this.status.nmi_transition = true;
            }

            if (this.status.virq_enabled && !this.status.hirq_enabled && this.status.irq_line) {
                this.status.irq_transition = true;
            }

            if (!this.status.virq_enabled && !this.status.hirq_enabled) {
                this.status.irq_line = false;
                this.status.irq_transition = false;
            }

            this.status.irq_lock = true;
            return;

        case 0x4201:
            if ((this.status.pio & 0x80) != 0 && (data & 0x80) == 0) {
                this.snes.ppu.latch_counters();
            }
            this.status.pio = data;

        case 0x4202:
            this.status.wrmpya = data;
            return;

        case 0x4203:
            this.status.wrmpyb = data;
            this.status.rdmpy = (this.status.wrmpya * this.status.wrmpyb);
            return;

        case 0x4204:
            this.status.wrdiva = ((this.status.wrdiva & 0xff00) | (data << 0));
            return;

        case 0x4205:
            this.status.wrdiva = ((data << 8) | (this.status.wrdiva & 0x00ff));
            return;

        case 0x4206:
            this.status.wrdivb = data;
            this.status.rddiv = ((this.status.wrdivb != 0) ? this.status.wrdiva / this.status.wrdivb : 0xffff);
            this.status.rdmpy = ((this.status.wrdivb != 0) ? this.status.wrdiva % this.status.wrdivb : this.status.wrdiva);
            return;

        case 0x4207:
            this.status.htime = ((this.status.htime & 0x0100) | (data << 0));
            return;

        case 0x4208:
            this.status.htime = (((data & 1) << 8) | (this.status.htime & 0x00ff));
            return;

        case 0x4209:
            this.status.vtime = ((this.status.vtime & 0x0100) | (data << 0));
            return;

        case 0x420a:
            this.status.vtime = (((data & 1) << 8) | (this.status.vtime & 0x00ff));
            return;

        case 0x420b:
            for (var i = 0; i < 8; i++) {
                channel[i].dma_enabled = (data & (1 << i)) != 0;
            }
            if (data != 0) {
                dma_run();
            }
            return;

        case 0x420c:
            for (var i = 0; i < 8; i++) {
                channel[i].hdma_enabled = (data & (1 << i)) != 0;
            }
            return;

        case 0x420d:
            this.status.rom_speed = (data & 1) != 0 ? 6 : 8;
            return;
    }

    if ((addr & 0xff80) == 0x4300) {
        var i = (addr >> 4) & 7;

        switch (addr & 0xff8f) {
            case 0x4300:
                channel[i].direction = (data & 0x80) != 0;
                channel[i].indirect = (data & 0x40) != 0;
                channel[i].unused = (data & 0x20) != 0;
                channel[i].reverse_transfer = (data & 0x10) != 0;
                channel[i].fixed_transfer = (data & 0x08) != 0;
                channel[i].transfer_mode = (data & 0x07);
                return;

            case 0x4301:
                channel[i].dest_addr = data;
                return;

            case 0x4302:
                channel[i].source_addr = ((channel[i].source_addr & 0xff00) | (data << 0));
                return;

            case 0x4303:
                channel[i].source_addr = ((data << 8) | (channel[i].source_addr & 0x00ff));
                return;

            case 0x4304:
                channel[i].source_bank = data;
                return;

            case 0x4305:
                channel[i].union.transfer_size = ((channel[i].union.transfer_size & 0xff00) | (data << 0));
                return;

            case 0x4306:
                channel[i].union.transfer_size = ((data << 8) | (channel[i].union.transfer_size & 0x00ff));
                return;

            case 0x4307:
                channel[i].indirect_bank = data;
                return;

            case 0x4308:
                channel[i].hdma_addr = ((channel[i].hdma_addr & 0xff00) | (data << 0));
                return;

            case 0x4309:
                channel[i].hdma_addr = ((data << 8) | (channel[i].hdma_addr & 0x00ff));
                return;

            case 0x430a:
                channel[i].line_counter = data;
                return;

            case 0x430b:
            case 0x430f:
                channel[i].unknown = data;
                return;
        }
    }
}
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

SNESJS.CPU.Regs = function() {
	this.pc = new SNESJS.CPU.Reg24();

	this.p = new SNESJS.CPU.RegFlag();

	var rtemp = [];

	this.a = rtemp[0] = new SNESJS.CPU.Reg16();
	this.x = rtemp[1] = new SNESJS.CPU.Reg16();
	this.y = rtemp[2] = new SNESJS.CPU.Reg16();
	this.z = rtemp[3] = new SNESJS.CPU.Reg16();
	this.s = rtemp[4] = new SNESJS.CPU.Reg16();
	this.d = rtemp[5] = new SNESJS.CPU.Reg16();

	this.r = rtemp;

	this.db = 0;
	this.e = false;
	this.irq = false; //IRQ pin (0 = low, 1 = trigger)
	this.wai = false; //Raised during wai, cleared after interrupt triggered
	this.mdr = 0; //Memory data register

	this.z.d = 0;
}

SNESJS.CPU.RegFlag = function() {
	this.n = false;
	this.v = false;
	this.m = false;
	this.x = false;
	this.d = false;
	this.i = false;
	this.z = false;
	this.c = false;
}

SNESJS.CPU.RegFlag.prototype.assign = function(data) {
	this.n = (data & 0x80) == 0x80;
	this.v = (data & 0x40) == 0x40;
	this.m = (data & 0x20) == 0x20;
	this.x = (data & 0x10) == 0x10;
	this.d = (data & 0x08) == 0x08;
	this.i = (data & 0x04) == 0x04;
	this.z = (data & 0x02) == 0x02;
	this.c = (data & 0x01) == 0x01;
}

SNESJS.CPU.RegFlag.prototype.valueOf = function() {
	return (this.n ? 0x80 : 0x00)
		| (this.v ? 0x40 : 0x00)
		| (this.m ? 0x20 : 0x00)
		| (this.x ? 0x10 : 0x00)
		| (this.d ? 0x08 : 0x00)
		| (this.i ? 0x04 : 0x00)
		| (this.z ? 0x02 : 0x00)
		| (this.c ? 0x01 : 0x00);
}

SNESJS.CPU.Reg16 = function() {
	this.w = 0; //Value

	this.l = 0;
	this.h = 0;
}

SNESJS.CPU.Reg24 = function() {
	this.d = 0; //Value

	this.w = 0;
	this.wh = 0;

	this.l = 0;
	this.h = 0;
	this.b = 0;
	this.bh = 0;
}
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

SNESJS.CPU.Status = function() {

	this.nmi_valid = false;
	this.nmi_line = false;
	this.nmi_transition = false;
	this.nmi_pending = false;

	this.irq_valid = false;
	this.irq_line = false;
	this.irq_transition = false;
	this.irq_pending = false;

	this.irq_lock = false;
	this.hdma_pending = false;

	this.wram_addr = 0;

	this.joypad_strobe_latch = false;

	this.nmi_enabled = false;
	this.virq_enabled = false;
	this.hirq_enabled = false;
	this.auto_joypad_poll_enabled = false;

	this.pio = 0;

	this.wrmpya = 0;
	this.wrmpyb = 0;
	this.wrdiva = 0;
	this.wrdivb = 0;

	this.htime = 0;
	this.vtime = 0;

	this.rom_speed = 0;

	this.rddiv = 0;
	this.rdmpy = 0;

	this.joy1l = 0
	this.joy1h = 0;
	this.joy2l = 0
	this.joy2h = 0;
	this.joy3l = 0
	this.joy3h = 0;
	this.joy4l = 0
	this.joy4h = 0;

}
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

SNESJS.CPU.QueueEvent = {
	DramRefresh: 0,
	HdmaRun: 1
};

SNESJS.CPU.prototype.queue_event = function(id) {
  switch(id) {
    case SNESJS.CPU.QueueEvent.DramRefresh: 
    	return add_clocks(40);

    case SNESJS.CPU.QueueEvent.HdmaRun: 
    	return hdma_run();
  }
}

SNESJS.CPU.prototype.last_cycle = function() {
  if(this.status.irq_lock) {
    this.status.irq_lock = false;
    return;
  }

  if(this.status.nmi_transition) {
    regs.wai = false;
    this.status.nmi_transition = false;
    this.status.nmi_pending = true;
  }

  if(this.status.irq_transition || this.regs.irq) {
    this.regs.wai = false;
    this.status.irq_transition = false;
    this.status.irq_pending = !this.regs.p.i;
  }
}

SNESJS.CPU.prototype.add_clocks = function(clocks) {
  if(this.status.hirq_enabled) {
    if(this.status.virq_enabled) {
      var cpu_time = this.snes.ppucounter.vcounter() * 1364 + hcounter();
      var irq_time = this.status.vtime * 1364 + this.status.htime * 4;
      var framelines = (system.region.i == REGION_NTSC ? 262 : 312) + field();

      if(cpu_time > irq_time) {
      	irq_time += framelines * 1364;
      }

      var irq_valid = this.status.irq_valid;
      this.status.irq_valid = cpu_time <= irq_time && cpu_time + clocks > irq_time;

      if(!irq_valid && this.status.irq_valid) {
      	this.status.irq_line = true;
      }

    } else {

      var irq_time = this.status.htime * 4;

      if(hcounter() > irq_time) {
      	irq_time += 1364;
      }

      var irq_valid = this.status.irq_valid;

      this.status.irq_valid = hcounter() <= irq_time && hcounter() + clocks > irq_time;

      if(!irq_valid && this.status.irq_valid) {
      	this.status.irq_line = true;
      }

    }

    if(this.status.irq_line) {
    	this.status.irq_transition = true;
    }

  } else if(this.status.virq_enabled) {
    var irq_valid = this.status.irq_valid;
    this.status.irq_valid = vcounter() == this.status.vtime;

    if(!irq_valid && this.status.irq_valid) {
    	this.status.irq_line = true;
    }

    if(this.status.irq_line) {
    	this.status.irq_transition = true;
    }

  } else {
    this.status.irq_valid = false;
  }

  this.status.tick(clocks);
  queue.tick(clocks);
  step(clocks);
}

SNESJS.CPU.prototype.scanline = function() {
  this.status.synchronize_smp();
  this.status.synchronize_ppu();
  this.status.synchronize_coprocessors();

  this.snes.system.scanline();

  if(vcounter() == 0) hdma_init();

  queue.enqueue(534, SNESJS.CPU.QueueEvent.DramRefresh);

  if(vcounter() <= (ppu.overscan() == false ? 224 : 239)) {
    queue.enqueue(1104 + 8, SNESJS.CPU.QueueEvent.HdmaRun);
  }

  var nmi_valid = this.status.nmi_valid;
  this.status.nmi_valid = vcounter() >= (ppu.overscan() == false ? 225 : 240);

  if(!nmi_valid && this.status.nmi_valid) {
    this.status.nmi_line = true;

    if(this.status.nmi_enabled) {
    	this.status.nmi_transition = true;
    }

  } else if(nmi_valid && !this.status.nmi_valid) {
    this.status.nmi_line = false;
  }

  if(this.status.auto_joypad_poll_enabled && vcounter() == (ppu.overscan() == false ? 227 : 242)) {
    this.status.run_auto_joypad_poll();
  }
}

SNESJS.CPU.prototype.run_auto_joypad_poll = function() {
  this.snes.input.port1.latch(1);
  this.snes.input.port2.latch(1);
  this.snes.input.port1.latch(0);
  this.snes.input.port2.latch(0);

  var joy1 = 0, joy2 = 0, joy3 = 0, joy4 = 0;
  for(var i = 0; i < 16; i++) {
    var port0 = this.snes.input.port1.data();
    var port1 = this.snes.input.port2.data();

    joy1 |= (port0 & 1) ? (0x8000 >> i) : 0;
    joy2 |= (port1 & 1) ? (0x8000 >> i) : 0;
    joy3 |= (port0 & 2) ? (0x8000 >> i) : 0;
    joy4 |= (port1 & 2) ? (0x8000 >> i) : 0;
  }

  this.status.joy1l = joy1;
  this.status.joy1h = joy1 >> 8;

  this.status.joy2l = joy2;
  this.status.joy2h = joy2 >> 8;

  this.status.joy3l = joy3;
  this.status.joy3h = joy3 >> 8;

  this.status.joy4l = joy4;
  this.status.joy4h = joy4 >> 8;
}

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

SNESJS.Bus = function(snes) {
  this.snes = snes;

  this.reader = [];
  this.writer = [];

  this.lookup = [];
  this.target = [];
}

SNESJS.Bus.prototype.mirror = function(addr, size) {
  var base = 0;
  if (size) {

    var mask = 1 << 23;

    while (addr >= size) {
      while (!(addr & mask)) mask >>= 1;
      addr -= mask;
      if (size > mask) {
        size -= mask;
        base += mask;
      }
      mask >>= 1;
    }

    base += addr;

  }
  return base;
}

SNESJS.Bus.prototype.map = function(addr, access, offset) {
  var p = this.page[addr >> 8];
  p.access = access;
  p.offset = offset - addr;
}


SNESJS.Bus.prototype.map = function(mode, bank_lo, bank_hi, addr_lo, addr_hi, rd, wr, base, length) {

  var id = idcount++;
  this.reader[id] = rd;
  this.writer[id] = wr;

  if (length == 0) {
    length = (bank_hi - bank_lo + 1) * (addr_hi - addr_lo + 1);
  }

  var offset = 0;
  for (var bank = bank_lo; bank <= bank_hi; bank++) {
    for (var addr = addr_lo; addr <= addr_hi; addr++) {
      var destaddr = (bank << 16) | addr;

      if (mode == SNESJS.Bus.MapMode.Linear) {
        destaddr = this.mirror(base + offset++, length);
      }

      if (mode == SNESJS.Bus.MapMode.Shadow) {
        destaddr = this.mirror(base + destaddr, length);
      }

      this.lookup[(bank << 16) | addr] = id;
      this.target[(bank << 16) | addr] = destaddr;
    }
  }
}

SNESJS.Bus.bus_reader_dummy = function(cpu, thing) {
  return cpu.regs.mdr;
}

SNESJS.Bus.bus_writer_dummy = function(cpu, thing, byte) {}

SNESJS.Bus.prototype.map_reset = function() {
  for (var i = 0; i < 0x100; i++) {
    this.reader[i] = SNESJS.Bus.bus_reader_dummy;
  }

  for (var i = 0; i < 0x100; i++) {
    this.writer[i] = SNESJS.Bus.bus_writer_dummy;
  }

  idcount = 0;
  this.map(SNESJS.Bus.MapMode.Direct, 0x00, 0xff, 0x0000, 0xffff, this.reader, this.writer);
}

SNESJS.Bus.prototype.map_xml = function() {
  for (var i = 0; i < this.snes.cartridge.mapping.length; i++) {
    var m = this.snes.cartridge.mapping[i];
    map(m.mode.i, m.banklo, m.bankhi, m.addrlo, m.addrhi, m.read, m.write, m.offset, m.size);
  }
}

SNESJS.Bus.prototype.read = function(addr) {
  return this.reader[this.lookup[addr]](this.target[addr]);
}

SNESJS.Bus.prototype.write = function(addr, data) {
  return writer[this.lookup[addr]](this.target[addr], this.data);
}

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

 SNESJS.Bus.MapMode = {
 	Direct: 0,
 	Linear: 1,
 	Shadow: 2
 }
function uclip24(num) {
	return num & 0xffffff;
}

function uclip16(num) {
	return num & 0xffff;
}

function uclip8(num) {
	return num & 0xff;
}
//Code taken and modified from http://stackoverflow.com/questions/359788/how-to-execute-a-javascript-function-when-i-have-its-name-as-a-string
function getFunctionByName(functionName) {
	var context = window;
	var args = Array.prototype.slice.call(arguments).splice(2);
	var namespaces = functionName.split(".");
	var func = namespaces.pop();
	for(var i = 0; i < namespaces.length; i++) {
    	context = context[namespaces[i]];
	}
	return context[func];
}